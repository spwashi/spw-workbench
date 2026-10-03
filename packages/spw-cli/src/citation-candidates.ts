/**
 * Where a classified citation may land on disk — one order shared by
 * `spw resolve` and the corpus scan, so the two cannot drift apart.
 */

import path from 'node:path'
import type { ClassifiedCitation } from '@spwashi/spw-seed'

/**
 * Which base a relative target resolved against. The citing file's directory is
 * tried first, then the consumer root — the same order the LSP follows, so a
 * `~"packages/…"` citation that navigates in the editor also resolves here.
 */
export type ResolveBasis = 'file' | 'root'

/**
 * Candidate absolute paths for a citation, in the order to try them. A `/route`
 * resolves against the consumer root only; anything else tries the citing
 * file's directory first, then the consumer root.
 */
export function citationCandidates(
  citation: Pick<ClassifiedCitation, 'kind' | 'targetPath'>,
  citingDir: string,
  consumerRoot: string,
): Array<[ResolveBasis, string]> {
  if (citation.kind === 'route') {
    return [['root', path.resolve(consumerRoot, citation.targetPath.replace(/^\/+/, ''))]]
  }
  return [
    ['file', path.resolve(citingDir, citation.targetPath)],
    ['root', path.resolve(consumerRoot, citation.targetPath)],
  ]
}
