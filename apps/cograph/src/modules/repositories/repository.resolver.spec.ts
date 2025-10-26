import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryResolver } from './repository.resolver';
import { RepositoryService } from './repository.service';

describe('RepositoryResolver', () => {
  let resolver: RepositoryResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryResolver, RepositoryService],
    }).compile();

    resolver = module.get<RepositoryResolver>(RepositoryResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
