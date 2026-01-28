import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: 'A code entity extracted from a repository file.',
})
export class CodeEntity {
  @Field(() => ID, { description: 'Unique identifier of the code entity.' })
  id: string;

  @Field(() => ID, { description: 'ID of the repository file this entity belongs to.' })
  repositoryFileId: string;

  @Field(() => String, { description: 'Name of the entity (e.g., function name, class name).' })
  name: string;

  @Field(() => String, { description: 'Type of entity (e.g., function, class, interface).' })
  type: string;

  @Field(() => Int, { description: 'Starting line number of the entity in the file.' })
  startLine: number;

  @Field(() => Int, { description: 'Ending line number of the entity in the file.' })
  endLine: number;

  @Field(() => String, {
    nullable: true,
    description: 'User-provided annotations for this entity.',
  })
  annotations?: string | null;

  @Field(() => Date, { description: 'Timestamp when the entity was created.' })
  createdAt: Date;

  @Field(() => Date, { description: 'Timestamp when the entity was last updated.' })
  updatedAt: Date;
}
