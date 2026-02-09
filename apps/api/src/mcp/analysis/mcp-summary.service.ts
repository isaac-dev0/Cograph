import { Injectable } from '@nestjs/common';
import { MCPClientService } from '../mcp-client.service';

/**
 * Generates AI-powered summaries for code files using Claude via MCP.
 */
@Injectable()
export class MCPSummaryService {
  constructor(private readonly mcpClient: MCPClientService) {}

  /**
   * Generates a summary for a file using the MCP generate-summary tool.
   * @param fileContent The raw content of the file
   * @param filePath The path of the file (for context)
   * @returns The generated summary text
   */
  async generateFileSummary(
    fileContent: string,
    filePath: string,
  ): Promise<string> {
    try {
      const result = await this.mcpClient.callTool<{ summary: string }>(
        'generate-summary',
        {
          code: fileContent,
          summaryType: 'file',
          filePath,
        },
        { timeout: 30000 },
      );

      if (typeof result === 'string') {
        return result;
      }

      return result.summary;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Summary generation timed out. Please try again.');
        }
        throw new Error(`Failed to generate summary: ${error.message}`);
      }
      throw new Error('Failed to generate summary. Please try again.');
    }
  }
}
