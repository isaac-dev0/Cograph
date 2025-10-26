import { Injectable } from '@nestjs/common';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';
import { RepositoryEntity } from './entities/repository.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RepositoryService {
  constructor(
    @InjectRepository(RepositoryEntity)
    private readonly repositoryRepo: Repository<RepositoryEntity>
  ) {}

  async create(dto: CreateRepositoryDto): Promise<RepositoryEntity> {
    const repository = await this.repositoryRepo.create(dto);
    return this.repositoryRepo.save(repository);
  }

  findAll(): Promise<RepositoryEntity[]> {
    return this.repositoryRepo.find();
  }

  findOne(id: string): Promise<RepositoryEntity | null> {
    return this.repositoryRepo.findOneBy({ id });
  }

  async update(id: string, dto: UpdateRepositoryDto): Promise<RepositoryEntity | null> {
    const repository = await this.repositoryRepo.findOneBy({ id });
    if (!repository) return null;
    Object.assign(repository, dto);
    return this.repositoryRepo.save(repository);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repositoryRepo.delete(id);
    return result.affected !== 0;
  }
}
