# Database & migrations

Operational runbook for the Postgres database (Neon) backing this app. Read
this before any schema change once real users are on the system.

## How it works

- Migrations live in `prisma/migrations/` and are applied **forward-only** by
  `prisma migrate deploy`, which runs as part of `npm run build` (which calls
  `scripts/build.mjs`). Vercel runs that on every deploy, so any new migration
  committed to `main` ships automatically with the next deploy.
- Runtime queries go through `@prisma/adapter-neon` (HTTP/WebSocket driver)
  using the **pooled** connection (`DATABASE_URL`). Migrations use Prisma's
  classic engine over a **direct** connection (`DATABASE_URL_UNPOOLED`),
  declared as `directUrl` in the Prisma datasource — pgBouncer in transaction
  mode would otherwise break DDL.
- The Neon ↔ Vercel integration sets both env vars per scope; for Preview
  deployments it injects them per-deployment pointing at the ephemeral branch
  it just created.
- `scripts/build.mjs` falls back to `DATABASE_URL_UNPOOLED` when
  `DATABASE_URL` is missing, so the build is robust against Vercel scopes
  that have only the unpooled variant set. `lib/db.ts` and `prisma/seed.ts`
  do the same fallback at runtime.
- `prisma db push` is **not** part of the deploy flow and must not be used
  against the production database — it bypasses the migration history and
  silently introduces schema drift. Use `prisma migrate dev` locally; that's
  the only way to author a migration.

## Branch topology

The Neon project `if-journal` (id `soft-water-55064614`) has one long-lived
branch plus a small set of integration-managed branches:

| Branch | Branch ID | Purpose |
| --- | --- | --- |
| `production` | `br-small-unit-adbhmz1p` | Default branch. Real user data. Endpoint host `ep-holy-brook-ad2l0eke`. The Vercel ↔ Neon integration always parents new branches off this one. |
| `vercel-dev` | `br-royal-surf-adem1wkq` | Auto-created by the integration when the project was linked. Used by `vercel dev` (Development env scope). Cloned from `production`. |
| `pr-…` (auto) | varies | Created per Vercel preview deployment by the integration; cloned from `production`; deleted when the preview is closed/merged. |

**No Neon-side branch protection.** Protected branches are a paid Neon
feature; on the free tier, the production branch is unprotected and can be
deleted via console or API. The defenses we rely on instead:

- `scripts/check-not-prod.ts` blocks any local `db:migrate` / `db:seed` /
  `db:reset` / `db:push` from hitting the production endpoint.
- The MCP/agent permission layer denies arbitrary writes to the production
  branch unless explicitly authorized for the specific operation.
- Manual safety: when running ad-hoc SQL via the Neon console, double-check
  the branch selector at the top of the SQL editor before running anything
  destructive.

## Preview deployments

The Vercel ↔ Neon native integration creates a fresh ephemeral Neon branch
for each Vercel preview deployment by cloning the **`production` branch**
(it always parents off the Default branch — there is no UI to point it at a
different parent). It injects per-deployment `DATABASE_URL` and
`DATABASE_URL_UNPOOLED` into the preview build. The existing build script
(`prisma generate && prisma migrate deploy && next build`) then runs against
the new branch — so each preview gets a copy of current production data
plus any pending migrations. The branch is deleted automatically when the
PR closes (auto-cleanup is enabled in the integration settings).

**This means real user data is cloned into each preview branch.** This is
the deliberate trade-off we accepted to keep the setup simple while user
count is small. Mitigations:

- Vercel preview URLs require Vercel team auth — only members of
  `spencers-projects-19cee858` can view them. Don't share preview links
  with anyone outside the team.
- Branches are short-lived; they exist only while a PR is open.
- The Neon free tier doesn't allow per-preview branching from a non-Default
  parent. To switch to a "demo-only seed" parent in the future, options are:
  (a) upgrade to a paid Neon plan and check whether their integration
  supports parent overrides, or (b) replace the integration with a custom
  workflow that creates branches via Neon API and writes per-deployment env
  vars via the Vercel API. Revisit when adding collaborators or when user
  count makes prod data sensitivity material.

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
  → Vercel build runs node scripts/build.mjs:
      DATABASE_URL ||= DATABASE_URL_UNPOOLED   ← graceful fallback
      prisma generate
      prisma migrate deploy   ← applies any new migrations to prod DB
                                via DATABASE_URL_UNPOOLED (directUrl)
      next build
  → on success, the new app version goes live
```

If `prisma migrate deploy` fails, the build fails and the deploy doesn't ship.
The previous app version keeps running, but the database is in whatever state
the partial migration left it. If that happens, branch the DB (see Recovery)
before doing anything else.

`scripts/build.mjs` runs the three steps in sequence and exits non-zero on
the first failure, so partial deploys (e.g. migrate succeeds, next build
fails) leave the DB ahead of the running app. That's intentional and
recoverable: re-deploy from `main` once the root cause is fixed.

## Recovery

- **Neon point-in-time recovery (PITR).** Neon retains WAL for the project;
  any moment in the retention window can be branched from the Neon console
  via Branches → Create branch → "from a point in time."
- **Current retention window: 6 hours** (`history_retention_seconds = 21600`).
  This is the free-tier maximum. For app-level recovery purposes it means:
  a problem reported and triaged within ~4 hours of occurring is recoverable
  via PITR; older issues are not. If retention becomes load-bearing (e.g.
  user-reported data loss), upgrading to a paid Neon plan unlocks longer
  windows (Launch: 7 days; Scale: 14 days; Business: 30 days).
- **Before any destructive migration**, take a manual Neon branch from the
  production DB. If the migration goes wrong you can re-point a recovery
  client at the branch to extract specific rows. The branch is free and
  takes seconds to create.
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
manually.

`npm run db:seed` (and `db:migrate`, `db:reset`, `db:push`) is gated by
`scripts/check-not-prod.ts`, which inspects `DATABASE_URL` and exits if it
matches the production Neon endpoint. To deliberately re-seed the production
demo user, run with `ALLOW_PROD_DB_WRITE=1 npm run db:seed`. The same guard
is what protects the prod branch from accidentally taking a `migrate dev`
or `migrate reset` from a misconfigured shell.

## Local development

- `npm run db:migrate` — author a new migration and apply it to your local DB.
- `npm run db:seed` — refresh demo data in your local DB.
- `npm run db:reset` — **destructive**: drops the database, reapplies the
  full migration history, and runs the seed.
- `npm run db:push` — **destructive**: pushes schema changes without writing
  a migration. Use only on throwaway local DBs while exploring schema shapes.
- `npm run db:studio` — Prisma Studio for browsing data.

Each of those commands (except `db:studio`) is gated by
`scripts/check-not-prod.ts`. If either `DATABASE_URL` or
`DATABASE_URL_UNPOOLED` resolves to the production Neon endpoint, the script
exits non-zero before Prisma runs. Override with `ALLOW_PROD_DB_WRITE=1` for
a deliberate prod seed only.

For local development, set `DATABASE_URL_UNPOOLED` (preferred — it's the
direct connection used by migrations) in `.env.local`. The app falls back to
this when `DATABASE_URL` isn't set, so a single env var works for runtime
and migrations against a local Postgres or your own Neon dev branch. To
mirror Vercel's setup exactly, set both: `DATABASE_URL` to a pooled URL and
`DATABASE_URL_UNPOOLED` to the direct one.

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

- **CI doesn't apply migrations against a real Postgres.** `pgfence` static
  analysis runs in CI but the migrations themselves aren't dry-run. A future
  CI step could spin up an ephemeral Neon branch and run
  `prisma migrate deploy` there to catch runtime migration failures before a
  Vercel deploy attempts them.
- **Real user data leaks into preview branches.** Documented trade-off (see
  Preview deployments section). When user count or collaborator surface
  grows, swap the integration for a workflow that uses a non-Default parent.
