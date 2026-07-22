import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  async check() {
    const isRedisHealthy = await this.redisService.pingCheck();

    const result = {
      status: isRedisHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        redis: isRedisHealthy ? 'up' : 'down',
      },
    };

    if (!isRedisHealthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
