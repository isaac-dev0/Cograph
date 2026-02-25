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
    it('should return nodes and edges in React Flow format', async () => {
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

    it('should apply pagination limits', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getRepositoryGraph('repo-123', { limit: 100, offset: 50 });

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('SKIP $offset'),
        expect.objectContaining({ offset: neo4jInt(50), limit: neo4jInt(100) }),
      );
    });

    it('should use default pagination when options not provided', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getRepositoryGraph('repo-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ offset: neo4jInt(0), limit: neo4jInt(500) }),
      );
    });

    it('should return empty graph when no files found', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.getRepositoryGraph('repo-123');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('getFileDependencies', () => {
    it('should traverse dependencies with specified depth', async () => {
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

    it('should handle unlimited depth', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependencies('file-123', -1);

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('IMPORTS*]'),
        expect.any(Object),
      );
    });

    it('should use default depth of 1 when not specified', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFileDependencies('file-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('IMPORTS*1..1'),
        expect.any(Object),
      );
    });

    it('should return dependency nodes and edges', async () => {
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
    it('should traverse dependents in reverse direction', async () => {
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

    it('should handle unlimited depth for dependents', async () => {
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
    it('should return the total number of file nodes for a repository', async () => {
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

    it('should return 0 when there are no files in the repository', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.getRepositoryNodeCount('repo-123');

      expect(result).toBe(0);
    });
  });

  describe('findCircularDependencies', () => {
    it('should detect circular import cycles', async () => {
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

    it('should return empty array when no cycles found', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.findCircularDependencies('repo-123');

      expect(result).toEqual([]);
    });

    it('should limit results to 100 cycles', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      await service.findCircularDependencies('repo-123');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.any(Object),
      );
    });
  });

  describe('getFilesByType', () => {
    it('should filter files by extension', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([]);
      mockPrismaService.codeEntity.findMany.mockResolvedValue([]);

      await service.getFilesByType('repo-123', 'ts');

      expect(mockNeo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.type = $fileType'),
        expect.objectContaining({ fileType: 'ts' }),
      );
    });

    it('should apply pagination to file type query', async () => {
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

    it('should return filtered files with entities and imports', async () => {
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
    it('should handle Neo4j query errors gracefully', async () => {
      mockNeo4jService.read.mockRejectedValue(new Error('Neo4j connection failed'));

      await expect(service.getRepositoryGraph('repo-123')).rejects.toThrow(
        'Neo4j connection failed',
      );
    });

    it('should handle Prisma query errors and fallback to non-enriched data', async () => {
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
