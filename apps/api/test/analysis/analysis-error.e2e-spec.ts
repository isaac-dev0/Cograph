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
import { INVALID_REPO, MALFORMED_URL_REPO } from '../fixtures/test-repositories';

describe('Analysis Flow E2E - Error Scenarios', () => {
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

  describe('Error Scenario 1: Invalid Repository URL', () => {
    it('should handle non-existent repository gracefully', async () => {
      testRepositoryId = await db.createTestRepository({
        name: INVALID_REPO.name,
        repositoryUrl: INVALID_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeUndefined();
      const jobId = mutationResult.data.analyseRepository.id;

      const { job } = await pollAndTrackStatuses(gqlClient, jobId, {
        maxWaitMs: 120000,
        intervalMs: 2000,
        onProgress: (j) =>
          console.log(`Invalid repo job: ${j.status} - ${j.errorMessage || 'no error yet'}`),
      });

      expect(job.status).toBe('FAILED');
      expect(job.errorMessage).toBeDefined();
      expect(job.errorMessage).not.toBeNull();
      expect(job.completedAt).not.toBeNull();

      expect(job.errorMessage!.length).toBeGreaterThan(0);
      console.log('Error message:', job.errorMessage);

      const files = await db.getRepositoryFiles(testRepositoryId);
      expect(files.length).toBe(0);
    }, 180000);
  });

  describe('Error Scenario 2: Malformed Repository URL', () => {
    it('should handle malformed URL gracefully', async () => {
      testRepositoryId = await db.createTestRepository({
        name: MALFORMED_URL_REPO.name,
        repositoryUrl: MALFORMED_URL_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeUndefined();
      const jobId = mutationResult.data.analyseRepository.id;

      const { job } = await pollAndTrackStatuses(gqlClient, jobId, {
        maxWaitMs: 60000,
        intervalMs: 1000,
      });

      expect(job.status).toBe('FAILED');
      expect(job.errorMessage).toBeDefined();
      expect(job.errorMessage).not.toBeNull();

      const files = await db.getRepositoryFiles(testRepositoryId);
      expect(files.length).toBe(0);
    }, 120000);
  });

  describe('Error Scenario 3: Repository Not Found in Database', () => {
    it('should return error for non-existent repository ID', async () => {
      const fakeRepoId = '00000000-0000-0000-0000-000000000000';

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: fakeRepoId });

      expect(mutationResult.errors).toBeDefined();
      expect(mutationResult.errors!.length).toBeGreaterThan(0);

      console.log('GraphQL error for non-existent repo:', mutationResult.errors);
    });
  });

  describe('Error Scenario 4: Cleanup After Failure', () => {
    it('should clean up temp directory even after analysis failure', async () => {
      testRepositoryId = await db.createTestRepository({
        name: INVALID_REPO.name,
        repositoryUrl: INVALID_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job } = await pollAndTrackStatuses(
        gqlClient,
        mutationResult.data.analyseRepository.id,
        { maxWaitMs: 120000 },
      );

      expect(job.status).toBe('FAILED');

      const cleaned = await waitForCleanup(testRepositoryId, 20000);
      expect(cleaned).toBe(true);
    }, 180000);
  });

  describe('Error Scenario 5: Authentication Required', () => {
    it('should reject requests without authentication', async () => {
      const unauthClient = new GraphQLClient(app);

      testRepositoryId = await db.createTestRepository({
        name: 'auth-test',
        repositoryUrl: 'https://github.com/example/repo',
      });

      const mutationResult = await unauthClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeDefined();
      expect(mutationResult.errors!.length).toBeGreaterThan(0);

      const errorMessage = mutationResult.errors![0].message.toLowerCase();
      expect(
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('unauthenticated') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('authentication'),
      ).toBe(true);
    });
  });

  describe('Error Scenario 6: Multiple Failed Analyses', () => {
    it('should handle multiple failed analyses without corruption', async () => {
      testRepositoryId = await db.createTestRepository({
        name: INVALID_REPO.name,
        repositoryUrl: INVALID_REPO.url,
      });

      const results = await Promise.all([
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: testRepositoryId },
        ),
        gqlClient.mutation<{ analyseRepository: AnalysisJobResult }>(
          ANALYSE_REPOSITORY_MUTATION,
          { repositoryId: testRepositoryId },
        ),
      ]);

      for (const result of results) {
        expect(result.errors).toBeUndefined();
        expect(result.data.analyseRepository.id).toBeDefined();
      }

      const jobResults = await Promise.all(
        results.map((r) =>
          pollAndTrackStatuses(gqlClient, r.data.analyseRepository.id, {
            maxWaitMs: 120000,
          }),
        ),
      );

      for (const { job } of jobResults) {
        expect(job.status).toBe('FAILED');
      }

      const jobs = await db.getAnalysisJobsForRepository(testRepositoryId);
      expect(jobs.length).toBe(2);

      const jobIds = new Set(jobs.map((j) => j.id));
      expect(jobIds.size).toBe(2);
    }, 180000);
  });
});
