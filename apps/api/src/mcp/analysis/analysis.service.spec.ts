import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@prisma/client';
import { AnalysisService } from './analysis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MCPAnalysisService } from './mcp-analysis.service';
import { Neo4jGraphService } from '../../graph/services/neo4j-graph.service';
import { RepositoryAnalysis } from '../../common/shared/analysis.interfaces';

const mockPrismaService = {
  repository: { findUnique: jest.fn() },
  analysisJob: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  repositoryFile: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  codeEntity: {
    createMany: jest.fn(),
  },
};

const mockMcpAnalysisService = {
  analyseRepository: jest.fn(),
};

const mockNeo4jGraphService = {
  deleteRepositoryGraph: jest.fn(),
  bulkCreateFileNodes: jest.fn(),
  createEntityNode: jest.fn(),
  bulkCreateImportRelationships: jest.fn(),
};

const baseRepository = {
  id: 'repo-1',
  repositoryUrl: 'https://github.com/test/repo',
  name: 'repo',
  fullName: 'test/repo',
};

const baseJob = {
  id: 'job-1',
  repositoryId: 'repo-1',
  status: AnalysisStatus.PENDING,
  progress: 0,
  filesAnalysed: 0,
  totalFiles: null,
  startedAt: new Date('2024-01-01T00:00:00Z'),
  completedAt: null,
  errorMessage: null,
  errorDetails: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const oneFileAnalysis: RepositoryAnalysis = {
  repositoryUrl: 'https://github.com/test/repo',
  analysedAt: '2024-01-01T00:00:00Z',
  summary: {
    totalFiles: 1,
    totalLines: 50,
    successfulAnalyses: 1,
    failedAnalyses: 0,
    filesByType: { ts: 1 },
  },
  files: [
    {
      filePath: '/tmp/repo/src/index.ts',
      relativePath: 'src/index.ts',
      analysis: {
        filePath: 'src/index.ts',
        fileName: 'index.ts',
        fileType: 'ts',
        lines: 50,
        imports: [],
        exports: [],
        entities: [],
      },
    },
  ],
};

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MCPAnalysisService, useValue: mockMcpAnalysisService },
        { provide: Neo4jGraphService, useValue: mockNeo4jGraphService },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startAnalysis', () => {
    beforeEach(() => {
      jest.spyOn(service, 'runAnalysis').mockResolvedValue(undefined);
    });

    it('throws NotFoundException when the repository does not exist', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(null);

      await expect(service.startAnalysis('missing-repo')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when an active job is already running', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(baseRepository);
      mockPrismaService.analysisJob.findFirst.mockResolvedValue({
        ...baseJob,
        status: AnalysisStatus.ANALYSING,
      });

      await expect(service.startAnalysis('repo-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when a completed job exists within the cooldown window', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(baseRepository);
      mockPrismaService.analysisJob.findFirst.mockResolvedValue({
        ...baseJob,
        status: AnalysisStatus.COMPLETED,
        createdAt: new Date(Date.now() - 60_000),
      });

      await expect(service.startAnalysis('repo-1')).rejects.toThrow(ConflictException);
    });

    it('creates a job and fires runAnalysis asynchronously when no conflict exists', async () => {
      mockPrismaService.repository.findUnique.mockResolvedValue(baseRepository);
      mockPrismaService.analysisJob.findFirst.mockResolvedValue(null);
      mockPrismaService.analysisJob.create.mockResolvedValue(baseJob);

      const result = await service.startAnalysis('repo-1');

      expect(result).toEqual({ jobId: 'job-1' });
      expect(service.runAnalysis).toHaveBeenCalledWith(
        'job-1',
        'repo-1',
        'https://github.com/test/repo',
      );
    });
  });

  describe('runAnalysis', () => {
    it('runs the full pipeline and marks the job as COMPLETED', async () => {
      mockPrismaService.analysisJob.update.mockResolvedValue({});
      mockPrismaService.repositoryFile.deleteMany.mockResolvedValue({ count: 0 });
      mockNeo4jGraphService.deleteRepositoryGraph.mockResolvedValue(0);
      mockNeo4jGraphService.bulkCreateFileNodes.mockResolvedValue(1);
      mockNeo4jGraphService.bulkCreateImportRelationships.mockResolvedValue(0);
      mockPrismaService.repositoryFile.create.mockResolvedValue({ id: 'file-1' });
      mockPrismaService.analysisJob.findUnique.mockResolvedValue({ filesAnalysed: 0, totalFiles: 1 });
      mockMcpAnalysisService.analyseRepository.mockImplementation(
        async (_url, _id, _opts, callback) => {
          await callback(oneFileAnalysis);
          return oneFileAnalysis;
        },
      );

      await service.runAnalysis('job-1', 'repo-1', 'https://github.com/test/repo');

      expect(mockPrismaService.analysisJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({ status: AnalysisStatus.COMPLETED }),
        }),
      );
    });

    it('marks the job as FAILED and stores the error message when the MCP service throws', async () => {
      mockPrismaService.analysisJob.update.mockResolvedValue({});
      mockPrismaService.repositoryFile.deleteMany.mockResolvedValue({ count: 0 });
      mockNeo4jGraphService.deleteRepositoryGraph.mockResolvedValue(0);
      mockMcpAnalysisService.analyseRepository.mockRejectedValue(
        new Error('MCP connection refused'),
      );

      await service.runAnalysis('job-1', 'repo-1', 'https://github.com/test/repo');

      expect(mockPrismaService.analysisJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AnalysisStatus.FAILED,
            errorMessage: 'MCP connection refused',
          }),
        }),
      );
    });
  });

  describe('getAnalysisJob', () => {
    it('throws NotFoundException when the job does not exist', async () => {
      mockPrismaService.analysisJob.findUnique.mockResolvedValue(null);

      await expect(service.getAnalysisJob('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the job with its repository when found', async () => {
      mockPrismaService.analysisJob.findUnique.mockResolvedValue({
        ...baseJob,
        repository: baseRepository,
      });

      const result = await service.getAnalysisJob('job-1');

      expect(result.id).toBe('job-1');
      expect(result.repository.id).toBe('repo-1');
    });
  });

  describe('getRepositoryFiles', () => {
    it('returns files ordered by path and includes code entities', async () => {
      const mockFile = {
        id: 'file-1',
        repositoryId: 'repo-1',
        filePath: 'src/index.ts',
        fileName: 'index.ts',
        codeEntities: [],
      };
      mockPrismaService.repositoryFile.findMany.mockResolvedValue([mockFile]);

      const result = await service.getRepositoryFiles('repo-1');

      expect(mockPrismaService.repositoryFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repositoryId: 'repo-1' },
          include: { codeEntities: true },
          orderBy: { filePath: 'asc' },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('resolveImportSource (private)', () => {
    let pathIndex: Map<string, string>;

    beforeEach(() => {
      pathIndex = new Map([
        ['src/utils.ts', 'src/utils.ts'],
        ['src/components/Button.tsx', 'src/components/Button.tsx'],
        ['components/Button.tsx', 'components/Button.tsx'],
      ]);
    });

    it('returns null for external imports that have no . or @/ prefix', () => {
      const result = (service as any).resolveImportSource('react', 'src/index.ts', pathIndex);

      expect(result).toBeNull();
    });

    it('resolves a relative import to its indexed file path', () => {
      const result = (service as any).resolveImportSource('./utils', 'src/index.ts', pathIndex);

      expect(result).toBe('src/utils.ts');
    });

    it('resolves an @/ alias by expanding it to src/', () => {
      const result = (service as any).resolveImportSource('@/utils', 'src/index.ts', pathIndex);

      expect(result).toBe('src/utils.ts');
    });

    it('falls back to the path without src/ when the @/ alias does not match inside src/', () => {
      const fallbackIndex = new Map([
        ['components/Button.tsx', 'components/Button.tsx'],
      ]);

      const result = (service as any).resolveImportSource(
        '@/components/Button',
        'src/index.ts',
        fallbackIndex,
      );

      expect(result).toBe('components/Button.tsx');
    });

    it('returns null when the import path cannot be resolved in the index', () => {
      const result = (service as any).resolveImportSource('./nonexistent', 'src/index.ts', pathIndex);

      expect(result).toBeNull();
    });
  });
});
