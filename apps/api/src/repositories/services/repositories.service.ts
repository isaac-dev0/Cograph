import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Repository } from '../models/repository.model';
import { ImportRepositoryInput } from '../dto/import-repository.input';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Imports or updates a single repository in the database.
   * Uses upsert operation to create if not exists, or update if exists (based on githubId).
   *
   * @param {ImportRepositoryInput} input - Repository data to import or update
   * @returns {Promise<Repository>} The imported or updated repository
   * @throws {Error} If database operation fails
   */
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

  /**
   * Imports multiple repositories in bulk.
   * Processes each repository individually and continues even if some fail.
   * Errors are logged but do not stop the bulk import process.
   *
   * @param {ImportRepositoryInput[]} inputs - Array of repository data to import
   * @returns {Promise<void>}
   */
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

  /**
   * Finds all repositories with optional filtering.
   * Results are ordered by GitHub updated date (most recent first).
   * Includes the most recent sync history entry for each repository.
   *
   * @param {Object} [options] - Optional filter parameters
   * @param {boolean} [options.includeArchived] - If false, excludes archived repositories
   * @param {boolean} [options.includePrivate] - If false, excludes private repositories
   * @param {string} [options.owner] - Filter by owner login (e.g., "username" or "org-name")
   * @returns {Promise<Repository[]>} Array of repositories matching the criteria
   */
  async findAll(options?: {
    includeArchived?: boolean;
    includePrivate?: boolean;
    owner?: string;
    projectId?: string;
  }) {
    return this.prisma.repository.findMany({
      where: {
        ...(options?.includeArchived === false && { isArchived: false }),
        ...(options?.includePrivate === false && { isPrivate: false }),
        ...(options?.owner && { ownerLogin: options.owner }),
        ...(options?.projectId && {
          projects: {
            some: {
              projectId: options.projectId,
            },
          },
        }),
      },
      orderBy: { githubUpdatedAt: 'desc' },
      include: {
        syncHistory: {
          take: 1,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Finds all repositories associated with a specific project.
   *
   * @param {string} projectId - The UUID of the project
   * @param {Object} [options] - Optional filter parameters
   * @param {boolean} [options.includeArchived] - If false, excludes archived repositories
   * @param {boolean} [options.includePrivate] - If false, excludes private repositories
   * @returns {Promise<Repository[]>} Array of repositories for the project
   */
  async findByProjectId(
    projectId: string,
    options?: {
      includeArchived?: boolean;
      includePrivate?: boolean;
    },
  ) {
    return this.prisma.repository.findMany({
      where: {
        projects: {
          some: {
            projectId,
          },
        },
        ...(options?.includeArchived === false && { isArchived: false }),
        ...(options?.includePrivate === false && { isPrivate: false }),
      },
      orderBy: { githubUpdatedAt: 'desc' },
      include: {
        syncHistory: {
          take: 1,
          orderBy: { syncStartedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Adds one or more repositories to a project.
   *
   * @param {string} projectId - The UUID of the project
   * @param {string[]} repositoryIds - Array of repository UUIDs to add
   * @returns {Promise<void>}
   */
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

  /**
   * Removes a repository from a project.
   *
   * @param {string} projectId - The UUID of the project
   * @param {string} repositoryId - The UUID of the repository to remove
   * @returns {Promise<void>}
   */
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

  /**
   * Finds a repository by its GitHub ID.
   * Includes up to 5 most recent sync history entries.
   *
   * @param {number} githubId - The GitHub repository ID
   * @returns {Promise<Repository | null>} The repository if found, null otherwise
   */
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

  /**
   * Finds a repository by its full name (e.g., "owner/repo").
   * Includes up to 5 most recent sync history entries.
   *
   * @param {string} fullName - The full repository name in format "owner/repo"
   * @returns {Promise<Repository | null>} The repository if found, null otherwise
   */
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
   * Finds repositories that need to be synced (stale repositories).
   * A repository is considered stale if:
   * - It hasn't been synced in the specified number of hours
   * - It has never been synced (lastSyncedAt is null)
   * - The last sync failed (syncStatus is FAILED)
   *
   * Only returns active (non-archived, non-disabled) repositories.
   *
   * @param {number} [hoursOld=24] - Number of hours to consider a repository stale
   * @returns {Promise<Repository[]>} Array of stale repositories that need syncing
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

  /**
   * Starts a sync operation for a repository.
   * Creates a sync history entry and updates the repository status to SYNCING.
   *
   * @param {string} repositoryId - The UUID of the repository to sync
   * @returns {Promise<RepositorySyncHistory>} The created sync history entry
   * @throws {Error} If repository is not found or database operation fails
   */
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

  /**
   * Marks a sync operation as completed successfully.
   * Updates the sync history with completion time, status, and metrics.
   * Updates the repository status to SYNCED and clears any previous sync errors.
   *
   * @param {string} repositoryId - The UUID of the repository that was synced
   * @param {string} syncHistoryId - The UUID of the sync history entry
   * @param {number} filesProcessed - Number of files processed during the sync
   * @returns {Promise<void>}
   * @throws {Error} If sync history or repository is not found
   */
  async completeSync(
    repositoryId: string,
    syncHistoryId: string,
    filesProcessed: number,
  ) {
    const syncHistory = await this.prisma.repositorySyncHistory.findUnique({
      where: { id: syncHistoryId },
    });

    const duration = syncHistory
      ? Date.now() - syncHistory.syncStartedAt.getTime()
      : null;

    await this.prisma.repositorySyncHistory.update({
      where: { id: syncHistoryId },
      data: {
        syncCompletedAt: new Date(),
        status: SyncStatus.SYNCED,
        filesProcessed,
        duration,
      },
    });

    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        syncStatus: SyncStatus.SYNCED,
        lastSyncedAt: new Date(),
        syncError: null,
      },
    });
  }

  /**
   * Marks a sync operation as failed.
   * Updates the sync history with error information and completion time.
   * Updates the repository status to FAILED and stores the error message.
   *
   * @param {string} repositoryId - The UUID of the repository that failed to sync
   * @param {string} syncHistoryId - The UUID of the sync history entry
   * @param {string} error - Error message describing why the sync failed
   * @returns {Promise<void>}
   * @throws {Error} If sync history or repository is not found
   */
  async failSync(repositoryId: string, syncHistoryId: string, error: string) {
    const syncHistory = await this.prisma.repositorySyncHistory.findUnique({
      where: { id: syncHistoryId },
    });

    const duration = syncHistory
      ? Date.now() - syncHistory.syncStartedAt.getTime()
      : null;

    await this.prisma.repositorySyncHistory.update({
      where: { id: syncHistoryId },
      data: {
        syncCompletedAt: new Date(),
        status: SyncStatus.FAILED,
        error,
        duration,
      },
    });

    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        syncStatus: SyncStatus.FAILED,
        syncError: error,
      },
    });
  }

  /**
   * Archives a repository (soft delete).
   * Sets isArchived to true and records the archive timestamp.
   * Archived repositories are typically excluded from active queries.
   *
   * @param {string} repositoryId - The UUID of the repository to archive
   * @returns {Promise<Repository>} The archived repository
   * @throws {Error} If repository is not found
   */
  async archiveRepository(repositoryId: string) {
    return this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Retrieves synchronisation statistics for all repositories.
   * Returns counts of repositories by their sync status.
   *
   * @returns {Promise<Object>} Object containing sync statistics
   * @returns {number} returns.total - Total number of repositories
   * @returns {number} returns.synced - Number of successfully synced repositories
   * @returns {number} returns.pending - Number of repositories pending sync
   * @returns {number} returns.syncing - Number of repositories currently syncing
   * @returns {number} returns.failed - Number of repositories with failed syncs
   */
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
