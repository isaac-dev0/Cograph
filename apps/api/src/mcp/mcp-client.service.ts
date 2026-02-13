/**
 * 
 * A large part of this code was taken from a private GitHub 
 * repository and modified for my usage.
 * 
 */

import { Injectable, InternalServerErrorException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { join } from 'path';

const MCP_SERVER_PATH = join(__dirname, '../../../mcp-server/build/index.js');

const importEsm = (specifier: string) =>
  new Function('specifier', 'return import(specifier)')(specifier);

interface MCPClient {
  connect(transport: unknown): Promise<void>;
  close(): Promise<void>;
  callTool(
    params: { name: string; arguments: Record<string, unknown> },
    resultSchema?: unknown,
    options?: { timeout?: number },
  ): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

/**
 * Manages the lifecycle of an MCP stdio client connection.
 * Connects on module init and disconnects on module destroy.
 */
@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private client: MCPClient | null = null;

  /** Spawns the MCP server process over stdio and establishes a client connection. */
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
      { capabilities: {}, requestTimeout: 600_000 },
    ) as MCPClient;

    await this.client.connect(transport);
  }

  /** Closes the MCP client connection gracefully when the module is torn down. */
  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  /** Invokes an MCP tool by name and parses the JSON response. */
  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
    options?: { timeout?: number },
  ): Promise<T> {
    if (!this.client) {
      throw new InternalServerErrorException('MCP client is not connected');
    }

    const result = await this.client.callTool(
      { name: toolName, arguments: args },
      undefined,
      options,
    );

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content?.find((content) => content.type === 'text');

    if (!textContent?.text) {
      throw new InternalServerErrorException('No text content in MCP response');
    }

    try {
      return JSON.parse(textContent.text) as T;
    } catch {
      return textContent.text as T;
    }
  }
}
