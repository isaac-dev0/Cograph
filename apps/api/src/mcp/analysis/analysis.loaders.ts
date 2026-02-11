import { Injectable, Scope } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { FileAnnotation } from './models/file-annotation.model';

/**
 * Request-scoped DataLoaders for the Analysis domain.
 * A new instance is created per GraphQL request to prevent cross-request cache contamination.
 */
@Injectable({ scope: Scope.REQUEST })
export class AnalysisLoaders {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batches annotation lookups by file ID.
   * Replaces the per-file `repositoryFile.findUnique` in the `annotations` field resolver.
   */
  readonly fileAnnotations = new DataLoader<string, FileAnnotation[]>(
    async (fileIds: readonly string[]) => {
      const rows = await this.prisma.annotation.findMany({
        where: { fileId: { in: [...fileIds] } },
        orderBy: { createdAt: 'asc' },
      });

      const annotationsMap = new Map<string, FileAnnotation[]>();

      for (const row of rows) {
        const list = annotationsMap.get(row.fileId) ?? [];
        list.push({
          id: row.id,
          title: row.title,
          content: row.content,
          tags: row.tags,
          linkedEntityIds: row.linkedEntityIds,
          author: { id: row.authorId, name: row.authorName },
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
        annotationsMap.set(row.fileId, list);
      }

      return fileIds.map((fileId) => annotationsMap.get(fileId) ?? []);
    },
  );
}
