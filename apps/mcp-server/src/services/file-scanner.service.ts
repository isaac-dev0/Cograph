import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";
import { ScannedFile, ScanOptions } from "../types.js";

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**",
  "**/*.d.ts",
  "**/coverage/**",
  "**/.git/**",
];

export class FileScannerService {
  async scanDirectory(options: ScanOptions): Promise<ScannedFile[]> {
    const {
      rootPath,
      extensions = DEFAULT_EXTENSIONS,
      ignorePatterns = DEFAULT_IGNORE_PATTERNS,
      onProgress,
    } = options;

    const patterns = extensions.map((ext) => `**/*${ext}`);

    const files = await fg(patterns, {
      cwd: rootPath,
      ignore: ignorePatterns,
      absolute: false,
      onlyFiles: true,
    });

    const scannedFiles: ScannedFile[] = [];
    const total = files.length;

    const resolvedRoot = path.resolve(rootPath);

    for (let i = 0; i < files.length; i++) {
      const relativePath = files[i];
      const absolutePath = path.resolve(rootPath, relativePath);
      const fileName = path.basename(relativePath);

      if (!absolutePath.startsWith(resolvedRoot + path.sep) && absolutePath !== resolvedRoot) {
        console.error(`Skipping traversal attempt: ${relativePath}`);
        continue;
      }

      try {
        const content = await fs.readFile(absolutePath, "utf-8");
        const lines = content.split("\n").length;

        scannedFiles.push({
          filePath: absolutePath,
          relativePath,
          fileName,
          content,
          lines,
        });

        if (onProgress) {
          onProgress(i + 1, total, relativePath);
        }
      } catch (error) {
        console.error(`Failed to read file ${relativePath}:`, error);
      }
    }

    return scannedFiles;
  }

  async getFileCount(options: Omit<ScanOptions, "onProgress">): Promise<number> {
    const {
      rootPath,
      extensions = DEFAULT_EXTENSIONS,
      ignorePatterns = DEFAULT_IGNORE_PATTERNS,
    } = options;

    const patterns = extensions.map((extension) => `**/*${extension}`);

    const files = await fg(patterns, {
      cwd: rootPath,
      ignore: ignorePatterns,
      absolute: false,
      onlyFiles: true,
    });

    return files.length;
  }
}
