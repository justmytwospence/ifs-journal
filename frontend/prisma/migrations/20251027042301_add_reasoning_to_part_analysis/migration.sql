/*
  Warnings:

  - Added the required column `reasoning` to the `part_analyses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add column with default empty object for existing rows, then make it required
ALTER TABLE "part_analyses" ADD COLUMN "reasoning" JSONB NOT NULL DEFAULT '{}'::jsonb;
