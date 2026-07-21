import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
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

  update(id: string, data: UserUpdateData) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
