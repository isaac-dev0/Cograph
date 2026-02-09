import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class CreateAnnotationInput {
  @Field(() => String, { description: 'Title of the annotation' })
  @IsString()
  @Length(1, 200)
  title: string;

  @Field(() => String, { description: 'Markdown content of the annotation' })
  @IsString()
  @Length(1, 10000)
  content: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Tags for organizing the annotation',
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @Field(() => [ID], {
    nullable: true,
    description: 'IDs of code entities linked to this annotation',
  })
  @IsOptional()
  @IsArray()
  linkedEntityIds?: string[];
}

@InputType()
export class UpdateAnnotationInput {
  @Field(() => String, { nullable: true, description: 'Title of the annotation' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Markdown content of the annotation',
  })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Tags for organizing the annotation',
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @Field(() => [ID], {
    nullable: true,
    description: 'IDs of code entities linked to this annotation',
  })
  @IsOptional()
  @IsArray()
  linkedEntityIds?: string[];
}
