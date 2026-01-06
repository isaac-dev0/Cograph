-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "icon_url" TEXT;

-- CreateTable
CREATE TABLE "project_repositories" (
    "project_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_repositories_pkey" PRIMARY KEY ("project_id","repository_id")
);

-- CreateIndex
CREATE INDEX "project_repositories_project_id_idx" ON "project_repositories"("project_id");

-- CreateIndex
CREATE INDEX "project_repositories_repository_id_idx" ON "project_repositories"("repository_id");

-- AddForeignKey
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
