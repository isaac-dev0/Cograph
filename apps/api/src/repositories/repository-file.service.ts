import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CRUD operations for RepositoryFile records with dual-ID lookup support. */
@Injectable()
export class RepositoryFileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a file by Postgres UUID or Neo4j node ID.
   * Graph nodes reference files by Neo4j ID, while direct queries use UUIDs.
   */
  async findById(id: string) {
    const file = UUID_PATTERN.test(id)
      ? await this.prisma.repositoryFile.findUnique({
          where: { id },
          include: { codeEntities: true },
        })
      : await this.prisma.repositoryFile.findFirst({
          where: { neo4jNodeId: id },
          include: { codeEntities: true },
        });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${id} not found`);
    }

    return file;
  }

  /** Returns all files for a repository, ordered by path. */
  async findByRepositoryId(repositoryId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new NotFoundException(`Repository with id ${repositoryId} not found`);
    }

    return this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: { codeEntities: true },
      orderBy: { filePath: 'asc' },
    });
  }

  /** Replaces the annotations JSON for a file. */
  async updateAnnotation(id: string, annotation: string) {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${id} not found`);
    }

    return this.prisma.repositoryFile.update({
      where: { id },
      data: { annotations: annotation },
      include: { codeEntities: true },
    });
  }

  /** Updates the AI-generated summary for a file. */
  async updateSummary(id: string, summary: string) {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id } });

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
