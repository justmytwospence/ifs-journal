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

import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED
}

const steps = [
  ['npx', ['prisma', 'generate']],
  ['npx', ['prisma', 'migrate', 'deploy']],
  ['npx', ['prisma', 'db', 'seed']],
  ['npx', ['next', 'build']],
]

for (const [cmd, args] of steps) {
  const label = [cmd, ...args].join(' ')
  console.log(`\n→ ${label}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    console.error(`build.mjs: "${label}" failed with exit code ${result.status}`)
    process.exit(result.status ?? 1)
  }
}
