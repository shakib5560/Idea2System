import { Test, TestingModule } from '@nestjs/testing';
import { AUserService } from './a_user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AUserService', () => {
  let service: AUserService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AUserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AUserService>(AUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
