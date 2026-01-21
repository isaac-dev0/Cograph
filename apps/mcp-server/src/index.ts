import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { registerAnalyseRepositoryTool } from "./tools/analyse-repository.tool.js";
import { registerGenerateDependencyGraphTool } from "./tools/generate-dependency-graph.tool.js";

dotenv.config();

export const server = new McpServer({
  name: "cograph-mcp-server",
  version: "1.0.0",
});

registerAnalyseRepositoryTool(server);
registerGenerateDependencyGraphTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cograph MCP Server Started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
