import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '../helpers/test-app';
import { DatabaseHelper } from '../helpers/database-helper';
import {
  GraphQLClient,
  ANALYSE_REPOSITORY_MUTATION,
  GET_REPOSITORY_FILES_QUERY,
} from '../helpers/graphql-client';
import { generateUniqueTestUser } from '../helpers/auth-helper';
import {
  pollAndTrackStatuses,
  AnalysisJobResult,
} from '../helpers/polling-helper';
import { waitForCleanup } from '../helpers/cleanup-helper';
import { SMALL_TS_REPO, MIXED_LANG_REPO } from '../fixtures/test-repositories';

describe('Analysis Flow E2E', () => {
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

  describe('Scenario 1: Happy Path - Small TypeScript Repository', () => {
    it('should analyze a small repository successfully', async () => {
      testRepositoryId = await db.createTestRepository({
        name: SMALL_TS_REPO.name,
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeUndefined();
      expect(mutationResult.data.analyseRepository).toBeDefined();
      expect(mutationResult.data.analyseRepository.status).toBe('PENDING');
      expect(mutationResult.data.analyseRepository.repositoryId).toBe(
        testRepositoryId,
      );

      const jobId = mutationResult.data.analyseRepository.id;

      const { job, statusHistory } = await pollAndTrackStatuses(
        gqlClient,
        jobId,
        {
          maxWaitMs: 180000,
          intervalMs: 2000,
          onProgress: (j) =>
            console.log(
              `Job ${j.id}: ${j.status} - ${j.filesAnalysed}/${j.totalFiles || '?'} (${j.progress}%)`,
            ),
        },
      );

      expect(job.status).toBe('COMPLETED');
      expect(job.progress).toBe(100);
      expect(job.completedAt).not.toBeNull();
      expect(job.errorMessage).toBeNull();
      expect(job.filesAnalysed).toBeGreaterThan(0);

      expect(statusHistory).toContain('PENDING');
      expect(statusHistory).toContain('COMPLETED');

      const filesResponse = await gqlClient.query<{
        repositoryFiles: Array<{
          id: string;
          repositoryId: string;
          filePath: string;
          fileName: string;
          fileType: string;
          linesOfCode: number;
          neo4jNodeId: string | null;
          annotations: string | null;
          codeEntities: Array<{
            id: string;
            name: string;
            type: string;
            startLine: number;
            endLine: number;
            annotations: string | null;
          }>;
        }>;
      }>(GET_REPOSITORY_FILES_QUERY, { repositoryId: testRepositoryId });

      expect(filesResponse.errors).toBeUndefined();
      const files = filesResponse.data.repositoryFiles;

      expect(files.length).toBeGreaterThanOrEqual(
        SMALL_TS_REPO.expectedFileCount.min,
      );
      expect(files.length).toBeLessThanOrEqual(
        SMALL_TS_REPO.expectedFileCount.max,
      );

      for (const file of files) {
        expect(file.id).toBeDefined();
        expect(file.filePath).toBeDefined();
        expect(file.fileName).toBeDefined();
        expect(file.fileType).toBeDefined();
        expect(file.linesOfCode).toBeGreaterThan(0);

        expect(file.neo4jNodeId).toMatch(
          new RegExp(`^file-${testRepositoryId}-`),
        );
      }

      const cleaned = await waitForCleanup(testRepositoryId, 15000);
      expect(cleaned).toBe(true);
    }, 240000);
  });

  describe('Scenario 2: Mixed Language Repository (JS + TS)', () => {
    it('should analyze repository with multiple file types', async () => {
      testRepositoryId = await db.createTestRepository({
        name: MIXED_LANG_REPO.name,
        repositoryUrl: MIXED_LANG_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      expect(mutationResult.errors).toBeUndefined();
      const jobId = mutationResult.data.analyseRepository.id;

      const { job } = await pollAndTrackStatuses(gqlClient, jobId, {
        maxWaitMs: 240000,
        intervalMs: 3000,
        onProgress: (j) =>
          console.log(
            `Mixed lang job: ${j.status} - ${j.filesAnalysed}/${j.totalFiles || '?'}`,
          ),
      });

      expect(job.status).toBe('COMPLETED');

      const filesResponse = await gqlClient.query<{
        repositoryFiles: Array<{
          id: string;
          fileType: string;
        }>;
      }>(GET_REPOSITORY_FILES_QUERY, { repositoryId: testRepositoryId });

      const files = filesResponse.data.repositoryFiles;
      expect(files.length).toBeGreaterThan(0);

      const fileTypes = new Set(files.map((f) => f.fileType));
      console.log('Found file types:', Array.from(fileTypes));

      const hasExpectedType = MIXED_LANG_REPO.expectedFileTypes.some((type) =>
        fileTypes.has(type),
      );
      expect(hasExpectedType).toBe(true);
    }, 300000);
  });

  describe('Scenario 3: Code Entities Verification', () => {
    it('should extract code entities with accurate line numbers', async () => {
      testRepositoryId = await db.createTestRepository({
        name: SMALL_TS_REPO.name,
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job } = await pollAndTrackStatuses(
        gqlClient,
        mutationResult.data.analyseRepository.id,
        { maxWaitMs: 180000 },
      );

      expect(job.status).toBe('COMPLETED');

      const filesResponse = await gqlClient.query<{
        repositoryFiles: Array<{
          id: string;
          linesOfCode: number;
          codeEntities: Array<{
            id: string;
            name: string;
            type: string;
            startLine: number;
            endLine: number;
            annotations: string | null;
          }>;
        }>;
      }>(GET_REPOSITORY_FILES_QUERY, { repositoryId: testRepositoryId });

      const files = filesResponse.data.repositoryFiles;
      const filesWithEntities = files.filter(
        (f) => f.codeEntities && f.codeEntities.length > 0,
      );

      console.log(
        `Found ${filesWithEntities.length} files with code entities out of ${files.length} total files`,
      );

      expect(filesWithEntities.length).toBeGreaterThan(0);

      const validEntityTypes = [
        'function',
        'class',
        'interface',
        'type',
        'variable',
      ];

      for (const file of filesWithEntities) {
        for (const entity of file.codeEntities) {
          expect(entity.id).toBeDefined();
          expect(entity.name).toBeDefined();
          expect(entity.type).toBeDefined();
          expect(validEntityTypes).toContain(entity.type);
          expect(entity.startLine).toBeGreaterThan(0);
          expect(entity.endLine).toBeGreaterThanOrEqual(entity.startLine);
          expect(entity.endLine).toBeLessThanOrEqual(file.linesOfCode);

          if (entity.annotations) {
            const annotations = JSON.parse(entity.annotations);
            if (annotations.neo4jNodeId) {
              expect(annotations.neo4jNodeId).toMatch(
                new RegExp(`^entity-.*-${entity.name}$`),
              );
            }
          }
        }
      }
    }, 240000);
  });

  describe('Scenario 4: Database State Verification', () => {
    it('should store all analysis data correctly in database', async () => {
      testRepositoryId = await db.createTestRepository({
        name: SMALL_TS_REPO.name,
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const mutationResult = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job } = await pollAndTrackStatuses(
        gqlClient,
        mutationResult.data.analyseRepository.id,
        { maxWaitMs: 180000 },
      );

      expect(job.status).toBe('COMPLETED');

      const dbJob = await db.getAnalysisJob(job.id);
      expect(dbJob).toBeDefined();
      expect(dbJob!.status).toBe('COMPLETED');
      expect(dbJob!.filesAnalysed).toBeGreaterThan(0);
      expect(dbJob!.totalFiles).toBeGreaterThan(0);
      expect(dbJob!.progress).toBe(100);

      const dbFiles = await db.getRepositoryFiles(testRepositoryId);
      expect(dbFiles.length).toBe(dbJob!.filesAnalysed);

      for (const file of dbFiles) {
        if (file.annotations) {
          const annotations = JSON.parse(file.annotations);
          expect(annotations).toHaveProperty('imports');
          expect(annotations).toHaveProperty('exports');
          expect(Array.isArray(annotations.imports)).toBe(true);
          expect(Array.isArray(annotations.exports)).toBe(true);
        }
      }
    }, 240000);
  });

  describe('Scenario 5: Re-analysis Clears Previous Data', () => {
    it('should clear existing files when repository is re-analyzed', async () => {
      testRepositoryId = await db.createTestRepository({
        name: SMALL_TS_REPO.name,
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const mutation1 = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job: job1 } = await pollAndTrackStatuses(
        gqlClient,
        mutation1.data.analyseRepository.id,
        { maxWaitMs: 180000 },
      );
      expect(job1.status).toBe('COMPLETED');

      const files1 = await db.getRepositoryFiles(testRepositoryId);
      const fileIds1 = new Set(files1.map((f) => f.id));
      expect(files1.length).toBeGreaterThan(0);

      const mutation2 = await gqlClient.mutation<{
        analyseRepository: AnalysisJobResult;
      }>(ANALYSE_REPOSITORY_MUTATION, { repositoryId: testRepositoryId });

      const { job: job2 } = await pollAndTrackStatuses(
        gqlClient,
        mutation2.data.analyseRepository.id,
        { maxWaitMs: 180000 },
      );
      expect(job2.status).toBe('COMPLETED');

      const files2 = await db.getRepositoryFiles(testRepositoryId);
      const fileIds2 = new Set(files2.map((f) => f.id));

      const overlappingIds = [...fileIds1].filter((id) => fileIds2.has(id));
      expect(overlappingIds.length).toBe(0);

      expect(files2.length).toBe(files1.length);
    }, 480000);
  });
});
