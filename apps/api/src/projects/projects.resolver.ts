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

  @Mutation(() => ProjectModel, { name: 'createProject' })
  create(
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.create({
      ...createProjectInput,
      ownerId: profile.id,
    });
  }

  @Query(() => ProjectModel, { name: 'findProjectById' })
  findById(@Args('projectId', { type: () => ID }) projectId: string) {
    return this.projectsService.findById(projectId);
  }

  @Query(() => [ProjectModel], { name: 'findProjectsByProfileId' })
  findByProfileId(@Args('profileId', { type: () => ID }) profileId: string) {
    return this.projectsService.findByProfileId(profileId);
  }

  @Query(() => [ProjectMemberModel], { name: 'findProjectMembers' })
  findProjectMembers(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() profile: ProfileModel,
  ) {
    return this.projectsService.findProjectMembers(projectId, profile.id);
  }

  @Mutation(() => ProjectModel, { name: 'updateProject' })
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

  @Mutation(() => ProjectMemberModel, { name: 'updateProjectMemberRole' })
  updateMemberRole(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('memberId', { type: () => ID }) memberId: string,
    @Args('role', { type: () => ProjectRole }) role: ProjectRole,
  ) {
    return this.projectsService.updateMemberRole(projectId, memberId, role);
  }

  @Mutation(() => ProjectModel, { name: 'transferProjectOwnership' })
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

  @Mutation(() => [ProjectMemberModel], { name: 'addProjectMembers' })
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

  @Mutation(() => ProjectMemberModel, { name: 'removeProjectMember' })
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

  @Mutation(() => ProjectModel, { name: 'archiveProject' })
  archive(@Args('projectId', { type: () => ID }) projectId: string) {
    return this.projectsService.archive(projectId);
  }

  @ResolveField(() => ProfileModel)
  async owner(@Parent() project: ProjectModel) {
    return this.loaders.owner.load(project.ownerId);
  }

  @ResolveField(() => [ProjectMemberModel])
  async members(@Parent() project: ProjectModel) {
    return this.loaders.members.load(project.id);
  }
}
