-- CreateTable
CREATE TABLE "annotations" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "linked_entity_ids" TEXT[],
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annotations_file_id_idx" ON "annotations"("file_id");

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "repository_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
