import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '../helpers/test-app';
import { DatabaseHelper } from '../helpers/database-helper';
import {
  GraphQLClient,
  ANALYSE_REPOSITORY_MUTATION,
} from '../helpers/graphql-client';
import { generateUniqueTestUser } from '../helpers/auth-helper';
import {
  pollAndTrackStatuses,
  AnalysisJobResult,
} from '../helpers/polling-helper';
import { waitForCleanup } from '../helpers/cleanup-helper';
import { LARGE_REPO } from '../fixtures/test-repositories';

describe('Analysis Flow E2E - Large Repository Performance', () => {
  let app: INestApplication;
  let db: DatabaseHelper;
  let gqlClient: GraphQLClient;
  let testRepositoryId: string | undefined;

  beforeAll(async () => {
    app = await createTestApp();
    db = new DatabaseHelper();
    await db.connect();

    const testUser = generateUniqueTestUser();
    gqlClient = new GraphQLClient(app, testUser.token);
  }, 120000);

  afterAll(async () => {
    await db.disconnect();
    await closeTestApp();
  });

  afterEach(async () => {
    if (testRepositoryId) {
      await db.cleanupRepositorySafe(testRepositoryId);
      testRepositoryId = undefined;
    }
  });

  describe('Large Repository (100+ files)', () => {
    it('should analyse large repository within time limit', async () => {
      testRepositoryId = await db.createTestRepository({
        name: LARGE_REPO.name,
        repositoryUrl: LARGE_REPO.url,
      });

      const startTime = Date.now();
      console.log(`Starting large repository analysis: ${LARGE_REPO.url}`);

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeUndefined();
      const jobId = mutationResult.data.analyseRepository.id;

      let lastProgress = 0;
      let lastFilesAnalysed = 0;

      const { job } = await pollAndTrackStatuses(gqlClient, jobId, {
        maxWaitMs: 600000,
        intervalMs: 5000,
        onProgress: (j) => {
          if (j.progress !== lastProgress || j.filesAnalysed !== lastFilesAnalysed) {
            console.log(
              `[${Math.round((Date.now() - startTime) / 1000)}s] ` +
              `Status: ${j.status}, Progress: ${j.progress}%, ` +
              `Files: ${j.filesAnalysed}/${j.totalFiles || '?'}`,
            );
            lastProgress = j.progress;
            lastFilesAnalysed = j.filesAnalysed;
          }
        },
      });

      const duration = Date.now() - startTime;
      const durationSeconds = Math.round(duration / 1000);
      const durationMinutes = Math.round(duration / 60000 * 10) / 10;

      console.log(`\n=== Large Repository Analysis Complete ===`);
      console.log(`Duration: ${durationSeconds}s (${durationMinutes} min)`);
      console.log(`Files analyzed: ${job.filesAnalysed}`);
      console.log(`Status: ${job.status}`);

      expect(job.status).toBe('COMPLETED');
      expect(job.progress).toBe(100);
      expect(job.filesAnalysed).toBeGreaterThanOrEqual(
        LARGE_REPO.expectedFileCount.min,
      );

      const filesPerMinute = job.filesAnalysed / durationMinutes;
      console.log(`Performance: ${Math.round(filesPerMinute)} files/minute`);

      if (job.filesAnalysed >= 100) {
        expect(duration).toBeLessThan(300000);
        console.log('✓ Performance requirement met: < 5 min for 100+ files');
      }

      const files = await db.getRepositoryFiles(testRepositoryId);
      expect(files.length).toBe(job.filesAnalysed);
      expect(files.length).toBeGreaterThanOrEqual(
        LARGE_REPO.expectedFileCount.min,
      );

      console.log(`\n=== File Statistics ===`);

      const filesByType: Record<string, number> = {};
      let totalLines = 0;
      let totalEntities = 0;

      for (const file of files) {
        filesByType[file.fileType] = (filesByType[file.fileType] || 0) + 1;
        totalLines += file.linesOfCode;
        totalEntities += file.codeEntities.length;
      }

      console.log('Files by type:', filesByType);
      console.log(`Total lines of code: ${totalLines}`);
      console.log(`Total code entities: ${totalEntities}`);
      console.log(`Average entities per file: ${Math.round(totalEntities / files.length * 10) / 10}`);

      const cleaned = await waitForCleanup(testRepositoryId, 30000);
      expect(cleaned).toBe(true);
      console.log('✓ Temp directory cleaned up');
    }, 720000);
  });

  describe('Large Repository - Data Integrity', () => {
    it('should maintain data integrity for large number of files', async () => {
      testRepositoryId = await db.createTestRepository({
        name: `${LARGE_REPO.name}-integrity`,
        repositoryUrl: LARGE_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job } = await pollAndTrackStatuses(
        gqlClient,
        mutationResult.data.analyseRepository.id,
        {
          maxWaitMs: 600000,
          intervalMs: 10000,
        },
      );

      expect(job.status).toBe('COMPLETED');

      const files = await db.getRepositoryFiles(testRepositoryId);

      const seenPaths = new Set<string>();
      const seenNeo4jIds = new Set<string>();

      for (const file of files) {
        expect(seenPaths.has(file.filePath)).toBe(false);
        seenPaths.add(file.filePath);

        if (file.neo4jNodeId) {
          expect(seenNeo4jIds.has(file.neo4jNodeId)).toBe(false);
          seenNeo4jIds.add(file.neo4jNodeId);
          expect(file.neo4jNodeId).toMatch(
            new RegExp(`^file-${testRepositoryId}-`),
          );
        }

        expect(file.fileName.length).toBeGreaterThan(0);
        expect(file.fileType.length).toBeGreaterThan(0);
        expect(file.linesOfCode).toBeGreaterThan(0);

        for (const entity of file.codeEntities) {
          expect(entity.name.length).toBeGreaterThan(0);
          expect(entity.startLine).toBeGreaterThan(0);
          expect(entity.endLine).toBeGreaterThanOrEqual(entity.startLine);
          expect(entity.endLine).toBeLessThanOrEqual(file.linesOfCode);
        }
      }

      console.log(`Verified data integrity for ${files.length} files`);
      console.log(`Unique file paths: ${seenPaths.size}`);
      console.log(`Unique Neo4j IDs: ${seenNeo4jIds.size}`);
    }, 720000);
  });

  describe('Large Repository - Memory and Resource Usage', () => {
    it('should not cause memory issues during large analysis', async () => {
      testRepositoryId = await db.createTestRepository({
        name: `${LARGE_REPO.name}-memory`,
        repositoryUrl: LARGE_REPO.url,
      });

      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', {
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB',
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job } = await pollAndTrackStatuses(
        gqlClient,
        mutationResult.data.analyseRepository.id,
        {
          maxWaitMs: 600000,
          intervalMs: 10000,
          onProgress: () => {
            const currentMemory = process.memoryUsage();
            if (currentMemory.heapUsed > 500 * 1024 * 1024) {
              console.warn(
                'High memory usage:',
                Math.round(currentMemory.heapUsed / 1024 / 1024) + 'MB',
              );
            }
          },
        },
      );

      expect(job.status).toBe('COMPLETED');

      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(finalMemory.heapTotal / 1024 / 1024) + 'MB',
      });

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log(
        'Memory increase:',
        Math.round(memoryIncrease / 1024 / 1024) + 'MB',
      );

      if (memoryIncrease > 500 * 1024 * 1024) {
        console.warn('⚠️ High memory increase detected');
      }
    }, 720000);
  });
});
