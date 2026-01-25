import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ChildProcess } from 'child_process';
import { join } from 'path';

const MCP_SERVER_PATH = join(__dirname, '../../../mcp-server/dist/index.js');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPClientService.name);
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `Connecting to MCP server (attempt ${attempt}/${MAX_RETRIES})...`,
        );

        this.transport = new StdioClientTransport({
          command: 'node',
          args: [MCP_SERVER_PATH],
        });

        this.client = new Client(
          { name: 'cograph-api', version: '1.0.0' },
          { capabilities: {} },
        );

        await this.client.connect(this.transport);

        // Store reference to server process for cleanup
        this.serverProcess = (this.transport as any)._process || null;

        this.isConnected = true;
        this.logger.log('Successfully connected to MCP server');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Connection attempt ${attempt} failed: ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    this.logger.error(
      `Failed to connect to MCP server after ${MAX_RETRIES} attempts`,
      lastError?.stack,
    );
  }

  private async disconnect(): Promise<void> {
    this.logger.log('Disconnecting from MCP server...');

    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        this.logger.log('MCP client closed');
      }
    } catch (error) {
      this.logger.warn(
        `Error closing MCP client: ${error instanceof Error ? error.message : error}`,
      );
    }

    try {
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill('SIGTERM');
        this.logger.log('MCP server process terminated');
      }
    } catch (error) {
      this.logger.warn(
        `Error killing server process: ${error instanceof Error ? error.message : error}`,
      );
    }

    this.client = null;
    this.transport = null;
    this.serverProcess = null;
    this.isConnected = false;
  }

  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client is not connected');
    }

    this.logger.log(`Calling MCP tool: ${toolName}`);

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract text content from response
      const content = result.content as Array<{ type: string; text?: string }>;
      const textContent = content?.find((c) => c.type === 'text');

      if (!textContent?.text) {
        throw new Error('No text content in MCP response');
      }

      const responseText = textContent.text.trim();

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(responseText) as T;
      } catch {
        return responseText as T;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`MCP tool call failed: ${errorMessage}`);
      throw new Error(`MCP tool '${toolName}' failed: ${errorMessage}`);
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
