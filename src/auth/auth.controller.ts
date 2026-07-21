import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login-auth.dto';
import { OAuthStateService } from './oauth/oauth-state.service';
import { OAuthProviderService } from './oauth/oauth-provider.service';
import { OAuthService } from './oauth/oauth.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    username?: string | null;
  };
};


@Controller('auth')
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly oauthStateService: OAuthStateService,
    private readonly oauthProviderService: OAuthProviderService,
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(
    @Req() req: AuthenticatedRequest,
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenResult = this.authService.createToken(req.user);
    
    // Set HTTP-only session cookie
    res.cookie('__session', tokenResult.accessToken, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: this.isProd,
    });

    return tokenResult;
  }

  // ─── Google OAuth Flow with PKCE & OIDC ────────────────────────────────────

  @Get('google')
  googleLogin(@Res() res: Response) {
    const state = this.oauthStateService.generateState();
    const codeVerifier = this.oauthStateService.generateCodeVerifier();
    const codeChallenge = this.oauthStateService.generateCodeChallenge(codeVerifier);
    const nonce = this.oauthStateService.generateNonce();

    // Store OAuth state & verifier in signed HTTP-only cookie
    res.cookie('__oauth_state_google', JSON.stringify({ state, codeVerifier, nonce }), {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      secure: this.isProd,
    });

    const redirectUrl = this.oauthProviderService.getGoogleAuthUrl(
      state,
      codeChallenge,
      nonce,
    );

    return res.redirect(redirectUrl);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (error) {
      res.clearCookie('__oauth_state_google');
      throw new BadRequestException(`Google login cancelled or failed: ${error}`);
    }

    if (!code || !state) {
      res.clearCookie('__oauth_state_google');
      throw new BadRequestException('Invalid callback request: missing code or state');
    }

    const rawCookie = req.signedCookies?.__oauth_state_google || req.cookies?.__oauth_state_google;
    res.clearCookie('__oauth_state_google');

    if (!rawCookie) {
      throw new BadRequestException('Invalid OAuth state session or session expired');
    }

    let cookieData: { state: string; codeVerifier: string; nonce: string };
    try {
      cookieData = typeof rawCookie === 'string' ? JSON.parse(rawCookie) : rawCookie;
    } catch {
      throw new BadRequestException('Invalid OAuth state cookie content');
    }

    if (cookieData.state !== state) {
      throw new UnauthorizedException('OAuth CSRF state mismatch verification failed');
    }

    // Exchange code for tokens & validate ID Token PKCE / Nonce / Iss / Aud
    const tokenResponse = await this.oauthProviderService.exchangeGoogleCode(
      code,
      cookieData.codeVerifier,
      cookieData.nonce,
    );

    // Find/create user & link OAuth account
    const { user } = await this.oauthService.handleOAuthCallback('google', tokenResponse);

    // Generate App JWT & set HTTP-only session cookie
    const tokenResult = this.authService.createToken(user);
    res.cookie('__session', tokenResult.accessToken, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: this.isProd,
    });

    return tokenResult;
  }

  // ─── GitHub OAuth Flow ──────────────────────────────────────────────────────

  @Get('github')
  githubLogin(@Res() res: Response) {
    const state = this.oauthStateService.generateState();
    const codeVerifier = this.oauthStateService.generateCodeVerifier();
    const codeChallenge = this.oauthStateService.generateCodeChallenge(codeVerifier);

    res.cookie('__oauth_state_github', JSON.stringify({ state, codeVerifier }), {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      secure: this.isProd,
    });

    const redirectUrl = this.oauthProviderService.getGithubAuthUrl(state, codeChallenge);
    return res.redirect(redirectUrl);
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (error) {
      res.clearCookie('__oauth_state_github');
      throw new BadRequestException(`GitHub login cancelled or failed: ${error}`);
    }

    if (!code || !state) {
      res.clearCookie('__oauth_state_github');
      throw new BadRequestException('Invalid callback request: missing code or state');
    }

    const rawCookie = req.signedCookies?.__oauth_state_github || req.cookies?.__oauth_state_github;
    res.clearCookie('__oauth_state_github');

    if (!rawCookie) {
      throw new BadRequestException('Invalid OAuth state session or session expired');
    }

    let cookieData: { state: string; codeVerifier?: string };
    try {
      cookieData = typeof rawCookie === 'string' ? JSON.parse(rawCookie) : rawCookie;
    } catch {
      throw new BadRequestException('Invalid OAuth state cookie content');
    }

    if (cookieData.state !== state) {
      throw new UnauthorizedException('OAuth CSRF state mismatch verification failed');
    }

    const tokenResponse = await this.oauthProviderService.exchangeGithubCode(
      code,
      cookieData.codeVerifier,
    );

    const { user } = await this.oauthService.handleOAuthCallback('github', tokenResponse);

    const tokenResult = this.authService.createToken(user);
    res.cookie('__session', tokenResult.accessToken, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: this.isProd,
    });

    return tokenResult;
  }

  // ─── Provider Token Refresh & Revoke ────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Post('refresh-provider-token/:provider')
  async refreshProviderToken(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: 'google' | 'github',
  ) {
    if (provider !== 'google' && provider !== 'github') {
      throw new BadRequestException('Invalid provider name. Must be google or github.');
    }

    const userAccounts = await this.oauthService['oauthRepo'].findByUserId(req.user.id);
    const targetAccount = userAccounts.find((acc) => acc.provider === provider);

    if (!targetAccount) {
      throw new BadRequestException(`No connected ${provider} account found for this user`);
    }

    await this.oauthService.ensureValidProviderToken(targetAccount.id);
    return { success: true, message: `Provider token for ${provider} refreshed successfully` };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('oauth/:provider')
  async revokeOAuthAccount(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: 'google' | 'github',
  ) {
    if (provider !== 'google' && provider !== 'github') {
      throw new BadRequestException('Invalid provider name. Must be google or github.');
    }

    await this.oauthService.revokeOAuthAccount(req.user.id, provider);
    return { success: true, message: `Disconnected ${provider} account successfully` };
  }

  // ─── Logout & Profile ──────────────────────────────────────────────────────

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('__session');
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}