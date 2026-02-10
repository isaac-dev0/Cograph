-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "default_branch" TEXT NOT NULL DEFAULT 'main';

-- CreateIndex
CREATE INDEX "project_members_profile_id_idx" ON "project_members"("profile_id");

-- CreateIndex
CREATE INDEX "project_members_project_id_role_idx" ON "project_members"("project_id", "role");

-- CreateIndex
CREATE INDEX "repository_files_neo4j_node_id_idx" ON "repository_files"("neo4j_node_id");

-- CreateIndex
CREATE INDEX "repository_sync_history_repository_id_sync_started_at_idx" ON "repository_sync_history"("repository_id", "sync_started_at");
