import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AUserService } from '../a_user/a_user.service';
import { RegisterDto } from './dto/create-auth.dto';
import { User } from '@prisma/client';

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AUserService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    if (dto.email) {
      const existingEmail = await this.users.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('An account with that email already exists');
      }
    }

    if (dto.username) {
      const existingUsername = await this.users.findByUsername(dto.username);
      if (existingUsername) {
        throw new ConflictException('Username is already taken');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.users.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });

    return this.createToken({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    });
  }

  // ─── Validate Local (email/username + password) ───────────────────────────
  async validateLocalUser(
    identifier: string,
    password: string,
  ): Promise<AuthUser | null> {
    const user = await this.users.findByIdentifier(identifier);

    if (!user || !user.passwordHash) return null;

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    };
  }

  // ─── Create JWT Token ─────────────────────────────────────────────────────
  createToken(user: AuthUser | User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: 'name' in user ? user.name : undefined,
      username: user.username,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: 'name' in user ? user.name : undefined,
        username: user.username,
        avatarUrl: 'avatarUrl' in user ? user.avatarUrl : undefined,
      },
    };
  }
}
