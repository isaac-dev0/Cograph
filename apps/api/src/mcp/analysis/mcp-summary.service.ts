import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MCPClientService } from '../mcp-client.service';

@Injectable()
export class MCPSummaryService {
  constructor(private readonly mcpClient: MCPClientService) {}

  async summariseFile(
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
          throw new ServiceUnavailableException(
            'Summary generation timed out. Please try again.',
          );
        }
        throw new InternalServerErrorException(
          `Failed to generate summary: ${error.message}`,
        );
      }
      throw new InternalServerErrorException(
        'Failed to generate summary. Please try again.',
      );
    }
  }
}
