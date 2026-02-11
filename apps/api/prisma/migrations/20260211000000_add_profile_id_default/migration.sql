-- Add a database-level default to profiles.id so direct Supabase client
-- inserts (which don't supply an id) succeed without a NOT NULL violation.
ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
