import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { join } from 'path';

const MCP_SERVER_PATH = join(__dirname, '../../../mcp-server/build/index.js');

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importEsm = (specifier: string) =>
  new Function('specifier', 'return import(specifier)')(specifier);

interface MCPClient {
  connect(transport: unknown): Promise<void>;
  close(): Promise<void>;
  callTool(params: {
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private client: MCPClient | null = null;

  async onModuleInit(): Promise<void> {
    const { Client } = await importEsm('@modelcontextprotocol/sdk/client');
    const { StdioClientTransport } = await importEsm(
      '@modelcontextprotocol/sdk/client/stdio.js',
    );

    const transport = new StdioClientTransport({
      command: 'node',
      args: [MCP_SERVER_PATH],
    });

    this.client = new Client(
      { name: 'cograph-api', version: '1.0.0' },
      { capabilities: {} },
    ) as MCPClient;

    await this.client.connect(transport);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    if (!this.client) {
      throw new Error('MCP client is not connected');
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content?.find((ctx) => ctx.type === 'text');

    if (!textContent?.text) {
      throw new Error('No text content in MCP response');
    }

    try {
      return JSON.parse(textContent.text) as T;
    } catch {
      return textContent.text as T;
    }
  }
}
