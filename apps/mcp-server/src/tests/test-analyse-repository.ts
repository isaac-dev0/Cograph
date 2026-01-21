/* 
*
* FILE IS AI GENERATED FOR THE SAKE OF TESTING. 
*
*/

import { GitService } from "../services/git.service.js";
import { ClaudeService } from "../services/claude.service.js";
import { FileScannerService } from "../services/file-scanner.service.js";
import { FileAnalysis, FileAnalysisResult, RepositoryAnalysis } from "../types.js";
import path from "path";

const FILE_ANALYSIS_SCHEMA = `{
  "filePath": "string",
  "fileName": "string",
  "fileType": "string (e.g., 'typescript', 'javascript', 'tsx', 'jsx')",
  "lines": "number",
  "imports": [{
    "source": "string (module path)",
    "specifiers": ["string (imported names)"],
    "isExternal": "boolean",
    "resolvedPath": "string | undefined"
  }],
  "exports": [{
    "name": "string",
    "type": "function | class | interface | type | const | default"
  }],
  "entities": [{
    "name": "string",
    "type": "function | class | interface | type | variable",
    "startLine": "number",
    "endLine": "number"
  }]
}`;

const FILE_ANALYSIS_PROMPT = `Analyse this code file and extract its structure. Identify:
1. All import statements - note whether they're external (from node_modules) or internal
2. All export statements - identify what's being exported and its type
3. All code entities - functions, classes, interfaces, types, and variables with their line ranges

Be precise with line numbers. For fileType, use: typescript, javascript, tsx, or jsx.`;

function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const extensionMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
  };
  return extensionMap[ext] || ext.slice(1);
}

async function testFileScannerService() {
  console.log("Testing FileScannerService...\n");

  const gitService = new GitService();
  const fileScannerService = new FileScannerService();

  const repoUrl = "https://github.com/octocat/Hello-World.git";
  const repoId = "test-scanner-" + Date.now();

  let clonedPath: string | null = null;

  try {
    console.log("Cloning test repository...");
    clonedPath = await gitService.cloneRepository(repoUrl, repoId);
    console.log("✓ Repository cloned to:", clonedPath);

    console.log("\nScanning for files...");
    const files = await fileScannerService.scanDirectory({
      rootPath: clonedPath,
      onProgress: (current, total, filePath) => {
        console.log(`  Scanned ${current}/${total}: ${filePath}`);
      },
    });

    console.log(`\n✓ Found ${files.length} files`);

    const fileCount = await fileScannerService.getFileCount({
      rootPath: clonedPath,
    });
    console.log(`✓ File count method returned: ${fileCount}`);

    console.log();
  } catch (error) {
    console.error("✗ File scanner test failed:", error);
    throw error;
  } finally {
    if (clonedPath) {
      await gitService.deleteDirectory(clonedPath);
      console.log("✓ Cleanup complete");
    }
  }
}

async function testFullRepositoryAnalysis() {
  console.log("\nTesting full repository analysis...\n");

  const gitService = new GitService();
  const claudeService = new ClaudeService();
  const fileScannerService = new FileScannerService();

  // Use a small TypeScript repo for testing
  const repoUrl = "https://github.com/sindresorhus/is-odd.git";
  const repoId = "test-analysis-" + Date.now();

  let clonedPath: string | null = null;

  try {
    console.log("Cloning repository:", repoUrl);
    clonedPath = await gitService.cloneRepository(repoUrl, repoId);
    console.log("✓ Repository cloned to:", clonedPath);

    console.log("\nScanning for TypeScript/JavaScript files...");
    const scannedFiles = await fileScannerService.scanDirectory({
      rootPath: clonedPath,
      onProgress: (current, total, filePath) => {
        console.log(`  Scanned ${current}/${total}: ${filePath}`);
      },
    });
    console.log(`✓ Found ${scannedFiles.length} files to analyse`);

    if (scannedFiles.length === 0) {
      console.log("No files found to analyse, test complete.");
      return;
    }

    const fileResults: FileAnalysisResult[] = [];
    const filesByType: Record<string, number> = {};
    let totalLines = 0;
    let successfulAnalyses = 0;
    let failedAnalyses = 0;

    // Limit to first 3 files to keep test quick
    const filesToAnalyse = scannedFiles.slice(0, 3);

    for (let i = 0; i < filesToAnalyse.length; i++) {
      const file = filesToAnalyse[i];
      console.log(`\nAnalysing ${i + 1}/${filesToAnalyse.length}: ${file.relativePath}`);

      const fileType = getFileExtension(file.relativePath);
      filesByType[fileType] = (filesByType[fileType] || 0) + 1;
      totalLines += file.lines;

      try {
        const analysis = await claudeService.analyseCodeStructured<FileAnalysis>(
          FILE_ANALYSIS_PROMPT,
          file.content,
          FILE_ANALYSIS_SCHEMA
        );

        fileResults.push({
          filePath: file.filePath,
          relativePath: file.relativePath,
          analysis: {
            ...analysis,
            filePath: file.relativePath,
            fileName: file.fileName,
            lines: file.lines,
          },
        });
        successfulAnalyses++;
        console.log("✓ Successfully analysed");
        console.log("  Imports:", analysis.imports?.length || 0);
        console.log("  Exports:", analysis.exports?.length || 0);
        console.log("  Entities:", analysis.entities?.length || 0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("✗ Failed to analyse:", errorMessage);
        fileResults.push({
          filePath: file.filePath,
          relativePath: file.relativePath,
          analysis: null,
          error: errorMessage,
        });
        failedAnalyses++;
      }
    }

    const result: RepositoryAnalysis = {
      repositoryUrl: repoUrl,
      analysedAt: new Date().toISOString(),
      summary: {
        totalFiles: scannedFiles.length,
        totalLines,
        successfulAnalyses,
        failedAnalyses,
        filesByType,
      },
      files: fileResults,
    };

    console.log("\n=== Analysis Summary ===");
    console.log("Total files scanned:", result.summary.totalFiles);
    console.log("Total lines:", result.summary.totalLines);
    console.log("Successful analyses:", result.summary.successfulAnalyses);
    console.log("Failed analyses:", result.summary.failedAnalyses);
    console.log("Files by type:", result.summary.filesByType);
    console.log();
  } catch (error) {
    console.error("✗ Repository analysis test failed:", error);
    throw error;
  } finally {
    if (clonedPath) {
      console.log("Cleaning up...");
      await gitService.deleteDirectory(clonedPath);
      console.log("✓ Cleanup complete");
    }
  }
}

async function testErrorHandling() {
  console.log("\nTesting error handling with problematic content...\n");

  const claudeService = new ClaudeService();

  // Test with malformed/edge case content
  const problematicContent = `
// Empty file with just a comment
`;

  try {
    console.log("Analysing edge case content...");
    const analysis = await claudeService.analyseCodeStructured<FileAnalysis>(
      FILE_ANALYSIS_PROMPT,
      problematicContent,
      FILE_ANALYSIS_SCHEMA
    );
    console.log("✓ Edge case handled successfully");
    console.log("  Result:", JSON.stringify(analysis, null, 2));
  } catch (error) {
    console.log("✓ Error caught as expected:", error instanceof Error ? error.message : error);
  }

  console.log();
}

async function main() {
  console.log("=== Analyse Repository Tool Test ===\n");

  try {
    await testFileScannerService();
    await testErrorHandling();
    await testFullRepositoryAnalysis();

    console.log("\n=== All tests passed ✓ ===");
  } catch (error) {
    console.error("\n=== Tests failed ✗ ===");
    console.error(error);
    process.exit(1);
  }
}

main();
