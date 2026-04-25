import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// Neon's serverless driver uses WebSockets to talk to the database. In Node
// runtimes it needs a WebSocket constructor; Node 22+ exposes a global one
// that matches the browser API well enough for Neon's purposes. On edge it's
// already there. Only override if a concrete polyfill is required.
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket as unknown as typeof neonConfig.webSocketConstructor
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrisma(): PrismaClient {
  // The Neon-Vercel integration provides DATABASE_URL (pooled) when it can
  // and always provides DATABASE_URL_UNPOOLED (direct). Fall back to the
  // unpooled variant when the pooled one isn't set so a misaligned env scope
  // never silently breaks runtime queries.
  const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required')
  }
  // Driver adapter keeps a pool alive across hot serverless invocations so
  // cold starts don't open a fresh TCP connection every time — the previous
  // vanilla PrismaClient would exhaust Neon's connection limits under load.
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
