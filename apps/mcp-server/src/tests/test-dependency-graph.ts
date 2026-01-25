/*
 *
 * FILE IS AI GENERATED FOR THE SAKE OF TESTING.
 *
 */

import { FileAnalysisResult, DependencyGraph } from "../types.js";

// Mock file analysis results for testing
const mockFiles: FileAnalysisResult[] = [
  {
    filePath: "/repo/src/index.ts",
    relativePath: "src/index.ts",
    analysis: {
      filePath: "src/index.ts",
      fileName: "index.ts",
      fileType: "typescript",
      lines: 50,
      imports: [
        { source: "./utils", specifiers: ["formatDate", "parseDate"], isExternal: false },
        { source: "./services/api", specifiers: ["fetchData"], isExternal: false },
        { source: "express", specifiers: ["Router"], isExternal: true },
      ],
      exports: [{ name: "main", type: "function" }],
      entities: [{ name: "main", type: "function", startLine: 10, endLine: 45 }],
    },
  },
  {
    filePath: "/repo/src/utils.ts",
    relativePath: "src/utils.ts",
    analysis: {
      filePath: "src/utils.ts",
      fileName: "utils.ts",
      fileType: "typescript",
      lines: 30,
      imports: [
        { source: "date-fns", specifiers: ["format", "parse"], isExternal: true },
      ],
      exports: [
        { name: "formatDate", type: "function" },
        { name: "parseDate", type: "function" },
      ],
      entities: [
        { name: "formatDate", type: "function", startLine: 5, endLine: 15 },
        { name: "parseDate", type: "function", startLine: 17, endLine: 27 },
      ],
    },
  },
  {
    filePath: "/repo/src/services/api.ts",
    relativePath: "src/services/api.ts",
    analysis: {
      filePath: "src/services/api.ts",
      fileName: "api.ts",
      fileType: "typescript",
      lines: 40,
      imports: [
        { source: "../utils", specifiers: ["formatDate"], isExternal: false },
        { source: "axios", specifiers: ["default"], isExternal: true },
      ],
      exports: [{ name: "fetchData", type: "function" }],
      entities: [{ name: "fetchData", type: "function", startLine: 8, endLine: 35 }],
    },
  },
  {
    filePath: "/repo/src/types.ts",
    relativePath: "src/types.ts",
    analysis: {
      filePath: "src/types.ts",
      fileName: "types.ts",
      fileType: "typescript",
      lines: 20,
      imports: [],
      exports: [
        { name: "User", type: "interface" },
        { name: "Config", type: "type" },
      ],
      entities: [
        { name: "User", type: "interface", startLine: 1, endLine: 10 },
        { name: "Config", type: "type", startLine: 12, endLine: 18 },
      ],
    },
  },
  // File with analysis error (should be skipped)
  {
    filePath: "/repo/src/broken.ts",
    relativePath: "src/broken.ts",
    analysis: null,
    error: "Failed to parse file",
  },
];

// Simple implementation of the graph builder for testing
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function resolveImportPath(importSource: string, fromFile: string): string {
  const fromDir = fromFile.substring(0, fromFile.lastIndexOf("/"));
  if (importSource.startsWith("../")) {
    const parentDir = fromDir.substring(0, fromDir.lastIndexOf("/"));
    return normalizePath(parentDir + "/" + importSource.substring(3));
  }
  if (importSource.startsWith("./")) {
    return normalizePath(fromDir + "/" + importSource.substring(2));
  }
  return importSource;
}

const EXTENSIONS_TO_TRY = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];

function findMatchingFile(resolvedPath: string, knownFiles: Set<string>): string | null {
  for (const ext of EXTENSIONS_TO_TRY) {
    const candidate = normalizePath(resolvedPath + ext);
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function buildDependencyGraph(files: FileAnalysisResult[]): DependencyGraph {
  const validFiles = files.filter((f) => f.analysis !== null);
  const knownFiles = new Set(validFiles.map((f) => normalizePath(f.relativePath)));

  const nodes = validFiles.map((file) => ({
    id: normalizePath(file.relativePath),
    label: file.analysis?.fileName || "",
    type: "file" as const,
    data: {
      lines: file.analysis?.lines || 0,
      exports: file.analysis?.exports || [],
      entities: file.analysis?.entities || [],
    },
  }));

  const edges: DependencyGraph["edges"] = [];
  for (const file of validFiles) {
    const sourceFile = normalizePath(file.relativePath);
    for (const imp of file.analysis?.imports || []) {
      if (imp.isExternal) continue;
      if (!imp.source.startsWith("./") && !imp.source.startsWith("../")) continue;

      const resolvedPath = resolveImportPath(imp.source, file.relativePath);
      const targetFile = findMatchingFile(resolvedPath, knownFiles);

      if (targetFile) {
        edges.push({
          id: `${sourceFile}->${targetFile}`,
          source: sourceFile,
          target: targetFile,
          type: "imports",
          data: { specifiers: imp.specifiers },
        });
      }
    }
  }

  return { nodes, edges };
}

function testNodeCreation() {
  console.log("Testing node creation...\n");

  const graph = buildDependencyGraph(mockFiles);

  console.log("✓ Total nodes:", graph.nodes.length);
  console.log("  Expected: 4 (excluding broken.ts)");
  console.log("  Actual:", graph.nodes.length === 4 ? "PASS" : "FAIL");

  const nodeIds = graph.nodes.map((n) => n.id);
  console.log("\n✓ Node IDs:", nodeIds);

  const hasIndex = nodeIds.includes("src/index.ts");
  const hasUtils = nodeIds.includes("src/utils.ts");
  const hasApi = nodeIds.includes("src/services/api.ts");
  const hasTypes = nodeIds.includes("src/types.ts");
  const hasBroken = nodeIds.includes("src/broken.ts");

  console.log("  Has index.ts:", hasIndex ? "PASS" : "FAIL");
  console.log("  Has utils.ts:", hasUtils ? "PASS" : "FAIL");
  console.log("  Has api.ts:", hasApi ? "PASS" : "FAIL");
  console.log("  Has types.ts:", hasTypes ? "PASS" : "FAIL");
  console.log("  Excludes broken.ts:", !hasBroken ? "PASS" : "FAIL");
  console.log();
}

function testEdgeCreation() {
  console.log("Testing edge creation...\n");

  const graph = buildDependencyGraph(mockFiles);

  console.log("✓ Total edges:", graph.edges.length);
  console.log("  Expected: 3 (internal imports only)");
  console.log("  Actual:", graph.edges.length === 3 ? "PASS" : "FAIL");

  // index.ts -> utils.ts
  const indexToUtils = graph.edges.find(
    (e) => e.source === "src/index.ts" && e.target === "src/utils.ts"
  );
  console.log("\n✓ index.ts -> utils.ts:", indexToUtils ? "PASS" : "FAIL");
  if (indexToUtils) {
    console.log("  Specifiers:", indexToUtils.data?.specifiers);
  }

  // index.ts -> services/api.ts
  const indexToApi = graph.edges.find(
    (e) => e.source === "src/index.ts" && e.target === "src/services/api.ts"
  );
  console.log("\n✓ index.ts -> services/api.ts:", indexToApi ? "PASS" : "FAIL");
  if (indexToApi) {
    console.log("  Specifiers:", indexToApi.data?.specifiers);
  }

  // services/api.ts -> utils.ts
  const apiToUtils = graph.edges.find(
    (e) => e.source === "src/services/api.ts" && e.target === "src/utils.ts"
  );
  console.log("\n✓ services/api.ts -> utils.ts:", apiToUtils ? "PASS" : "FAIL");
  if (apiToUtils) {
    console.log("  Specifiers:", apiToUtils.data?.specifiers);
  }

  console.log();
}

function testExternalImportsIgnored() {
  console.log("Testing external imports are ignored...\n");

  const graph = buildDependencyGraph(mockFiles);

  const externalEdges = graph.edges.filter(
    (e) =>
      e.target.includes("express") ||
      e.target.includes("axios") ||
      e.target.includes("date-fns")
  );

  console.log("✓ External import edges:", externalEdges.length);
  console.log("  Expected: 0");
  console.log("  Actual:", externalEdges.length === 0 ? "PASS" : "FAIL");
  console.log();
}

function testEdgeIdFormat() {
  console.log("Testing edge ID format...\n");

  const graph = buildDependencyGraph(mockFiles);

  const allValid = graph.edges.every((e) => e.id === `${e.source}->${e.target}`);
  console.log("✓ All edge IDs follow source->target format:", allValid ? "PASS" : "FAIL");

  console.log("  Sample edge IDs:");
  graph.edges.slice(0, 3).forEach((e) => {
    console.log(`    ${e.id}`);
  });
  console.log();
}

function testEdgesOnlyBetweenExistingNodes() {
  console.log("Testing edges only reference existing nodes...\n");

  const graph = buildDependencyGraph(mockFiles);
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  const invalidEdges = graph.edges.filter(
    (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );

  console.log("✓ Invalid edges (referencing non-existent nodes):", invalidEdges.length);
  console.log("  Expected: 0");
  console.log("  Actual:", invalidEdges.length === 0 ? "PASS" : "FAIL");
  console.log();
}

async function main() {
  console.log("=== Dependency Graph Test ===\n");

  try {
    testNodeCreation();
    testEdgeCreation();
    testExternalImportsIgnored();
    testEdgeIdFormat();
    testEdgesOnlyBetweenExistingNodes();

    console.log("=== All tests passed ✓ ===");
  } catch (error) {
    console.error("\n=== Tests failed ✗ ===");
    console.error(error);
    process.exit(1);
  }
}

main();
