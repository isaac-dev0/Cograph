-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "repositories" (
    "id" UUID NOT NULL,
    "github_id" INTEGER NOT NULL,
    "node_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "repository_url" TEXT NOT NULL,
    "owner_login" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_avatar_url" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3),
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "sync_error" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL,
    "github_created_at" TIMESTAMP(3) NOT NULL,
    "github_updated_at" TIMESTAMP(3) NOT NULL,
    "github_pushed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_sync_history" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "sync_started_at" TIMESTAMP(3) NOT NULL,
    "sync_completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error" TEXT,
    "files_processed" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repositories_github_id_key" ON "repositories"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_node_id_key" ON "repositories"("node_id");

-- CreateIndex
CREATE INDEX "repositories_is_private_idx" ON "repositories"("is_private");

-- CreateIndex
CREATE INDEX "repositories_is_archived_idx" ON "repositories"("is_archived");

-- CreateIndex
CREATE INDEX "repositories_is_disabled_idx" ON "repositories"("is_disabled");

-- CreateIndex
CREATE INDEX "repositories_last_synced_at_idx" ON "repositories"("last_synced_at");

-- CreateIndex
CREATE INDEX "repositories_sync_status_idx" ON "repositories"("sync_status");

-- CreateIndex
CREATE INDEX "repositories_github_updated_at_idx" ON "repositories"("github_updated_at");

-- CreateIndex
CREATE INDEX "repositories_owner_login_idx" ON "repositories"("owner_login");

-- CreateIndex
CREATE INDEX "repository_sync_history_repository_id_idx" ON "repository_sync_history"("repository_id");

-- CreateIndex
CREATE INDEX "repository_sync_history_sync_started_at_idx" ON "repository_sync_history"("sync_started_at");

-- AddForeignKey
ALTER TABLE "repository_sync_history" ADD CONSTRAINT "repository_sync_history_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
