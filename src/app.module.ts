import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AUserModule } from './a_user/a_user.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { RedisService } from './common/redis/redis.service';

@Module({
  imports: [
    /**
     * ConfigModule – loads the .env file and makes ConfigService available
     * globally across all modules without needing to re-import it.
     */
    ConfigModule.forRoot({
      isGlobal: true, // no need to import ConfigModule in child modules
      envFilePath: '.env',
    }),
    RedisModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: async (redisService: RedisService) => {
        const store = await redisStore({
          redisInstance: redisService.getClient(),
          ttl: 300 * 1000, // 5 minutes in milliseconds
          keyPrefix: 'cache:',
        });
        return { store };
      },
    }),
    AuthModule,
    AUserModule,
    PrismaModule,
  ],
  controllers: [AppController],
  // Only services/providers belong here — modules must never be listed in providers[]
  providers: [AppService],
})
export class AppModule {}
