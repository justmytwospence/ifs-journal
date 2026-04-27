# IFS Journal

A journaling app for Internal Family Systems work. Users write entries; Claude
extracts the "parts" (Manager, Firefighter, Protector, Exile) speaking through
the writing and anchors them to the exact passages they came from.

## Features

- **Citation-grounded analysis** — every part the model identifies is backed by
  cited passages from the journal, never free-form inference. Built on the
  [Anthropic Citations API](https://docs.claude.com/en/docs/build-with-claude/citations)
- **Resilient text anchoring** — citations survive entry edits via W3C
  TextQuote/TextPosition selectors with a fuzzy fallback (the [Hypothesis](https://hypothes.is/)
  approach)
- **Demo personas** — three synthetic users (Kai, Maya, Riley) with curated
  parts and 40 entries each, seeded from committed eval snapshots so the demo
  is reproducible and offline
- **Per-user privacy** — every API handler scopes queries by `session.user.id`;
  preview deploys are gated behind Vercel team auth

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: Node 22
- **Database**: PostgreSQL via Neon (serverless, with Vercel integration for
  preview branches)
- **ORM**: Prisma with `@prisma/adapter-neon`
- **AI**: Anthropic Claude Opus 4.7 across all surfaces (analysis, prompt
  generation, conversation)
- **Auth**: NextAuth v5 (credentials provider with bcrypt + email verification)
- **Lint/Format**: Biome (not ESLint/Prettier)
- **Errors**: Sentry (when `SENTRY_DSN` is set)
- **Email**: Resend (transactional)

## Getting Started

```bash
# Install dependencies (Node 22.21+)
npm install

# Set up environment
cp .env.local.example .env.local
# Required: DATABASE_URL, DATABASE_URL_UNPOOLED, ANTHROPIC_API_KEY,
#           NEXTAUTH_SECRET (or AUTH_SECRET), RESEND_API_KEY, EMAIL_FROM
# Optional: SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN,
#           ADMIN_EMAILS (comma-separated, gates /admin/*)

# Apply migrations
npm run db:migrate

# Seed demo personas (loads from committed snapshots; ~5s, no LLM calls)
npm run db:seed

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` — Next dev server (Turbopack)
- `npm run lint` / `npm run check` — Biome (lint / lint+autofix)
- `npm test` — Vitest (citation parser, anchoring, part similarity)
- `npm run db:migrate` / `db:seed` / `db:studio` — Prisma
- `npm run eval` — full eval harness (slow, spends API tokens)
- `npm run eval:promote` / `eval:report` — promote latest snapshot, print scorecard

`db:migrate`, `db:seed`, `db:reset`, `db:push`, and `eval` refuse to run
against the production Neon endpoint via `scripts/check-not-prod.ts`. Override
with `ALLOW_PROD_DB_WRITE=1` for the rare deliberate prod seed.

## Architecture

- `app/` — App Router routes
  - `(auth)/` — login, register, reset-password
  - `api/` — route handlers; every one calls `auth()` and scopes by user id
  - `admin/evals/` — dev-only eval dashboard, gated by `ADMIN_EMAILS`
- `lib/anthropic.ts` — SDK client + `ANALYSIS_MODEL` / `CONVERSATION_MODEL` /
  `CONTENT_MODEL` constants (all `claude-opus-4-7`) + a 529/overloaded
  error helper
- `lib/anchoring/` — W3C TextQuote/Position selectors with fuzzy re-anchoring
- `lib/batch-analysis.ts` — holistic re-analysis of every entry, streaming
- `lib/incremental-analysis.ts` — single-entry analysis after a save
- `lib/citation-parser.ts` — parses `<part>` XML + Anthropic citations
- `lib/part-similarity.ts` — Levenshtein + synonym dedup of extracted parts
- `lib/rate-limit.ts` — fixed-window per-user/per-IP buckets +
  `enforceLlmBudget` daily kill switch across all LLM endpoints
- `lib/eval/` — eval harness (respondent, run-persona, capture, score)
- `evals/personas/<slug>.md` — persona profiles (frontmatter + system prompt)
- `evals/snapshots/<slug>/{<timestamp>,latest}.json` — committed eval output;
  `latest.json` is what `prisma db seed` loads
- `prisma/schema.prisma` — User, JournalEntry, Part, PartAnalysis, Highlight,
  PartConversation, PartsOperation, RateLimit, AuthToken
- `proxy.ts` — edge middleware (Next 16's renamed `middleware.ts`)

## Data Model Notes

Highlights use the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/):

- **TextPositionSelector** — `startOffset` + `endOffset` for O(1) slicing
- **TextQuoteSelector** — `exact` + `prefix`/`suffix` (32 chars each) for fuzzy
  re-anchoring when the entry text is edited

Journal entries are soft-deleted (`deletedAt` column); recoverable for ~30
days from the database before a future reaper purges them.

## Deployment

Deploys to Vercel from `main`. The build script (`scripts/build.mjs`) runs
`prisma migrate deploy` followed by the seed (which only touches
`demo-<slug>@ifsjournal.me` accounts) so prod and previews always reflect the
committed snapshots.

Preview branches use ephemeral Neon branches cloned from `production` via the
Neon ↔ Vercel integration; they're deleted on PR close.
