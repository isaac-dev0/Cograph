import { Field, ID, InputType } from "@nestjs/graphql";
import { IsEmail, Length } from "class-validator";

@InputType()
export class SyncProfileInput {
  @Field(() => ID, { description: 'The unique Supabase Auth User ID (UID).' })
  userId: string;

  @Field(() => String, { description: 'The user\'s email address.' })
  @IsEmail()
  @Length(1, 100)
  email: string;

  @Field(() => String, { description: 'The user\'s public display name.' })
  @Length(1, 100)
  displayName: string;
}