import { PrismaClient, AnalysisStatus } from '@prisma/client';

export interface TestRepositoryData {
  name: string;
  repositoryUrl: string;
  fullName?: string;
}

export interface AnalysisJobData {
  id: string;
  repositoryId: string;
  status: AnalysisStatus;
  progress: number;
  filesAnalysed: number;
  totalFiles: number | null;
  errorMessage: string | null;
  errorDetails: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryFileData {
  id: string;
  repositoryId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  linesOfCode: number;
  neo4jNodeId: string | null;
  annotations: string | null;
  claudeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  codeEntities: CodeEntityData[];
}

export interface CodeEntityData {
  id: string;
  repositoryFileId: string;
  name: string;
  type: string;
  startLine: number;
  endLine: number;
  annotations: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseHelper {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async createTestRepository(data: TestRepositoryData): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);

    const repo = await this.prisma.repository.create({
      data: {
        githubId: randomId + timestamp,
        nodeId: `test-node-${timestamp}-${randomId}`,
        name: data.name,
        fullName: data.fullName || `test/${data.name}`,
        repositoryUrl: data.repositoryUrl,
        ownerLogin: 'test-owner',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/ghost.png',
        isPrivate: false,
        githubCreatedAt: new Date(),
        githubUpdatedAt: new Date(),
        githubPushedAt: new Date(),
      },
    });

    return repo.id;
  }

  async cleanupRepository(repositoryId: string): Promise<void> {
    await this.prisma.repository.delete({
      where: { id: repositoryId },
    });
  }

  async cleanupRepositorySafe(repositoryId: string): Promise<void> {
    try {
      await this.cleanupRepository(repositoryId);
    } catch {
      /* Ignore Errors */
    }
  }

  async getAnalysisJob(jobId: string): Promise<AnalysisJobData | null> {
    return this.prisma.analysisJob.findUnique({
      where: { id: jobId },
    });
  }

  async getRepositoryFiles(repositoryId: string): Promise<RepositoryFileData[]> {
    return this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: { codeEntities: true },
      orderBy: { filePath: 'asc' },
    });
  }

  async getCodeEntities(repositoryFileId: string): Promise<CodeEntityData[]> {
    return this.prisma.codeEntity.findMany({
      where: { repositoryFileId },
      orderBy: { startLine: 'asc' },
    });
  }

  async getAnalysisJobsForRepository(repositoryId: string): Promise<AnalysisJobData[]> {
    return this.prisma.analysisJob.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async repositoryExists(repositoryId: string): Promise<boolean> {
    const count = await this.prisma.repository.count({
      where: { id: repositoryId },
    });
    return count > 0;
  }
}
