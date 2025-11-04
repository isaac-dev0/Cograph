import { Field, InputType } from '@nestjs/graphql';
import { ProjectRole } from '@prisma/client';

@InputType()
export class AddProjectMemberInput {
  @Field(() => String, { description: 'Profile ID of the User' })
  profileId: string;

  @Field(() => String, { description: 'Project ID of the Project' })
  projectId: string;

  @Field(() => String, {
    defaultValue: ProjectRole.GUEST,
    description: 'Role of the User',
  })
  role: ProjectRole;
}
