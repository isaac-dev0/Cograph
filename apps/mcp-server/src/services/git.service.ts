import { simpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class GitService {
  generateTempPath(repositoryId: string): string {
    const timestamp = Date.now();
    return path.join(os.tmpdir(), 'cograph', 'repos', repositoryId, timestamp.toString());
  }

  async cleanupStaleClones(repositoryId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
    const dir = path.join(os.tmpdir(), 'cograph', 'repos', repositoryId);
    const entries = await fs.readdir(dir).catch(() => []);
    const cutoff = Date.now() - maxAgeMs;
    await Promise.all(
      entries
        .filter((entry) => parseInt(entry) < cutoff)
        .map((entry) => this.deleteDirectory(path.join(dir, entry))),
    );
  }

  async cloneRepository(
    repositoryUrl: string,
    repositoryId: string,
    branch?: string
  ): Promise<string> {
    await this.cleanupStaleClones(repositoryId);
    const targetPath = this.generateTempPath(repositoryId);

    await fs.mkdir(targetPath, { recursive: true });

    const git = simpleGit();
    const options = ['--depth=1'];

    if (branch) {
      options.push('--branch', branch);
    }

    await git.clone(repositoryUrl, targetPath, options);

    return targetPath;
  }

  async deleteDirectory(directoryPath: string): Promise<void> {
    try {
      await fs.rm(directoryPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete directory ${directoryPath}:`, error);
    }
  }
}
