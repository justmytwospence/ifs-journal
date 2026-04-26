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
- `npm run db:seed` — load demo personas from committed snapshots (see Gotchas)
- `npm run db:studio` — Prisma Studio
- `npm run eval` — run the persona eval harness (drives the live pipeline against
  synthetic personas, writes a snapshot per persona). Slow + spends API tokens.
- `npm run eval:promote` — copy the latest `<timestamp>.json` snapshot to
  `latest.json` per persona; that's the file the seed reads
- `npm run eval:report` — print the scorecard for the latest snapshot of each
  persona (forbidden patterns, prompt diversity, citation validity, coverage)

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
- `evals/personas/<slug>.md` — persona profiles, body is the respondent's
  system prompt verbatim. YAML frontmatter holds picker metadata.
- `evals/snapshots/<slug>/{<timestamp>,latest}.json` — committed eval output;
  `latest.json` is what `prisma db seed` loads.
- `lib/eval/` — eval harness: `respondent`, `run-persona`, `capture`, `score`
- `lib/prompts/generate-for-user.ts`, `lib/journal/save-entry.ts` — extracted
  cores of the corresponding API routes; both the routes and the eval harness
  share these so the eval runs the production code path.
- `infra/dns/` — DNS records for domains we control, committed as JSON for reproducibility (Resend domain config for `ifsjournal.me`)

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
- Demo users: `isDemo` is derived server-side in `lib/auth.ts` from a Set of
  emails read from `evals/personas/<slug>.md` filenames where a corresponding
  `evals/snapshots/<slug>/latest.json` exists. The legacy `DEMO_USER_EMAIL`
  env var is included in the set as a fallback for backwards compat. Never
  trust client input for the demo flag.

## Gotchas

- `npm run db:seed` is a **pure DB-insert loader**: reads
  `evals/snapshots/<persona>/latest.json` for each committed persona, upserts
  `demo-<slug>@ifsjournal.me`, wipes that user's parts+entries, and reloads
  from the snapshot. No LLM calls. Runs in seconds. Only touches demo users.
  **Now invoked by every Vercel deploy** via `scripts/build.mjs` between
  migrate-deploy and next-build, so prod and previews always reflect the
  committed snapshots
- `npm run eval` runs the slow path — drives the live prompt-gen +
  saveEntry + batch-analysis pipeline against persona "respondents" (isolated
  Anthropic calls that see only the persona file + their own prior responses).
  Writes one snapshot per persona to `evals/snapshots/<slug>/`. Sequential, ~$2
  + ~15min per persona. Re-run when the prompt-gen template, persona files, or
  the LLM/analysis stack changes meaningfully. Then `npm run eval:promote`
  + commit
- `db:migrate`, `db:seed`, `db:reset`, `db:push`, `eval` are gated by `scripts/check-not-prod.ts` — they refuse to run when `DATABASE_URL` resolves to the production Neon endpoint. Override with `ALLOW_PROD_DB_WRITE=1` for the rare deliberate prod seed
- Preview deploys run on ephemeral Neon branches **cloned from `production`** by the Neon ↔ Vercel integration; they're auto-deleted when the PR closes. Real user data lands in previews — preview URLs are gated behind Vercel team auth, so don't share preview links externally. Trade-off rationale + future mitigations in `docs/database.md`
- Prompt markdown files are bundled into serverless function output via `outputFileTracingIncludes` in `next.config.ts` — add new prompt call sites there
- Node locked to `>=22.21.0 <23.0.0` in `engines`
- Vercel functions default to 60s; `/api/parts/batch-reanalysis` gets 300s via `vercel.json`
