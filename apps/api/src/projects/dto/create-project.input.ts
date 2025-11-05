import { InputType, Field, ID } from '@nestjs/graphql';
import { IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field(() => String, { description: 'Name of the project' })
  @IsString()
  @Length(3, 50)
  name: string;

  @Field(() => String, { description: 'Description of the project', nullable: true })
  @IsOptional()
  @Length(0, 300)
  description?: string;

  @Field(() => ID, { description: 'Supabase User ID of the project owner' })
  @IsString()
  ownerId: string;
}
