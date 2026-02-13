import { Field, ID, ObjectType } from '@nestjs/graphql';
import { FileAnnotation } from './file-annotation.model';

@ObjectType({
  description: 'An annotation enriched with its source file information, for display in the documents view.',
})
export class DocumentAnnotation extends FileAnnotation {
  @Field(() => ID, { description: 'Postgres UUID of the repository file this annotation belongs to.' })
  fileId: string;

  @Field(() => String, { description: 'Repository-relative path of the source file.' })
  filePath: string;

  @Field(() => String, { description: 'Base name of the source file (e.g. "foo.ts").' })
  fileName: string;
}
