/**
 * Path rename — re-aim citations when a file or directory moves.
 *
 * A move is the refactor that breaks the most links at once: every `~"…"`
 * that reached the old place now dangles, and every relative link inside a
 * moved directory may now climb the wrong number of `../`. Consumers have
 * rewritten these by hand with scripts that grep text; this rule instead
 * walks the parser's PathRefs, so prose that merely looks like a path is
 * never touched.
 *
 * For each citation it decides where the citation lands today, where that
 * target will be after the move, and where the citing surface itself will
 * sit, then writes the shortest text in the citation's own form — `./` or
 * `../` relative, bare, root-relative, or `/route` — keeping its `#fragment`
 * and its quotes. A citation that already reaches its target from where it
 * will sit is left alone, which is what makes a second run a no-op.
 *
 * Paths here are absolute and `/`-separated; hosts convert at their edge.
 * Existence is an oracle the host supplies, so the rule stays portable.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { PathRefNode } from '../types/ast'
import { PATH_REFS } from '../query/presets'
import { classifyCitation } from './resolve-citation'
import type { SemanticRule, SemanticRewrite } from './semantic-edit'

/** One move, `from` → `to`, as absolute `/`-separated paths. */
export interface PathMove {
  from: string
  to: string
}

export interface PathRenameContext {
  /** Consumer root. Bare citations fall back to it, as `spw resolve` and the LSP do. */
  consumerRoot: string
  /** The surface being planned, where it sits now (before any move). */
  citingFile: string
  /** Whether a path exists now. Files and directories both count. */
  exists(absPath: string): boolean
}

/** How a citation names its target; a rewrite keeps the form it found. */
export type CitationForm = 'relative' | 'bare' | 'route'
type Basis = 'file' | 'root'

// ── Path arithmetic (POSIX, host-free) ──────────────────────────

export function normalizePath(p: string): string {
  const absolute = p.startsWith('/')
  const out: string[] = []
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop()
      else if (!absolute) out.push('..')
      continue
    }
    out.push(part)
  }
  return (absolute ? '/' : '') + out.join('/')
}

function joinPath(dir: string, rel: string): string {
  return normalizePath(`${dir}/${rel}`)
}

function dirnameOf(p: string): string {
  const cut = p.lastIndexOf('/')
  return cut <= 0 ? '/' : p.slice(0, cut)
}

export function relativePath(fromDir: string, to: string): string {
  const a = normalizePath(fromDir).split('/').filter(Boolean)
  const b = normalizePath(to).split('/').filter(Boolean)
  let shared = 0
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared += 1
  return [...a.slice(shared).map(() => '..'), ...b.slice(shared)].join('/')
}

function isAtOrUnder(p: string, dir: string): boolean {
  return p === dir || p.startsWith(dir.endsWith('/') ? dir : `${dir}/`)
}

/** Where `p` sits once every move has happened. */
export function mapThroughMoves(p: string, moves: readonly PathMove[]): string {
  for (const move of moves) {
    if (isAtOrUnder(p, move.from)) return move.to + p.slice(move.from.length)
  }
  return p
}

function normalizeMoves(moves: readonly PathMove[]): PathMove[] {
  return moves.map(move => ({ from: normalizePath(move.from), to: normalizePath(move.to) }))
}

// ── Citation reading ────────────────────────────────────────────

function formOf(pathText: string): CitationForm {
  if (pathText.startsWith('/')) return 'route'
  if (pathText === '.' || pathText === '..' || pathText.startsWith('./') || pathText.startsWith('../')) return 'relative'
  return 'bare'
}

/** Candidate targets in resolution order — citing directory first, then root. */
function candidates(pathText: string, form: CitationForm, citingDir: string, root: string): Array<[Basis, string]> {
  if (form === 'route') return [['root', joinPath(root, pathText.slice(1))]]
  const byFile = joinPath(citingDir, pathText)
  const byRoot = joinPath(root, pathText)
  // A bare citation from a surface at the root reads as root-relative: that
  // form survives the citing surface moving deeper, the file form would not.
  if (byFile === byRoot) return [[form === 'bare' ? 'root' : 'file', byFile]]
  return [['file', byFile], ['root', byRoot]]
}

interface Resolution {
  target: string
  basis: Basis
}

/**
 * Where a citation lands, read from where its surface sits now: the first
 * candidate that exists, else one still naming a moved path (the move already
 * happened). Anything else dangles and is not this rule's to fix — including a
 * moving surface's links that a first run already rebased for where it will
 * sit, which is why a second run owes nothing.
 */
function resolveCitation(
  pathText: string,
  form: CitationForm,
  moves: readonly PathMove[],
  context: PathRenameContext,
  root: string,
  citingFile: string,
): Resolution | null {
  const now = candidates(pathText, form, dirnameOf(citingFile), root)
  for (const [basis, target] of now) {
    if (context.exists(target)) return { target, basis }
  }
  for (const [basis, target] of now) {
    if (moves.some(move => isAtOrUnder(target, move.from))) return { target, basis }
  }
  return null
}

function express(
  target: string,
  form: CitationForm,
  basis: Basis,
  nextCitingDir: string,
  root: string,
  trailingSlash: boolean,
): string {
  const rel = relativePath(basis === 'root' ? root : nextCitingDir, target)
  let text: string
  if (form === 'route') text = `/${rel}`
  else if (form === 'relative') text = rel === '' ? '.' : rel.startsWith('..') ? rel : `./${rel}`
  else text = rel === '' ? '.' : rel
  return trailingSlash && !text.endsWith('/') ? `${text}/` : text
}

/**
 * The inner range of a path literal — inside its quotes when it has them —
 * and the delimiters to show it with (`~<…>` paths carry none of their own).
 */
function literalRange(node: PathRefNode, source: string): { start: number; end: number; open: string; close: string } {
  const start = node.path.span.start.offset
  const end = node.path.span.end.offset
  const open = source[start]
  const quoted = end - start >= 2 && (open === '"' || open === "'" || open === '`') && source[end - 1] === open
  if (quoted) return { start: start + 1, end: end - 1, open: open!, close: open! }
  const bounded = source[start - 1] === '<'
  return { start, end, open: bounded ? '<' : '', close: bounded ? '>' : '' }
}

/**
 * Plan one citation's rewrite under a set of moves, or null when it already
 * reaches its target from where its surface will sit (or is not ours).
 */
export function rewriteCitationForMoves(
  node: PathRefNode,
  source: string,
  moves: readonly PathMove[],
  context: PathRenameContext,
): SemanticRewrite | null {
  const range = literalRange(node, source)
  const raw = source.slice(range.start, range.end)
  if (!raw || raw.includes('*') || /\s/.test(raw)) return null

  const kind = classifyCitation(raw).kind
  if (kind === 'external' || kind === 'malformed') return null

  const hash = raw.lastIndexOf('#')
  const pathText = hash > 0 ? raw.slice(0, hash) : raw
  const fragment = hash > 0 ? raw.slice(hash) : ''
  if (pathText.startsWith('~')) return null

  const normalized = normalizeMoves(moves)
  const root = normalizePath(context.consumerRoot)
  const citingFile = normalizePath(context.citingFile)
  const nextCitingDir = dirnameOf(mapThroughMoves(citingFile, normalized))
  const form = formOf(pathText)

  const resolved = resolveCitation(pathText, form, normalized, context, root, citingFile)
  if (!resolved) return null

  const nextTarget = mapThroughMoves(resolved.target, normalized)
  const base = form === 'route' || resolved.basis === 'root' ? root : nextCitingDir
  const readable = form === 'route' ? pathText.slice(1) : pathText
  if (joinPath(base, readable) === nextTarget) return null

  const nextPath = express(nextTarget, form, resolved.basis, nextCitingDir, root, pathText.endsWith('/'))
  if (nextPath === pathText) return null
  const newText = `${nextPath}${fragment}`
  return {
    range: { start: range.start, end: range.end },
    newText,
    reason: `~${range.open}${raw}${range.close} → ~${range.open}${newText}${range.close}`,
  }
}

/**
 * A rule that re-aims every citation in one surface under a set of moves.
 *
 * Built per citing surface, since where a citation lands depends on where it
 * is written. All moves share one rule so a citation is edited once even when
 * both its target and its own surface move.
 */
export function renamePaths(moves: readonly PathMove[], context: PathRenameContext): SemanticRule {
  const root = normalizePath(context.consumerRoot)
  const label = normalizeMoves(moves)
    .map(move => `${relativePath(root, move.from) || '.'}→${relativePath(root, move.to) || '.'}`)
    .join(', ')
  return {
    id: `rename_path:${label}`,
    description: `Re-aim citations for ${label}`,
    select: PATH_REFS,
    stratum: 'reference',
    effectGrade: 'effect.l2.workspace',
    rewrite(node, source) {
      return rewriteCitationForMoves(node as PathRefNode, source, moves, context)
    },
  }
}

/**
 * Cheap gate before parsing: a surface can only owe an edit if it moves, or if
 * its text names the last segment of a moved path — every citation that
 * reaches into a moved path from outside it has to spell that segment.
 */
export function mayCitePathMoves(source: string, citingFile: string, moves: readonly PathMove[]): boolean {
  const file = normalizePath(citingFile)
  return normalizeMoves(moves).some(move => {
    if (isAtOrUnder(file, move.from)) return true
    const segment = move.from.slice(move.from.lastIndexOf('/') + 1)
    return segment.length > 0 && source.includes(segment)
  })
}
