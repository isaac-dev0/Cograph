import { Test, TestingModule } from '@nestjs/testing';
import { int as neo4jInt } from 'neo4j-driver';
import { GraphQueryService } from './graph-query.service';
import { Neo4jService } from 'nest-neo4j';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('GraphQueryService', () => {
  let service: GraphQueryService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
  };

  const mockPrismaService = {
    repositoryFile: {
      findMany: jest.fn(),
    },
    codeEntity: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphQueryService,
        { provide: Neo4jService, useValue: mockNeo4jService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GraphQueryService>(GraphQueryService);
    neo4jService = module.get<Neo4jService>(Neo4jService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRepositoryGraph', () => {
    it('returns nodes and edges with Prisma metadata merged', async () => {
      const mockNeo4jResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'f') {
                return {
                  identity: { low: 1, high: 0 },
                  labels: ['File'],
                  properties: {
                    id: 'file-1',
                    repositoryId: 'repo-123',
                    path: 'src/index.ts',
                    name: 'index.ts',
                    type: 'ts',
                    linesOfCode: 100,
                  },
                };
              }
              if (key === 'entities') return [];
              if (key === 'imports') return [];
            }),
          },
        ],
      };

      const mockPrismaFiles = [
        {
          id: 'db-file-1',
          neo4jNodeId: 'file-1',
          annotations: JSON.stringify({ imports: [] }),
          claudeSummary: 'Test file summary',
          filePath: 'src/index.ts',
          fileName: 'index.ts',
        },
      ];

      mockNeo4jService.read.mockResolvedValue(mockNeo4jResult);
      mockPrismaService.repositoryFile.findMany.mockResolvedValue(mockPrismaFiles);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      const result = await service.getRepositoryGraph('repo-123');

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(Array.isArray(result.nodes)).toBe(true);
      expect(Array.isArray(result.edges)).toBe(true);
      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].type).toBe('file');
      expect(result.nodes[0].data.claudeSummary).toBe('Test file summary');
    });

    it('applies SKIP and LIMIT to the Cypher query', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getRepositoryGraph('repo-123', { limit: 100, offset: 50 });

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('SKIP $offset'),
        expect.objectContaining({ offset: neo4jInt(50), limit: neo4jInt(100) }),
      );
    });

    it('uses offset 0 and limit 500 when no options are given', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getRepositoryGraph('repo-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ offset: neo4jInt(0), limit: neo4jInt(500) }),
      );
    });

    it('returns an empty graph when Neo4j has no records', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.getRepositoryGraph('repo-123');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('getFileDependencies', () => {
    it('builds an IMPORTS*1..N pattern for the specified depth', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependencies('file-123', 2);

      expect(mockNeo4jService.read).toHaveBeenCalledTimes(2);
      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('IMPORTS*1..2'),
        expect.any(Object),
      );
    });

    it('uses an unbounded IMPORTS* pattern when depth is -1', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependencies('file-123', -1);

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('IMPORTS*]'),
        expect.any(Object),
      );
    });

    it('defaults to IMPORTS*1..1 when depth is omitted', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependencies('file-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('IMPORTS*1..1'),
        expect.any(Object),
      );
    });

    it('returns the resolved dependency nodes and edges', async () => {
      const mockNodesResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'node') {
                return {
                  identity: { low: 2, high: 0 },
                  labels: ['File'],
                  properties: {
                    id: 'file-2',
                    repositoryId: 'repo-123',
                    path: 'src/utils.ts',
                    name: 'utils.ts',
                    type: 'ts',
                    linesOfCode: 50,
                  },
                };
              }
              if (key === 'entities') return [];
            }),
          },
        ],
      };

      const mockEdgesResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'r') {
                return {
                  identity: { low: 1, high: 0 },
                  type: 'IMPORTS',
                  properties: { specifiers: ['util1', 'util2'] },
                };
              }
              if (key === 'source') {
                return { identity: { low: 1, high: 0 }, properties: { id: 'file-123' } };
              }
              if (key === 'target') {
                return { identity: { low: 2, high: 0 }, properties: { id: 'file-2' } };
              }
            }),
          },
        ],
      };

      mockNeo4jService.read
        .mockResolvedValueOnce(mockNodesResult)
        .mockResolvedValueOnce(mockEdgesResult);
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      const result = await service.getFileDependencies('file-123', 1);

      expect(result.nodes.length).toBe(1);
      expect(result.edges.length).toBe(1);
      expect(result.edges[0].type).toBe('imports');
    });
  });

  describe('getFileDependents', () => {
    it('queries incoming IMPORTS edges in reverse direction', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependents('file-123', 2);

      expect(mockNeo4jService.read).toHaveBeenCalledTimes(2);
      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('-[:IMPORTS*1..2]->'),
        expect.any(Object),
      );
    });

    it('uses an unbounded pattern for dependents when depth is -1', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependents('file-123', -1);

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('-[:IMPORTS*]->'),
        expect.any(Object),
      );
    });
  });

  describe('getRepositoryNodeCount', () => {
    it('returns the total file node count', async () => {
      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({ toNumber: () => 42 }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockResult);

      const result = await service.getRepositoryNodeCount('repo-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('count(f) as total'),
        { repositoryId: 'repo-123' },
      );
      expect(result).toBe(42);
    });

    it('returns 0 when Neo4j has no records', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.getRepositoryNodeCount('repo-123');

      expect(result).toBe(0);
    });
  });

  describe('findCircularDependencies', () => {
    it('detects cycles and maps them to the expected shape', async () => {
      const mockResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'cycleIds') return ['file-1', 'file-2', 'file-1'];
              if (key === 'cyclePaths') return ['a.ts', 'b.ts', 'a.ts'];
              if (key === 'cycleLength') return { toNumber: () => 2 };
            }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockResult);

      const result = await service.findCircularDependencies('repo-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('cycle');
      expect(result[0]).toHaveProperty('paths');
      expect(result[0].cycle).toEqual(['file-1', 'file-2', 'file-1']);
      expect(result[0].paths).toEqual(['a.ts', 'b.ts', 'a.ts']);
      expect(result[0].length).toBe(2);
    });

    it('returns an empty array when Neo4j has no records', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.findCircularDependencies('repo-123');

      expect(result).toEqual([]);
    });

    it('passes a LIMIT 100 clause to the Cypher query', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      await service.findCircularDependencies('repo-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.any(Object),
      );
    });
  });

  describe('getFilesByType', () => {
    it('filters nodes by fileType in the Cypher query', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFilesByType('repo-123', 'ts');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.type = $fileType'),
        expect.objectContaining({ fileType: 'ts' }),
      );
    });

    it('applies pagination to the file type query', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFilesByType('repo-123', 'tsx', { limit: 50, offset: 10 });

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          repositoryId: 'repo-123',
          fileType: 'tsx',
          offset: neo4jInt(10),
          limit: neo4jInt(50),
        }),
      );
    });

    it('returns nodes with the matching file type', async () => {
      const mockNeo4jResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'f') {
                return {
                  identity: { low: 1, high: 0 },
                  labels: ['File'],
                  properties: {
                    id: 'file-1',
                    repositoryId: 'repo-123',
                    path: 'src/index.tsx',
                    name: 'index.tsx',
                    type: 'tsx',
                    linesOfCode: 150,
                  },
                };
              }
              if (key === 'entities') return [];
              if (key === 'imports') return [];
            }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockNeo4jResult);
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      const result = await service.getFilesByType('repo-123', 'tsx');

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].data.fileType).toBe('tsx');
    });
  });

  describe('Error Handling', () => {
    it('propagates Neo4j errors', async () => {
      mockNeo4jService.read.mockRejectedValue(new Error('Neo4j connection failed'));

      await expect(service.getRepositoryGraph('repo-123')).rejects.toThrow(
        'Neo4j connection failed',
      );
    });

    it('returns nodes without enrichment when Prisma fails', async () => {
      const mockNeo4jResult = {
        records: [
          {
            get: jest.fn((key) => {
              if (key === 'f') {
                return {
                  identity: { low: 1, high: 0 },
                  labels: ['File'],
                  properties: {
                    id: 'file-1',
                    repositoryId: 'repo-123',
                    path: 'src/index.ts',
                    name: 'index.ts',
                    type: 'ts',
                    linesOfCode: 100,
                  },
                };
              }
              if (key === 'entities') return [];
              if (key === 'imports') return [];
            }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockNeo4jResult);
      mockPrismaService.repositoryFile.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getRepositoryGraph('repo-123');

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].data.claudeSummary).toBeUndefined();
    });
  });
});
