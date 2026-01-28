import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CodeEntity } from './code-entity.model';

@ObjectType({
  description: 'A file within a repository that has been analysed.',
})
export class RepositoryFile {
  @Field(() => ID, { description: 'Unique identifier of the repository file.' })
  id: string;

  @Field(() => ID, { description: 'ID of the repository this file belongs to.' })
  repositoryId: string;

  @Field(() => String, { description: 'Relative path of the file within the repository.' })
  filePath: string;

  @Field(() => String, { description: 'Name of the file.' })
  fileName: string;

  @Field(() => String, { description: 'Type/extension of the file.' })
  fileType: string;

  @Field(() => Int, { description: 'Number of lines of code in the file.' })
  linesOfCode: number;

  @Field(() => String, {
    nullable: true,
    description: 'Neo4j node ID for graph database reference.',
  })
  neo4jNodeId?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'User-provided annotations for this file.',
  })
  annotations?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'AI-generated summary of the file contents.',
  })
  claudeSummary?: string | null;

  @Field(() => Date, { description: 'Timestamp when the file record was created.' })
  createdAt: Date;

  @Field(() => Date, { description: 'Timestamp when the file record was last updated.' })
  updatedAt: Date;

  @Field(() => [CodeEntity], {
    nullable: true,
    description: 'Code entities (functions, classes, etc.) found in this file.',
  })
  codeEntities?: CodeEntity[];
}
