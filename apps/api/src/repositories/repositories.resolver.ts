import { UseGuards } from '@nestjs/common';
import { RepositoriesService } from './services/repositories.service';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SyncRepositoriesService } from './services/sync-repositories.service';
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

  @Query(() => [RepositoryModel], { name: 'findAllRepositories' })
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

  @Query(() => RepositoryModel, { name: 'findRepositoryByGithubId', nullable: true })
  async findByGithubId(
    @Args('githubId', { type: () => Int }) githubId: number,
  ) {
    return this.repositoriesService.findByGithubId(githubId);
  }

  @Query(() => RepositoryModel, { name: 'findRepositoryByFullName', nullable: true })
  async findByFullName(
    @Args('fullName', { type: () => String }) fullName: string,
  ) {
    return this.repositoriesService.findByFullName(fullName);
  }

  @Mutation(() => Boolean, { name: 'syncRepositoriesFromGitHub' })
  async syncFromGitHub(
    @Args('input', { type: () => SyncRepositoriesInput })
    input: SyncRepositoriesInput,
  ) {
    await this.syncRepositoriesService.syncRepository(input.githubToken);
    return true;
  }

  @Mutation(() => RepositoryModel, { name: 'archiveRepository' })
  async archive(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ) {
    return this.repositoriesService.archiveRepository(repositoryId);
  }

}
