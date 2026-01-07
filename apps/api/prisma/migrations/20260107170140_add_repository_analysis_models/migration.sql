-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'CLONING', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "repository_files" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "lines_of_code" INTEGER NOT NULL DEFAULT 0,
    "neo4j_node_id" TEXT,
    "annotations" TEXT,
    "claude_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_entities" (
    "id" UUID NOT NULL,
    "repository_file_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_line" INTEGER NOT NULL,
    "end_line" INTEGER NOT NULL,
    "annotations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_jobs" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "files_analysed" INTEGER NOT NULL DEFAULT 0,
    "total_files" INTEGER,
    "error_message" TEXT,
    "error_details" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repository_files_repository_id_idx" ON "repository_files"("repository_id");

-- CreateIndex
CREATE INDEX "repository_files_file_type_idx" ON "repository_files"("file_type");

-- CreateIndex
CREATE UNIQUE INDEX "repository_files_repository_id_file_path_key" ON "repository_files"("repository_id", "file_path");

-- CreateIndex
CREATE INDEX "code_entities_repository_file_id_idx" ON "code_entities"("repository_file_id");

-- CreateIndex
CREATE INDEX "analysis_jobs_repository_id_idx" ON "analysis_jobs"("repository_id");

-- CreateIndex
CREATE INDEX "analysis_jobs_status_idx" ON "analysis_jobs"("status");

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_entities" ADD CONSTRAINT "code_entities_repository_file_id_fkey" FOREIGN KEY ("repository_file_id") REFERENCES "repository_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
