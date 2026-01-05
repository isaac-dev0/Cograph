import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SyncRepositoriesInput {
  @Field(() => String, {
    description: 'GitHub access token for authenticating with GitHub API',
  })
  githubToken: string;
}

