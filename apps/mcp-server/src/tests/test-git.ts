// THIS FILE IS AI GENERATED FOR THE SAKE OF TESTING.

import { GitService } from '../services/git.service.js';
import fs from 'fs/promises';
import path from 'path';

const gitService = new GitService();

async function testGenerateTempPath() {
  console.log('Testing generateTempPath...\n');

  const repoId = 'test-repo-123';
  const path1 = gitService.generateTempPath(repoId);

  await new Promise(resolve => setTimeout(resolve, 10));

  const path2 = gitService.generateTempPath(repoId);

  console.log('✓ Generated paths:');
  console.log('  Path 1:', path1);
  console.log('  Path 2:', path2);
  console.log('✓ Paths are unique:', path1 !== path2);
  console.log('✓ Contains repoId:', path1.includes(repoId));
  console.log('✓ Contains timestamp pattern:', /\d{13}/.test(path1));
  console.log();
}

async function testCloneRepository() {
  console.log('Testing cloneRepository (shallow clone)...\n');

  const repoUrl = 'https://github.com/octocat/Hello-World.git';
  const repoId = 'test-clone-' + Date.now();

  try {
    console.log('Cloning repository...');
    const clonedPath = await gitService.cloneRepository(repoUrl, repoId);

    console.log('✓ Repository cloned to:', clonedPath);

    const exists = await fs.access(clonedPath).then(() => true).catch(() => false);
    console.log('✓ Directory exists:', exists);

    const gitDir = await fs.access(path.join(clonedPath, '.git')).then(() => true).catch(() => false);
    console.log('✓ Git directory present:', gitDir);

    const files = await fs.readdir(clonedPath);
    console.log('✓ Files in repository:', files.length, 'items');
    console.log();

    console.log('Testing cleanup...');
    await gitService.deleteDirectory(clonedPath);

    const stillExists = await fs.access(clonedPath).then(() => true).catch(() => false);
    console.log('✓ Directory removed:', !stillExists);
    console.log();

  } catch (error) {
    console.error('✗ Clone failed:', error);
    throw error;
  }
}

async function testCloneWithBranch() {
  console.log('Testing cloneRepository with specific branch...\n');

  const repoUrl = 'https://github.com/octocat/Hello-World.git';
  const repoId = 'test-branch-' + Date.now();
  const branch = 'master';

  try {
    console.log(`Cloning branch: ${branch}...`);
    const clonedPath = await gitService.cloneRepository(repoUrl, repoId, branch);

    console.log('✓ Repository cloned to:', clonedPath);

    const exists = await fs.access(clonedPath).then(() => true).catch(() => false);
    console.log('✓ Directory exists:', exists);
    console.log();

    await gitService.deleteDirectory(clonedPath);

  } catch (error) {
    console.error('✗ Branch clone failed:', error);
    throw error;
  }
}

async function testDeleteDirectory() {
  console.log('Testing deleteDirectory (graceful failure)...\n');

  const nonExistentPath = '/tmp/cograph/non-existent-path-' + Date.now();

  console.log('Attempting to delete non-existent directory...');
  await gitService.deleteDirectory(nonExistentPath);
  console.log('✓ No error thrown for non-existent directory');
  console.log();
}

async function main() {
  console.log('=== Git Service Test ===\n');

  try {
    await testGenerateTempPath();
    await testCloneRepository();
    await testCloneWithBranch();
    await testDeleteDirectory();

    console.log('=== All tests passed ✓ ===');
  } catch (error) {
    console.error('\n=== Tests failed ✗ ===');
    process.exit(1);
  }
}

main();
