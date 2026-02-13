import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DependencyGraph,
  FileAnalysisResult,
  GraphNode,
  GraphEdge,
} from "../types.js";
import path from "path";
import { EXTENSIONS_TO_TRY } from "../constants.js";

const log = (message: string) => console.error(`[DependencyGraph] ${message}`);

function normalisePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Resolve an import source to an absolute path relative to the importing file.
 * Example: "./utils" from "src/index.ts" links to "src/utils.ts"
 */
function resolveImportPath(importSource: string, fromFile: string): string {
  const fromDirectory = path.dirname(fromFile);
  const resolved = path.join(fromDirectory, importSource);
  return normalisePath(resolved);
}

/**
 * Check if a resolved import path matches any file in the known files set.
 * Tries multiple extensions: .ts, .tsx, .js, .jsx, /index.ts, /index.js
 */
function findMatchingFile(
  resolvedPath: string,
  knownFiles: Set<string>,
): string | null {
  for (const extension of EXTENSIONS_TO_TRY) {
    const candidate = normalisePath(resolvedPath + extension);
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Check if an import is a relative import (starts with . or ..)
 */
function isRelativeImport(importSource: string): boolean {
  return importSource.startsWith("./") || importSource.startsWith("../");
}

/**
 * Create a graph node from a file analysis result.
 */
function createNode(file: FileAnalysisResult): GraphNode {
  return {
    id: normalisePath(file.relativePath),
    label: file.analysis?.fileName || path.basename(file.relativePath),
    type: "file",
    data: {
      lines: file.analysis?.lines || 0,
      exports: file.analysis?.exports || [],
      entities: file.analysis?.entities || [],
    },
  };
}

/**
 * Create a graph edge for an import relationship.
 */
function createEdge(
  sourceFile: string,
  targetFile: string,
  specifiers: string[],
): GraphEdge {
  return {
    id: `${sourceFile}->${targetFile}`,
    source: sourceFile,
    target: targetFile,
    type: "imports",
    data: { specifiers },
  };
}

/**
 * Process imports from a single file and create edges for valid internal imports.
 * Exclude external imports (e.g., node_modules)
 * Skip non-relative imports (aliases, absolute paths)
 */
function processFileImports(
  file: FileAnalysisResult,
  knownFiles: Set<string>,
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const sourceFile = normalisePath(file.relativePath);

  if (!file.analysis?.imports) {
    return edges;
  }

  for (const importItem of file.analysis.imports) {
    if (importItem.isExternal) {
      continue;
    }

    if (!isRelativeImport(importItem.source)) {
      continue;
    }

    const resolvedPath = resolveImportPath(importItem.source, file.relativePath);
    const targetFile = findMatchingFile(resolvedPath, knownFiles);

    if (targetFile) edges.push(createEdge(sourceFile, targetFile, importItem.specifiers));
  }

  return edges;
}

/**
 * Build a dependency graph from analysed files.
 */
function buildDependencyGraph(files: FileAnalysisResult[]): DependencyGraph {
  const validFiles = files.filter((file) => file.analysis !== null);
  const knownFiles = new Set(validFiles.map((file) => normalisePath(file.relativePath)));

  const nodes: GraphNode[] = validFiles.map(createNode);
  const edges: GraphEdge[] = [];

  for (const file of validFiles) {
    const fileEdges = processFileImports(file, knownFiles);
    edges.push(...fileEdges);
  }

  log(`Created ${nodes.length} nodes and ${edges.length} edges`);

  return { nodes, edges };
}

const inputSchema = z.object({
  files: z
    .array(
      z.object({
        filePath: z.string(),
        relativePath: z.string(),
        analysis: z
          .object({
            filePath: z.string(),
            fileName: z.string(),
            fileType: z.string(),
            lines: z.number(),
            imports: z.array(
              z.object({
                source: z.string(),
                specifiers: z.array(z.string()),
                isExternal: z.boolean(),
              }),
            ),
            exports: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
            entities: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                startLine: z.number(),
                endLine: z.number(),
              }),
            ),
          })
          .nullable(),
        error: z.string().optional(),
      }),
    )
    .describe("Array of file analysis results from analyse-repository tool"),
});

export function registerGenerateDependencyGraphTool(server: McpServer): void {
  server.registerTool(
    "generate-dependency-graph",
    {
      description:
        "Generate a dependency graph from analysed files showing import relationships between files",
      inputSchema,
    },
    async ({ files }) => {
      try {
        log(`Processing ${files.length} files`);

        const graph = buildDependencyGraph(files as FileAnalysisResult[]);

        log(`Done. ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(graph, null, 2) },
          ],
        };
      } catch (error) {
        log(`Error: ${error}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
