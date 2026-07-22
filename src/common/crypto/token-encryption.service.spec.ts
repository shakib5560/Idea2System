import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TokenEncryptionService } from './token-encryption.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('TokenEncryptionService', () => {
  let service: TokenEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue(
                '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
              ),
          },
        },
      ],
    }).compile();

    service = module.get<TokenEncryptionService>(TokenEncryptionService);
  });

  it('should encrypt and decrypt string successfully', () => {
    const originalToken = 'secret-access-token-12345';
    const encrypted = service.encrypt(originalToken);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(originalToken);
    expect(encrypted?.split(':').length).toBe(3);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(originalToken);
  });

  it('should return null when input is null or undefined', () => {
    expect(service.encrypt(null)).toBeNull();
    expect(service.encrypt(undefined)).toBeNull();
    expect(service.decrypt(null)).toBeNull();
    expect(service.decrypt(undefined)).toBeNull();
  });

  it('should throw InternalServerErrorException on invalid ciphertext', () => {
    expect(() => service.decrypt('invalid-ciphertext')).toThrow(
      InternalServerErrorException,
    );
    expect(() => service.decrypt('iv:tag:badciphertext')).toThrow(
      InternalServerErrorException,
    );
  });
});
