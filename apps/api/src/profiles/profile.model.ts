import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Profile {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  displayName: string;

  @Field(() => String)
  job?: string;

  @Field(() => String)
  location?: string;

  @Field(() => String)
  avatarUrl?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
