import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface CuratedRoleFields {
  customName: string
  ageImpression: string
  positiveIntent: string
  fearedOutcome: string
  whatItProtects: string
  userNotes: string
}

export type CuratedByRole = Partial<
  Record<'manager' | 'protector' | 'firefighter' | 'exile', CuratedRoleFields>
>

export interface Persona {
  slug: string
  name: string
  oneLineDescription: string
  emoji?: string
  /** The markdown body, frontmatter stripped. Used verbatim as the
   *  respondent's system prompt and as the input to the body-hash. */
  body: string
  /** The full file contents, including frontmatter. Used for hashing /
   *  display when needed. */
  raw: string
  /** Per-role curated user-fields, loaded from a sibling
   *  `<slug>.curated.json` file. Never seen by the respondent — that path
   *  only ever reads `body`. Optional; if the sibling file is missing,
   *  curation is skipped for this persona. */
  curatedByRole?: CuratedByRole
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

export function parsePersonaFile(slug: string, raw: string): Persona {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) {
    throw new Error(`Persona "${slug}": missing YAML frontmatter (--- block).`)
  }
  const fm = parseSimpleYaml(match[1])
  const body = match[2].trim()

  if (!fm.name) {
    throw new Error(`Persona "${slug}": frontmatter missing required field "name".`)
  }
  if (!fm.oneLineDescription) {
    throw new Error(`Persona "${slug}": frontmatter missing required field "oneLineDescription".`)
  }

  return {
    slug,
    name: fm.name,
    oneLineDescription: fm.oneLineDescription,
    emoji: fm.emoji,
    body,
    raw,
  }
}

export async function loadPersona(personasDir: string, slug: string): Promise<Persona> {
  const raw = await readFile(join(personasDir, `${slug}.md`), 'utf-8')
  const persona = parsePersonaFile(slug, raw)
  persona.curatedByRole = await loadCuratedByRole(personasDir, slug)
  return persona
}

const CURATED_ROLES = ['manager', 'protector', 'firefighter', 'exile'] as const
const CURATED_FIELDS: (keyof CuratedRoleFields)[] = [
  'customName',
  'ageImpression',
  'positiveIntent',
  'fearedOutcome',
  'whatItProtects',
  'userNotes',
]

/**
 * Reads `<slug>.curated.json` next to the persona markdown. Returns
 * undefined if the file is absent — curation is then skipped for this
 * persona. Throws on malformed JSON or missing fields so the eval fails
 * loudly rather than silently writing partial data.
 *
 * The respondent never reads this file — `respondAsPersona` only ever
 * touches `persona.body` — so curated content cannot leak into generated
 * journal entries.
 */
async function loadCuratedByRole(
  personasDir: string,
  slug: string
): Promise<CuratedByRole | undefined> {
  let raw: string
  try {
    raw = await readFile(join(personasDir, `${slug}.curated.json`), 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw err
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>
  const out: CuratedByRole = {}
  for (const role of CURATED_ROLES) {
    const block = parsed[role]
    if (block === undefined) continue
    if (typeof block !== 'object' || block === null) {
      throw new Error(`Persona "${slug}": curated role "${role}" must be an object.`)
    }
    const b = block as Record<string, unknown>
    for (const f of CURATED_FIELDS) {
      if (typeof b[f] !== 'string' || b[f] === '') {
        throw new Error(`Persona "${slug}": curated.${role}.${f} must be a non-empty string.`)
      }
    }
    out[role] = {
      customName: b.customName as string,
      ageImpression: b.ageImpression as string,
      positiveIntent: b.positiveIntent as string,
      fearedOutcome: b.fearedOutcome as string,
      whatItProtects: b.whatItProtects as string,
      userNotes: b.userNotes as string,
    }
  }
  return out
}

/**
 * Minimal YAML scalar parser — frontmatter is small and only uses string
 * scalars. Avoids a yaml dependency for what amounts to `key: value` lines.
 */
function parseSimpleYaml(yaml: string): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!m) continue
    const value = m[2].trim().replace(/^['"]|['"]$/g, '')
    out[m[1]] = value
  }
  return out
}

/**
 * Returns just the body of a persona file (strip frontmatter). Used for
 * hashing — frontmatter holds display metadata only, so editing it shouldn't
 * invalidate snapshots.
 */
export function stripPersonaFrontmatter(raw: string): string {
  const match = raw.match(FRONTMATTER_RE)
  return (match ? match[2] : raw).trim()
}
