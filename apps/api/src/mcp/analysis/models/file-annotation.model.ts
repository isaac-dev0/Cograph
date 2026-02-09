import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: 'Author information for a file annotation.',
})
export class AnnotationAuthor {
  @Field(() => ID, { description: 'Profile ID of the annotation author.' })
  id: string;

  @Field(() => String, { description: 'Display name of the annotation author.' })
  name: string;
}

@ObjectType({
  description: 'A user-created annotation on a repository file.',
})
export class FileAnnotation {
  @Field(() => ID, { description: 'Unique identifier of the annotation.' })
  id: string;

  @Field(() => String, { description: 'Title of the annotation (max 200 characters).' })
  title: string;

  @Field(() => String, { description: 'Markdown content of the annotation.' })
  content: string;

  @Field(() => [String], { description: 'Tags associated with this annotation.' })
  tags: string[];

  @Field(() => [ID], {
    description: 'IDs of code entities linked to this annotation.',
  })
  linkedEntityIds: string[];

  @Field(() => AnnotationAuthor, { description: 'Author of the annotation.' })
  author: AnnotationAuthor;

  @Field(() => Date, { description: 'Timestamp when the annotation was created.' })
  createdAt: Date;

  @Field(() => Date, { description: 'Timestamp when the annotation was last updated.' })
  updatedAt: Date;
}
