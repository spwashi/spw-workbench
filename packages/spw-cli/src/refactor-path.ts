/**
 * spw refactor --rename path:from=to — the filesystem edge of a path rename.
 *
 * The seed rule (`renamePaths`) decides each citation's new text from the
 * parser's PathRefs. This module owns what needs a disk: resolving the move's
 * two ends, the existence oracle, the move command the plan offers but never
 * runs, and the Markdown/HTML lines it lists without editing — those files are
 * not parsed, so the refactor does not claim them.
 */
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import {
  mayCitePathMoves,
  renamePaths,
  type PathMove,
  type RefactorPlanMoveCard,
  type RefactorPlanUnownedLink,
  type SemanticRule,
} from '@spwashi/spw-seed'
import { collectFilesByExtension } from './fs-walk'
import { resolveWorkspacePath, type SpwWorkspace } from './workspace'

/** A move with both ends absolute (host separators) and what kind of thing moves. */
export interface ResolvedPathMove {
  from: string
  to: string
  kind: 'file' | 'directory'
  state: 'pending' | 'moved'
}

export interface PathSpec {
  from: string
  to: string
}

/** Markdown and HTML: files that cite paths the parser does not read. */
export const UNOWNED_LINK_EXTENSIONS = ['.md', '.markdown', '.html', '.htm'] as const

const UNOWNED_LINE_LIMIT = 160

export function toPosix(p: string): string {
  return path.sep === '/' ? p : p.split(path.sep).join('/')
}

function toSeedMoves(moves: readonly ResolvedPathMove[]): PathMove[] {
  return moves.map(move => ({ from: toPosix(move.from), to: toPosix(move.to) }))
}

async function statKind(abs: string): Promise<'file' | 'directory' | null> {
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat) return null
  return stat.isDirectory() ? 'directory' : 'file'
}

function isAtOrUnder(candidate: string, dir: string): boolean {
  const rel = path.relative(dir, candidate)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * Resolve each `from=to` against the consumer root (the same authority the
 * refactor's targets use) and check the move is one a plan can describe.
 */
export async function resolvePathMoves(
  specs: readonly PathSpec[],
  workspace: SpwWorkspace | null,
  consumerRoot: string,
): Promise<ResolvedPathMove[] | { error: string }> {
  const moves: ResolvedPathMove[] = []
  for (const spec of specs) {
    let from: string
    let to: string
    try {
      from = workspace ? await resolveWorkspacePath(workspace, spec.from) : path.resolve(consumerRoot, spec.from)
      to = workspace ? await resolveWorkspacePath(workspace, spec.to) : path.resolve(consumerRoot, spec.to)
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
    if (from === to) return { error: `path:${spec.from}=${spec.to} names the same place twice` }
    if (isAtOrUnder(to, from)) return { error: `cannot move ${spec.from} inside itself (${spec.to})` }

    const [fromKind, toKind] = await Promise.all([statKind(from), statKind(to)])
    if (fromKind && toKind) {
      return { error: `${spec.to} already exists; name a destination that does not, so the move cannot nest or overwrite` }
    }
    const kind = fromKind ?? toKind
    if (!kind) return { error: `nothing at ${spec.from} (or at ${spec.to})` }
    moves.push({ from, to, kind, state: fromKind ? 'pending' : 'moved' })
  }
  return moves
}

/** The rule for one citing surface — where a citation lands depends on where it is written. */
export function pathRuleFor(file: string, moves: readonly ResolvedPathMove[], consumerRoot: string): SemanticRule {
  return renamePaths(toSeedMoves(moves), {
    consumerRoot: toPosix(consumerRoot),
    citingFile: toPosix(file),
    exists: abs => existsSync(abs),
  })
}

/** Skip the parse for surfaces that cannot owe a path edit. */
export function mayOwePathEdit(source: string, file: string, moves: readonly ResolvedPathMove[]): boolean {
  return mayCitePathMoves(source, toPosix(file), toSeedMoves(moves))
}

function shellWord(value: string): string {
  return /^[\w./@%+=:,-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * The move as a command to run from `cwd`. The refactor rewrites citations; it
 * never moves the file, so the plan hands the move over instead.
 */
export function moveCards(
  moves: readonly ResolvedPathMove[],
  consumerRoot: string,
  cwd: string,
): RefactorPlanMoveCard[] {
  return moves.map(move => {
    const from = path.relative(cwd, move.from) || '.'
    const to = path.relative(cwd, move.to) || '.'
    const parent = path.dirname(move.to)
    const mkdir = existsSync(parent) ? '' : `mkdir -p ${shellWord(path.relative(cwd, parent) || '.')} && `
    return {
      from: toPosix(path.relative(consumerRoot, move.from)),
      to: toPosix(path.relative(consumerRoot, move.to)),
      kind: move.kind,
      state: move.state,
      command: `${mkdir}mv ${shellWord(from)} ${shellWord(to)}`,
    }
  })
}

// ── Links the parser does not own ───────────────────────────────

const MARKDOWN_LINK = /\]\(\s*<?([^)\s>]+)>?/g
const HTML_LINK = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi
const REFERENCE_DEFINITION = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/

function linkTargets(line: string): string[] {
  const out: string[] = []
  for (const match of line.matchAll(MARKDOWN_LINK)) out.push(match[1]!)
  for (const match of line.matchAll(HTML_LINK)) out.push(match[1]!)
  const definition = line.match(REFERENCE_DEFINITION)
  if (definition) out.push(definition[1]!)
  return out
}

function linkLandsIn(target: string, fileDir: string, consumerRoot: string, moves: readonly ResolvedPathMove[]): boolean {
  const bare = target.replace(/[?#].*$/, '')
  if (!bare || /^[a-z][a-z0-9+.-]*:/i.test(bare)) return false
  let decoded = bare
  try { decoded = decodeURI(bare) } catch { /* keep the raw text */ }
  const candidates = decoded.startsWith('/')
    ? [path.resolve(consumerRoot, decoded.replace(/^\/+/, ''))]
    : [path.resolve(fileDir, decoded), path.resolve(consumerRoot, decoded)]
  return candidates.some(candidate => moves.some(move => isAtOrUnder(candidate, move.from)))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Lines in Markdown/HTML under `roots` that name a moved path: a link that
 * resolves into it, or its consumer-root-relative spelling. Listed, never
 * edited — these files are not parsed, so the refactor cannot own them.
 */
export async function findUnownedLinks(
  roots: readonly string[],
  moves: readonly ResolvedPathMove[],
  consumerRoot: string,
): Promise<RefactorPlanUnownedLink[]> {
  const files = [...new Set((await Promise.all(
    roots.map(root => collectFilesByExtension(root, UNOWNED_LINK_EXTENSIONS)),
  )).flat())].sort()

  const spellings = moves
    .map(move => toPosix(path.relative(consumerRoot, move.from)))
    .filter(spelling => spelling && !spelling.startsWith('..'))
    .map(spelling => new RegExp(`(?:^|[^\\w./-])(?:\\./)?${escapeRegExp(spelling)}(?![\\w-]|\\.\\w)`))

  const out: RefactorPlanUnownedLink[] = []
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8').catch(() => null)
    if (text === null) continue
    const fileDir = path.dirname(file)
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!
      const linked = linkTargets(line).some(target => linkLandsIn(target, fileDir, consumerRoot, moves))
      if (!linked && !spellings.some(pattern => pattern.test(line))) continue
      const trimmed = line.trim()
      out.push({
        file: toPosix(path.relative(consumerRoot, file)),
        line: i + 1,
        text: trimmed.length > UNOWNED_LINE_LIMIT ? `${trimmed.slice(0, UNOWNED_LINE_LIMIT - 1)}…` : trimmed,
      })
    }
  }
  return out
}
