import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { Octokit } from '@octokit/rest';
import { ImportRepositoryInput } from './dto/import-repository.input';

/**
 * Service responsible for synchronising repositories from GitHub.
 * Handles fetching repository data from GitHub API and transforming it for database import.
 *
 * @class SyncRepositoriesService
 */
@Injectable()
export class SyncRepositoriesService {
  private readonly logger = new Logger(SyncRepositoriesService.name);

  constructor(private repositoriesService: RepositoriesService) { }

  /**
   * Creates an authenticated Octokit client instance.
   *
   * @private
   * @param {string} token - GitHub personal access token or OAuth token
   * @returns {Octokit} Authenticated Octokit client
   */
  private createOctokitClient(token: string): Octokit {
    return new Octokit({
      auth: token,
    });
  }

  /**
   * Transforms a GitHub API repository response into ImportRepositoryInput format.
   * Maps GitHub API field names to database field names and handles data normalisation.
   *
   * @private
   * @param {any} repository - Raw repository object from GitHub API
   * @returns {ImportRepositoryInput} Transformed repository data ready for import
   */
  private transformGitHubRepository(repository: any): ImportRepositoryInput {
    return {
      githubId: repository.id,
      nodeId: repository.node_id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description || null,
      visibility: repository.visibility || (repository.private ? 'private' : 'public'),
      repositoryUrl: repository.html_url,
      defaultBranch: repository.default_branch || 'main',
      icon: repository.owner.avatar_url || null,
      ownerLogin: repository.owner.login,
      ownerType: repository.owner.type === 'Organization' ? 'Organization' : 'User',
      ownerAvatarUrl: repository.owner.avatar_url,
      isArchived: repository.archived || false,
      isDisabled: repository.disabled || false,
      isPrivate: repository.private,
      githubCreatedAt: new Date(repository.created_at),
      githubUpdatedAt: new Date(repository.updated_at),
      githubPushedAt: new Date(repository.pushed_at),
    }
  }

  /**
   * Fetches all repositories for the authenticated user from GitHub API.
   * Retrieves up to 100 repositories sorted by most recently updated.
   * Note: GitHub API pagination is not currently implemented - only first page is fetched.
   *
   * @param {string} token - GitHub personal access token or OAuth token
   * @returns {Promise<ImportRepositoryInput[]>} Array of transformed repository data
   * @throws {Error} If GitHub API request fails or token is invalid
   */
  async fetchRepositories(token: string): Promise<ImportRepositoryInput[]> {
    if (!token) {
      this.logger.error('Token is undefined or null!');
      throw new BadRequestException('GitHub token is required but was not provided');
    }

    const octokit = this.createOctokitClient(token);
    const repositories: ImportRepositoryInput[] = [];

    try {
      this.logger.log('Fetching repositories from GitHub');

      let page = 1;
      while (true) {
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
          per_page: 100,
          page,
          sort: 'updated',
        });

        for (const repository of data) {
          repositories.push(this.transformGitHubRepository(repository));
        }

        if (data.length < 100) break;
        page++;
      }

      this.logger.log(`Fetched ${repositories.length} repositories from GitHub.`);
      return repositories;
    } catch (error) {
      this.logger.error('Failed to fetch repositories from GitHub', {
        type: error.constructor.name,
        message: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  /**
   * Synchronises repositories from GitHub to the database.
   * Fetches repositories from GitHub API and imports them using bulk import.
   * This is the main entry point for syncing repositories.
   *
   * @param {string} token - GitHub personal access token or OAuth token
   * @returns {Promise<void>}
   * @throws {Error} If GitHub API request fails or import process fails
   */
  async syncRepository(token: string): Promise<void> {
    this.logger.log(`Syncing repository from GitHub...`);

    const repositories = await this.fetchRepositories(token);

    if (repositories.length > 0) {
      await this.repositoriesService.bulkImport(repositories);
      this.logger.log(`Successfully synced ${repositories.length} repositories.`);
    } else {
      this.logger.warn(`No repositories found to sync.`);
    }
  }
}
