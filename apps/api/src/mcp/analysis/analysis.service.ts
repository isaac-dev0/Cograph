import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalysisStatus } from '@prisma/client';
import { MCPAnalysisService } from './mcp-analysis.service';
import { Neo4jGraphService } from '../../graph/services/neo4j-graph.service';
import { ImportRelationshipData } from '../../common/shared/graph.interfaces';
import {
  RepositoryAnalysis,
  FileAnalysisResult,
} from '../../common/shared/analysis.interfaces';

type SuccessfulFile = FileAnalysisResult & {
  analysis: NonNullable<FileAnalysisResult['analysis']>;
};

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const ANALYSIS_COOLDOWN_MS = 5 * 60 * 1_000;

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcpAnalysis: MCPAnalysisService,
    private readonly neo4jGraph: Neo4jGraphService,
  ) {}

  /** Creates an analysis job and begins asynchronous processing. */
  async startAnalysis(repositoryId: string): Promise<{ jobId: string }> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new NotFoundException(`Repository not found: ${repositoryId}`);
    }

    const cooldownCutoff = new Date(Date.now() - ANALYSIS_COOLDOWN_MS);
    const recentJob = await this.prisma.analysisJob.findFirst({
      where: {
        repositoryId,
        OR: [
          {
            status: {
              in: [
                AnalysisStatus.PENDING,
                AnalysisStatus.CLONING,
                AnalysisStatus.ANALYSING,
              ],
            },
          },
          {
            status: AnalysisStatus.COMPLETED,
            createdAt: { gte: cooldownCutoff },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentJob) {
      const activeStatuses: AnalysisStatus[] = [
        AnalysisStatus.PENDING,
        AnalysisStatus.CLONING,
        AnalysisStatus.ANALYSING,
      ];
      const isActive = activeStatuses.includes(recentJob.status);

      if (isActive) {
        throw new ConflictException(
          'An analysis job is already running for this repository.',
        );
      }

      const secondsRemaining = Math.ceil(
        (recentJob.createdAt.getTime() + ANALYSIS_COOLDOWN_MS - Date.now()) /
          1_000,
      );
      throw new ConflictException(
        `Analysis was run recently. Please wait ${secondsRemaining} seconds before re-analysing.`,
      );
    }

    const job = await this.prisma.analysisJob.create({
      data: {
        repositoryId,
        status: AnalysisStatus.PENDING,
        startedAt: new Date(),
      },
    });

    this.logger.log(`Created analysis job: ${job.id}`);

    this.runAnalysis(job.id, repository.id, repository.repositoryUrl).catch(
      (error) =>
        this.logger.error(
          `Analysis failed for job ${job.id}: ${error.message}`,
        ),
    );

    return { jobId: job.id };
  }

  /**
   * Runs the full analysis pipeline: clone, analyse in batches, store each
   * batch, then create import relationships once all files are processed.
   */
  async runAnalysis(
    jobId: string,
    repositoryId: string,
    repositoryUrl: string,
  ): Promise<void> {
    try {
      await this.updateJobStatus(jobId, AnalysisStatus.CLONING);
      await this.updateJobStatus(jobId, AnalysisStatus.ANALYSING);

      await this.prisma.repositoryFile.deleteMany({ where: { repositoryId } });
      await this.neo4jGraph.deleteRepositoryGraph(repositoryId);

      const analysis = await this.mcpAnalysis.analyseRepository(
        repositoryUrl,
        repositoryId,
        undefined,
        async (batch) => {
          this.logger.log(
            `[${jobId}] Storing batch of ${batch.files.length} files`,
          );
          await this.storeBatch(jobId, repositoryId, batch);
        },
      );

      this.logger.log(
        `[${jobId}] Analysis complete: ${analysis.files.length} files`,
      );

      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: { totalFiles: analysis.summary.totalFiles },
      });

      this.logger.log(`[${jobId}] Creating import relationships`);
      await this.createImportRelationships(jobId, repositoryId, analysis);

      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: {
          status: AnalysisStatus.COMPLETED,
          completedAt: new Date(),
          filesAnalysed: analysis.summary.successfulAnalyses,
          progress: 100,
        },
      });

      this.logger.log(`[${jobId}] Analysis completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorDetails =
        error instanceof Error ? error.stack : JSON.stringify(error);
      this.logger.error(`[${jobId}] Analysis failed: ${errorMessage}`);

      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: {
          status: AnalysisStatus.FAILED,
          completedAt: new Date(),
          errorMessage,
          errorDetails,
        },
      });
    }
  }

  /** Returns an analysis job with its associated repository. */
  async getAnalysisJob(jobId: string) {
    const job = await this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        repository: {
          select: { id: true, name: true, fullName: true, repositoryUrl: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Analysis job not found: ${jobId}`);
    }

    return job;
  }

  /** Returns all repository files ordered by path, including code entities. */
  async getRepositoryFiles(repositoryId: string) {
    return this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: { codeEntities: true },
      orderBy: { filePath: 'asc' },
    });
  }

  /**
   * Persists a batch of analysed files to both PostgreSQL and Neo4j,
   * then updates the job progress counter.
   *
   * Partial failure is designed intentionally. A single malformed file must not abort
   * the entire batch. Failures are logged individually, and a summary line
   * is emitted at the end so they are easy to spot in job logs.
   * 
   * Progress is incremented by the number of files successfully stored to
   * PostgreSQL - failed files are excluded from the count.
   */
  private async storeBatch(
    jobId: string,
    repositoryId: string,
    batch: RepositoryAnalysis,
  ): Promise<void> {
    const files = this.filterSuccessful(batch.files);

    let storedCount = 0;
    let pgFailedCount = 0;

    for (const file of files) {
      try {
        await this.storeFileToPg(repositoryId, file);
        storedCount++;
      } catch (error) {
        pgFailedCount++;
        this.logger.error(
          `[${jobId}] Failed to store ${file.relativePath}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (pgFailedCount > 0) {
      this.logger.warn(
        `[${jobId}] Batch complete: ${storedCount} stored, ${pgFailedCount} failed (PG)`,
      );
    }

    try {
      await this.storeFilesToNeo4j(jobId, repositoryId, files);
    } catch (error) {
      this.logger.error(
        `[${jobId}] Failed to write batch to Neo4j: ${error instanceof Error ? error.message : error}`,
      );
    }

    await this.updateBatchProgress(
      jobId,
      storedCount,
      batch.summary.totalFiles,
    );
  }

  /** Creates a RepositoryFile row and its CodeEntity rows in PostgreSQL. */
  private async storeFileToPg(
    repositoryId: string,
    file: SuccessfulFile,
  ): Promise<void> {
    const { analysis } = file;

    const neo4jNodeId = `file-${repositoryId}-${file.relativePath}`;

    const repositoryFile = await this.prisma.repositoryFile.create({
      data: {
        repositoryId,
        filePath: file.relativePath,
        fileName: analysis.fileName,
        fileType: analysis.fileType,
        linesOfCode: analysis.lines,
        neo4jNodeId,
        annotations: JSON.stringify({
          imports: analysis.imports,
          exports: analysis.exports,
        }),
      },
    });

    if (analysis.entities?.length) {
      await this.prisma.codeEntity.createMany({
        data: analysis.entities.map((entity) => ({
          repositoryFileId: repositoryFile.id,
          name: entity.name,
          type: entity.type,
          startLine: entity.startLine,
          endLine: entity.endLine,
          annotations: JSON.stringify({
            neo4jNodeId: `entity-${repositoryId}-${file.relativePath}-${entity.name}`,
          }),
        })),
      });
    }
  }

  /** Creates File and Entity nodes in Neo4j for a batch of files. */
  private async storeFilesToNeo4j(
    jobId: string,
    repositoryId: string,
    files: SuccessfulFile[],
  ): Promise<void> {
    const fileNodes = files.map((file) => ({
      id: `file-${repositoryId}-${file.relativePath}`,
      repositoryId,
      path: file.relativePath,
      name: file.analysis.fileName,
      type: file.analysis.fileType,
      linesOfCode: file.analysis.lines,
    }));

    await this.neo4jGraph.bulkCreateFileNodes(fileNodes);

    const entityTasks = files.flatMap((file) => {
      if (!file.analysis.entities?.length) return [];

      const fileNodeId = `file-${repositoryId}-${file.relativePath}`;
      
      return file.analysis.entities.map((entity) =>
        this.neo4jGraph
          .createEntityNode({
            id: `entity-${repositoryId}-${file.relativePath}-${entity.name}`,
            fileId: fileNodeId,
            name: entity.name,
            type: entity.type as 'Function' | 'Class' | 'Interface',
            startLine: entity.startLine,
            endLine: entity.endLine,
          })
          .catch((error) => {
            this.logger.error(
              `[${jobId}] Failed to create entity ${entity.name}: ${error instanceof Error ? error.message : error}`,
            );
          }),
      );
    });

    await Promise.all(entityTasks);

    this.logger.log(`[${jobId}] Wrote ${files.length} files to Neo4j`);
  }

  /**
   * Creates IMPORTS relationships in Neo4j between all analysed files.
   * Called once after all batches are stored so every file is available
   * for resolution.
   */
  private async createImportRelationships(
    jobId: string,
    repositoryId: string,
    analysis: RepositoryAnalysis,
  ): Promise<void> {
    const files = this.filterSuccessful(analysis.files);

    const pathIndex = new Map<string, string>();
    for (const file of files) {
      pathIndex.set(file.relativePath, file.relativePath);
    }

    const imports: ImportRelationshipData[] = [];

    for (const file of files) {
      if (!file.analysis.imports?.length) continue;

      const sourceFileId = `file-${repositoryId}-${file.relativePath}`;

      for (const importStatement of file.analysis.imports) {
        if (importStatement.isExternal) continue;

        const resolvedPath = this.resolveImportSource(
          importStatement.source,
          file.relativePath,
          pathIndex,
        );
        if (!resolvedPath) continue;

        imports.push({
          sourceFileId,
          targetFileId: `file-${repositoryId}-${resolvedPath}`,
          specifiers: importStatement.specifiers || [],
        });
      }
    }

    if (imports.length > 0) {
      const created =
        await this.neo4jGraph.bulkCreateImportRelationships(imports);
      this.logger.log(`[${jobId}] Created ${created} import relationships`);
    } else {
      this.logger.log(`[${jobId}] No import relationships to create`);
    }
  }

  /**
   * Resolves an import source string to a file path present in `pathIndex`.
   * Returns `null` if the source is external (no `.` or `@/` prefix).
   *
   * Three-step fallback strategy:
   * 1. Expand `@/` to `src/` (the project's tsconfig path alias) and search
   *    with common extensions / index variants via `findWithExtensions`.
   * 2. For relative paths, resolve against the importing file's directory first.
   * 3. If the `@/`-prefixed lookup failed, retry without any prefix — covers
   *    projects where `@/` maps to the repo root rather than `src/`.
   */
  private resolveImportSource(
    source: string,
    importingFilePath: string,
    pathIndex: Map<string, string>,
  ): string | null {
    if (!source.startsWith('.') && !source.startsWith('@/')) {
      return null;
    }

    const resolvedBase = source.startsWith('@/')
      ? source.replace('@/', 'src/')
      : this.resolveRelativePath(source, importingFilePath);

    const match = this.findWithExtensions(resolvedBase, pathIndex);
    if (match) return match;

    if (source.startsWith('@/')) {
      const withoutPrefix = source.replace('@/', '');
      return this.findWithExtensions(withoutPrefix, pathIndex);
    }

    return null;
  }

  /** Resolves a relative import path against the importing file's directory. */
  private resolveRelativePath(
    source: string,
    importingFilePath: string,
  ): string {
    const dirParts = importingFilePath.replace(/\/[^/]+$/, '').split('/');

    for (const part of source.split('/')) {
      if (part === '.') continue;
      if (part === '..') dirParts.pop();
      else dirParts.push(part);
    }

    return dirParts.join('/');
  }

  /** Tries exact match, then with extensions, then as an index file. */
  private findWithExtensions(
    base: string,
    pathIndex: Map<string, string>,
  ): string | null {
    if (pathIndex.has(base)) return pathIndex.get(base)!;

    for (const ext of EXTENSIONS) {
      if (pathIndex.has(base + ext)) return pathIndex.get(base + ext)!;
    }

    for (const ext of EXTENSIONS) {
      const indexPath = `${base}/index${ext}`;
      if (pathIndex.has(indexPath)) return pathIndex.get(indexPath)!;
    }

    return null;
  }

  /** Narrows a list of file analysis results to only those with a non-null analysis payload. */
  private filterSuccessful(files: FileAnalysisResult[]): SuccessfulFile[] {
    return files.filter((f): f is SuccessfulFile => f.analysis !== null);
  }

  /** Persists a new status value to the analysis job record. */
  private async updateJobStatus(
    jobId: string,
    status: AnalysisStatus,
  ): Promise<void> {
    await this.prisma.analysisJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  /**
   * Increments the job's `filesAnalysed` counter by `batchCount` and recomputes the
   * percentage progress. Uses `fallbackTotal` when the job's stored total is not yet set.
   */
  private async updateBatchProgress(
    jobId: string,
    batchCount: number,
    fallbackTotal: number,
  ): Promise<void> {
    const job = await this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      select: { filesAnalysed: true, totalFiles: true },
    });

    const filesAnalysed = (job?.filesAnalysed || 0) + batchCount;
    const totalFiles = job?.totalFiles || fallbackTotal;
    const progress =
      totalFiles > 0 ? Math.round((filesAnalysed / totalFiles) * 100) : 0;

    await this.prisma.analysisJob.update({
      where: { id: jobId },
      data: { filesAnalysed, progress },
    });

    this.logger.log(
      `[${jobId}] Batch stored: ${filesAnalysed}/${totalFiles} files (${progress}%)`,
    );
  }
}
