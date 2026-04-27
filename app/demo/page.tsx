import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { loadPersona, type Persona } from '@/lib/eval/persona-loader'
import { DemoPicker } from './DemoPicker'

const PERSONAS_DIR = 'evals/personas'
const SNAPSHOTS_DIR = 'evals/snapshots'

/**
 * Lists personas that have a committed snapshot in evals/snapshots/<slug>/latest.json.
 * A persona without a snapshot would result in a demo card whose user doesn't
 * exist in the DB (the seed only creates users for committed snapshots), so we
 * filter them out here as well.
 */
async function listAvailablePersonas(): Promise<Persona[]> {
  let files: string[]
  try {
    files = await readdir(PERSONAS_DIR)
  } catch {
    return []
  }
  const slugs = files
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .filter((slug) => existsSync(join(SNAPSHOTS_DIR, slug, 'latest.json')))
    .sort()
  return Promise.all(slugs.map((slug) => loadPersona(PERSONAS_DIR, slug)))
}

export default async function DemoPage() {
  const personas = await listAvailablePersonas()

  if (personas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl tracking-tight text-foreground mb-4">
            Demo not yet available
          </h1>
          <p className="text-muted-foreground mb-6">
            The demo accounts haven't been seeded yet. Check back soon.
          </p>
          <Button size="lg" render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl tracking-tight text-foreground mb-3">
            Try a demo account
          </h1>
          <p className="text-muted-foreground">
            Pick one to explore. Each is a fictional persona with their own journal entries and
            parts. All accounts are read-only.
          </p>
        </div>
        <DemoPicker
          personas={personas.map((p) => ({
            slug: p.slug,
            name: p.name,
            oneLineDescription: p.oneLineDescription,
            emoji: p.emoji,
          }))}
        />
      </div>
    </div>
  )
}
