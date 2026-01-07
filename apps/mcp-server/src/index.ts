import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const server = new McpServer({
  name: "cograph-mcp-server",
  version: "1.0.0",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

server.registerTool(
  "ping",
  {
    description: "Get ping response with an optional message",
    inputSchema: {
      message: z.string().optional().describe("Optional message to echo back"),
    },
  },
  async ({ message }) => {
    return {
      content: [{ type: "text", text: message ? `pong: ${message}` : "pong" }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cograph MCP Server Started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
