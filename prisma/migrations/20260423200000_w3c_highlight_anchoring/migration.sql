-- W3C highlight anchoring schema update
--
-- journal_entries gains a required `slug` column for O(1) slug lookup.
-- highlights loses its direct entryId FK — entry identity is now derived
-- via partAnalysis.entryId to eliminate the risk of data drift between
-- the two paths.
--
-- The TRUNCATE is necessary because the new slug column is NOT NULL and
-- existing rows have no value for it. The seed script (run by the build
-- after migrations) clears and recreates journal_entries on every deploy
-- anyway, so no data is lost that wouldn't be lost regardless. CASCADE
-- cleans up dependent part_analyses and highlights.

TRUNCATE TABLE "journal_entries" CASCADE;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_userId_slug_key" ON "journal_entries"("userId", "slug");

-- DropForeignKey
ALTER TABLE "highlights" DROP CONSTRAINT "highlights_entryId_fkey";

-- DropIndex
DROP INDEX "highlights_entryId_idx";

-- AlterTable
ALTER TABLE "highlights" DROP COLUMN "entryId";
