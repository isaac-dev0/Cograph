import { simpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class GitService {
  generateTempPath(repositoryId: string): string {
    const timestamp = Date.now();
    return path.join(os.tmpdir(), 'cograph', 'repos', repositoryId, timestamp.toString());
  }

  async cloneRepository(
    repositoryUrl: string,
    repositoryId: string,
    branch?: string
  ): Promise<string> {
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
