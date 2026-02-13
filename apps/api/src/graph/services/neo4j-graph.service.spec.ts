import { Test, TestingModule } from '@nestjs/testing';
import { Neo4jGraphService } from './neo4j-graph.service';
import { FileNodeData, EntityNodeData, ImportRelationshipData } from '../../common/shared/graph.interfaces';
import { Neo4jService } from 'nest-neo4j';

describe('Neo4jGraphService', () => {
  let service: Neo4jGraphService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    write: jest.fn(),
    read: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Neo4jGraphService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService,
        },
      ],
    }).compile();

    service = module.get<Neo4jGraphService>(Neo4jGraphService);
    neo4jService = module.get<Neo4jService>(Neo4jService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFileNode', () => {
    it('should create a file node with correct parameters', async () => {
      const fileData: FileNodeData = {
        id: 'file-123',
        repositoryId: 'repo-456',
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'ts',
        linesOfCode: 100,
      };

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: fileData,
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.createFileNode(fileData);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (f:File'),
        expect.objectContaining({
          id: fileData.id,
          repositoryId: fileData.repositoryId,
          path: fileData.path,
          name: fileData.name,
          type: fileData.type,
          linesOfCode: fileData.linesOfCode,
        }),
      );

      expect(result).toEqual(fileData);
    });

    it('should throw error if file creation fails', async () => {
      const fileData: FileNodeData = {
        id: 'file-123',
        repositoryId: 'repo-456',
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'ts',
        linesOfCode: 100,
      };

      mockNeo4jService.write.mockResolvedValue({ records: [] });

      await expect(service.createFileNode(fileData)).rejects.toThrow('Failed to create file node');
    });
  });

  describe('createEntityNode', () => {
    it('should create an entity node and link it to a file', async () => {
      const entityData: EntityNodeData = {
        id: 'entity-789',
        fileId: 'file-123',
        name: 'myFunction',
        type: 'Function',
        startLine: 10,
        endLine: 20,
      };

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: entityData,
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.createEntityNode(entityData);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (e:Function'),
        expect.objectContaining({
          fileId: entityData.fileId,
          id: entityData.id,
          name: entityData.name,
          type: entityData.type,
          startLine: entityData.startLine,
          endLine: entityData.endLine,
        }),
      );

      expect(result).toEqual(entityData);
    });
  });

  describe('createImportRelationship', () => {
    it('should create an import relationship between two files', async () => {
      const importData: ImportRelationshipData = {
        sourceFileId: 'file-123',
        targetFileId: 'file-456',
        specifiers: ['myFunction', 'myClass'],
      };

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              properties: {
                specifiers: importData.specifiers,
              },
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.createImportRelationship(importData);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (from)-[r:IMPORTS'),
        expect.objectContaining({
          sourceFileId: importData.sourceFileId,
          targetFileId: importData.targetFileId,
          specifiers: importData.specifiers,
        }),
      );

      expect(result.specifiers).toEqual(importData.specifiers);
    });
  });

  describe('deleteRepositoryGraph', () => {
    it('should delete all nodes for a repository', async () => {
      const repositoryId = 'repo-456';

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              toNumber: () => 5,
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.deleteRepositoryGraph(repositoryId);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE'),
        { repositoryId },
      );

      expect(result).toBe(5);
    });
  });

  describe('getFileNode', () => {
    it('should retrieve a file node with entities', async () => {
      const fileId = 'file-123';

      const mockResult = {
        records: [
          {
            get: jest.fn((key: string) => {
              if (key === 'f') {
                return {
                  properties: {
                    id: fileId,
                    path: 'src/index.ts',
                    name: 'index.ts',
                  },
                };
              }
              if (key === 'entities') {
                return [
                  {
                    properties: {
                      id: 'entity-1',
                      name: 'myFunction',
                      type: 'Function',
                    },
                  },
                ];
              }
            }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockResult);

      const result = await service.getFileNode(fileId);

      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (f:File {id: $fileId})'),
        { fileId },
      );

      expect(result).toEqual({
        id: fileId,
        path: 'src/index.ts',
        name: 'index.ts',
        entities: [
          {
            id: 'entity-1',
            name: 'myFunction',
            type: 'Function',
          },
        ],
      });
    });

    it('should return null if file node not found', async () => {
      const fileId = 'non-existent-file';

      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.getFileNode(fileId);

      expect(result).toBeNull();
    });
  });

  describe('bulkCreateFileNodes', () => {
    it('should bulk create multiple file nodes', async () => {
      const files: FileNodeData[] = [
        {
          id: 'file-1',
          repositoryId: 'repo-456',
          path: 'src/index.ts',
          name: 'index.ts',
          type: 'ts',
          linesOfCode: 100,
        },
        {
          id: 'file-2',
          repositoryId: 'repo-456',
          path: 'src/utils.ts',
          name: 'utils.ts',
          type: 'ts',
          linesOfCode: 50,
        },
      ];

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              toNumber: () => 2,
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.bulkCreateFileNodes(files);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND $files'),
        { files },
      );

      expect(result).toBe(2);
    });
  });

  describe('bulkCreateImportRelationships', () => {
    it('should bulk create multiple import relationships', async () => {
      const imports: ImportRelationshipData[] = [
        {
          sourceFileId: 'file-1',
          targetFileId: 'file-2',
          specifiers: ['myFunction'],
        },
        {
          sourceFileId: 'file-1',
          targetFileId: 'file-3',
          specifiers: ['myClass'],
        },
      ];

      const mockResult = {
        records: [
          {
            get: jest.fn().mockReturnValue({
              toNumber: () => 2,
            }),
          },
        ],
      };

      mockNeo4jService.write.mockResolvedValue(mockResult);

      const result = await service.bulkCreateImportRelationships(imports);

      expect(neo4jService.write).toHaveBeenCalledWith(
        expect.stringContaining('UNWIND $imports'),
        { imports },
      );

      expect(result).toBe(2);
    });
  });

  describe('getRepositoryGraph', () => {
    it('should retrieve all files and relationships for a repository', async () => {
      const repositoryId = 'repo-456';

      const mockResult = {
        records: [
          {
            get: jest.fn((key: string) => {
              if (key === 'f') {
                return {
                  properties: {
                    id: 'file-1',
                    path: 'src/index.ts',
                  },
                };
              }
              if (key === 'entities') {
                return [
                  {
                    properties: {
                      id: 'entity-1',
                      name: 'myFunction',
                    },
                  },
                ];
              }
              if (key === 'imports') {
                return [
                  {
                    file: {
                      properties: {
                        id: 'file-2',
                        path: 'src/utils.ts',
                      },
                    },
                    specifiers: ['utils'],
                  },
                ];
              }
            }),
          },
        ],
      };

      mockNeo4jService.read.mockResolvedValue(mockResult);

      const result = await service.getRepositoryGraph(repositoryId);

      expect(neo4jService.read).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (f:File {repositoryId: $repositoryId})'),
        { repositoryId },
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('entities');
      expect(result[0]).toHaveProperty('imports');
    });
  });
});
