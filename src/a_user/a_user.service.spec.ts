import { Test, TestingModule } from '@nestjs/testing';
import { AUserService } from './a_user.service';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

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
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AUserService>(AUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
