import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import type { FileAnnotation, AnnotationAuthor } from 'src/mcp/analysis/models/file-annotation.model';
import type { CreateAnnotationInput, UpdateAnnotationInput } from 'src/mcp/analysis/dto/annotation-inputs';

interface FileAnnotationsData {
  version: number;
  annotations: FileAnnotation[];
}

/** Service for managing structured annotations on repository files. */
@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parses annotation JSON from database TEXT field.
   * Returns empty array if field is null or invalid JSON.
   * Converts ISO date strings back to Date objects for GraphQL.
   */
  private parseAnnotations(raw: string | null): FileAnnotation[] {
    if (!raw) return [];

    try {
      const data: FileAnnotationsData = JSON.parse(raw);
      const annotations = data.annotations || [];

      return annotations.map((annotation) => ({
        ...annotation,
        createdAt: new Date(annotation.createdAt),
        updatedAt: new Date(annotation.updatedAt),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Serializes annotations array to JSON format for storage.
   */
  private serializeAnnotations(annotations: FileAnnotation[]): string {
    const data: FileAnnotationsData = {
      version: 1,
      annotations,
    };
    return JSON.stringify(data);
  }

  /**
   * Retrieves all annotations for a file.
   */
  async getAnnotations(fileId: string): Promise<FileAnnotation[]> {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`RepositoryFile with id ${fileId} not found`);
    }

    return this.parseAnnotations(file.annotations);
  }

  /**
   * Creates a new annotation on a file.
   */
  async createAnnotation(
    fileId: string,
    input: CreateAnnotationInput,
    author: AnnotationAuthor,
  ): Promise<FileAnnotation> {
    const annotations = await this.getAnnotations(fileId);

    const now = new Date().toISOString();
    const newAnnotation: FileAnnotation = {
      id: uuid(),
      title: input.title,
      content: input.content,
      tags: input.tags || [],
      linkedEntityIds: input.linkedEntityIds || [],
      author,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    annotations.push(newAnnotation);

    await this.prisma.repositoryFile.update({
      where: { id: fileId },
      data: { annotations: this.serializeAnnotations(annotations) },
    });

    return newAnnotation;
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
    const annotations = await this.getAnnotations(fileId);
    const index = annotations.findIndex((a) => a.id === annotationId);

    if (index === -1) {
      throw new NotFoundException(`Annotation with id ${annotationId} not found`);
    }

    const annotation = annotations[index];
    if (annotation.author.id !== userId) {
      throw new ForbiddenException('You can only edit your own annotations');
    }

    annotations[index] = {
      ...annotation,
      title: input.title ?? annotation.title,
      content: input.content ?? annotation.content,
      tags: input.tags ?? annotation.tags,
      linkedEntityIds: input.linkedEntityIds ?? annotation.linkedEntityIds,
      updatedAt: new Date(),
    };

    await this.prisma.repositoryFile.update({
      where: { id: fileId },
      data: { annotations: this.serializeAnnotations(annotations) },
    });

    return annotations[index];
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
    const annotations = await this.getAnnotations(fileId);
    const annotation = annotations.find((a) => a.id === annotationId);

    if (!annotation) {
      throw new NotFoundException(`Annotation with id ${annotationId} not found`);
    }

    if (annotation.author.id !== userId) {
      throw new ForbiddenException('You can only delete your own annotations');
    }

    const filtered = annotations.filter((a) => a.id !== annotationId);

    await this.prisma.repositoryFile.update({
      where: { id: fileId },
      data: { annotations: this.serializeAnnotations(filtered) },
    });

    return true;
  }
}
