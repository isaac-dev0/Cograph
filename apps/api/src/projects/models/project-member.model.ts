import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ProjectRole } from '@prisma/client';

@ObjectType()
export class ProjectMember {
  @Field(() => ID)
  profileId: string;

  @Field(() => ID)
  projectId: string;

  @Field(() => ProjectRole, { description: 'Role of the user' })
  role: ProjectRole;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
