/*
  Warnings:

  - You are about to drop the `project_users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `owner_profile_id` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProjectRole" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "public"."project_users" DROP CONSTRAINT "project_users_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_users" DROP CONSTRAINT "project_users_project_id_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "owner_profile_id" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."project_users";

-- CreateTable
CREATE TABLE "project_members" (
    "profile_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'GUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("profile_id","project_id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
