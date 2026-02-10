import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsLoaders } from './projects.loaders';

@Module({
  providers: [ProjectsResolver, ProjectsService, ProjectsLoaders],
})
export class ProjectsModule {}
