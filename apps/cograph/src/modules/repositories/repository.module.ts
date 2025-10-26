import { Module } from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { RepositoryResolver } from './repository.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoryEntity } from './entities/repository.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RepositoryEntity])],
  providers: [RepositoryResolver, RepositoryService],
  exports: [RepositoryService],
})
export class RepositoryModule {}
