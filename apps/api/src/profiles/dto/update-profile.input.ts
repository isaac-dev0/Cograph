import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, Length, IsUrl } from 'class-validator';

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Length(1, 100)
  job?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Length(1, 100)
  location?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  githubToken?: string;
}
