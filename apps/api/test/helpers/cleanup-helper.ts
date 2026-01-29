import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getTempRepoBasePath(): string {
  return path.join(os.tmpdir(), 'cograph', 'repos');
}

export function getTempRepoPath(repositoryId: string): string {
  return path.join(getTempRepoBasePath(), repositoryId);
}

export async function verifyTempDirectoryCleaned(repositoryId: string): Promise<boolean> {
  const tempPath = getTempRepoPath(repositoryId);

  try {
    await fs.promises.access(tempPath);
    const contents = await fs.promises.readdir(tempPath);
    return contents.length === 0;
  } catch {
    return true;
  }
}

export async function waitForCleanup(
  repositoryId: string,
  maxWaitMs: number = 10000,
  intervalMs: number = 500,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await verifyTempDirectoryCleaned(repositoryId)) {
      return true;
    }
    await sleep(intervalMs);
  }

  return false;
}

export async function listTempDirectories(): Promise<string[]> {
  const basePath = getTempRepoBasePath();

  try {
    await fs.promises.access(basePath);
    return fs.promises.readdir(basePath);
  } catch {
    return [];
  }
}

export async function cleanupTempDirectory(repositoryId: string): Promise<void> {
  const tempPath = getTempRepoPath(repositoryId);

  try {
    await fs.promises.rm(tempPath, { recursive: true, force: true });
  } catch {
    /* Errors ignored */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
