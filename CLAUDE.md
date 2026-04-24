# IFS Journal

Next.js app for Internal Family Systems (IFS) therapy journaling. Users write journal
entries; Claude extracts "parts" (Managers, Firefighters, Protectors, Exiles) via the
Anthropic Citations API and anchors them back to source passages using W3C text
quote/position selectors. The core premise is citation-grounded extraction — parts
must be backed by actual cited passages, never free-form inferences.

## Commands

- `npm run dev` — Next dev server (Turbopack)
- `npm run lint` — Biome check (config in `biome.json`, not ESLint/Prettier)
- `npm run check` — Biome check + write auto-fixes
- `npm run db:migrate` — Prisma migrate dev
- `npm run db:seed` — wipe + reseed demo user, runs batch analysis (see Gotchas)
- `npm run db:studio` — Prisma Studio

## Architecture skeleton

- `app/` — App Router. `(auth)/` for login/register, `api/` for route handlers
- `lib/` — shared utilities
  - `lib/anthropic.ts` — SDK client + model constants (`ANALYSIS_MODEL`, `CONVERSATION_MODEL`, `CONTENT_MODEL`)
  - `lib/auth.ts` — NextAuth v5-beta config (credentials provider)
  - `lib/batch-analysis.ts` — holistic reanalysis of all entries (streamed)
  - `lib/citation-parser.ts` — parses `<part>` XML + Anthropic citations (being replaced in P1.1)
  - `lib/part-similarity.ts` — Levenshtein + synonym dedup
  - `lib/anchoring/` — W3C TextQuoteSelector + fuzzy re-anchoring
  - `lib/prompts/*.md` — prompt templates, bundled via `next.config.ts` `outputFileTracingIncludes`
- `prisma/schema.prisma` — User, JournalEntry, Part, PartAnalysis, Highlight, PartConversation, PartsOperation
- `proxy.ts` — edge middleware (Next 16 convention; was called `middleware.ts` pre-16)

## LLM surfaces

- `POST /api/parts/batch-reanalysis` — Opus 4.7, streams, 300s vercel timeout
- `POST /api/journal/entries/[id]/incremental-analysis` — Opus 4.7, single entry
- `POST /api/conversations` — Opus 4.7, streaming SSE (`data: {"content":"…"}\n\n` + `[DONE]`)
- `POST /api/prompts/generate` + `POST /api/prompts/writing-tips` — Sonnet 4.6

## Conventions

- **Biome**, not Prettier/ESLint. Single quotes, semicolons as needed, 100 col
- Path alias `@/*` → repo root
- Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `security:`, `style:`)
- No emoji in code or comments. Emoji icons for parts are user-facing data, fine
- Per-route auth: every API handler calls `auth()` and filters Prisma queries by `session.user.id`. Do not add new endpoints without both
- Demo user: `isDemo` is derived server-side from `DEMO_USER_EMAIL` in `lib/auth.ts` — never trust client input

## Gotchas

- `prisma db seed` **wipes and recreates the demo user's journal entries + parts** on every deploy (so demo data looks current). Runs batch analysis at the end
- Prompt markdown files are bundled into serverless function output via `outputFileTracingIncludes` in `next.config.ts` — add new prompt call sites there
- Node locked to `>=22.21.0 <23.0.0` in `engines`
- Vercel functions default to 60s; `/api/parts/batch-reanalysis` gets 300s via `vercel.json`
