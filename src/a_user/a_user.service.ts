import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

type UserUpdateData = Partial<{
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  username: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  emailVerificationSentAt: Date | null;
}>;

@Injectable()
export class AUserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    try {
      const cached = await this.cacheManager.get<User>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      // Fail-open: cache failures do not break database query
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (user) {
      try {
        await this.cacheManager.set(cacheKey, user, 300 * 1000); // 5 minutes in milliseconds
      } catch (err) {
        // Fail-open: cache write failure should not affect response
      }
    }
    return user;
  }

  findByVerificationToken(emailVerificationTokenHash: string) {
    return this.prisma.user.findUnique({
      where: { emailVerificationTokenHash },
    });
  }

  create(data: {
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
    passwordHash?: string | null;
    emailVerifiedAt?: Date | null;
    emailVerificationTokenHash?: string | null;
    emailVerificationExpiresAt?: Date | null;
    emailVerificationSentAt?: Date | null;
  }) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UserUpdateData) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    try {
      await this.cacheManager.del(`user:${id}`);
    } catch (err) {
      // Fail-open: cache deletion failures should not block updates
    }
    return user;
  }
}
