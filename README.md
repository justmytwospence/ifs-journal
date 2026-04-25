# IFS Journal

A journaling app that uses AI to identify and track Internal Family Systems (IFS) parts from your writing.

## Features

- **Journal Entries**: Write journal entries with AI-generated prompts
- **Parts Detection**: AI analyzes entries to identify IFS parts (Protector, Manager, Firefighter, Exile)
- **Text Highlighting**: See exactly which phrases reveal each part, with explanations
- **Parts Dashboard**: Track your parts over time with activity trends

## Data Model

### W3C Web Annotation Standard

Text highlights use the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) for resilient text anchoring:

- **TextPositionSelector**: `startOffset` and `endOffset` for O(1) lookup via string slicing
- **TextQuoteSelector**: `exact`, `prefix` (32 chars), `suffix` (32 chars) for fuzzy fallback when content changes

This approach (used by [Hypothesis](https://hypothes.is/)) ensures highlights survive minor text edits.

### Schema Overview

```
User
├── JournalEntry (prompt, content, contentHash, wordCount, analysisStatus)
│   ├── PartAnalysis (confidence) → links to Part
│   │   └── Highlight (startOffset, endOffset, exact, prefix, suffix, reasoning, isStale)
│   └── highlights (direct relation for efficient queries)
└── Part (name, slug, description, role, color, icon)
    └── partAnalyses → Highlights → JournalEntry (quotes derived from highlights)
```

### Key Design Decisions

1. **No duplicate quote storage**: `Part.quotes` removed; quotes are derived from `Highlight.exact` at query time
2. **O(1) slug lookup**: `Part.slug` is pre-computed and indexed with `@@unique([userId, slug])`
3. **Content change detection**: `JournalEntry.contentHash` (SHA-256) enables marking highlights as stale
4. **Per-highlight reasoning**: Moved from `PartAnalysis.reasoning` (JSON map) to `Highlight.reasoning` (per-record)

## Getting Started

```bash
# Install dependencies (--legacy-peer-deps matches Vercel; keeps next-auth@beta happy with React 19)
npm install --legacy-peer-deps

# Pull env vars from Vercel (preferred — gets the Neon connection strings the
# integration manages plus all other secrets), or copy the example and fill
# in by hand:
npx vercel env pull .env.local
# OR: cp .env.local.example .env.local && $EDITOR .env.local

# Apply migrations to your local database
npm run db:migrate

# Seed demo data (creates the demo user + 19 canned journal entries + parts)
npm run db:seed

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

The `db:migrate` / `db:seed` / `db:reset` / `db:push` scripts are gated by
`scripts/check-not-prod.ts` — they refuse to run if `DATABASE_URL` (or
`DATABASE_URL_UNPOOLED`) resolves to the production Neon endpoint. Override
with `ALLOW_PROD_DB_WRITE=1` for the rare deliberate prod seed.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Prisma 6 with `@prisma/adapter-neon` (WebSocket runtime, classic engine for migrations)
- **AI**: Anthropic Claude (Opus 4.7 for analysis & conversations, Sonnet 4.6 for prompts)
- **Auth**: NextAuth v5 beta (credentials provider + passwordless demo provider)
- **Email**: Resend (transactional verification + password reset)
- **Observability**: Sentry
- **Styling**: Tailwind CSS 4
- **Lint/format**: Biome (not ESLint/Prettier)

## Database & deployment

Vercel is connected to Neon via Neon's native Vercel integration:

- **Production deploys** run against the `production` Neon branch. The
  integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`
  (direct) on Vercel's Production scope.
- **Preview deploys** get an ephemeral Neon branch each, cloned from
  `production` and deleted automatically when the PR closes. The integration
  injects per-deployment env vars; no static `DATABASE_URL` for Preview.
- **`vercel dev`** uses a long-lived `vercel-dev` Neon branch the integration
  auto-created.

The Prisma datasource uses both env vars: `url = env("DATABASE_URL")` for
runtime queries through the serverless adapter, `directUrl =
env("DATABASE_URL_UNPOOLED")` for `prisma migrate deploy` (pgBouncer in
transaction mode breaks DDL). `scripts/build.mjs`, `lib/db.ts`, and
`prisma/seed.ts` fall back to `DATABASE_URL_UNPOOLED` if `DATABASE_URL`
isn't set, so a Vercel scope with only the unpooled variant doesn't break.

**Build flow** (every Vercel deploy):

```
node scripts/build.mjs
  → DATABASE_URL ||= DATABASE_URL_UNPOOLED   (graceful fallback)
  → npx prisma generate
  → npx prisma migrate deploy                (forward-only)
  → npx next build
```

**Important caveat:** preview branches contain a copy of production data
(Neon's free-tier integration always parents off the Default branch).
Vercel preview URLs are gated behind team auth — don't share preview
links externally. Full topology, recovery story, schema-change patterns,
and PITR window are in [`docs/database.md`](docs/database.md). Per-project
agent conventions live in [`CLAUDE.md`](CLAUDE.md).

## Text Anchoring Library

The `lib/anchoring/` module provides W3C-compliant text selectors:

```typescript
import { computeSelector, matchQuote, reanchorHighlight } from '@/lib/anchoring'

// Create selector from quote text
const selector = computeSelector(entryContent, quoteText)
// Returns: { startOffset, endOffset, exact, prefix, suffix }

// Fuzzy match when content changes
const match = matchQuote(newContent, selector.exact, {
  prefix: selector.prefix,
  suffix: selector.suffix,
  hint: selector.startOffset,
})
// Returns: { start, end, score } or null
```

## Deploy on Vercel

The easiest way to deploy is the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
