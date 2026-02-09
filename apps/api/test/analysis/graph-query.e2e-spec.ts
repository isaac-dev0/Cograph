import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '../helpers/test-app';
import { DatabaseHelper } from '../helpers/database-helper';
import { SMALL_TS_REPO } from '../fixtures/test-repositories';
import { GraphQueryService } from 'src/graph/services/graph-query.service';
import { Neo4jGraphService } from 'src/graph/services/neo4j-graph.service';

describe('GraphQueryService', () => {
  let app: INestApplication;
  let db: DatabaseHelper;
  let neo4jGraphService: Neo4jGraphService;
  let graphQueryService: GraphQueryService;
  let testRepositoryId: string | undefined;

  beforeAll(async () => {
    app = await createTestApp();
    db = new DatabaseHelper();
    await db.connect();

    neo4jGraphService = app.get(Neo4jGraphService);
    graphQueryService = app.get(GraphQueryService);
  }, 120000);

  afterAll(async () => {
    await db.disconnect();
    await closeTestApp();
  });

  afterEach(async () => {
    if (testRepositoryId) {
      await neo4jGraphService.deleteRepositoryGraph(testRepositoryId);
      await db.cleanupRepositorySafe(testRepositoryId);
      testRepositoryId = undefined;
    }
  });

  describe('getRepositoryGraph', () => {
    it('should return complete graph with enriched metadata', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'graph-query-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const prisma = (db as any).prisma;
      await prisma.repositoryFile.create({
        data: {
          repositoryId: testRepositoryId,
          filePath: 'src/index.ts',
          fileName: 'index.ts',
          fileType: 'ts',
          linesOfCode: 100,
          neo4jNodeId: `file-${testRepositoryId}-src/index.ts`,
          annotations: JSON.stringify({ imports: [] }),
          claudeSummary: 'Main entry point file',
        },
      });

      await prisma.repositoryFile.create({
        data: {
          repositoryId: testRepositoryId,
          filePath: 'src/utils.ts',
          fileName: 'utils.ts',
          fileType: 'ts',
          linesOfCode: 50,
          neo4jNodeId: `file-${testRepositoryId}-src/utils.ts`,
          annotations: JSON.stringify({ imports: [] }),
          claudeSummary: 'Utility functions',
        },
      });

      await neo4jGraphService.createFileNode({
        id: `file-${testRepositoryId}-src/index.ts`,
        repositoryId: testRepositoryId,
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'ts',
        linesOfCode: 100,
      });

      await neo4jGraphService.createFileNode({
        id: `file-${testRepositoryId}-src/utils.ts`,
        repositoryId: testRepositoryId,
        path: 'src/utils.ts',
        name: 'utils.ts',
        type: 'ts',
        linesOfCode: 50,
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: `file-${testRepositoryId}-src/index.ts`,
        toFileId: `file-${testRepositoryId}-src/utils.ts`,
        specifiers: ['utilFunc'],
      });

      const graph = await graphQueryService.getRepositoryGraph(testRepositoryId);

      expect(graph).toBeDefined();
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      const fileNode = graph.nodes.find((n) => n.data.path === 'src/index.ts');
      expect(fileNode).toBeDefined();
      expect(fileNode?.type).toBe('file');
      expect(fileNode?.data.claudeSummary).toBe('Main entry point file');
      expect(fileNode?.data.annotations).toBeDefined();

      const importEdge = graph.edges.find((e) => e.type === 'imports');
      expect(importEdge).toBeDefined();
      expect(importEdge?.data?.specifiers).toContain('utilFunc');
    }, 60000);

    it('should support pagination', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'pagination-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const prisma = (db as any).prisma;
      for (let i = 0; i < 10; i++) {
        await prisma.repositoryFile.create({
          data: {
            repositoryId: testRepositoryId,
            filePath: `src/file${i}.ts`,
            fileName: `file${i}.ts`,
            fileType: 'ts',
            linesOfCode: 10,
            neo4jNodeId: `file-${testRepositoryId}-src/file${i}.ts`,
          },
        });

        await neo4jGraphService.createFileNode({
          id: `file-${testRepositoryId}-src/file${i}.ts`,
          repositoryId: testRepositoryId,
          path: `src/file${i}.ts`,
          name: `file${i}.ts`,
          type: 'ts',
          linesOfCode: 10,
        });
      }

      const page1 = await graphQueryService.getRepositoryGraph(testRepositoryId, {
        limit: 5,
        offset: 0,
      });

      const page2 = await graphQueryService.getRepositoryGraph(testRepositoryId, {
        limit: 5,
        offset: 5,
      });

      expect(page1.nodes.length).toBeLessThanOrEqual(5);
      expect(page2.nodes.length).toBeLessThanOrEqual(5);

      const page1Ids = new Set(page1.nodes.map((n) => n.id));
      const page2Ids = new Set(page2.nodes.map((n) => n.id));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection.length).toBe(0); // No overlap
    }, 60000);
  });

  describe('getFileDependencies', () => {
    it('should traverse dependency tree correctly', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'dependencies-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const fileAId = `file-${testRepositoryId}-src/a.ts`;
      const fileBId = `file-${testRepositoryId}-src/b.ts`;
      const fileCId = `file-${testRepositoryId}-src/c.ts`;

      await neo4jGraphService.createFileNode({
        id: fileAId,
        repositoryId: testRepositoryId,
        path: 'src/a.ts',
        name: 'a.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileBId,
        repositoryId: testRepositoryId,
        path: 'src/b.ts',
        name: 'b.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileCId,
        repositoryId: testRepositoryId,
        path: 'src/c.ts',
        name: 'c.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileAId,
        toFileId: fileBId,
        specifiers: ['funcB'],
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileBId,
        toFileId: fileCId,
        specifiers: ['funcC'],
      });

      const depth1 = await graphQueryService.getFileDependencies(fileAId, 1);
      const depth1Files = depth1.nodes.filter((n) => n.type === 'file');
      expect(depth1Files.length).toBe(1);
      expect(depth1Files[0].data.path).toBe('src/b.ts');

      const depth2 = await graphQueryService.getFileDependencies(fileAId, 2);
      const depth2Files = depth2.nodes.filter((n) => n.type === 'file');
      expect(depth2Files.length).toBe(2);
      const paths = depth2Files.map((f) => f.data.path).sort();
      expect(paths).toContain('src/b.ts');
      expect(paths).toContain('src/c.ts');
    }, 60000);
  });

  describe('getFileDependents', () => {
    it('should find files that import a given file', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'dependents-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const fileAId = `file-${testRepositoryId}-src/a.ts`;
      const fileBId = `file-${testRepositoryId}-src/b.ts`;
      const fileCId = `file-${testRepositoryId}-src/c.ts`;

      await neo4jGraphService.createFileNode({
        id: fileAId,
        repositoryId: testRepositoryId,
        path: 'src/a.ts',
        name: 'a.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileBId,
        repositoryId: testRepositoryId,
        path: 'src/b.ts',
        name: 'b.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileCId,
        repositoryId: testRepositoryId,
        path: 'src/c.ts',
        name: 'c.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileAId,
        toFileId: fileCId,
        specifiers: ['funcC'],
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileBId,
        toFileId: fileCId,
        specifiers: ['funcC'],
      });

      const dependents = await graphQueryService.getFileDependents(fileCId, 1);
      const dependentFiles = dependents.nodes.filter((n) => n.type === 'file');

      expect(dependentFiles.length).toBe(2);
      const paths = dependentFiles.map((f) => f.data.path).sort();
      expect(paths).toContain('src/a.ts');
      expect(paths).toContain('src/b.ts');
    }, 60000);
  });

  describe('findCircularDependencies', () => {
    it('should detect circular import cycles', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'circular-deps-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const fileAId = `file-${testRepositoryId}-src/a.ts`;
      const fileBId = `file-${testRepositoryId}-src/b.ts`;

      await neo4jGraphService.createFileNode({
        id: fileAId,
        repositoryId: testRepositoryId,
        path: 'src/a.ts',
        name: 'a.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileBId,
        repositoryId: testRepositoryId,
        path: 'src/b.ts',
        name: 'b.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileAId,
        toFileId: fileBId,
        specifiers: ['funcB'],
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileBId,
        toFileId: fileAId,
        specifiers: ['funcA'],
      });

      const cycles = await graphQueryService.findCircularDependencies(
        testRepositoryId,
      );

      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles[0];
      expect(cycle.cycle).toBeDefined();
      expect(cycle.paths).toBeDefined();
      expect(cycle.length).toBeGreaterThan(0);

      expect(cycle.paths).toContain('src/a.ts');
      expect(cycle.paths).toContain('src/b.ts');
    }, 60000);

    it('should return empty array when no cycles exist', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'no-cycles-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      const fileAId = `file-${testRepositoryId}-src/a.ts`;
      const fileBId = `file-${testRepositoryId}-src/b.ts`;

      await neo4jGraphService.createFileNode({
        id: fileAId,
        repositoryId: testRepositoryId,
        path: 'src/a.ts',
        name: 'a.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createFileNode({
        id: fileBId,
        repositoryId: testRepositoryId,
        path: 'src/b.ts',
        name: 'b.ts',
        type: 'ts',
        linesOfCode: 10,
      });

      await neo4jGraphService.createImportRelationship({
        fromFileId: fileAId,
        toFileId: fileBId,
        specifiers: ['funcB'],
      });

      const cycles = await graphQueryService.findCircularDependencies(
        testRepositoryId,
      );

      expect(cycles).toEqual([]);
    }, 60000);
  });

  describe('getFilesByType', () => {
    it('should filter files by extension', async () => {
      testRepositoryId = await db.createTestRepository({
        name: 'file-type-test',
        repositoryUrl: SMALL_TS_REPO.url,
      });

      await neo4jGraphService.createFileNode({
        id: `file-${testRepositoryId}-src/index.ts`,
        repositoryId: testRepositoryId,
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'ts',
        linesOfCode: 100,
      });

      await neo4jGraphService.createFileNode({
        id: `file-${testRepositoryId}-src/component.tsx`,
        repositoryId: testRepositoryId,
        path: 'src/component.tsx',
        name: 'component.tsx',
        type: 'tsx',
        linesOfCode: 50,
      });

      await neo4jGraphService.createFileNode({
        id: `file-${testRepositoryId}-src/utils.js`,
        repositoryId: testRepositoryId,
        path: 'src/utils.js',
        name: 'utils.js',
        type: 'js',
        linesOfCode: 30,
      });

      const tsFiles = await graphQueryService.getFilesByType(
        testRepositoryId,
        'ts',
      );

      expect(tsFiles.nodes.length).toBe(1);
      expect(tsFiles.nodes[0].data.fileType).toBe('ts');
      expect(tsFiles.nodes[0].data.path).toBe('src/index.ts');

      const tsxFiles = await graphQueryService.getFilesByType(
        testRepositoryId,
        'tsx',
      );

      expect(tsxFiles.nodes.length).toBe(1);
      expect(tsxFiles.nodes[0].data.fileType).toBe('tsx');
      expect(tsxFiles.nodes[0].data.path).toBe('src/component.tsx');

      const jsFiles = await graphQueryService.getFilesByType(
        testRepositoryId,
        'js',
      );

      expect(jsFiles.nodes.length).toBe(1);
      expect(jsFiles.nodes[0].data.fileType).toBe('js');
    }, 60000);
  });
});
