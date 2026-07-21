import {
  ConflictException,
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AUserService } from '../a_user/a_user.service';
import { RegisterDto } from './dto/create-auth.dto';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../common/mail/mail.service';

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  emailVerified?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AUserService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    if (dto.email) {
      const existingEmail = await this.users.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(
          'An account with that email already exists',
        );
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

    await this.issueEmailVerification(user);
    return {
      message:
        'Account created. Check your email to verify your address before signing in.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.users.findByVerificationToken(
      this.hashVerificationToken(token),
    );

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'This verification link is invalid or has expired.',
      );
    }

    await this.users.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
    });
    return {
      message: 'Your email address has been verified. You can now sign in.',
    };
  }

  async resendEmailVerification(email: string) {
    const user = await this.users.findByEmail(email);
    // Keep this response generic so the endpoint cannot enumerate accounts.
    if (!user || user.emailVerifiedAt || !user.email) {
      return {
        message:
          'If an unverified account exists, a verification email has been sent.',
      };
    }
    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Please wait a minute before requesting another verification email.',
      );
    }

    await this.issueEmailVerification(user);
    return {
      message:
        'If an unverified account exists, a verification email has been sent.',
    };
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
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Please verify your email address before signing in.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      emailVerified: !!user.emailVerifiedAt,
    };
  }

  // ─── Create JWT Token ─────────────────────────────────────────────────────
  createToken(user: AuthUser | User) {
    const emailVerified = 'emailVerifiedAt' in user
      ? !!user.emailVerifiedAt
      : !!(user as AuthUser).emailVerified;

    const payload = {
      sub: user.id,
      email: user.email,
      name: 'name' in user ? user.name : undefined,
      username: user.username,
      emailVerified,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: 'name' in user ? user.name : undefined,
        username: user.username,
        avatarUrl: 'avatarUrl' in user ? user.avatarUrl : undefined,
        emailVerified,
      },
    };
  }

  private async issueEmailVerification(user: User) {
    if (!user.email) return;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.users.update(user.id, {
      emailVerificationTokenHash: this.hashVerificationToken(otp),
      emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // OTP expires in 15 minutes
      emailVerificationSentAt: new Date(),
    });

    const apiUrl = this.config
      .get<string>('API_URL', 'http://localhost:5000')
      .replace(/\/$/, '');
    const verificationUrl = `${apiUrl}/api/v1.0/auth/verify-email?token=${encodeURIComponent(otp)}`;
    await this.mail.sendEmailVerification(user.email, otp, verificationUrl);
  }

  private hashVerificationToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
