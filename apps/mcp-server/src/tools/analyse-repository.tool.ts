import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GitService } from "../services/git.service.js";
import { ClaudeService } from "../services/claude.service.js";
import {
  FileAnalysis,
  FileAnalysisResult,
  RepositoryAnalysis,
  ScannedFile,
} from "../types.js";
import path from "path";
import { FileScannerService } from "../services/file-scanner.service.js";
import { FILE_TYPE_MAP } from "../constants.js";

const FILE_ANALYSIS_SCHEMA = `{
  "filePath": "string",
  "fileName": "string",
  "fileType": "typescript | javascript | tsx | jsx",
  "lines": "number",
  "imports": [{ "source": "string", "specifiers": ["string"], "isExternal": "boolean" }],
  "exports": [{ "name": "string", "type": "function | class | interface | type | const | default" }],
  "entities": [{ "name": "string", "type": "function | class | interface | type | variable", "startLine": "number", "endLine": "number" }]
}`;

const FILE_ANALYSIS_PROMPT = `Analyse this code file and extract:
1. Import statements (mark external if from node_modules)
2. Export statements with their types
3. Code entities (functions, classes, interfaces, types, variables) with line ranges

Use fileType: typescript, javascript, tsx, or jsx.`;

const log = (message: string) =>
  console.error(`[RepositoryAnalysis] ${message}`);

function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return FILE_TYPE_MAP[ext] || ext.slice(1);
}

function extractRepositoryId(repositoryUrl: string): string {
  return repositoryUrl.split("/").pop()?.replace(".git", "") || "repo";
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const MAX_RETRY_ATTEMPTS = 3;

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = MAX_RETRY_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("unreachable");
}

async function analyseFile(
  claude: ClaudeService,
  file: ScannedFile,
): Promise<FileAnalysis> {
  const analysis = await withRetry(() =>
    claude.analyseCodeStructured<FileAnalysis>(
      FILE_ANALYSIS_PROMPT,
      file.content,
      FILE_ANALYSIS_SCHEMA,
    ),
  );

  return {
    ...analysis,
    filePath: file.relativePath,
    fileName: file.fileName,
    lines: file.lines,
  };
}

async function analyseFileWithErrorHandling(
  claude: ClaudeService,
  file: ScannedFile,
  index: number,
  total: number,
): Promise<{ result: FileAnalysisResult; success: boolean }> {
  log(`Analysing ${index + 1}/${total}: ${file.relativePath}`);

  try {
    const analysis = await analyseFile(claude, file);
    log(`Analysis Successful: ${file.relativePath}`);
    return {
      result: {
        filePath: file.filePath,
        relativePath: file.relativePath,
        analysis,
      },
      success: true,
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    log(`Analysis Failed: ${file.relativePath} -> ${errorMessage}`);
    return {
      result: {
        filePath: file.filePath,
        relativePath: file.relativePath,
        analysis: null,
        error: errorMessage,
      },
      success: false,
    };
  }
}

const ANALYSIS_CONCURRENCY = parseInt(process.env.ANALYSIS_CONCURRENCY ?? "5");

async function analyseAllFiles(
  claude: ClaudeService,
  files: ScannedFile[],
): Promise<{
  results: FileAnalysisResult[];
  summary: RepositoryAnalysis["summary"];
}> {
  const filesByType: Record<string, number> = {};
  let totalLines = 0;
  for (const file of files) {
    const fileType = getFileType(file.relativePath);
    filesByType[fileType] = (filesByType[fileType] || 0) + 1;
    totalLines += file.lines;
  }

  const results: FileAnalysisResult[] = new Array(files.length);
  let successfulAnalyses = 0;
  let failedAnalyses = 0;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= files.length) break;

      const { result, success } = await analyseFileWithErrorHandling(
        claude,
        files[index],
        index,
        files.length,
      );

      results[index] = result;
      if (success) successfulAnalyses++;
      else failedAnalyses++;
    }
  };

  const workerCount = Math.min(ANALYSIS_CONCURRENCY, files.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return {
    results,
    summary: {
      totalFiles: files.length,
      totalLines,
      successfulAnalyses,
      failedAnalyses,
      filesByType,
    },
  };
}

function buildRepositoryAnalysis(
  repositoryUrl: string,
  branch: string | undefined,
  files: FileAnalysisResult[],
  summary: RepositoryAnalysis["summary"],
): RepositoryAnalysis {
  return {
    repositoryUrl,
    branch,
    analysedAt: new Date().toISOString(),
    summary,
    files,
  };
}

const inputSchema = z.object({
  repositoryUrl: z.string().url().describe("Git repository URL to analyse"),
  branch: z
    .string()
    .optional()
    .describe("Branch to clone (defaults to main/master)"),
  repositoryId: z
    .string()
    .optional()
    .describe("Identifier for temp directory naming"),
  maxFiles: z
    .number()
    .optional()
    .describe("Maximum number of files to analyse (for batch processing)"),
  skipFiles: z
    .number()
    .optional()
    .describe("Number of files to skip (for batch processing)"),
});

export function registerAnalyseRepositoryTool(server: McpServer): void {
  const git = new GitService();
  const claude = new ClaudeService();
  const scanner = new FileScannerService();

  server.registerTool(
    "analyse-repository",
    {
      description:
        "Clone a git repository and analyse all TypeScript/JavaScript files",
      inputSchema,
    },
    async ({ repositoryUrl, branch, repositoryId, maxFiles, skipFiles }) => {
      const repoId = repositoryId || extractRepositoryId(repositoryUrl);
      let clonedPath: string | null = null;

      try {
        log(`Cloning: ${repositoryUrl}`);
        clonedPath = await git.cloneRepository(repositoryUrl, repoId, branch);
        log(`Cloned to: ${clonedPath}`);

        log("Scanning for files...");
        const allFiles = await scanner.scanDirectory({ rootPath: clonedPath });
        log(`Found ${allFiles.length} files`);

        const skip = skipFiles || 0;
        const limit = maxFiles || allFiles.length;
        const files = allFiles.slice(skip, skip + limit);
        log(
          `Analysing batch: ${skip}-${skip + files.length} of ${allFiles.length}`,
        );

        const { results, summary } = await analyseAllFiles(claude, files);

        summary.totalFiles = allFiles.length;

        log(
          `Success: ${summary.successfulAnalyses}, Failed: ${summary.failedAnalyses}`,
        );

        const analysis = buildRepositoryAnalysis(
          repositoryUrl,
          branch,
          results,
          summary,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(analysis, null, 2) },
          ],
        };
      } catch (error) {
        log(`Error: ${toErrorMessage(error)}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: toErrorMessage(error) }),
            },
          ],
          isError: true,
        };
      } finally {
        if (clonedPath) {
          log("Removing cloned paths...");
          await git.deleteDirectory(clonedPath);
        }
      }
    },
  );
}
