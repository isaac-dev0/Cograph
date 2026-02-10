import { Injectable, Logger } from '@nestjs/common';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
} from '@prisma/client';
import {
  CannotRemoveOwnerException,
  InvalidOwnershipTransferException,
  MemberNotFoundException,
  ProjectNotFoundException,
  UnauthorisedProjectAccessException,
} from 'src/common/exceptions/projects.exceptions';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new project and assigns the creator as the owner.
   * This also creates a corresponding `ProjectMember` record with the `OWNER` role.
   *
   * Executed within a transaction for data consistency — both the project
   * and the owner membership must succeed or both are rolled back.
   *
   * @param {CreateProjectInput} createProjectInput - The data for the new project.
   * @returns {Promise<Project>} The created project.
   * @throws {Error} If database operations fail or the transaction is rolled back.
   */
  async create(createProjectInput: CreateProjectInput): Promise<Project> {
    return await this.prisma.$transaction(async (transactionClient) => {
      const project = await transactionClient.project.create({
        data: createProjectInput,
      });

      await transactionClient.projectMember.create({
        data: {
          projectId: project.id,
          profileId: project.ownerId,
          role: ProjectRole.OWNER,
        },
      });

      this.logger.log({ operation: 'Created' }, ProjectsService.name);

      return project;
    });
  }

  /**
   * Retrieves a project by its unique identifier.
   *
   * @param {string} projectId - The unique project ID.
   * @returns {Promise<Project>} The retrieved project.
   * @throws {ProjectNotFoundException} If no project exists with the provided ID.
   */
  async findById(projectId: string): Promise<Project> {
    try {
      return await this.prisma.project.findUniqueOrThrow({
        where: { id: projectId },
      });
    } catch {
      throw new ProjectNotFoundException(projectId);
    }
  }

  /**
   * Retrieves all projects that a given user is a member of or owns.
   *
   * @param {string} profileId - The profile ID of the user.
   * @returns {Promise<Project[]>} A list of projects associated with the user.
   */
  async findByProfileId(profileId: string): Promise<Project[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { profileId: profileId },
      include: { project: true },
    });
    return memberships.map((membership) => membership.project);
  }

  /**
   * Retrieves all project members given a project ID.
   * The calling user must be a member of the project.
   *
   * @param {string} projectId - The ID of the project.
   * @param {string} userId - The ID of the user making the request.
   * @returns {Promise<{profileId}[]>} Array of profileIds.
   * @throws {UnauthorisedProjectAccessException} If the caller is not a member.
   */
  async findProjectMembers(
    projectId: string,
    userId: string,
  ): Promise<{ profileId: string }[]> {
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, profileId: userId },
    });

    if (!membership) {
      this.logger.warn(
        `Unauthorised attempt by ${userId} to view members of project ${projectId}`,
      );
      throw new UnauthorisedProjectAccessException('view members of');
    }

    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: { profileId: true },
    });
  }

  /**
   * Updates an existing project.
   * Only the project owner or members with the `ADMIN` role can update a project.
   *
   * @param {string} projectId - The ID of the project to update.
   * @param {string} userId - The ID of the user performing the update.
   * @param {UpdateProjectInput} updateProjectInput - The update payload.
   * @returns {Promise<Project>} The updated project.
   * @throws {UnauthorisedProjectAccessException} If the user is not authorised.
   */
  async update(
    projectId: string,
    userId: string,
    updateProjectInput: UpdateProjectInput,
  ): Promise<Project> {
    await this.findAuthorisedMember(projectId, userId, 'update');

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: updateProjectInput,
    });

    this.logger.log({ operation: 'Updated' }, ProjectsService.name);

    return updatedProject;
  }

  /**
   * Updates the project role of specified member.
   * Only the current owner and admins can update other's roles.
   *
   * @param {string} projectId - The project ID.
   * @param {string} memberId - The ID of the member.
   * @param {string} role - The new role of the member.
   * @returns {Promise<ProjectMember>} The updated project member with new role.
   */
  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
  ): Promise<ProjectMember> {
    await this.findAuthorisedMember(projectId, memberId, 'update member role');

    const updatedRole = await this.prisma.projectMember.update({
      where: {
        profileId_projectId: {
          projectId: projectId,
          profileId: memberId,
        },
      },
      data: { role: role },
    });

    this.logger.log(`${memberId} now is ${role} in ${projectId}.`);

    return updatedRole;
  }

  /**
   * Transfers ownership of a project to another member.
   * Only the current owner can transfer ownership, and the new owner
   * must already be a project member.
   *
   * @param {string} projectId - The project ID.
   * @param {string} newOwnerId - The ID of the new owner.
   * @param {string} currentOwnerId - The ID of the current owner.
   * @returns {Promise<Project>} The updated project with new ownership.
   * @throws {UnauthorisedProjectAccessException} If requester is not the owner.
   * @throws {InvalidOwnershipTransferException} If the new owner is not a member.
   */
  async transferOwnership(
    projectId: string,
    ownerId: string,
    newOwnerId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { members: true },
    });

    if (project.ownerId !== ownerId) {
      throw new UnauthorisedProjectAccessException('transfer ownership of');
    }

    const newOwnerMember = project.members.find(
      (member) => member.profileId === newOwnerId,
    );
    if (!newOwnerMember) throw new InvalidOwnershipTransferException();

    const [updatedProject] = await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { ownerId: newOwnerId },
      }),
      this.prisma.projectMember.update({
        where: {
          profileId_projectId: {
            profileId: newOwnerId,
            projectId: projectId,
          },
        },
        data: { role: ProjectRole.OWNER },
      }),
      this.prisma.projectMember.upsert({
        where: {
          profileId_projectId: {
            profileId: project.ownerId,
            projectId: projectId,
          },
        },
        update: { role: ProjectRole.MEMBER },
        create: {
          profileId: project.ownerId,
          projectId: projectId,
          role: ProjectRole.MEMBER,
        },
      }),
    ]);

    this.logger.log(
      `Project ownership of ${projectId} transferred to ${newOwnerId}.`,
    );

    return updatedProject;
  }

  /**
   * Adds multiple users to a project as members.
   * Owners and admins can add new members.
   * Duplicate or existing members are skipped.
   *
   * @param {string} projectId - The project ID.
   * @param {string} userId - The ID of the acting user.
   * @param {string[]} profileIds - Array of user profile IDs to add.
   * @returns {Promise<ProjectMember[]>} The full list of members after update.
   * @throws {UnauthorisedProjectAccessException} If the user cannot modify members.
   */
  async addMembers(
    projectId: string,
    userId: string,
    profileIds: string[],
  ): Promise<ProjectMember[]> {
    await this.findAuthorisedMember(projectId, userId, 'add members to');

    const existing = await this.prisma.projectMember.findMany({
      where: { projectId: projectId, profileId: { in: profileIds } },
      select: { profileId: true },
    });

    const newIds = profileIds.filter(
      (id) => !existing.some((member) => member.profileId === id),
    );
    if (newIds.length === 0) return [];

    await this.prisma.projectMember.createMany({
      data: newIds.map((id) => ({
        projectId: projectId,
        profileId: id,
        role: ProjectRole.MEMBER,
      })),
    });

    this.logger.log(
      `User ${userId} added ${newIds.length} member(s) to project ${projectId}`,
    );

    return this.prisma.projectMember.findMany({
      where: { projectId: projectId },
    });
  }

  /**
   * Removes a member from a project.
   * Owners and admins can remove members.
   * The owner cannot be removed.
   *
   * @param {string} projectId - The project ID.
   * @param {string} userId - The ID of the acting user.
   * @param {string} profileId - The profile ID of the member to remove.
   * @returns {Promise<ProjectMember>} The removed member record.
   * @throws {CannotRemoveOwnerException} If attempting to remove the owner.
   * @throws {MemberNotFoundException} If the member does not exist.
   * @throws {UnauthorisedProjectAccessException} If the user lacks permission.
   */
  async removeMember(
    projectId: string,
    userId: string,
    profileId: string,
  ): Promise<ProjectMember> {
    const project = await this.findAuthorisedMember(
      projectId,
      userId,
      'remove members from',
    );

    if (profileId === project.ownerId) throw new CannotRemoveOwnerException();

    const existing = await this.prisma.projectMember.findUnique({
      where: {
        profileId_projectId: { projectId: projectId, profileId: profileId },
      },
    });

    if (!existing) throw new MemberNotFoundException(profileId);

    const removed = await this.prisma.projectMember.delete({
      where: {
        profileId_projectId: { projectId: projectId, profileId: profileId },
      },
    });

    this.logger.log(
      `User ${userId} removed member ${profileId} from project ${projectId}.`,
    );

    return removed;
  }

  /**
   * Archives a project (soft delete).
   * Sets the project status to `ARCHIVED` without removing it from the database.
   *
   * @param {string} projectId - The project ID to archive.
   * @returns {Promise<Project>} The updated (archived) project.
   */
  async archive(projectId: string): Promise<Project> {
    const archived = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
    });

    this.logger.log(`Project ${projectId} archived.`);

    return archived;
  }

  /**
   * Helper method to check if a user has permission to act on a project.
   * Valid for owners and members with the `ADMIN` role.
   *
   * @private
   * @param {string} projectId - The project ID to check.
   * @param {string} userId - The user's profile ID.
   * @param {string} action - A human-readable action for logging and error messages.
   * @returns {Promise<Project>} The project if the user is authorised.
   * @throws {UnauthorisedProjectAccessException} If the user is not authorised.
   */
  private async findAuthorisedMember(
    projectId: string,
    userId: string,
    action: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { profileId: userId, role: ProjectRole.ADMIN } } },
        ],
      },
    });

    if (!project) {
      this.logger.warn(
        `Unauthorised attempt by ${userId} to ${action} project ${projectId}`,
      );
      throw new UnauthorisedProjectAccessException(action);
    }

    return project;
  }
}
