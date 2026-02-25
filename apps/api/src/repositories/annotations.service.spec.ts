import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnnotationsService } from './services/annotations.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

const mockPrismaService = {
  repositoryFile: {
    findUnique: jest.fn(),
  },
  annotation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const baseAnnotationRow = {
  id: 'ann-1',
  fileId: 'file-1',
  title: 'Test annotation',
  content: '# Heading\nSome content',
  tags: ['api', 'auth'],
  linkedEntityIds: [],
  authorId: 'user-1',
  authorName: 'Alice',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

const baseFileRow = {
  id: 'file-1',
  repositoryId: 'repo-1',
  filePath: 'src/auth/auth.service.ts',
  fileName: 'auth.service.ts',
};

describe('AnnotationsService', () => {
  let service: AnnotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnnotationsService>(AnnotationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAnnotations', () => {
    it('throws NotFoundException when file does not exist', async () => {
      mockPrismaService.repositoryFile.findUnique.mockResolvedValue(null);

      await expect(service.getAnnotations('missing-file')).rejects.toThrow(NotFoundException);
    });

    it('returns mapped annotations for a file', async () => {
      mockPrismaService.repositoryFile.findUnique.mockResolvedValue(baseFileRow);
      mockPrismaService.annotation.findMany.mockResolvedValue([baseAnnotationRow]);

      const result = await service.getAnnotations('file-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ann-1');
      expect(result[0].title).toBe('Test annotation');
      expect(result[0].author).toEqual({ id: 'user-1', name: 'Alice' });
    });

    it('returns empty array when file exists but has no annotations', async () => {
      mockPrismaService.repositoryFile.findUnique.mockResolvedValue(baseFileRow);
      mockPrismaService.annotation.findMany.mockResolvedValue([]);

      const result = await service.getAnnotations('file-1');

      expect(result).toEqual([]);
    });
  });

  describe('getRepositoryAnnotations', () => {
    it('returns empty array when no annotations exist for the repository', async () => {
      mockPrismaService.annotation.findMany.mockResolvedValue([]);

      const result = await service.getRepositoryAnnotations('repo-1');

      expect(result).toEqual([]);
      expect(mockPrismaService.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { file: { repositoryId: 'repo-1' } },
        }),
      );
    });

    it('returns DocumentAnnotation list with file info attached', async () => {
      const rowWithFile = {
        ...baseAnnotationRow,
        file: { filePath: 'src/auth/auth.service.ts', fileName: 'auth.service.ts' },
      };
      mockPrismaService.annotation.findMany.mockResolvedValue([rowWithFile]);

      const result = await service.getRepositoryAnnotations('repo-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ann-1');
      expect(result[0].fileId).toBe('file-1');
      expect(result[0].filePath).toBe('src/auth/auth.service.ts');
      expect(result[0].fileName).toBe('auth.service.ts');
    });

    it('orders results by createdAt descending', async () => {
      mockPrismaService.annotation.findMany.mockResolvedValue([]);

      await service.getRepositoryAnnotations('repo-1');

      expect(mockPrismaService.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('includes file fields via prisma include', async () => {
      mockPrismaService.annotation.findMany.mockResolvedValue([]);

      await service.getRepositoryAnnotations('repo-1');

      expect(mockPrismaService.annotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { file: { select: { filePath: true, fileName: true } } },
        }),
      );
    });
  });

  describe('createAnnotation', () => {
    it('throws NotFoundException when file does not exist', async () => {
      mockPrismaService.repositoryFile.findUnique.mockResolvedValue(null);

      await expect(
        service.createAnnotation('missing', { title: 'T', content: 'C' }, { id: 'u1', name: 'Alice' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates and returns annotation with correct author mapping', async () => {
      mockPrismaService.repositoryFile.findUnique.mockResolvedValue(baseFileRow);
      mockPrismaService.annotation.create.mockResolvedValue(baseAnnotationRow);

      const result = await service.createAnnotation(
        'file-1',
        { title: 'Test annotation', content: '# Heading\nSome content', tags: ['api', 'auth'] },
        { id: 'user-1', name: 'Alice' },
      );

      expect(result.id).toBe('ann-1');
      expect(result.author).toEqual({ id: 'user-1', name: 'Alice' });
    });
  });

  describe('updateAnnotation', () => {
    it('throws NotFoundException when annotation does not exist', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAnnotation('file-1', 'missing', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when annotation belongs to a different file', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue({
        ...baseAnnotationRow,
        fileId: 'different-file',
      });

      await expect(
        service.updateAnnotation('file-1', 'ann-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the author', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(baseAnnotationRow);

      await expect(
        service.updateAnnotation('file-1', 'ann-1', { title: 'New' }, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates and returns annotation', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(baseAnnotationRow);
      mockPrismaService.annotation.update.mockResolvedValue({ ...baseAnnotationRow, title: 'Updated' });

      const result = await service.updateAnnotation('file-1', 'ann-1', { title: 'Updated' }, 'user-1');

      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteAnnotation', () => {
    it('throws NotFoundException when annotation does not exist', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAnnotation('file-1', 'missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when annotation belongs to a different file', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue({
        ...baseAnnotationRow,
        fileId: 'different-file',
      });

      await expect(
        service.deleteAnnotation('file-1', 'ann-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the author', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(baseAnnotationRow);

      await expect(
        service.deleteAnnotation('file-1', 'ann-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes annotation and returns true', async () => {
      mockPrismaService.annotation.findUnique.mockResolvedValue(baseAnnotationRow);
      mockPrismaService.annotation.delete.mockResolvedValue(baseAnnotationRow);

      const result = await service.deleteAnnotation('file-1', 'ann-1', 'user-1');

      expect(result).toBe(true);
    });
  });
});
