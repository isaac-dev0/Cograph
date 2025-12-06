/*
  Warnings:

  - The primary key for the `profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `project_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `profiles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `profile_id` on the `project_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `projects` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `owner_profile_id` on the `projects` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."project_members" DROP CONSTRAINT "project_members_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_members" DROP CONSTRAINT "project_members_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_owner_profile_id_fkey";

-- AlterTable
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_pkey",
DROP COLUMN "profile_id",
ADD COLUMN     "profile_id" UUID NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" UUID NOT NULL,
ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("profile_id", "project_id");

-- AlterTable
ALTER TABLE "projects" DROP CONSTRAINT "projects_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "owner_profile_id",
ADD COLUMN     "owner_profile_id" UUID NOT NULL,
ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
