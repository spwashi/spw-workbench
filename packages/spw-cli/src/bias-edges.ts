/**
 * bias-edges — the one place the CLI reads bias edges off a surface.
 *
 * mount (resolution), mutate (rewrite), and expand (template) all need the same
 * two things: enumerate the bias edges in a source, and resolve a tilde-relative
 * target on disk. They live here so the three consumers share one reading and
 * one resolution rule instead of re-deriving them. readBias stays verb-neutral
 * in seed; this is still just reading — the verb lives in each consumer.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { BIAS, readBias, spwq, type BiasEdge } from '@spwashi/spw-seed'

/** A bias edge located in a source: the neutral edge plus where it sits. */
export interface BiasSite {
  edge: BiasEdge
  /** Operator label, e.g. `ref` in `=ref{ … }`. */
  label?: string
  /** 1-based line of the edge's first character. */
  line: number
  /** 1-based line of the edge's last character (insertion point for projection). */
  endLine: number
}

/** Enumerate the bias edges in a surface, in source order. */
export function biasSites(source: string): BiasSite[] {
  let matches
  try {
    matches = spwq.fromSource(source, BIAS)
  } catch {
    return []
  }
  const sites: BiasSite[] = []
  for (const match of matches) {
    const edge = readBias(match.node)
    if (!edge) continue
    const label = (match.node as { operatorLabel?: { value?: string } }).operatorLabel?.value
    sites.push({ edge, label, line: match.span.startLine + 1, endLine: match.span.endLine + 1 })
  }
  return sites
}

/**
 * Resolve a tilde-relative target to an existing file: workspace root (cwd)
 * first, then the surface's own directory. A `#fragment` is stripped before
 * resolving. Returns the resolved path, or null when nothing exists.
 */
export async function resolveTilde(target: string, baseDir: string): Promise<string | null> {
  const bare = target.split('#')[0]!
  for (const candidate of [path.resolve(bare), path.resolve(baseDir, bare)]) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // try the next candidate
    }
  }
  return null
}
