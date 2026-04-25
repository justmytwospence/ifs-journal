import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load .env.local file for Prisma CLI commands
config({ path: '.env.local' })

// Mirror lib/db.ts and scripts/build.mjs: accept either DATABASE_URL (pooled)
// or DATABASE_URL_UNPOOLED (direct) so a Vercel scope that has only the
// integration-set unpooled variant doesn't break `prisma generate` in
// postinstall. Don't use Prisma's `env()` helper here — it throws at module
// load time if the named var is missing, defeating the fallback.
const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? ''

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: databaseUrl,
  },
})
