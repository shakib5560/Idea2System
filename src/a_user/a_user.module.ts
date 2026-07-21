import { Module } from '@nestjs/common';
import { AUserService } from './a_user.service';
import { PrismaService } from '../prisma/prisma.service';

// users/users.module.ts
@Module({
  providers: [AUserService, PrismaService],
  exports: [AUserService],
})
export class AUserModule {}
