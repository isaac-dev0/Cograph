import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import type { Annotation } from '@prisma/client';
import type { FileAnnotation, AnnotationAuthor } from 'src/mcp/analysis/models/file-annotation.model';
import type { CreateAnnotationInput, UpdateAnnotationInput } from 'src/mcp/analysis/dto/annotation-inputs';

/** Service for managing structured annotations on repository files. */
@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Maps a Prisma Annotation row to the FileAnnotation GraphQL type. */
  private toFileAnnotation(row: Annotation): FileAnnotation {
    const author: AnnotationAuthor = { id: row.authorId, name: row.authorName };
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      tags: row.tags,
      linkedEntityIds: row.linkedEntityIds,
      author,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Retrieves all annotations for a file. */
  async getAnnotations(fileId: string): Promise<FileAnnotation[]> {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${fileId} not found`);
    }

    const rows = await this.prisma.annotation.findMany({
      where: { fileId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => this.toFileAnnotation(row));
  }

  /** Creates a new annotation on a file. */
  async createAnnotation(
    fileId: string,
    input: CreateAnnotationInput,
    author: AnnotationAuthor,
  ): Promise<FileAnnotation> {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${fileId} not found`);
    }

    const row = await this.prisma.annotation.create({
      data: {
        fileId,
        title: input.title,
        content: input.content,
        tags: input.tags ?? [],
        linkedEntityIds: input.linkedEntityIds ?? [],
        authorId: author.id,
        authorName: author.name,
      },
    });

    return this.toFileAnnotation(row);
  }

  /**
   * Updates an existing annotation.
   * Only the annotation's author can update it.
   */
  async updateAnnotation(
    fileId: string,
    annotationId: string,
    input: UpdateAnnotationInput,
    userId: string,
  ): Promise<FileAnnotation> {
    const row = await this.prisma.annotation.findUnique({ where: { id: annotationId } });

    if (!row || row.fileId !== fileId) {
      throw new NotFoundException(`Annotation with id ${annotationId} not found`);
    }

    if (!row.authorId || row.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own annotations');
    }

    const updated = await this.prisma.annotation.update({
      where: { id: annotationId },
      data: {
        title: input.title ?? row.title,
        content: input.content ?? row.content,
        tags: input.tags ?? row.tags,
        linkedEntityIds: input.linkedEntityIds ?? row.linkedEntityIds,
      },
    });

    return this.toFileAnnotation(updated);
  }

  /**
   * Deletes an annotation.
   * Only the annotation's author can delete it.
   */
  async deleteAnnotation(
    fileId: string,
    annotationId: string,
    userId: string,
  ): Promise<boolean> {
    const row = await this.prisma.annotation.findUnique({ where: { id: annotationId } });

    if (!row || row.fileId !== fileId) {
      throw new NotFoundException(`Annotation with id ${annotationId} not found`);
    }

    if (!row.authorId || row.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own annotations');
    }

    await this.prisma.annotation.delete({ where: { id: annotationId } });

    return true;
  }
}
