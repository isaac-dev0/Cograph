import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class SyncProfileInput {
  @Field(() => String, { description: 'The unique Supabase Auth User ID (UID).' })
  userId: string;

  @Field(() => String, { description: 'The user\'s email address.' })
  email: string;

  @Field(() => String, { description: 'The user\'s public display name.' })
  displayName: string;
}