import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AUserService } from '../../a_user/a_user.service';
import { OAuthAccountRepository } from './oauth-account.repository';
import {
  OAuthProviderService,
  OAuthUserProfile,
  OAuthTokenResponse,
} from './oauth-provider.service';
import { User, OAuthAccount } from '@prisma/client';

export interface OAuthAuthResult {
  user: User;
  oauthAccount: OAuthAccount;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly userService: AUserService,
    private readonly oauthRepo: OAuthAccountRepository,
    private readonly providerService: OAuthProviderService,
  ) {}

  /**
   * Primary logic for handling user creation and provider linking.
   * 1. Look up OAuthAccount by (provider, providerAccountId).
   * 2. If existing OAuthAccount is found:
   *    - Update stored tokens.
   *    - Fetch & update User profile fields if updated (e.g. name, avatar).
   *    - Return existing User and OAuthAccount.
   * 3. If no OAuthAccount exists:
   *    - Check if a User exists with the verified email returned by the provider.
   *    - If matching User exists with verified email:
   *        Link the new OAuthAccount to the existing User.
   *    - If no User exists:
   *        Create a new User record and link the new OAuthAccount to it.
   */
  async handleOAuthCallback(
    provider: 'google' | 'github',
    tokenResponse: OAuthTokenResponse,
  ): Promise<OAuthAuthResult> {
    const {
      userProfile,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      scope,
    } = tokenResponse;

    // Step 1: Look up existing OAuthAccount link by immutable (provider, providerAccountId)
    let oauthAccount = await this.oauthRepo.findByProvider(
      provider,
      userProfile.providerAccountId,
    );

    let user: User | null = null;

    if (oauthAccount) {
      // User & OAuth account already linked -> update tokens
      oauthAccount = await this.oauthRepo.updateTokens(oauthAccount.id, {
        accessToken,
        refreshToken: refreshToken ?? undefined, // Keep existing if null
        accessTokenExpiresAt,
        scope,
      });

      user = await this.userService.findById(oauthAccount.userId);
      if (!user) {
        throw new UnauthorizedException('Associated user not found');
      }

      // Update user avatar/name if missing
      if (
        (userProfile.avatarUrl && !user.avatarUrl) ||
        (userProfile.name && !user.name)
      ) {
        user = await this.userService.update(user.id, {
          name: user.name || userProfile.name || undefined,
          avatarUrl: user.avatarUrl || userProfile.avatarUrl || undefined,
        });
      }
    } else {
      // Step 2: No existing OAuthAccount link. Check account linking policy based on verified email.
      if (userProfile.email && userProfile.emailVerified) {
        user = await this.userService.findByEmail(userProfile.email);
      }

      if (!user) {
        // Step 3: Create new user if no match found
        user = await this.userService.create({
          email: userProfile.email,
          name: userProfile.name,
          avatarUrl: userProfile.avatarUrl,
          emailVerifiedAt: userProfile.emailVerified ? new Date() : null,
        });
      } else {
        // Existing user found via verified email -> safely link account & update details
        const updateData: any = {};
        if (!user.name && userProfile.name) {
          updateData.name = userProfile.name;
        }
        if (!user.avatarUrl && userProfile.avatarUrl) {
          updateData.avatarUrl = userProfile.avatarUrl;
        }
        if (!user.emailVerifiedAt && userProfile.emailVerified) {
          updateData.emailVerifiedAt = new Date();
        }
        if (Object.keys(updateData).length > 0) {
          user = await this.userService.update(user.id, updateData);
        }
      }

      // Create new OAuthAccount link
      oauthAccount = await this.oauthRepo.create({
        userId: user.id,
        provider,
        providerAccountId: userProfile.providerAccountId,
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        scope,
      });
    }

    return { user, oauthAccount };
  }

  /**
   * Check token expiry and refresh server-side if expired or near expiry.
   * If refresh fails or token revoked, invalidate stored token data & throw UnauthorizedException.
   */
  async ensureValidProviderToken(
    oauthAccountId: string,
  ): Promise<{ accessToken: string }> {
    const oauthAccount = await this.oauthRepo.findById(oauthAccountId);
    if (!oauthAccount) {
      throw new UnauthorizedException('OAuth account not found');
    }

    if (!oauthAccount.accessToken && !oauthAccount.refreshToken) {
      throw new UnauthorizedException(
        'OAuth token missing or revoked. Re-authentication required.',
      );
    }

    const now = new Date();
    // Refresh if token expires in less than 2 minutes (120,000ms) or is already expired
    const isExpiredOrSoon =
      oauthAccount.accessTokenExpiresAt &&
      oauthAccount.accessTokenExpiresAt.getTime() - now.getTime() < 120000;

    if (!isExpiredOrSoon && oauthAccount.accessToken) {
      return { accessToken: oauthAccount.accessToken };
    }

    // Attempt token refresh
    if (!oauthAccount.refreshToken) {
      // Cannot refresh without a refresh token, clear tokens
      await this.oauthRepo.clearTokens(oauthAccount.id);
      throw new UnauthorizedException(
        'Access token expired and no refresh token available',
      );
    }

    try {
      let refreshed;
      if (oauthAccount.provider === 'google') {
        refreshed = await this.providerService.refreshGoogleToken(
          oauthAccount.refreshToken,
        );
      } else if (oauthAccount.provider === 'github') {
        refreshed = await this.providerService.refreshGithubToken(
          oauthAccount.refreshToken,
        );
      } else {
        throw new BadRequestException(
          `Unsupported OAuth provider: ${oauthAccount.provider}`,
        );
      }

      const updatedAccount = await this.oauthRepo.updateTokens(
        oauthAccount.id,
        {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || oauthAccount.refreshToken, // keep existing if not rotated
          accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
        },
      );

      return { accessToken: updatedAccount.accessToken! };
    } catch (err) {
      // Invalidate token data if refresh fails or is revoked
      await this.oauthRepo.clearTokens(oauthAccount.id);
      throw new UnauthorizedException(
        'OAuth session expired or authorization was revoked. Please log in again.',
      );
    }
  }

  /**
   * Revoke/clear OAuth account tokens for a given user & provider.
   */
  async revokeOAuthAccount(
    userId: string,
    provider: 'google' | 'github',
  ): Promise<void> {
    const accounts = await this.oauthRepo.findByUserId(userId);
    const targetAccount = accounts.find((acc) => acc.provider === provider);
    if (targetAccount) {
      await this.oauthRepo.clearTokens(targetAccount.id);
    }
  }
}
