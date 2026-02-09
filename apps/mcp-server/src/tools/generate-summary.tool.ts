import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ClaudeService } from "../services/claude.service.js";

const FILE_SUMMARY_PROMPT = `Generate a concise technical summary for this code file. Focus on:

1. **Purpose**: What is the primary purpose of this file?
2. **Responsibilities**: What are the main responsibilities and functionality it provides?
3. **Dependencies**: What key dependencies or imports does it rely on?
4. **System Fit**: How does this file fit into a larger system or architecture?

Requirements:
- Keep the summary between 200-300 words maximum
- Use professional, technical language
- Be concise and direct
- Do not include code examples
- Write in plain text (no markdown formatting)`;

const ENTITY_SUMMARY_PROMPT = `Generate a concise technical summary for this specific code entity (function, class, or method). Focus on:

1. **What it does**: Describe the core functionality and purpose
2. **Parameters**: Explain the input parameters and their expected types/values
3. **Return value**: What does it return and under what conditions?
4. **Side effects**: Note any side effects (state changes, I/O operations, external calls)
5. **Usage context**: When and how should this be used?

Requirements:
- Keep the summary between 200-300 words maximum
- Use professional, technical language
- Be concise and direct
- Do not include code examples
- Write in plain text (no markdown formatting)`;

const log = (message: string) => console.error(`[GenerateSummary] ${message}`);

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const inputSchema = z.object({
  code: z.string().describe("The code content to summarise"),
  summaryType: z
    .enum(["file", "entity"])
    .describe(
      "Type of summary: 'file' for entire file overview, 'entity' for specific function/class",
    ),
  entityName: z
    .string()
    .optional()
    .describe(
      "Name of the specific entity (function/class) when summaryType is 'entity'",
    ),
  filePath: z
    .string()
    .optional()
    .describe("Optional file path for additional context"),
});

export function registerGenerateSummaryTool(server: McpServer): void {
  const claude = new ClaudeService();

  server.registerTool(
    "generate-summary",
    {
      description:
        "Generate concise technical summaries for files or specific code entities (functions/classes)",
      inputSchema,
    },
    async ({ code, summaryType, entityName, filePath }) => {
      try {
        const isFileSummary = summaryType === "file";
        const prompt = isFileSummary
          ? FILE_SUMMARY_PROMPT
          : ENTITY_SUMMARY_PROMPT;

        let contextualPrompt = prompt;
        if (filePath) {
          contextualPrompt += `\n\nFile path: ${filePath}`;
        }
        if (!isFileSummary && entityName) {
          contextualPrompt += `\n\nEntity name: ${entityName}`;
        }

        log(
          `Generating ${summaryType} summary${entityName ? ` for ${entityName}` : ""}${filePath ? ` (${filePath})` : ""}`,
        );

        const summary = await claude.analyseCode(contextualPrompt, code);
        const trimmedSummary = summary.trim();

        log(
          `Summary generated successfully (${trimmedSummary.length} characters)`,
        );

        return {
          content: [{ type: "text" as const, text: trimmedSummary }],
        };
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        log(`Error: ${errorMessage}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
