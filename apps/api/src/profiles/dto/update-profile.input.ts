import { Field, InputType, Int, PartialType } from "@nestjs/graphql";
import { SyncProfileInput } from "./sync-profile.input";
import { IsNotEmpty, IsUUID, IsOptional, Length, IsUrl } from 'class-validator';

@InputType()
export class UpdateProfileInput extends PartialType(SyncProfileInput) {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Length(1, 100)
  job: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Length(1, 100)
  location: string;

  @Field(() => String)
  @IsOptional()
  @IsUrl()
  avatarUrl: string;
}
