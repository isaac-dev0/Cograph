-- Drop the github_token column from profiles (no longer used).
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "github_token";
