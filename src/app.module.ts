import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AUserModule } from './a_user/a_user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    /**
     * ConfigModule – loads the .env file and makes ConfigService available
     * globally across all modules without needing to re-import it.
     */
    ConfigModule.forRoot({
      isGlobal: true,   // no need to import ConfigModule in child modules
      envFilePath: '.env',
    }),

    /**
     * Global CacheModule powered by Upstash Redis via cache-manager-ioredis-yet
     */
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');
        const tls = config.get<string>('REDIS_TLS') === 'true';

        const store = await redisStore({
          host,
          port,
          password,
          ...(tls ? { tls: {} } : {}),
          keyPrefix: 'cache:',
          ttl: 300 * 1000, // 5 minutes default TTL in milliseconds
        });

        return { store };
      },
    }),

    AuthModule,
    AUserModule,
    PrismaModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController],
  // Only services/providers belong here — modules must never be listed in providers[]
  providers: [AppService],
})
export class AppModule {}
