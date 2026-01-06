import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class SyncRepositoriesInput {
  @Field(() => String, {
    description: 'GitHub access token for authenticating with GitHub API',
  })
  @IsString()
  @IsNotEmpty()
  githubToken: string;
}

