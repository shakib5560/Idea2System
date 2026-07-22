import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUserModule } from '../a_user/a_user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CryptoModule } from '../common/crypto/crypto.module';
import { OAuthStateService } from './oauth/oauth-state.service';
import { OAuthProviderService } from './oauth/oauth-provider.service';
import { OAuthAccountRepository } from './oauth/oauth-account.repository';
import { OAuthService } from './oauth/oauth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MailModule } from '../common/mail/mail.module';

import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [
    AUserModule,
    PrismaModule,
    CryptoModule,
    MailModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    OAuthStateService,
    OAuthProviderService,
    OAuthAccountRepository,
    OAuthService,
    TokenBlacklistService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, OAuthService, TokenBlacklistService],
})
export class AuthModule {}
