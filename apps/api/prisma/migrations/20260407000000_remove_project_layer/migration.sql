-- DropForeignKey
ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "project_members_profile_id_fkey";
ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "project_members_project_id_fkey";
ALTER TABLE "project_repositories" DROP CONSTRAINT IF EXISTS "project_repositories_project_id_fkey";
ALTER TABLE "project_repositories" DROP CONSTRAINT IF EXISTS "project_repositories_repository_id_fkey";
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_owner_profile_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "project_repositories";
DROP TABLE IF EXISTS "project_members";
DROP TABLE IF EXISTS "projects";

-- DropEnum
DROP TYPE IF EXISTS "ProjectRole";
DROP TYPE IF EXISTS "ProjectStatus";
