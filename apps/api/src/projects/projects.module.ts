import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProfileDataLoader } from 'src/profiles/profile.data-loader';

@Module({
  imports: [ProfileDataLoader],
  providers: [ProjectsResolver, ProjectsService],
})
export class ProjectsModule {}
