/**
 * Fragment resolution — `~"file#anchor"` addresses a node, not a file.
 *
 * The fragment names a deixis anchor inside the target surface; resolution
 * returns that anchor's binding (the particle and the node it points at), or
 * a dangling verdict with the anchors that do exist — so consumers can
 * diagnose and suggest instead of failing blind. Pure tree-level: file IO and
 * path resolution stay with the consumers (mount, expand, LSP).
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */
import type { ASTNode } from '../types/ast'
import { deixisTable, type ParticleBinding } from './particles'

export interface ResolvedFragment {
  fragment: string
  /** The anchor's binding, or null when the fragment dangles. */
  binding: ParticleBinding | null
  /** Every anchor the surface offers — the suggestion surface for danglers. */
  available: string[]
}

/** Resolve one fragment against a parsed surface. */
export function resolveFragment(root: ASTNode, fragment: string): ResolvedFragment {
  const table = deixisTable(root)
  return {
    fragment,
    binding: table.get(fragment) ?? null,
    available: [...table.keys()],
  }
}
