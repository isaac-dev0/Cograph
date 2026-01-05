import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { SyncRepositoriesService } from './sync-repositories.service';
import { RepositoriesResolver } from './repositories.resolver';

@Module({
  providers: [
    RepositoriesService,
    SyncRepositoriesService,
    RepositoriesResolver,
  ],
  exports: [RepositoriesService, SyncRepositoriesService],
})
export class RepositoriesModule {}
