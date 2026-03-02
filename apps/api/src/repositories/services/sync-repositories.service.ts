import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { ImportRepositoryInput } from '../dto/import-repository.input';

// @octokit/rest is ESM-only; dynamic import via Function constructor bypasses the CJS static analyser.
const importEsm = (specifier: string) =>
  new Function('specifier', 'return import(specifier)')(specifier);

interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  description: string | null;
  visibility?: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  owner: { avatar_url: string; login: string; type: string };
  archived: boolean;
  disabled: boolean;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
}

@Injectable()
export class SyncRepositoriesService {
  private readonly logger = new Logger(SyncRepositoriesService.name);

  constructor(private repositoriesService: RepositoriesService) { }

  private toImportInput(repository: GitHubRepo): ImportRepositoryInput {
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
      githubCreatedAt: new Date(repository.created_at ?? Date.now()),
      githubUpdatedAt: new Date(repository.updated_at ?? Date.now()),
      githubPushedAt: new Date(repository.pushed_at ?? Date.now()),
    }
  }

  async fetchRepositories(token: string): Promise<ImportRepositoryInput[]> {
    if (!token) {
      this.logger.error('Token is undefined or null.');
      throw new BadRequestException('GitHub token is required but was not provided.');
    }

    const { Octokit } = await importEsm('@octokit/rest');
    const octokit = new Octokit({ auth: token });
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
          repositories.push(this.toImportInput(repository));
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
