import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from './oauth.service';
import { AUserService } from '../../a_user/a_user.service';
import { OAuthAccountRepository } from './oauth-account.repository';
import {
  OAuthProviderService,
  OAuthTokenResponse,
} from './oauth-provider.service';
import { UnauthorizedException } from '@nestjs/common';
import { User, OAuthAccount } from '@prisma/client';

describe('OAuthService', () => {
  let service: OAuthService;
  let userService: jest.Mocked<AUserService>;
  let oauthRepo: jest.Mocked<OAuthAccountRepository>;
  let providerService: jest.Mocked<OAuthProviderService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    username: null,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOAuthAccount: OAuthAccount = {
    id: 'oauth-acc-123',
    userId: 'user-123',
    provider: 'google',
    providerAccountId: 'google-sub-999',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'openid email profile',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenResponse: OAuthTokenResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
    accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'openid email profile',
    userProfile: {
      providerAccountId: 'google-sub-999',
      email: 'test@example.com',
      emailVerified: true,
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    },
  };

  beforeEach(async () => {
    const mockUserServiceImpl = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
    };

    const mockOAuthRepoImpl = {
      findByProvider: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateTokens: jest.fn(),
      clearTokens: jest.fn(),
    };

    const mockProviderServiceImpl = {
      refreshGoogleToken: jest.fn(),
      refreshGithubToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: AUserService, useValue: mockUserServiceImpl },
        { provide: OAuthAccountRepository, useValue: mockOAuthRepoImpl },
        { provide: OAuthProviderService, useValue: mockProviderServiceImpl },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    userService = module.get(AUserService);
    oauthRepo = module.get(OAuthAccountRepository);
    providerService = module.get(OAuthProviderService);
  });

  describe('handleOAuthCallback', () => {
    it('should handle returning user login and update tokens', async () => {
      oauthRepo.findByProvider.mockResolvedValue(mockOAuthAccount);
      oauthRepo.updateTokens.mockResolvedValue(mockOAuthAccount);
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.handleOAuthCallback(
        'google',
        mockTokenResponse,
      );

      expect(oauthRepo.findByProvider).toHaveBeenCalledWith(
        'google',
        'google-sub-999',
      );
      expect(oauthRepo.updateTokens).toHaveBeenCalled();
      expect(userService.findById).toHaveBeenCalledWith('user-123');
      expect(result.user).toEqual(mockUser);
      expect(result.oauthAccount).toEqual(mockOAuthAccount);
    });

    it('should link account to existing user when email matches and is verified', async () => {
      oauthRepo.findByProvider.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(mockUser);
      oauthRepo.create.mockResolvedValue(mockOAuthAccount);

      const result = await service.handleOAuthCallback(
        'google',
        mockTokenResponse,
      );

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.create).not.toHaveBeenCalled();
      expect(oauthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          provider: 'google',
          providerAccountId: 'google-sub-999',
        }),
      );
      expect(result.user).toEqual(mockUser);
    });

    it('should create new user and oauth account when user does not exist', async () => {
      oauthRepo.findByProvider.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(mockUser);
      oauthRepo.create.mockResolvedValue(mockOAuthAccount);

      const result = await service.handleOAuthCallback(
        'google',
        mockTokenResponse,
      );

      expect(userService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        emailVerifiedAt: expect.any(Date),
      });
      expect(oauthRepo.create).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('ensureValidProviderToken', () => {
    it('should return valid unexpired access token without refreshing', async () => {
      oauthRepo.findById.mockResolvedValue(mockOAuthAccount);

      const result = await service.ensureValidProviderToken('oauth-acc-123');

      expect(result.accessToken).toBe('mock-access-token');
      expect(providerService.refreshGoogleToken).not.toHaveBeenCalled();
    });

    it('should refresh token if access token is expired', async () => {
      const expiredAccount = {
        ...mockOAuthAccount,
        accessTokenExpiresAt: new Date(Date.now() - 1000),
      };
      oauthRepo.findById.mockResolvedValue(expiredAccount);
      providerService.refreshGoogleToken.mockResolvedValue({
        accessToken: 'refreshed-access-token',
        refreshToken: 'rotated-refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      });
      oauthRepo.updateTokens.mockResolvedValue({
        ...expiredAccount,
        accessToken: 'refreshed-access-token',
      });

      const result = await service.ensureValidProviderToken('oauth-acc-123');

      expect(providerService.refreshGoogleToken).toHaveBeenCalledWith(
        'mock-refresh-token',
      );
      expect(oauthRepo.updateTokens).toHaveBeenCalled();
      expect(result.accessToken).toBe('refreshed-access-token');
    });

    it('should clear tokens and throw UnauthorizedException if token refresh fails or is revoked', async () => {
      const expiredAccount = {
        ...mockOAuthAccount,
        accessTokenExpiresAt: new Date(Date.now() - 1000),
      };
      oauthRepo.findById.mockResolvedValue(expiredAccount);
      providerService.refreshGoogleToken.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(
        service.ensureValidProviderToken('oauth-acc-123'),
      ).rejects.toThrow(UnauthorizedException);
      expect(oauthRepo.clearTokens).toHaveBeenCalledWith('oauth-acc-123');
    });
  });
});
