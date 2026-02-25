import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profiles.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';

const mockPrismaService = {
  profile: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const baseProfile = {
  id: 'profile-1',
  userId: 'supabase-uid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: DEFAULT_AVATAR_URL,
  job: null,
  location: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncProfile', () => {
    it('throws BadRequestException when userId is missing', async () => {
      await expect(
        service.syncProfile({ userId: '', email: 'alice@example.com', displayName: 'Alice' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts the profile using the correct create payload including the default avatar', async () => {
      mockPrismaService.profile.upsert.mockResolvedValue(baseProfile);

      const result = await service.syncProfile({
        userId: 'supabase-uid-1',
        email: 'alice@example.com',
        displayName: 'Alice',
      });

      expect(mockPrismaService.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'supabase-uid-1' },
          update: expect.objectContaining({ email: 'alice@example.com', displayName: 'Alice' }),
          create: expect.objectContaining({ avatarUrl: DEFAULT_AVATAR_URL }),
        }),
      );
      expect(result.id).toBe('profile-1');
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when no profile matches the internal ID', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the profile when it exists', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(baseProfile);

      const result = await service.findById('profile-1');

      expect(result.id).toBe('profile-1');
    });
  });

  describe('findByUserId', () => {
    it('throws NotFoundException when no profile matches the Supabase UID', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      await expect(service.findByUserId('unknown-uid')).rejects.toThrow(NotFoundException);
    });

    it('returns the profile when a matching Supabase UID is found', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(baseProfile);

      const result = await service.findByUserId('supabase-uid-1');

      expect(result.userId).toBe('supabase-uid-1');
    });
  });

  describe('findAll', () => {
    it('returns profiles ordered alphabetically by display name', async () => {
      mockPrismaService.profile.findMany.mockResolvedValue([baseProfile]);

      await service.findAll();

      expect(mockPrismaService.profile.findMany).toHaveBeenCalledWith({
        orderBy: { displayName: 'asc' },
      });
    });
  });

  describe('searchByEmail', () => {
    it('trims whitespace and lowercases the query before searching', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(baseProfile);

      await service.searchByEmail('  Alice@Example.COM  ');

      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
    });

    it('returns null when no profile matches the email', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      const result = await service.searchByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when Prisma returns a P2025 record-not-found error', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockPrismaService.profile.update.mockRejectedValue(prismaError);

      await expect(service.update('missing', { job: 'Engineer' })).rejects.toThrow(NotFoundException);
    });

    it('rethrows unexpected errors that are not P2025', async () => {
      mockPrismaService.profile.update.mockRejectedValue(new Error('Connection refused'));

      await expect(service.update('profile-1', { job: 'Engineer' })).rejects.toThrow(
        'Connection refused',
      );
    });

    it('returns the updated profile on success', async () => {
      mockPrismaService.profile.update.mockResolvedValue({ ...baseProfile, job: 'Engineer' });

      const result = await service.update('profile-1', { job: 'Engineer' });

      expect(result.job).toBe('Engineer');
    });
  });
});
