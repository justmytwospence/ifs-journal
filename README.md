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
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Push schema to database
npx prisma db push

# Seed demo data
npx prisma db seed

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Prisma with `@prisma/adapter-neon`
- **AI**: OpenAI GPT-4o
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS

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
