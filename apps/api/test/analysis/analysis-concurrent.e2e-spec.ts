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
import { SMALL_TS_REPO, SMALL_TS_REPO_ALT } from '../fixtures/test-repositories';

describe('Concurrency Analysis Flow E2E', () => {
  let app: INestApplication;
  let db: DatabaseHelper;
  let gqlClient: GraphQLClient;
  let testRepositoryIds: string[] = [];

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
    for (const id of testRepositoryIds) {
      await db.cleanupRepositorySafe(id);
    }
    testRepositoryIds = [];
  });

  describe('Concurrent Analysis: Two Different Repositories', () => {
    it('should analyze two repositories simultaneously without conflicts', async () => {
      const repo1Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO.name}-1`,
        repositoryUrl: SMALL_TS_REPO.url,
      });
      const repo2Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO_ALT.name}-2`,
        repositoryUrl: SMALL_TS_REPO_ALT.url,
      });
      testRepositoryIds = [repo1Id, repo2Id];

      console.log('Starting concurrent analysis of two different repositories...');

      const [mutation1, mutation2] = await Promise.all([
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo1Id },
        ),
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo2Id },
        ),
      ]);

      expect(mutation1.errors).toBeUndefined();
      expect(mutation2.errors).toBeUndefined();

      const job1Id = mutation1.data.analyseRepository.id;
      const job2Id = mutation2.data.analyseRepository.id;

      console.log(`Job 1 ID: ${job1Id}, Job 2 ID: ${job2Id}`);

      const [result1, result2] = await Promise.all([
        pollAndTrackStatuses(gqlClient, job1Id, {
          maxWaitMs: 300000,
          intervalMs: 3000,
          onProgress: (j) =>
            console.log(`Job1: ${j.status} - ${j.filesAnalysed}/${j.totalFiles || '?'}`),
        }),
        pollAndTrackStatuses(gqlClient, job2Id, {
          maxWaitMs: 300000,
          intervalMs: 3000,
          onProgress: (j) =>
            console.log(`Job2: ${j.status} - ${j.filesAnalysed}/${j.totalFiles || '?'}`),
        }),
      ]);

      expect(result1.job.status).toBe('COMPLETED');
      expect(result2.job.status).toBe('COMPLETED');

      const files1 = await db.getRepositoryFiles(repo1Id);
      const files2 = await db.getRepositoryFiles(repo2Id);

      console.log(`Repo1 has ${files1.length} files, Repo2 has ${files2.length} files`);

      for (const file of files1) {
        expect(file.repositoryId).toBe(repo1Id);
        expect(file.neo4jNodeId).toContain(repo1Id);
      }

      for (const file of files2) {
        expect(file.repositoryId).toBe(repo2Id);
        expect(file.neo4jNodeId).toContain(repo2Id);
      }

      const allFileIds = [...files1.map((f) => f.id), ...files2.map((f) => f.id)];
      const uniqueFileIds = new Set(allFileIds);
      expect(uniqueFileIds.size).toBe(allFileIds.length);
    }, 360000);
  });

  describe('Concurrent Analysis: Same Repository URL, Different Records', () => {
    it('should not mix data between concurrent analyses of same repo URL', async () => {
      const repo1Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO.name}-concurrent-a`,
        repositoryUrl: SMALL_TS_REPO.url,
        fullName: 'test/is-number-a',
      });
      const repo2Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO.name}-concurrent-b`,
        repositoryUrl: SMALL_TS_REPO.url,
        fullName: 'test/is-number-b',
      });
      testRepositoryIds = [repo1Id, repo2Id];

      console.log('Starting concurrent analysis of same repo URL with different records...');

      const [mutation1, mutation2] = await Promise.all([
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo1Id },
        ),
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo2Id },
        ),
      ]);

      expect(mutation1.errors).toBeUndefined();
      expect(mutation2.errors).toBeUndefined();

      const [result1, result2] = await Promise.all([
        pollAndTrackStatuses(gqlClient, mutation1.data.analyseRepository.id, {
          maxWaitMs: 300000,
          intervalMs: 3000,
        }),
        pollAndTrackStatuses(gqlClient, mutation2.data.analyseRepository.id, {
          maxWaitMs: 300000,
          intervalMs: 3000,
        }),
      ]);

      expect(result1.job.status).toBe('COMPLETED');
      expect(result2.job.status).toBe('COMPLETED');

      const files1 = await db.getRepositoryFiles(repo1Id);
      const files2 = await db.getRepositoryFiles(repo2Id);

      const file1Ids = new Set(files1.map((f) => f.id));
      const file2Ids = new Set(files2.map((f) => f.id));

      for (const id of file1Ids) {
        expect(file2Ids.has(id)).toBe(false);
      }

      const paths1 = files1.map((f) => f.filePath).sort();
      const paths2 = files2.map((f) => f.filePath).sort();

      expect(paths1).toEqual(paths2);

      console.log(`Both repos have ${paths1.length} files with matching paths but unique IDs`);
    }, 360000);
  });

  describe('Concurrent Analysis: Sequential Analyses of Same Repository', () => {
    it('should handle rapid sequential analyses without data corruption', async () => {
      const repoId = await db.createTestRepository({
        name: `${SMALL_TS_REPO.name}-sequential`,
        repositoryUrl: SMALL_TS_REPO.url,
      });
      testRepositoryIds = [repoId];

      console.log('Starting rapid sequential analyses...');

      const mutation1 = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: repoId });

      const mutation2 = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: repoId });

      expect(mutation1.errors).toBeUndefined();
      expect(mutation2.errors).toBeUndefined();

      const job1Id = mutation1.data.analyseRepository.id;
      const job2Id = mutation2.data.analyseRepository.id;

      expect(job1Id).not.toBe(job2Id);

      const [result1, result2] = await Promise.all([
        pollAndTrackStatuses(gqlClient, job1Id, { maxWaitMs: 300000 }),
        pollAndTrackStatuses(gqlClient, job2Id, { maxWaitMs: 300000 }),
      ]);

      expect(result1.job.status).toBe('COMPLETED');
      expect(result2.job.status).toBe('COMPLETED');

      const files = await db.getRepositoryFiles(repoId);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        expect(file.repositoryId).toBe(repoId);
      }

      const jobs = await db.getAnalysisJobsForRepository(repoId);
      expect(jobs.length).toBe(2);
    }, 360000);
  });

  describe('Concurrent Analysis: Job Isolation', () => {
    it('should maintain job progress independently', async () => {
      const repo1Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO.name}-iso1`,
        repositoryUrl: SMALL_TS_REPO.url,
      });
      const repo2Id = await db.createTestRepository({
        name: `${SMALL_TS_REPO_ALT.name}-iso2`,
        repositoryUrl: SMALL_TS_REPO_ALT.url,
      });
      testRepositoryIds = [repo1Id, repo2Id];

      const [mutation1, mutation2] = await Promise.all([
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo1Id },
        ),
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: repo2Id },
        ),
      ]);

      const job1Progress: number[] = [];
      const job2Progress: number[] = [];

      const [result1, result2] = await Promise.all([
        pollAndTrackStatuses(gqlClient, mutation1.data.analyseRepository.id, {
          maxWaitMs: 300000,
          intervalMs: 2000,
          onProgress: (j) => job1Progress.push(j.progress),
        }),
        pollAndTrackStatuses(gqlClient, mutation2.data.analyseRepository.id, {
          maxWaitMs: 300000,
          intervalMs: 2000,
          onProgress: (j) => job2Progress.push(j.progress),
        }),
      ]);

      expect(result1.job.status).toBe('COMPLETED');
      expect(result2.job.status).toBe('COMPLETED');

      expect(job1Progress[job1Progress.length - 1]).toBe(100);
      expect(job2Progress[job2Progress.length - 1]).toBe(100);

      for (let i = 1; i < job1Progress.length; i++) {
        expect(job1Progress[i]).toBeGreaterThanOrEqual(job1Progress[i - 1]);
      }
      for (let i = 1; i < job2Progress.length; i++) {
        expect(job2Progress[i]).toBeGreaterThanOrEqual(job2Progress[i - 1]);
      }
    }, 360000);
  });
});
