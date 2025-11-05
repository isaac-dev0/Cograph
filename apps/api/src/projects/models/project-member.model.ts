import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProjectRole } from '@prisma/client';

registerEnumType(ProjectRole, {
  name: 'ProjectRole',
  description:
    'Specifies the level of permissions a member has within a project.',
});

@ObjectType({ description: 'Represents a user who is part of a project.' })
export class ProjectMember {
  @Field(() => ID, {
    description:
      'Unique identifier of the user (profile) associated with this membership.',
  })
  profileId: string;

  @Field(() => ID, {
    description: 'Unique identifier of the project this member belongs to.',
  })
  projectId: string;

  @Field(() => ProjectRole, {
    description:
      'Role of the user within the project, e.g., OWNER, ADMIN, or MEMBER.',
  })
  role: ProjectRole;

  @Field(() => Date, {
    description: 'Timestamp of when this member was added to the project.',
  })
  createdAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of the last update to this project member record.',
  })
  updatedAt: Date;
}
