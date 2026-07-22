import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TokenBlacklistService } from '../token-blacklist.service';

export interface JwtPayload {
  jti?: string;
  sub: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          return req?.signedCookies?.__session || req?.cookies?.__session || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Called after the JWT is successfully verified.
   * Checks blacklist and attaches payload details to req.user.
   */
  async validate(payload: JwtPayload) {
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    if (payload.sub && payload.iat) {
      const isUserBlacklisted =
        await this.tokenBlacklistService.isUserBlacklisted(
          payload.sub,
          payload.iat,
        );
      if (isUserBlacklisted) {
        throw new UnauthorizedException('Session has been revoked');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.username,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
