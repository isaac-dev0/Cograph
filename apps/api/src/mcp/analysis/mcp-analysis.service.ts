import { Injectable, Logger } from '@nestjs/common';
import { MCPClientService } from '../mcp-client.service';
import { RepositoryAnalysis } from 'src/common/shared/types/repository-analysis.type';

@Injectable()
export class MCPAnalysisService {
  private readonly logger = new Logger(MCPAnalysisService.name);

  constructor(private readonly mcpClient: MCPClientService) {}

  async analyseRepository(
    repositoryUrl: string,
    repositoryId: string,
    branch?: string,
  ): Promise<RepositoryAnalysis> {
    this.logger.log(`Starting repository analysis: ${repositoryUrl}`);

    const result = await this.mcpClient.callTool<RepositoryAnalysis>(
      'analyse-repository',
      {
        repositoryUrl,
        repositoryId,
        ...(branch && { branch }),
      },
    );

    this.logger.log(
      `Analysis complete: ${result.summary.successfulAnalyses}/${result.summary.totalFiles} files`,
    );

    return result;
  }
}
