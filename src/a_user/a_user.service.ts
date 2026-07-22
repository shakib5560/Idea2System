import { Inject, Injectable } from '@nestjs/common';
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

  /**
   * Cached lookup for user by ID (~5 min TTL).
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) {
      // 5 minutes (300,000 ms)
      await this.cacheManager.set(cacheKey, user, 300000);
    }

    return user;
  }

  create(data: {
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
    passwordHash?: string | null;
    emailVerifiedAt?: Date | null;
  }) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UserUpdateData) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });
    // Invalidate cached user on update
    await this.cacheManager.del(`user:${id}`);
    return updatedUser;
  }
}