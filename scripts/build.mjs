#!/usr/bin/env node
// Vercel build entrypoint.
//
// The Neon-Vercel integration sets DATABASE_URL (pooled) and
// DATABASE_URL_UNPOOLED (direct) for Production and Development scopes, and
// injects both per-deployment for Preview. If a scope ends up with only the
// unpooled variant set (e.g. after a partial env-var migration), Prisma's
// schema would fail to load because `url = env("DATABASE_URL")` would be
// empty. We fall back here so the build is robust to either variant being
// the source of truth.
//
// Order of operations:
//   prisma generate → prisma migrate deploy → prisma db seed → next build
// Any failure exits non-zero so Vercel marks the deploy failed.
//
// `prisma db seed` runs against demo accounts only — it loads from
// evals/snapshots/<persona>/latest.json files committed to the repo. If
// no snapshots exist, the seed is a no-op. Real users (non-demo) are
// never touched. See prisma/seed.ts.
//
// Retry policy: the DB-touching steps (migrate deploy, db seed) get one
// retry with a 10s wait. Neon free-tier preview computes auto-suspend
// when idle, and a fresh deploy can land DURING the cold-start window —
// the connection times out before the compute is ready. The retry
// triggers the cold start once, waits, and re-attempts. Both DB steps
// are idempotent (migrate deploy is no-op when up to date; the seed
// wipes-and-reloads each demo user from scratch), so retrying is safe.

import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const steps = [
  { cmd: 'npx', args: ['prisma', 'generate'] },
  { cmd: 'npx', args: ['prisma', 'migrate', 'deploy'], retry: true },
  { cmd: 'npx', args: ['prisma', 'db', 'seed'], retry: true },
  { cmd: 'npx', args: ['next', 'build'] },
]

for (const step of steps) {
  const label = [step.cmd, ...step.args].join(' ')
  console.log(`\n→ ${label}`)
  let result = spawnSync(step.cmd, step.args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0 && step.retry) {
    console.warn(
      `build.mjs: "${label}" failed (exit ${result.status}); waiting 10s and retrying once (likely Neon cold start)`
    )
    await sleep(10_000)
    result = spawnSync(step.cmd, step.args, { stdio: 'inherit', env: process.env })
  }
  if (result.status !== 0) {
    console.error(`build.mjs: "${label}" failed with exit code ${result.status}`)
    process.exit(result.status ?? 1)
  }
}
