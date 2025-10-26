import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { RepositoryService } from './repository.service';
import { RepositoryEntity } from './entities/repository.entity';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';

@Resolver(() => RepositoryEntity)
export class RepositoryResolver {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Mutation(() => RepositoryEntity)
  createRepository(@Args('input') input: CreateRepositoryDto) {
    return this.repositoryService.create(input);
  }

  @Query(() => [RepositoryEntity])
  repositories() {
    return this.repositoryService.findAll();
  }

  @Query(() => RepositoryEntity, { nullable: true })
  repository(@Args('id', { type: () => String }) id: string) {
    return this.repositoryService.findOne(id);
  }

  @Mutation(() => RepositoryEntity, { nullable: true })
  updateRepository(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateRepositoryDto
  ) {
    return this.repositoryService.update(id, input);
  }

  @Mutation(() => Boolean)
  removeRepository(@Args('id', { type: () => String }) id: string) {
    return this.repositoryService.remove(id);
  }
}
