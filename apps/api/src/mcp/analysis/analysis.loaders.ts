/**
 * DataLoader definitions for the Analysis domain.
 * DataLoaders batch and deduplicate PostgreSQL lookups that would otherwise fire once per
 * node in a GraphQL list field (the N+1 problem). Each loader is request-scoped so its
 * per-request cache never leaks between concurrent GraphQL operations.
 */
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { FileAnnotation } from './models/file-annotation.model';

@Injectable({ scope: Scope.REQUEST })
export class AnalysisLoaders {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batches annotation lookups by file ID.
   * Replaces the per-file `repositoryFile.findUnique` in the `annotations` field resolver.
   */
  readonly fileAnnotations = new DataLoader<string, FileAnnotation[]>(
    async (fileIds: Array<string>) => {
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
