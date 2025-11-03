import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class RemoveProjectUserInput {
  @Field(() => String, { description: 'Profile ID of the User' })
  profileId: string;

  @Field(() => String, { description: 'Project ID of the Project' })
  projectId: string;
}