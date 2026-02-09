import { UseGuards } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SyncRepositoriesService } from './sync-repositories.service';
import { Repository as RepositoryModel } from './models/repository.model';
import { FindRepositoriesInput } from './dto/find-repositories.input';
import { SyncRepositoriesInput } from './dto/sync-repositories.input';

@UseGuards(SupabaseJwtGuard)
@Resolver(() => RepositoryModel)
export class RepositoriesResolver {
  constructor(
    private readonly syncRepositoriesService: SyncRepositoriesService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  @Query(() => [RepositoryModel], {
    name: 'findRepositoriesByProjectId',
    description: 'Finds repositories associated with a specific project.',
  })
  async findByProjectId(
    @Args('projectId', { type: () => ID }) projectId: string,
  ) {
    return this.repositoriesService.findByProjectId(projectId, {
      includeArchived: false,
      includePrivate: true,
    });
  }

  @Query(() => [RepositoryModel], {
    name: 'findAllRepositories',
    description: 'Finds all repositories with optional filters.',
  })
  async findAll(
    @Args('options', { nullable: true, type: () => FindRepositoriesInput })
    options?: FindRepositoriesInput,
  ) {
    return this.repositoriesService.findAll({
      includeArchived: options?.includeArchived,
      includePrivate: options?.includePrivate,
      owner: options?.owner,
    });
  }

  @Query(() => RepositoryModel, {
    name: 'findRepositoryByGithubId',
    description: 'Finds a repository by its GitHub ID.',
    nullable: true,
  })
  async findByGithubId(
    @Args('githubId', { type: () => Int }) githubId: number,
  ) {
    return this.repositoriesService.findByGithubId(githubId);
  }

  @Query(() => RepositoryModel, {
    name: 'findRepositoryByFullName',
    description: 'Finds a repository by its full name (e.g., "owner/repo").',
    nullable: true,
  })
  async findByFullName(
    @Args('fullName', { type: () => String }) fullName: string,
  ) {
    return this.repositoriesService.findByFullName(fullName);
  }

  @Mutation(() => Boolean, {
    name: 'syncRepositoriesFromGitHub',
    description:
      'Fetches repositories from GitHub API and imports them into the database.',
  })
  async syncFromGitHub(
    @Args('input', { type: () => SyncRepositoriesInput })
    input: SyncRepositoriesInput,
  ) {
    await this.syncRepositoriesService.syncRepository(input.githubToken);
    return true;
  }

  @Mutation(() => RepositoryModel, {
    name: 'archiveRepository',
    description: 'Archives a repository (soft delete).',
  })
  async archive(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ) {
    return this.repositoriesService.archiveRepository(repositoryId);
  }

  @Mutation(() => Boolean, {
    name: 'addRepositoriesToProject',
    description: 'Adds one or more repositories to a project.',
  })
  async addRepositoriesToProject(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('repositoryIds', { type: () => [ID] }) repositoryIds: string[],
  ) {
    await this.repositoriesService.addRepositoriesToProject(
      projectId,
      repositoryIds,
    );
    return true;
  }

  @Mutation(() => Boolean, {
    name: 'removeRepositoryFromProject',
    description: 'Removes a repository from a project.',
  })
  async removeRepositoryFromProject(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ) {
    await this.repositoriesService.removeRepositoryFromProject(
      projectId,
      repositoryId,
    );
    return true;
  }
}
