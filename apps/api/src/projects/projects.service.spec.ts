import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRole, ProjectStatus } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  CannotRemoveOwnerException,
  InvalidOwnershipTransferException,
  MemberNotFoundException,
  ProjectNotFoundException,
  UnauthorisedProjectAccessException,
} from 'src/common/exceptions/projects.exceptions';

const mockTransactionClient = {
  project: { create: jest.fn() },
  projectMember: { create: jest.fn() },
};

const mockPrismaService = {
  $transaction: jest.fn().mockImplementation(async (arg) => {
    if (typeof arg === 'function') return arg(mockTransactionClient);
    return Promise.all(arg);
  }),
  project: {
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  projectMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

const baseProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: null,
  ownerId: 'user-1',
  status: ProjectStatus.ACTIVE,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const baseProjectMember = {
  projectId: 'proj-1',
  profileId: 'user-1',
  role: ProjectRole.OWNER,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates the project and owner membership inside a single transaction', async () => {
      mockTransactionClient.project.create.mockResolvedValue(baseProject);
      mockTransactionClient.projectMember.create.mockResolvedValue(baseProjectMember);

      const result = await service.create({ name: 'Test Project', ownerId: 'user-1' });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.project.create).toHaveBeenCalledWith({
        data: { name: 'Test Project', ownerId: 'user-1' },
      });
      expect(mockTransactionClient.projectMember.create).toHaveBeenCalledWith({
        data: { projectId: 'proj-1', profileId: 'user-1', role: ProjectRole.OWNER },
      });
      expect(result.id).toBe('proj-1');
    });
  });

  describe('findById', () => {
    it('throws ProjectNotFoundException when the project does not exist', async () => {
      mockPrismaService.project.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

      await expect(service.findById('missing-proj')).rejects.toThrow(ProjectNotFoundException);
    });

    it('returns the project when it exists', async () => {
      mockPrismaService.project.findUniqueOrThrow.mockResolvedValue(baseProject);

      const result = await service.findById('proj-1');

      expect(result.id).toBe('proj-1');
    });
  });

  describe('findByProfileId', () => {
    it('returns the projects the user is a member of, mapped from memberships', async () => {
      mockPrismaService.projectMember.findMany.mockResolvedValue([
        { ...baseProjectMember, project: baseProject },
      ]);

      const result = await service.findByProfileId('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('proj-1');
    });
  });

  describe('findProjectMembers', () => {
    it('throws UnauthorisedProjectAccessException when caller is not a member', async () => {
      mockPrismaService.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findProjectMembers('proj-1', 'outsider')).rejects.toThrow(
        UnauthorisedProjectAccessException,
      );
    });

    it('returns member list when caller is a valid member', async () => {
      mockPrismaService.projectMember.findFirst.mockResolvedValue(baseProjectMember);
      mockPrismaService.projectMember.findMany.mockResolvedValue([
        { ...baseProjectMember, profile: { id: 'user-1', displayName: 'Alice' } },
      ]);

      const result = await service.findProjectMembers('proj-1', 'user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('throws UnauthorisedProjectAccessException when user is not owner or admin', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.update('proj-1', 'outsider', { name: 'New Name' })).rejects.toThrow(
        UnauthorisedProjectAccessException,
      );
    });

    it('updates and returns the project when the user is authorised', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);
      mockPrismaService.project.update.mockResolvedValue({ ...baseProject, name: 'New Name' });

      const result = await service.update('proj-1', 'user-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });

  describe('addMembers', () => {
    it('throws UnauthorisedProjectAccessException when user is not authorised', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(service.addMembers('proj-1', 'outsider', ['user-2'])).rejects.toThrow(
        UnauthorisedProjectAccessException,
      );
    });

    it('skips profiles that are already members and only adds new ones', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);
      mockPrismaService.projectMember.findMany
        .mockResolvedValueOnce([{ profileId: 'user-2' }])
        .mockResolvedValueOnce([]);

      await service.addMembers('proj-1', 'user-1', ['user-2', 'user-3']);

      expect(mockPrismaService.projectMember.createMany).toHaveBeenCalledWith({
        data: [{ projectId: 'proj-1', profileId: 'user-3', role: ProjectRole.MEMBER }],
      });
    });

    it('returns an empty array immediately when all provided profiles are already members', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);
      mockPrismaService.projectMember.findMany.mockResolvedValue([{ profileId: 'user-2' }]);

      const result = await service.addMembers('proj-1', 'user-1', ['user-2']);

      expect(mockPrismaService.projectMember.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('removeMember', () => {
    it('throws CannotRemoveOwnerException when attempting to remove the project owner', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);

      await expect(service.removeMember('proj-1', 'user-1', 'user-1')).rejects.toThrow(
        CannotRemoveOwnerException,
      );
    });

    it('throws MemberNotFoundException when the target profile is not a member', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);
      mockPrismaService.projectMember.findUnique.mockResolvedValue(null);

      await expect(service.removeMember('proj-1', 'user-1', 'user-99')).rejects.toThrow(
        MemberNotFoundException,
      );
    });

    it('removes and returns the deleted member record', async () => {
      const memberToRemove = { ...baseProjectMember, profileId: 'user-2', role: ProjectRole.MEMBER };
      mockPrismaService.project.findFirst.mockResolvedValue(baseProject);
      mockPrismaService.projectMember.findUnique.mockResolvedValue(memberToRemove);
      mockPrismaService.projectMember.delete.mockResolvedValue(memberToRemove);

      const result = await service.removeMember('proj-1', 'user-1', 'user-2');

      expect(mockPrismaService.projectMember.delete).toHaveBeenCalledTimes(1);
      expect(result.profileId).toBe('user-2');
    });
  });

  describe('transferOwnership', () => {
    it('throws UnauthorisedProjectAccessException when the requester is not the current owner', async () => {
      mockPrismaService.project.findUniqueOrThrow.mockResolvedValue({
        ...baseProject,
        members: [baseProjectMember],
      });

      await expect(service.transferOwnership('proj-1', 'not-owner', 'user-2')).rejects.toThrow(
        UnauthorisedProjectAccessException,
      );
    });

    it('throws InvalidOwnershipTransferException when the new owner is not an existing member', async () => {
      mockPrismaService.project.findUniqueOrThrow.mockResolvedValue({
        ...baseProject,
        members: [],
      });

      await expect(service.transferOwnership('proj-1', 'user-1', 'user-2')).rejects.toThrow(
        InvalidOwnershipTransferException,
      );
    });

    it('transfers ownership and updates both member roles in a transaction', async () => {
      const newOwnerMember = { ...baseProjectMember, profileId: 'user-2', role: ProjectRole.MEMBER };
      mockPrismaService.project.findUniqueOrThrow.mockResolvedValue({
        ...baseProject,
        members: [baseProjectMember, newOwnerMember],
      });
      mockPrismaService.project.update.mockResolvedValue({ ...baseProject, ownerId: 'user-2' });
      mockPrismaService.projectMember.update.mockResolvedValue({ ...newOwnerMember, role: ProjectRole.OWNER });
      mockPrismaService.projectMember.upsert.mockResolvedValue({ ...baseProjectMember, role: ProjectRole.MEMBER });

      const result = await service.transferOwnership('proj-1', 'user-1', 'user-2');

      expect(result.ownerId).toBe('user-2');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('archive', () => {
    it('sets the project status to ARCHIVED', async () => {
      mockPrismaService.project.update.mockResolvedValue({
        ...baseProject,
        status: ProjectStatus.ARCHIVED,
      });

      const result = await service.archive('proj-1');

      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { status: ProjectStatus.ARCHIVED },
      });
      expect(result.status).toBe(ProjectStatus.ARCHIVED);
    });
  });
});
