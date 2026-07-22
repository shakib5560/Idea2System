import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    try {
      await this.redisService.ping();
      return {
        status: 'ok',
        redis: 'up',
      };
    } catch (error) {
      return {
        status: 'error',
        redis: 'down',
        error: error.message,
      };
    }
  }
}
