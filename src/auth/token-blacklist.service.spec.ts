import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '../redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let mockRedis: {
    set: jest.Mock;
    get: jest.Mock;
    exists: jest.Mock;
  };

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blacklist', () => {
    it('should set jti with correct TTL in seconds', async () => {
      const jti = 'test-jti-123';
      const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now

      await service.blacklist(jti, exp);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'bl:test-jti-123',
        'revoked',
        'EX',
        expect.any(Number),
      );
    });

    it('should throw UnauthorizedException on Redis failure (fail-closed)', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection lost'));

      await expect(service.blacklist('jti-1', 9999999999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if jti exists in Redis', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted('revoked-jti');
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('bl:revoked-jti');
    });

    it('should return false if jti does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted('valid-jti');
      expect(result).toBe(false);
    });

    it('should throw UnauthorizedException on Redis failure (fail-closed)', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      await expect(service.isBlacklisted('jti-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('blacklistAllForUser & isUserBlacklisted', () => {
    it('should record user session revocation timestamp', async () => {
      await service.blacklistAllForUser('user-1', 900);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'bl:user:user-1',
        expect.any(String),
        'EX',
        900,
      );
    });

    it('should identify token issued before revocation timestamp as blacklisted', async () => {
      const nowMs = Date.now();
      mockRedis.get.mockResolvedValue(nowMs.toString());

      const tokenIssuedAtSec = Math.floor((nowMs - 5000) / 1000); // 5 seconds before revocation
      const isRevoked = await service.isUserBlacklisted('user-1', tokenIssuedAtSec);

      expect(isRevoked).toBe(true);
    });

    it('should identify token issued after revocation timestamp as valid', async () => {
      const nowMs = Date.now();
      mockRedis.get.mockResolvedValue(nowMs.toString());

      const tokenIssuedAtSec = Math.floor((nowMs + 5000) / 1000); // 5 seconds after revocation
      const isRevoked = await service.isUserBlacklisted('user-1', tokenIssuedAtSec);

      expect(isRevoked).toBe(false);
    });
  });
});
