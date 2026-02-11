import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  /** Fetches the raw file content from GitHub. */
  async getFileContent(id: string): Promise<string> {
    const file = await this.findById(id);
    const repository = await this.prisma.repository.findUnique({
      where: { id: file.repositoryId },
    });

    if (!repository) {
      throw new NotFoundException(`Repository with id ${file.repositoryId} not found`);
    }

    const rawUrl = this.buildGitHubRawUrl(repository.repositoryUrl, repository.defaultBranch, file.filePath);

    let response: Response;
    try {
      response = await fetch(rawUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch file content from GitHub: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(`Failed to fetch file content: ${response.statusText}`);
    }

    return response.text();
  }

  private buildGitHubRawUrl(repositoryUrl: string, defaultBranch: string, filePath: string): string {
    const cleanUrl = repositoryUrl.replace(/\.git$/, '');
    const urlParts = cleanUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];
    return `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
  }
}
