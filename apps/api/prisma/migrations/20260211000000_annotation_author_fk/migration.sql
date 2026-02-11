-- AlterTable: change author_id from TEXT NOT NULL to UUID nullable
-- and add a foreign key constraint to profiles.id with SET NULL on delete.

-- Step 1: Drop the NOT NULL constraint and cast to UUID
ALTER TABLE "annotations"
  ALTER COLUMN "author_id" DROP NOT NULL,
  ALTER COLUMN "author_id" TYPE UUID USING "author_id"::UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE "annotations"
  ADD CONSTRAINT "annotations_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
