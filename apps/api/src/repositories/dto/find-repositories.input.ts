import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class FindRepositoriesInput {
  @Field(() => Boolean, { nullable: true })
  includeArchived?: boolean;

  @Field(() => Boolean, { nullable: true })
  includePrivate?: boolean;

  @Field(() => String, { nullable: true })
  owner?: string;
}

