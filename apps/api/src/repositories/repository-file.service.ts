import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RepositoryFileService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: { codeEntities: true },
    });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${id} not found`);
    }

    return file;
  }

  async findByRepositoryId(repositoryId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new NotFoundException(
        `Repository with id ${repositoryId} not found`,
      );
    }

    return this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: { codeEntities: true },
      orderBy: { filePath: 'asc' },
    });
  }

  async updateAnnotation(id: string, annotation: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${id} not found`);
    }

    return this.prisma.repositoryFile.update({
      where: { id },
      data: { annotations: annotation },
      include: { codeEntities: true },
    });
  }

  async updateSummary(id: string, summary: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${id} not found`);
    }

    return this.prisma.repositoryFile.update({
      where: { id },
      data: { claudeSummary: summary },
      include: { codeEntities: true },
    });
  }
}
