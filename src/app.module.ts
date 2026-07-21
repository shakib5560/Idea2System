import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AUserModule } from './a_user/a_user.module';
import { PrismaModule } from './prisma/prisma.module';

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
    AuthModule,
    AUserModule,
    PrismaModule,
  ],
  controllers: [AppController],
  // Only services/providers belong here — modules must never be listed in providers[]
  providers: [AppService],
})
export class AppModule {}
