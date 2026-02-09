import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoryFileService } from './repository-file.service';
import { SyncRepositoriesService } from './sync-repositories.service';
import { AnnotationsService } from './annotations.service';
import { RepositoriesResolver } from './repositories.resolver';

@Module({
  providers: [
    RepositoriesService,
    RepositoryFileService,
    SyncRepositoriesService,
    AnnotationsService,
    RepositoriesResolver,
  ],
  exports: [
    RepositoriesService,
    RepositoryFileService,
    SyncRepositoriesService,
    AnnotationsService,
  ],
})
export class RepositoriesModule {}
