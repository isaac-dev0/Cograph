import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalysisStatus } from '@prisma/client';
import { MCPAnalysisService } from './mcp-analysis.service';
import { RepositoryAnalysis } from '../../common/shared/types/repository-analysis.type';
import { FileAnalysisResult } from '../../common/shared/types/file-analysis-result.type';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcpAnalysis: MCPAnalysisService,
  ) {}

  async startAnalysis(repositoryId: string): Promise<{ jobId: string }> {
    this.logger.log(`Starting analysis for repository: ${repositoryId}`);

    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    const job = await this.prisma.analysisJob.create({
      data: {
        repositoryId,
        status: AnalysisStatus.PENDING,
        startedAt: new Date(),
      },
    });

    this.logger.log(`Created analysis job: ${job.id}`);

    this.runAnalysis(job.id, repository.id, repository.repositoryUrl)
      .catch((error) => {
        this.logger.error(`Analysis failed for job ${job.id}: ${error.message}`);
      },
    );

    return { jobId: job.id };
  }

  async runAnalysis(
    jobId: string,
    repositoryId: string,
    repositoryUrl: string,
  ): Promise<void> {
    try {
      this.logger.log(`[${jobId}] Starting clone stage`);
      await this.updateJobStatus(jobId, AnalysisStatus.CLONING);

      this.logger.log(`[${jobId}] Starting analysis stage`);
      await this.updateJobStatus(jobId, AnalysisStatus.ANALYZING);

      const analysis = await this.mcpAnalysis.analyseRepository(
        repositoryUrl,
        repositoryId,
      );

      this.logger.log(`[${jobId}] Analysis returned ${analysis.files.length} files`);

      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: { totalFiles: analysis.summary.totalFiles },
      });

      this.logger.log(`[${jobId}] Storing analysis results`);
      await this.storeAnalysisResults(jobId, repositoryId, analysis);

      this.logger.log(`[${jobId}] Analysis completed successfully`);
      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: {
          status: AnalysisStatus.COMPLETED,
          completedAt: new Date(),
          filesAnalysed: analysis.summary.successfulAnalyses,
          progress: 100,
        },
      });
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

  async storeAnalysisResults(
    jobId: string,
    repositoryId: string,
    analysis: RepositoryAnalysis,
  ): Promise<void> {
    const successfulFiles = analysis.files.filter((file): file is FileAnalysisResult & {
      analysis: NonNullable<FileAnalysisResult['analysis']>;
    } => file.analysis !== null);

    this.logger.log(
      `[${jobId}] Storing ${successfulFiles.length} files with entities`,
    );

    /* Clear existing files for this repository before inserting new ones. */
    await this.prisma.repositoryFile.deleteMany({
      where: { repositoryId },
    });

    await this.prisma.$transaction(async (transaction) => {
      let filesProcessed = 0;

      for (const file of successfulFiles) {
        const fileAnalysis = file.analysis;
        const fileNeo4jNodeId = `file-${repositoryId}-${file.relativePath}`;

        const repositoryFile = await transaction.repositoryFile.create({
          data: {
            repositoryId,
            filePath: file.relativePath,
            fileName: fileAnalysis.fileName,
            fileType: fileAnalysis.fileType,
            linesOfCode: fileAnalysis.lines,
            neo4jNodeId: fileNeo4jNodeId,
            annotations: JSON.stringify({
              imports: fileAnalysis.imports,
              exports: fileAnalysis.exports,
            }),
          },
        });

        if (fileAnalysis.entities && fileAnalysis.entities.length > 0) {
          const entitiesData = fileAnalysis.entities.map((entity) => ({
            repositoryFileId: repositoryFile.id,
            name: entity.name,
            type: entity.type,
            startLine: entity.startLine,
            endLine: entity.endLine,
            annotations: JSON.stringify({
              neo4jNodeId: `entity-${repositoryFile.id}-${entity.name}`,
            }),
          }));

          await transaction.codeEntity.createMany({
            data: entitiesData,
          });
        }

        filesProcessed++;

        if (filesProcessed % 10 === 0 || filesProcessed === successfulFiles.length) {
          const progress = Math.round((filesProcessed / successfulFiles.length) * 100);
          await transaction.analysisJob.update({
            where: { id: jobId },
            data: {
              filesAnalysed: filesProcessed,
              progress,
            },
          });
        }
      }
    });

    this.logger.log(`[${jobId}] Stored all files and entities`);
  }

  async getAnalysisJob(jobId: string) {
    const job = await this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            repositoryUrl: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Analysis job not found: ${jobId}`);
    }

    return job;
  }

  async getRepositoryFiles(repositoryId: string) {
    return this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: {
        codeEntities: true,
      },
      orderBy: { filePath: 'asc' },
    });
  }

  private async updateJobStatus(
    jobId: string,
    status: AnalysisStatus,
  ): Promise<void> {
    await this.prisma.analysisJob.update({
      where: { id: jobId },
      data: { status },
    });
  }
}
