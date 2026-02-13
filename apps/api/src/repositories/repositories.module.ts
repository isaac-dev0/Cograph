import { Module } from '@nestjs/common';
import { RepositoriesService } from './services/repositories.service';
import { RepositoryFileService } from './services/repository-file.service';
import { SyncRepositoriesService } from './services/sync-repositories.service';
import { AnnotationsService } from './services/annotations.service';
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
