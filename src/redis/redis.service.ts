import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('REDIS_HOST');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD');
    const tls = configService.get<string>('REDIS_TLS') === 'true';

    super({
      host,
      port,
      password,
      ...(tls ? { tls: {} } : {}),
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });
  }

  async onModuleInit() {
    this.on('connect', () => this.logger.log('Redis connected'));
    this.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  async pingCheck(): Promise<boolean> {
    try {
      const res = await this.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.quit();
    this.logger.log('Redis disconnected');
  }
}
