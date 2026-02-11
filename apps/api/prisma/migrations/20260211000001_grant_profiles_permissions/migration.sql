-- Grant Supabase PostgREST roles access to the profiles table.
-- Tables created via Prisma migrations are not automatically visible to the
-- `authenticated` / `anon` roles that Supabase's REST API uses.

GRANT SELECT, INSERT, UPDATE ON TABLE "public"."profiles" TO authenticated;
GRANT SELECT ON TABLE "public"."profiles" TO anon;

-- Enable Row Level Security so policies control access going forward.
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile.
CREATE POLICY "profiles_select_own"
  ON "public"."profiles"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile (used by the OAuth callback).
CREATE POLICY "profiles_insert_own"
  ON "public"."profiles"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile.
CREATE POLICY "profiles_update_own"
  ON "public"."profiles"
  FOR UPDATE
  USING (auth.uid() = user_id);
