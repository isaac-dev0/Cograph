import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field(() => String, { description: 'Name of the project' })
  name: string;

  @Field(() => String, { description: 'Description of the project', nullable: true })
  description?: string;

  @Field(() => ID, { description: 'Supabase User ID of the project owner' })
  ownerId: string;
}
