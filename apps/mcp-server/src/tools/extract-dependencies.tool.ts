import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "path";
import { EXTENSIONS_TO_TRY } from "../constants.js";

const log = (message: string) => console.error(`[ExtractDependencies] ${message}`);

function normalisePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function resolveImportPath(importSource: string, fromFile: string): string {
  const fromDirectory = path.dirname(fromFile);
  const resolved = path.join(fromDirectory, importSource);
  return normalisePath(resolved);
}

function findMatchingFile(
  resolvedPath: string,
  filePathMap: Map<string, string>
): string | null {
  for (const extension of EXTENSIONS_TO_TRY) {
    const candidate = normalisePath(resolvedPath + extension);
    const fileId = filePathMap.get(candidate);
    if (fileId) {
      return fileId;
    }
  }
  return null;
}

function isRelativeImport(importSource: string): boolean {
  return importSource.startsWith("./") || importSource.startsWith("../");
}

interface FileInput {
  id: string;
  filePath: string;
  imports: Array<{ source: string; specifiers: string[] }>;
}

interface DependencyExtractionResult {
  internalImports: Array<{
    fromFileId: string;
    toFileId: string;
    specifiers: string[];
  }>;
  externalLibraries: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  externalImports: Array<{
    fromFileId: string;
    toLibraryId: string;
    specifiers: string[];
  }>;
  unresolvedImports: Array<{
    fromFile: string;
    importSource: string;
  }>;
}

function extractDependencies(files: FileInput[]): DependencyExtractionResult {
  /* 
  * Build map of file path which correlates with neo4jNodeId for quick lookups. 
  */
  const filePathMap = new Map<string, string>();
  files.forEach(file => {
    filePathMap.set(normalisePath(file.filePath), file.id);
  });

  const internalImports: DependencyExtractionResult['internalImports'] = [];
  const externalImports: DependencyExtractionResult['externalImports'] = [];
  const externalLibrariesMap = new Map<string, { id: string; name: string }>();
  const unresolvedImports: DependencyExtractionResult['unresolvedImports'] = [];

  for (const file of files) {
    for (const importStatement of file.imports) {
      if (isRelativeImport(importStatement.source)) {
        const resolvedPath = resolveImportPath(importStatement.source, file.filePath);
        const targetFileId = findMatchingFile(resolvedPath, filePathMap);

        if (targetFileId) {
          internalImports.push({
            fromFileId: file.id,
            toFileId: targetFileId,
            specifiers: importStatement.specifiers,
          });
        } else {
          log(`Unresolved relative import: ${file.filePath} -> ${importStatement.source}`);
          unresolvedImports.push({
            fromFile: file.filePath,
            importSource: importStatement.source,
          });
        }
      } else {
        const libraryName = importStatement.source.startsWith('@')
          ? importStatement.source.split('/').slice(0, 2).join('/')
          : importStatement.source.split('/')[0];

        if (!externalLibrariesMap.has(libraryName)) {
          externalLibrariesMap.set(libraryName, {
            id: `lib-${libraryName.replace(/[@\/]/g, '-')}`,
            name: libraryName,
          });
        }

        externalImports.push({
          fromFileId: file.id,
          toLibraryId: externalLibrariesMap.get(libraryName)!.id,
          specifiers: importStatement.specifiers,
        });
      }
    }
  }

  const externalLibraries = Array.from(externalLibrariesMap.values()).map(lib => ({
    ...lib,
    type: 'external',
  }));

  log(`Processed ${files.length} files`);
  log(`Found ${internalImports.length} internal imports`);
  log(`Found ${externalLibraries.length} unique external libraries`);
  log(`Found ${externalImports.length} external imports`);
  log(`Found ${unresolvedImports.length} unresolved imports`);

  return { internalImports, externalLibraries, externalImports, unresolvedImports };
}

const inputSchema = z.object({
  files: z.array(
    z.object({
      id: z.string().describe("Neo4j node ID for the file"),
      filePath: z.string().describe("Relative file path"),
      imports: z.array(
        z.object({
          source: z.string().describe("Import source (e.g., './utils', 'react')"),
          specifiers: z.array(z.string()).describe("Imported items"),
        })
      ),
    })
  ).describe("Array of files with their imports"),
});

export function registerExtractDependenciesTool(server: McpServer): void {
  server.registerTool(
    "extractDependencies",
    {
      description: "Extract dependency relationships between files and external libraries from import statements",
      inputSchema,
    },
    async ({ files }) => {
      try {
        const result = extractDependencies(files as FileInput[]);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        log(`Error: ${error}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: String(error) }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
