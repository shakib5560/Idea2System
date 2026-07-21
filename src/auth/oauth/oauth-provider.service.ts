import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OAuthUserProfile {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null; // seconds
  accessTokenExpiresAt: Date | null;
  scope: string | null;
  idToken?: string;
  userProfile: OAuthUserProfile;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string | null; // set if rotated
  accessTokenExpiresAt: Date | null;
}

@Injectable()
export class OAuthProviderService {
  constructor(private readonly configService: ConfigService) {}

  // ─── Google OAuth 2.0 / OIDC ───────────────────────────────────────────────

  getGoogleAuthUrl(state: string, codeChallenge: string, nonce: string): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL')!;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeGoogleCode(
    code: string,
    codeVerifier: string,
    expectedNonce: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL')!;

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(`Google token exchange failed: ${errBody}`);
    }

    const data = await res.json();
    const { access_token, refresh_token, expires_in, scope, id_token } = data;

    if (!id_token) {
      throw new UnauthorizedException('Google did not return an id_token');
    }

    // Validate ID Token payload (OIDC requirements: iss, aud, exp, nonce)
    const payload = this.decodeAndValidateGoogleIdToken(id_token, clientId, expectedNonce);

    const userProfile: OAuthUserProfile = {
      providerAccountId: payload.sub,
      email: payload.email || null,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name || null,
      avatarUrl: payload.picture || null,
    };

    const accessTokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresIn: expires_in || null,
      accessTokenExpiresAt,
      scope: scope || null,
      idToken: id_token,
      userProfile,
    };
  }

  async refreshGoogleToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new UnauthorizedException('Failed to refresh Google token');
    }

    const data = await res.json();
    const expires_in = data.expires_in;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null, // in case of token rotation
      accessTokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
    };
  }

  private decodeAndValidateGoogleIdToken(
    idToken: string,
    expectedClientId: string,
    expectedNonce: string,
  ): any {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed Google ID token');
    }

    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    let payload: any;
    try {
      payload = JSON.parse(payloadJson);
    } catch {
      throw new UnauthorizedException('Invalid Google ID token JSON payload');
    }

    // Verify Issuer
    const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      throw new UnauthorizedException(`Invalid ID token issuer: ${payload.iss}`);
    }

    // Verify Audience
    if (payload.aud !== expectedClientId) {
      throw new UnauthorizedException('ID token audience does not match Client ID');
    }

    // Verify Expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('ID token has expired');
    }

    // Verify Nonce
    if (expectedNonce && payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('ID token nonce mismatch');
    }

    return payload;
  }

  // ─── GitHub OAuth ──────────────────────────────────────────────────────────

  getGithubAuthUrl(state: string, codeChallenge?: string): string {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')!;
    const redirectUri = this.configService.get<string>('GITHUB_CALLBACK_URL')!;

    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    };

    if (codeChallenge) {
      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    return `https://github.com/login/oauth/authorize?${new URLSearchParams(params).toString()}`;
  }

  async exchangeGithubCode(
    code: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET')!;
    const redirectUri = this.configService.get<string>('GITHUB_CALLBACK_URL')!;

    const body: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(`GitHub token exchange failed: ${errBody}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new BadRequestException(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    const { access_token, refresh_token, expires_in, scope } = data;

    // Fetch user profile from GitHub API
    const userProfile = await this.fetchGithubUserProfile(access_token);

    const accessTokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    return {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresIn: expires_in || null,
      accessTokenExpiresAt,
      scope: scope || null,
      userProfile,
    };
  }

  async refreshGithubToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET')!;

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      throw new UnauthorizedException('Failed to refresh GitHub token');
    }

    const data = await res.json();
    if (data.error) {
      throw new UnauthorizedException(`GitHub refresh error: ${data.error_description || data.error}`);
    }

    const expires_in = data.expires_in;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      accessTokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
    };
  }

  private async fetchGithubUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Idea2System-OAuth',
      },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch user profile from GitHub');
    }

    const ghUser = await userRes.json();

    let email: string | null = ghUser.email || null;
    let emailVerified = false;

    // If public email is not present, query /user/emails
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Idea2System-OAuth',
        },
      });

      if (emailsRes.ok) {
        const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await emailsRes.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
        if (primaryEmail) {
          email = primaryEmail.email;
          emailVerified = primaryEmail.verified;
        }
      }
    } else {
      // GitHub verified public emails if present
      emailVerified = true;
    }

    return {
      providerAccountId: String(ghUser.id),
      email,
      emailVerified,
      name: ghUser.name || ghUser.login || null,
      avatarUrl: ghUser.avatar_url || null,
    };
  }
}
