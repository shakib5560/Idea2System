import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX_JTI = 'bl:';
  private readonly PREFIX_USER = 'bl:user:';

  constructor(private readonly redis: RedisService) {}

  /**
   * Blacklist a specific token by its `jti` until its natural expiration time (`exp`).
   */
  async blacklist(jti: string, exp: number): Promise<void> {
    if (!jti) return;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, exp - nowInSeconds);

    try {
      await this.redis.set(`${this.PREFIX_JTI}${jti}`, 'revoked', 'EX', ttl);
    } catch (error: any) {
      this.logger.error(`Failed to blacklist token ${jti}`, error?.stack);
      throw new UnauthorizedException('Security check failed (Redis error)');
    }
  }

  /**
   * Check if a token's `jti` has been blacklisted.
   * Fail-closed strategy: Throws UnauthorizedException if Redis is down or errors.
   */
  async isBlacklisted(jti?: string): Promise<boolean> {
    if (!jti) return false;
    try {
      const exists = await this.redis.exists(`${this.PREFIX_JTI}${jti}`);
      return exists === 1;
    } catch (error: any) {
      this.logger.error(
        `Failed to check blacklist status for jti ${jti}`,
        error?.stack,
      );
      throw new UnauthorizedException('Security check failed (Redis error)');
    }
  }

  /**
   * Invalidate all existing tokens for a given user by recording a revocation timestamp.
   * Default TTL is 15 minutes (900 seconds), matching standard access token lifetime.
   */
  async blacklistAllForUser(
    userId: string,
    ttlSeconds: number = 900,
  ): Promise<void> {
    if (!userId) return;
    try {
      const revokedAt = Date.now().toString();
      await this.redis.set(
        `${this.PREFIX_USER}${userId}`,
        revokedAt,
        'EX',
        ttlSeconds,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to blacklist all tokens for user ${userId}`,
        error?.stack,
      );
      throw new UnauthorizedException('Security check failed (Redis error)');
    }
  }

  /**
   * Check if a user's tokens issued before a revocation timestamp are invalidated.
   * Fail-closed strategy: Throws UnauthorizedException if Redis is down or errors.
   */
  async isUserBlacklisted(
    userId: string,
    tokenIssuedAt?: number,
  ): Promise<boolean> {
    if (!userId || !tokenIssuedAt) return false;
    try {
      const revokedAtStr = await this.redis.get(`${this.PREFIX_USER}${userId}`);
      if (!revokedAtStr) return false;

      const revokedAtMs = parseInt(revokedAtStr, 10);
      const tokenIssuedAtMs = tokenIssuedAt * 1000;

      return tokenIssuedAtMs <= revokedAtMs;
    } catch (error: any) {
      this.logger.error(
        `Failed to check user blacklist for user ${userId}`,
        error?.stack,
      );
      throw new UnauthorizedException('Security check failed (Redis error)');
    }
  }
}
