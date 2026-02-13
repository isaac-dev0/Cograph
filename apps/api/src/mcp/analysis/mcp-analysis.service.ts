import { Injectable, Logger } from '@nestjs/common';
import { MCPClientService } from '../mcp-client.service';
import { RepositoryAnalysis } from '../../common/shared/analysis.interfaces';

const BATCH_SIZE = 5;

@Injectable()
export class MCPAnalysisService {
  private readonly logger = new Logger(MCPAnalysisService.name);

  constructor(private readonly mcpClient: MCPClientService) {}

  /**
   * Analyses all files in a repository via the MCP `analyse-repository` tool.
   * Files are processed in batches of {@link BATCH_SIZE}. When `onBatchComplete`
   * is provided, each batch is passed to the callback for incremental storage.
   */
  async analyseRepository(
    repositoryUrl: string,
    repositoryId: string,
    branch?: string,
    onBatchComplete?: (batch: RepositoryAnalysis) => Promise<void>,
  ): Promise<RepositoryAnalysis> {
    this.logger.log(`Starting repository analysis: ${repositoryUrl}`);

    let skip = 0;
    let hasMore = true;
    let totalFiles = 0;
    let successfulAnalyses = 0;
    let failedAnalyses = 0;
    let totalLines = 0;

    const allResults: RepositoryAnalysis['files'] = [];
    const filesByType: Record<string, number> = {};

    while (hasMore) {
      this.logger.log(`Analysing batch starting at file ${skip}`);

      let batchResult: RepositoryAnalysis;
      try {
        batchResult = await this.mcpClient.callTool<RepositoryAnalysis>(
          'analyse-repository',
          {
            repositoryUrl,
            repositoryId,
            maxFiles: BATCH_SIZE,
            skipFiles: skip,
            ...(branch && { branch }),
          },
        );
      } catch (error) {
        this.logger.error(
          `Batch failed for files ${skip}-${skip + BATCH_SIZE}: ${error instanceof Error ? error.message : error}`,
        );

        skip += BATCH_SIZE;
        hasMore = totalFiles > 0 ? skip < totalFiles : false;
        
        continue;
      }

      totalFiles = batchResult.summary.totalFiles;
      successfulAnalyses += batchResult.summary.successfulAnalyses;
      failedAnalyses += batchResult.summary.failedAnalyses;
      totalLines += batchResult.summary.totalLines;

      for (const [type, count] of Object.entries(batchResult.summary.filesByType)) {
        filesByType[type] = (filesByType[type] || 0) + count;
      }

      allResults.push(...batchResult.files);

      this.logger.log(
        `Batch complete: ${batchResult.files.length} files (${successfulAnalyses}/${totalFiles} total)`,
      );

      if (onBatchComplete) {
        try {
          await onBatchComplete(batchResult);
        } catch (error) {
          this.logger.error(
            `Batch storage callback failed at offset ${skip}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      skip += BATCH_SIZE;
      hasMore = skip < totalFiles;
    }

    this.logger.log(`Analysis complete: ${successfulAnalyses}/${totalFiles} files`);

    return {
      repositoryUrl,
      branch,
      analysedAt: new Date().toISOString(),
      summary: { totalFiles, totalLines, successfulAnalyses, failedAnalyses, filesByType },
      files: allResults,
    };
  }
}
