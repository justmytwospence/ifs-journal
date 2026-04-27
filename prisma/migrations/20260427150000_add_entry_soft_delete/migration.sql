-- Soft delete support for journal entries.
-- DELETE handlers set deletedAt instead of hard-deleting; queries filter on
-- deletedAt IS NULL. Recoverable for 30 days; a future reaper purges older.

ALTER TABLE "journal_entries" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "journal_entries_deletedAt_idx" ON "journal_entries"("deletedAt");
