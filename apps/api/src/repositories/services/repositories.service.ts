import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Repository } from '../models/repository.model';
import { ImportRepositoryInput } from '../dto/import-repository.input';
import { Prisma, SyncStatus } from '@prisma/client';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async import(input: ImportRepositoryInput): Promise<Repository> {
    return this.prisma.repository.upsert({
      where: { githubId: input.githubId },
      update: {
        nodeId: input.nodeId,
        name: input.name,
        fullName: input.fullName,
        description: input.description,
        visibility: input.visibility.toLowerCase(),
        repositoryUrl: input.repositoryUrl,
        defaultBranch: input.defaultBranch,
        icon: input.icon,
        ownerLogin: input.ownerLogin,
        ownerType: input.ownerType.includes('/orgs/') ? 'Organization' : 'User',
        ownerAvatarUrl: input.ownerAvatarUrl,
        isPrivate: input.isPrivate,
        isArchived: input.isArchived,
        isDisabled: input.isDisabled,
        githubCreatedAt: input.githubCreatedAt,
        githubUpdatedAt: input.githubUpdatedAt,
        githubPushedAt: input.githubPushedAt,
        lastSyncedAt: new Date(),
        syncStatus: SyncStatus.SYNCED,
        syncError: null,
      },
      create: {
        githubId: input.githubId,
        nodeId: input.nodeId,
        name: input.name,
        fullName: input.fullName,
        description: input.description,
        visibility: input.visibility.toLowerCase(),
        repositoryUrl: input.repositoryUrl,
        defaultBranch: input.defaultBranch,
        icon: input.icon,
        ownerLogin: input.ownerLogin,
        ownerType: input.ownerType.includes('/orgs/') ? 'Organization' : 'User',
        ownerAvatarUrl: input.ownerAvatarUrl,
        isPrivate: input.isPrivate,
        isArchived: input.isArchived,
        isDisabled: input.isDisabled,
        githubCreatedAt: input.githubCreatedAt,
        githubUpdatedAt: input.githubUpdatedAt,
        githubPushedAt: input.githubPushedAt,
        lastSyncedAt: new Date(),
        syncStatus: SyncStatus.SYNCED,
      },
    });
  }

  async bulkImport(inputs: ImportRepositoryInput[]): Promise<void> {
    this.logger.log(`Bulk importing ${inputs.length} repositories.`);

    const results = await Promise.allSettled(
      inputs.map((input) => this.import(input)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to import ${inputs[index].fullName}: ${result.reason?.message ?? result.reason}`,
        );
      }
    });

    this.logger.log('Bulk import completed.');
  }

  async findAll(options?: {
    includeArchived?: boolean;
    includePrivate?: boolean;
    owner?: string;
    projectId?: string;
  }) {
    const where: Prisma.RepositoryWhereInput = {};
    if (options?.includeArchived === false) where.isArchived = false;
    if (options?.includePrivate === false) where.isPrivate = false;
    if (options?.owner) where.ownerLogin = options.owner;
    if (options?.projectId) where.projects = { some: { projectId: options.projectId } };

    return this.prisma.repository.findMany({
      where,
      orderBy: { githubUpdatedAt: 'desc' },
      include: {
        syncHistory: {
          take: 1,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  async findByProjectId(
    projectId: string,
    options?: {
      includeArchived?: boolean;
      includePrivate?: boolean;
    },
  ) {
    const where: Prisma.RepositoryWhereInput = { projects: { some: { projectId } } };
    if (options?.includeArchived === false) where.isArchived = false;
    if (options?.includePrivate === false) where.isPrivate = false;

    return this.prisma.repository.findMany({
      where,
      orderBy: { githubUpdatedAt: 'desc' },
      include: {
        syncHistory: {
          take: 1,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  async addRepositoriesToProject(
    projectId: string,
    repositoryIds: string[],
  ): Promise<void> {
    const existing = await this.prisma.projectRepository.findMany({
      where: {
        projectId,
        repositoryId: { in: repositoryIds },
      },
      select: { repositoryId: true },
    });

    const newIds = repositoryIds.filter(
      (id) => !existing.some((project) => project.repositoryId === id),
    );

    if (newIds.length > 0) {
      await this.prisma.projectRepository.createMany({
        data: newIds.map((repositoryId) => ({
          projectId,
          repositoryId,
        })),
      });

      this.logger.log(
        `Added ${newIds.length} repository(ies) to project ${projectId}`,
      );
    }
  }

  async removeRepositoryFromProject(
    projectId: string,
    repositoryId: string,
  ): Promise<void> {
    await this.prisma.projectRepository.delete({
      where: {
        projectId_repositoryId: {
          projectId,
          repositoryId,
        },
      },
    });

    this.logger.log(
      `Removed repository ${repositoryId} from project ${projectId}`,
    );
  }

  async findByGithubId(githubId: number) {
    return this.prisma.repository.findUnique({
      where: { githubId },
      include: {
        syncHistory: {
          take: 5,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  async findByFullName(fullName: string) {
    return this.prisma.repository.findFirst({
      where: { fullName },
      include: {
        syncHistory: {
          take: 5,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Stale = not synced within `hoursOld` hours, never synced, or last sync failed.
   * Only returns active (non-archived, non-disabled) repositories.
   */
  async findStaleRepositories(hoursOld: number = 24) {
    const staleDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

    return this.prisma.repository.findMany({
      where: {
        isArchived: false,
        isDisabled: false,
        OR: [
          { lastSyncedAt: { lt: staleDate } },
          { lastSyncedAt: null },
          { syncStatus: SyncStatus.FAILED },
        ],
      },
      orderBy: { githubUpdatedAt: 'desc' },
    });
  }

  async startSync(repositoryId: string) {
    const syncHistory = await this.prisma.repositorySyncHistory.create({
      data: {
        repositoryId,
        syncStartedAt: new Date(),
        status: SyncStatus.SYNCING,
      },
    });

    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { syncStatus: SyncStatus.SYNCING },
    });

    return syncHistory;
  }

  async completeSync(
    repositoryId: string,
    syncHistoryId: string,
    filesProcessed: number,
  ) {
    await this.finishSync(repositoryId, syncHistoryId, {
      status: SyncStatus.SYNCED,
      filesProcessed,
    });
  }

  async failSync(repositoryId: string, syncHistoryId: string, error: string) {
    await this.finishSync(repositoryId, syncHistoryId, {
      status: SyncStatus.FAILED,
      error,
    });
  }

  private async finishSync(
    repositoryId: string,
    syncHistoryId: string,
    outcome:
      | { status: typeof SyncStatus.SYNCED; filesProcessed: number }
      | { status: typeof SyncStatus.FAILED; error: string },
  ): Promise<void> {
    const history = await this.prisma.repositorySyncHistory.findUnique({
      where: { id: syncHistoryId },
    });

    const duration = history
      ? Date.now() - history.syncStartedAt.getTime()
      : null;

    if (outcome.status === SyncStatus.SYNCED) {
      await this.prisma.repositorySyncHistory.update({
        where: { id: syncHistoryId },
        data: {
          syncCompletedAt: new Date(),
          status: SyncStatus.SYNCED,
          filesProcessed: outcome.filesProcessed,
          duration,
        },
      });
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { syncStatus: SyncStatus.SYNCED, lastSyncedAt: new Date(), syncError: null },
      });
    } else {
      await this.prisma.repositorySyncHistory.update({
        where: { id: syncHistoryId },
        data: {
          syncCompletedAt: new Date(),
          status: SyncStatus.FAILED,
          error: outcome.error,
          duration,
        },
      });
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { syncStatus: SyncStatus.FAILED, syncError: outcome.error },
      });
    }
  }

  async archiveRepository(repositoryId: string) {
    return this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async getSyncStats() {
    const rows = await this.prisma.repository.groupBy({
      by: ['syncStatus'],
      _count: { _all: true },
    });

    const counts = Object.fromEntries(
      rows.map((row) => [row.syncStatus, row._count._all]),
    );

    return {
      total: rows.reduce((sum, row) => sum + row._count._all, 0),
      synced: counts[SyncStatus.SYNCED] ?? 0,
      pending: counts[SyncStatus.PENDING] ?? 0,
      syncing: counts[SyncStatus.SYNCING] ?? 0,
      failed: counts[SyncStatus.FAILED] ?? 0,
    };
  }
}
