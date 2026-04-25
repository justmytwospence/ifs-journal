# Database & migrations

Operational runbook for the Postgres database (Neon) backing this app. Read
this before any schema change once real users are on the system.

## How it works

- Migrations live in `prisma/migrations/` and are applied **forward-only** by
  `prisma migrate deploy`, which runs as part of `npm run build` (see
  `package.json`). Vercel runs that on every deploy, so any new migration
  committed to `main` ships automatically with the next deploy.
- Runtime queries go through `@prisma/adapter-neon` (HTTP/WebSocket driver),
  but migrations are applied through Prisma's classic engine over a normal
  Postgres connection. Both speak to the same Neon database via
  `DATABASE_URL`.
- `prisma db push` is **not** part of the deploy flow and must not be used
  against the production database — it bypasses the migration history and
  silently introduces schema drift. Use `prisma migrate dev` locally; that's
  the only way to author a migration.

## Adding a migration

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` (= `prisma migrate dev`). Prisma generates a
   migration in `prisma/migrations/<timestamp>_<name>/` and applies it to your
   local DB.
3. Inspect the generated SQL. Hand-edit it if Prisma's default isn't safe
   (see "Safe schema changes" below).
4. Commit the schema change and the generated migration in the same commit.
5. Open a PR. CI runs lint/typecheck/tests. On merge, Vercel's build runs
   `prisma migrate deploy`, which applies the new migration to prod.

Once a migration has been applied to prod, **never edit it**. Write a follow-up
migration. `prisma migrate deploy` refuses to run if the recorded history
diverges from what's on disk.

## Safe schema changes

Most changes are safe by default. The dangerous ones are listed below — handle
them with the expand/contract pattern: ship in two deploys, one that expands
the schema (additive, both shapes valid) and one that contracts it (removes
the old shape) once nothing depends on the old shape.

| Change                                | Safe? | Notes                                                                                                                                                       |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add nullable column                   | yes   | No-op for existing rows.                                                                                                                                    |
| Add column with `DEFAULT`             | yes   | Postgres backfills atomically. For very large tables, prefer nullable + backfill in app code to avoid a long lock.                                          |
| Add `NOT NULL` column without default | no    | Fails on a non-empty table. Add nullable first, backfill, then tighten the constraint in a follow-up migration.                                             |
| Drop column                           | risky | Once shipped, data is gone. Always do this in a deploy after the app no longer reads or writes the column.                                                  |
| Rename column                         | risky | Prisma generates `DROP + CREATE`, which destroys data. Replace by hand with `ALTER TABLE ... RENAME COLUMN ...`. Better: add new column → backfill → switch reads/writes → drop old, across multiple deploys. |
| Rename table                          | risky | Same as column rename. Hand-edit to `ALTER TABLE ... RENAME TO ...`.                                                                                        |
| Change column type                    | risky | If the cast can fail (text→int, narrowing varchar), do it as add-new-column + backfill + drop-old.                                                          |
| Add unique index on existing data     | risky | Will fail if duplicates exist. Audit data first.                                                                                                            |
| Drop index                            | yes   | Reversible.                                                                                                                                                 |
| Drop foreign key                      | yes   | Constraint only.                                                                                                                                            |

**Hand-edit checklist when Prisma's generated SQL looks destructive:**

- `DROP TABLE` on a table that still has data anywhere → stop, redesign as
  expand/contract.
- `DROP COLUMN` paired with `ADD COLUMN` of the same name → it's a rename;
  replace with `ALTER TABLE ... RENAME COLUMN`.
- `ALTER COLUMN ... SET NOT NULL` on an existing populated column → make sure
  a prior migration (or a backfill statement in the same migration, in the
  same transaction) has filled all rows.

## Deploy flow

```
git push origin main
  → Vercel build runs:
      prisma generate
      prisma migrate deploy   ← applies any new migrations to prod DB
      next build
  → on success, the new app version goes live
```

If `prisma migrate deploy` fails, the build fails and the deploy doesn't ship.
The previous app version keeps running, but the database is in whatever state
the partial migration left it. If that happens, branch the DB (see Recovery)
before doing anything else.

## Recovery

- **Neon point-in-time recovery (PITR).** Neon retains WAL for the database;
  any moment in the retention window can be branched from the Neon console.
  Before relying on this, confirm the retention period on the current Neon
  plan matches your tolerance for data loss.
- **Before any destructive migration**, take a manual Neon branch from the
  production DB. If the migration goes wrong you can re-point a recovery
  client at the branch to extract specific rows.
- **Rollback policy.** Migrations are forward-only. To undo a migration in
  prod, write a new migration that reverses it. Do not delete a migration
  from `prisma/migrations/` once it has been deployed.

## Seed script

`npm run db:seed` runs `prisma/seed.ts`, which:

1. Reads `DEMO_USER_EMAIL` (required in production).
2. Upserts the demo user.
3. **Deletes that user's journal entries**, then recreates the canned set.
4. Runs `runBatchAnalysis` against the new entries (consumes Anthropic API
   tokens).

Scope: it only touches the demo user. Non-demo users are never read or
written. It is **not** invoked as part of a Vercel deploy — only when run
manually. Run it from a trusted local shell with the prod `DATABASE_URL` only
when you want demo content refreshed.

## Local development

- `npm run db:migrate` — author a new migration and apply it to your local DB.
- `npm run db:seed` — refresh demo data in your local DB.
- `npm run db:reset` — **destructive**: drops the database, reapplies the
  full migration history, and runs the seed. Confirm `DATABASE_URL` points at
  your local DB before running this. There is currently no in-script guard.
- `npm run db:studio` — Prisma Studio for browsing data.

## CI checks

- **Migration safety check.** `.github/workflows/ci.yml` runs
  `@flvmnt/pgfence` against every committed migration on each PR (Prisma's
  recommended guard). It fails the build on medium-or-higher risk patterns —
  destructive drops, `NOT NULL` on populated tables, unsafe renames. Tune the
  `--max-risk` flag in the workflow if it gets too strict.
- The `--no-lock-timeout` / `--no-statement-timeout` flags are set because
  Prisma doesn't generate `SET lock_timeout` / `SET statement_timeout` at the
  top of migrations, and retro-fitting them into already-applied migrations
  would break `migrate deploy`'s history check. If you ever start writing
  migrations by hand, add those statements at the top and consider dropping
  the flags.

## Improvements not yet in place

- **`db:reset` guard.** Make the script refuse to run when the host in
  `DATABASE_URL` looks like the prod host.
- **Documented backup retention.** Write down the current Neon PITR window
  here so the on-call recovery story is unambiguous.
