import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TokenBlacklistService } from '../token-blacklist.service';

interface JwtPayload {
  sub: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  emailVerified?: boolean;
  jti?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly blacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          return (
            req?.signedCookies?.__session || req?.cookies?.__session || null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Called after the JWT is successfully verified.
   * The return value is attached to req.user.
   */
  async validate(payload: JwtPayload) {
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token: missing identifier.');
    }
    if (!payload.iat) {
      throw new UnauthorizedException('Invalid token: missing issued at timestamp.');
    }

    const isTokenBlacklisted = await this.blacklistService.isBlacklisted(payload.jti);
    if (isTokenBlacklisted) {
      throw new UnauthorizedException('Token has been blacklisted.');
    }

    const isUserBlacklisted = await this.blacklistService.isUserBlacklisted(payload.sub, payload.iat);
    if (isUserBlacklisted) {
      throw new UnauthorizedException('User has been logged out from all devices.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.username,
      emailVerified: payload.emailVerified,
    };
  }
}
