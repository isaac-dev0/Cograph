/*
  Warnings:

  - Added the required column `age` to the `people` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "people" ADD COLUMN     "age" INTEGER NOT NULL;
