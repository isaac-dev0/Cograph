import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Injectable, Scope, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsLoaders } from './projects.loaders';
import { Project as ProjectModel } from './models/project.model';
import { ProjectMember as ProjectMemberModel } from './models/project-member.model';
import { Profile as ProfileModel } from '../profiles/models/profile.model';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';
import { ProjectRole } from '@prisma/client';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Injectable({ scope: Scope.REQUEST })
@UseGuards(SupabaseJwtGuard)
@Resolver(() => ProjectModel)
export class ProjectsResolver {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly loaders: ProjectsLoaders,
  ) {}

  @Mutation(() => ProjectModel, {
    name: 'createProject',
    description: 'Creates a project given the specified parameters.',
  })
  create(
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.create({
      ...createProjectInput,
      ownerId: profile.id,
    });
  }

  @Query(() => ProjectModel, {
    name: 'findProjectById',
    description: 'Finds a project by its unique ID',
  })
  findById(@Args('projectId', { type: () => ID }) projectId: string) {
    return this.projectsService.findById(projectId);
  }

  @Query(() => [ProjectModel], {
    name: 'findProjectsByProfileId',
    description: 'Finds projects that the specified profile is a member of.',
  })
  findByProfileId(@Args('profileId', { type: () => ID }) profileId: string) {
    return this.projectsService.findByProfileId(profileId);
  }

  @Query(() => [ProjectMemberModel], {
    name: 'findProjectMembers',
    description: 'Finds all members of a project. Caller must be a member.',
  })
  findProjectMembers(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.findProjectMembers(projectId, profile.id);
  }

  @Mutation(() => ProjectModel, {
    name: 'updateProject',
    description: 'Updates an existing project.',
  })
  update(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('updateProjectInput') updateProjectInput: UpdateProjectInput,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.update(
      projectId,
      profile.id,
      updateProjectInput,
    );
  }

  @Mutation(() => ProjectMemberModel, {
    name: 'updateProjectMemberRole',
    description: "Updates a project member's role.",
  })
  updateMemberRole(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('memberId', { type: () => ID }) memberId: string,
    @Args('role', { type: () => ProjectRole }) role: ProjectRole,
  ) {
    return this.projectsService.updateMemberRole(projectId, memberId, role);
  }

  @Mutation(() => ProjectModel, {
    name: 'transferProjectOwnership',
    description: 'Transfers ownership of a project to another member.',
  })
  transferOwnership(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('newOwnerId', { type: () => ID }) newOwnerId: string,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.transferOwnership(
      projectId,
      profile.id,
      newOwnerId,
    );
  }

  @Mutation(() => [ProjectMemberModel], {
    name: 'addProjectMembers',
    description: 'Adds one or more members to a project.',
  })
  addMembers(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('profileIds', { type: () => [ID] }) profileIds: string[],
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.addMembers(
      projectId,
      profile.id,
      profileIds,
    );
  }

  @Mutation(() => ProjectMemberModel, {
    name: 'removeProjectMember',
    description: 'Removes a member from a project.',
  })
  removeMember(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('profileId', { type: () => ID }) profileId: string,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.removeMember(
      projectId,
      profile.id,
      profileId,
    );
  }

  @Mutation(() => ProjectModel, {
    name: 'archiveProject',
    description: 'Archives a project (soft delete).',
  })
  archive(@Args('projectId', { type: () => ID }) projectId: string) {
    return this.projectsService.archive(projectId);
  }

  /*
   *   +---   FIELD RESOLVERS   ---+
   */

  @ResolveField(() => ProfileModel)
  async owner(@Parent() project: ProjectModel) {
    return this.loaders.owner.load(project.ownerId);
  }

  @ResolveField(() => [ProjectMemberModel])
  async members(@Parent() project: ProjectModel) {
    return this.loaders.members.load(project.id);
  }
}
