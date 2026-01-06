import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProjectStatus } from '@prisma/client';
import { ProjectMember as ProjectMemberModel } from './project-member.model';
import { Profile as ProfileModel } from '../../profiles/models/profile.model';

registerEnumType(ProjectStatus, {
  name: 'ProjectStatus',
  description: 'Specifies the status of a project.',
});

@ObjectType({
  description:
    'A project that contains members, an owner, and metadata such as name and description.',
})
export class Project {
  @Field(() => ID, { description: 'Unique identifier of the project.' })
  id: string;

  @Field(() => String, {
    description: 'The name of the project.',
  })
  name: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Optional text description of the project's purpose or details.",
  })
  description?: string;

  @Field(() => String, {
    nullable: true,
    description: 'URL to the project logo image.',
  })
  icon?: string;

  @Field(() => ID, {
    description: 'Unique identifier of the user who owns this project.',
  })
  ownerId: string;

  @Field(() => ProjectStatus, {
    description: 'Status of the project, e.g., ACTIVE, ARCHIVED',
  })
  status: ProjectStatus;

  @Field(() => Date, {
    description: 'Timestamp of when the project was created.',
  })
  createdAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of the last update to the project.',
  })
  updatedAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of when the project was archived.',
    nullable: true,
  })
  archivedAt?: Date;

  @Field(() => ProfileModel, {
    description: 'Owner object of the project',
    nullable: true,
  })
  owner?: ProfileModel;

  @Field(() => [ProjectMemberModel], {
    description: 'Members of the project',
    nullable: true,
  })
  members?: ProjectMemberModel[];
}
