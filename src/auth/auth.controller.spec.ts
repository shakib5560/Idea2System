import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthStateService } from './oauth/oauth-state.service';
import { OAuthProviderService } from './oauth/oauth-provider.service';
import { OAuthService } from './oauth/oauth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      createToken: jest.fn(),
    };
    const mockOAuthStateService = {
      generateState: jest.fn().mockReturnValue('mock-state'),
      generateCodeVerifier: jest.fn().mockReturnValue('mock-verifier'),
      generateCodeChallenge: jest.fn().mockReturnValue('mock-challenge'),
      generateNonce: jest.fn().mockReturnValue('mock-nonce'),
    };
    const mockOAuthProviderService = {
      getGoogleAuthUrl: jest
        .fn()
        .mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
      getGithubAuthUrl: jest
        .fn()
        .mockReturnValue('https://github.com/login/oauth/authorize'),
      exchangeGoogleCode: jest.fn(),
      exchangeGithubCode: jest.fn(),
    };
    const mockOAuthService = {
      handleOAuthCallback: jest.fn(),
      ensureValidProviderToken: jest.fn(),
      revokeOAuthAccount: jest.fn(),
      oauthRepo: {
        findByUserId: jest.fn(),
      },
    };
    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OAuthStateService, useValue: mockOAuthStateService },
        { provide: OAuthProviderService, useValue: mockOAuthProviderService },
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
