import { Test, TestingModule } from '@nestjs/testing';
import { SyncStatus } from '@prisma/client';
import { RepositoriesService } from './services/repositories.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

const mockPrismaService = {
  repository: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  projectRepository: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
  repositorySyncHistory: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const baseImportInput = {
  githubId: 12345,
  nodeId: 'node-abc',
  name: 'my-repo',
  fullName: 'owner/my-repo',
  description: 'A test repo',
  visibility: 'Public',
  repositoryUrl: 'https://github.com/owner/my-repo',
  defaultBranch: 'main',
  icon: null,
  ownerLogin: 'owner',
  ownerType: 'https://api.github.com/users/owner',
  ownerAvatarUrl: 'https://avatars.githubusercontent.com/owner',
  isPrivate: false,
  isArchived: false,
  isDisabled: false,
  githubCreatedAt: new Date('2023-01-01T00:00:00Z'),
  githubUpdatedAt: new Date('2024-01-01T00:00:00Z'),
  githubPushedAt: new Date('2024-01-01T00:00:00Z'),
};

const baseRepository = {
  id: 'repo-1',
  githubId: 12345,
  name: 'my-repo',
  fullName: 'owner/my-repo',
  isPrivate: false,
  isArchived: false,
  isDisabled: false,
  syncStatus: SyncStatus.SYNCED,
  lastSyncedAt: new Date('2024-01-01T00:00:00Z'),
  syncError: null,
};

describe('RepositoriesService', () => {
  let service: RepositoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('import', () => {
    it('sets ownerType to Organization when the URL contains /orgs/', async () => {
      const orgInput = { ...baseImportInput, ownerType: 'https://api.github.com/orgs/my-org' };
      mockPrismaService.repository.upsert.mockResolvedValue({ ...baseRepository, ownerType: 'Organization' });

      await service.import(orgInput);

      expect(mockPrismaService.repository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ ownerType: 'Organization' }),
        }),
      );
    });

    it('sets ownerType to User when the URL does not contain /orgs/', async () => {
      mockPrismaService.repository.upsert.mockResolvedValue({ ...baseRepository, ownerType: 'User' });

      await service.import(baseImportInput);

      expect(mockPrismaService.repository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ ownerType: 'User' }),
        }),
      );
    });
  });

  describe('bulkImport', () => {
    it('continues processing when one import fails and does not throw', async () => {
      mockPrismaService.repository.upsert
        .mockResolvedValueOnce(baseRepository)
        .mockRejectedValueOnce(new Error('DB constraint violation'));

      const failingInput = { ...baseImportInput, githubId: 99999, fullName: 'owner/failing-repo' };

      await expect(service.bulkImport([baseImportInput, failingInput])).resolves.toBeUndefined();
      expect(mockPrismaService.repository.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('excludes archived repositories when includeArchived is false', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      await service.findAll({ includeArchived: false });

      expect(mockPrismaService.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isArchived: false }),
        }),
      );
    });

    it('does not include an isArchived filter when includeArchived is not specified', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      await service.findAll();

      const callArgs = mockPrismaService.repository.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('isArchived');
    });
  });

  describe('addRepositoriesToProject', () => {
    it('does not call createMany when all repositories are already linked to the project', async () => {
      mockPrismaService.projectRepository.findMany.mockResolvedValue([{ repositoryId: 'repo-1' }]);

      await service.addRepositoriesToProject('proj-1', ['repo-1']);

      expect(mockPrismaService.projectRepository.createMany).not.toHaveBeenCalled();
    });

    it('only creates links for repositories that are not already in the project', async () => {
      mockPrismaService.projectRepository.findMany.mockResolvedValue([{ repositoryId: 'repo-1' }]);

      await service.addRepositoriesToProject('proj-1', ['repo-1', 'repo-2']);

      expect(mockPrismaService.projectRepository.createMany).toHaveBeenCalledWith({
        data: [{ projectId: 'proj-1', repositoryId: 'repo-2' }],
      });
    });
  });

  describe('removeRepositoryFromProject', () => {
    it('deletes the project-repository link by composite key', async () => {
      mockPrismaService.projectRepository.delete.mockResolvedValue(undefined);

      await service.removeRepositoryFromProject('proj-1', 'repo-1');

      expect(mockPrismaService.projectRepository.delete).toHaveBeenCalledWith({
        where: { projectId_repositoryId: { projectId: 'proj-1', repositoryId: 'repo-1' } },
      });
    });
  });

  describe('findStaleRepositories', () => {
    it('uses a 24-hour cutoff by default', async () => {
      mockPrismaService.repository.findMany.mockResolvedValue([]);

      await service.findStaleRepositories();

      const callArgs = mockPrismaService.repository.findMany.mock.calls[0][0];
      const staleDate: Date = callArgs.where.OR[0].lastSyncedAt.lt;
      const expectedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      expect(Math.abs(staleDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
    });
  });

  describe('startSync', () => {
    it('creates a sync history entry and sets the repository status to SYNCING', async () => {
      const mockHistory = { id: 'hist-1', repositoryId: 'repo-1', status: SyncStatus.SYNCING };
      mockPrismaService.repositorySyncHistory.create.mockResolvedValue(mockHistory);
      mockPrismaService.repository.update.mockResolvedValue({});

      const result = await service.startSync('repo-1');

      expect(mockPrismaService.repositorySyncHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ repositoryId: 'repo-1', status: SyncStatus.SYNCING }),
        }),
      );
      expect(mockPrismaService.repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { syncStatus: SyncStatus.SYNCING } }),
      );
      expect(result.id).toBe('hist-1');
    });
  });

  describe('completeSync', () => {
    it('marks the sync history and repository as SYNCED and clears the error field', async () => {
      const startedAt = new Date(Date.now() - 5000);
      mockPrismaService.repositorySyncHistory.findUnique.mockResolvedValue({
        id: 'hist-1',
        syncStartedAt: startedAt,
      });
      mockPrismaService.repositorySyncHistory.update.mockResolvedValue({});
      mockPrismaService.repository.update.mockResolvedValue({});

      await service.completeSync('repo-1', 'hist-1', 42);

      expect(mockPrismaService.repositorySyncHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SyncStatus.SYNCED, filesProcessed: 42 }),
        }),
      );
      expect(mockPrismaService.repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncStatus: SyncStatus.SYNCED, syncError: null }),
        }),
      );
    });
  });

  describe('failSync', () => {
    it('records the error message on both the sync history entry and the repository', async () => {
      const startedAt = new Date(Date.now() - 3000);
      mockPrismaService.repositorySyncHistory.findUnique.mockResolvedValue({
        id: 'hist-1',
        syncStartedAt: startedAt,
      });
      mockPrismaService.repositorySyncHistory.update.mockResolvedValue({});
      mockPrismaService.repository.update.mockResolvedValue({});

      await service.failSync('repo-1', 'hist-1', 'Connection timeout');

      expect(mockPrismaService.repositorySyncHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SyncStatus.FAILED, error: 'Connection timeout' }),
        }),
      );
      expect(mockPrismaService.repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: SyncStatus.FAILED,
            syncError: 'Connection timeout',
          }),
        }),
      );
    });
  });

  describe('getSyncStats', () => {
    it('returns a totals object grouped by sync status with zero defaults for missing statuses', async () => {
      mockPrismaService.repository.groupBy.mockResolvedValue([
        { syncStatus: SyncStatus.SYNCED, _count: { _all: 10 } },
        { syncStatus: SyncStatus.FAILED, _count: { _all: 2 } },
      ]);

      const result = await service.getSyncStats();

      expect(result.total).toBe(12);
      expect(result.synced).toBe(10);
      expect(result.failed).toBe(2);
      expect(result.pending).toBe(0);
      expect(result.syncing).toBe(0);
    });
  });
});
