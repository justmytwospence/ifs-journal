import { execSync } from 'node:child_process'

export interface GitContext {
  sha: string
  branch: string
  /** True when the working tree had uncommitted changes at run time. */
  dirty: boolean
}

/**
 * Captures git lineage for a snapshot — the SHA the run was made against,
 * the branch name, and whether the tree was dirty. Used so a snapshot's
 * provenance is traceable without external metadata.
 */
export function captureGitContext(): GitContext {
  const sha = execSync('git rev-parse HEAD').toString().trim()
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  const dirty = execSync('git status --porcelain').toString().trim().length > 0
  return { sha, branch, dirty }
}
