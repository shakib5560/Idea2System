import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AUserService } from '../a_user/a_user.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIdentifier: jest.fn(),
      create: jest.fn(),
    };
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
