import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Blacklists a single JTI until its natural expiration.
   * @param jti The unique token identifier
   * @param exp The expiration timestamp of the token (in seconds)
   */
  async blacklist(jti: string, exp: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl <= 0) {
      this.logger.debug(`Token ${jti} is already naturally expired. Skipping blacklist.`);
      return;
    }

    const client = this.redisService.getClient();
    // Use the bl: key prefix for blacklist keys
    await client.set(`bl:${jti}`, '1', 'EX', ttl);
    this.logger.log(`Blacklisted token jti: bl:${jti} with TTL: ${ttl}s`);
  }

  /**
   * Checks if a JTI has been blacklisted.
   * @param jti The unique token identifier
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.exists(`bl:${jti}`);
    return result > 0;
  }

  /**
   * Blacklists all tokens issued for a user before this point.
   * Useful for "log out everywhere" and password change events.
   * @param userId The ID of the user
   * @param ttlSeconds The lifetime of access tokens (in seconds) to keep the blacklist active
   */
  async blacklistAllForUser(userId: string, ttlSeconds: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const client = this.redisService.getClient();
    // Use the bl: key prefix for blacklist keys
    await client.set(`bl:u:${userId}`, now.toString(), 'EX', ttlSeconds);
    this.logger.log(`Blacklisted all tokens for user ${userId} issued before timestamp ${now} for ${ttlSeconds}s`);
  }

  /**
   * Checks if a user has invalidated all their tokens issued before the token's issued-at time.
   * @param userId The ID of the user
   * @param tokenIssuedAt The issued-at timestamp of the token (in seconds)
   */
  async isUserBlacklisted(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const client = this.redisService.getClient();
    const blacklistedAtStr = await client.get(`bl:u:${userId}`);
    if (!blacklistedAtStr) {
      return false;
    }

    const blacklistedAt = parseInt(blacklistedAtStr, 10);
    // If the token was issued before the "logout everywhere" command, it is blacklisted
    return tokenIssuedAt < blacklistedAt;
  }
}
