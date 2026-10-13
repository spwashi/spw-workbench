/**
 * workspace/willRenameFiles — re-aim citations before a .spw file or folder moves.
 *
 * The same plan `spw refactor --rename path:from=to` computes: the seed's
 * `renamePaths` rule over every workspace surface, so every citation the
 * parser finds that lands on the moved path (or under a moved folder) is
 * rewritten to reach the new place from where its surface will sit, keeping
 * its form, fragment and quotes. The editor applies the edit and then moves
 * the file; the server never touches the disk.
 *
 * Open buffers are read in preference to disk, so edit ranges match what the
 * editor holds. Markdown and HTML are not parsed and so are not edited here.
 */

import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  mayCitePathMoves,
  offsetToPosition,
  planSemanticEdits,
  renamePaths,
  type PathMove,
} from '@spwashi/spw-seed'
import type { HandlerDeps, LspTextEdit, LspWorkspaceEdit } from '../types'

export interface FileRename {
  oldUri: string
  newUri: string
}

export interface RenameFilesParams {
  files?: FileRename[]
}

/** Surfaces planned at once; reads are cheap, parses happen only past the text gate. */
const RENAME_SCAN_CONCURRENCY = 16

function toPosix(p: string): string {
  return path.sep === '/' ? p : p.split(path.sep).join('/')
}

function isDirectory(abs: string): boolean {
  try { return statSync(abs).isDirectory() } catch { return false }
}

/** The renames this handler owns: .spw files and folders, as seed moves. */
export function movesFromRenames(params: RenameFilesParams | undefined, deps: Pick<HandlerDeps, 'pathFromUri'>): PathMove[] {
  const moves: PathMove[] = []
  for (const file of params?.files ?? []) {
    if (typeof file?.oldUri !== 'string' || typeof file?.newUri !== 'string') continue
    const from = deps.pathFromUri(file.oldUri)
    const to = deps.pathFromUri(file.newUri)
    if (!from || !to || from === to) continue
    if (!from.endsWith('.spw') && !isDirectory(from)) continue
    moves.push({ from: toPosix(from), to: toPosix(to) })
  }
  return moves
}

async function editsFor(
  file: string,
  moves: PathMove[],
  deps: HandlerDeps,
): Promise<[string, LspTextEdit[]] | null> {
  const uri = deps.uriFromPath(file)
  const source = await deps.getDocumentText(uri)
  if (source === null || !mayCitePathMoves(source, toPosix(file), moves)) return null

  const rule = renamePaths(moves, {
    consumerRoot: toPosix(deps.workspaceRoot),
    citingFile: toPosix(file),
    exists: abs => existsSync(abs),
  })
  const plan = planSemanticEdits(source, [rule])
  if (plan.edits.length === 0) return null
  return [uri, plan.edits.map(edit => ({
    range: { start: offsetToPosition(source, edit.start), end: offsetToPosition(source, edit.end) },
    newText: edit.newText,
  }))]
}

export async function willRenameFiles(
  params: RenameFilesParams | undefined,
  deps: HandlerDeps,
): Promise<LspWorkspaceEdit | null> {
  const moves = movesFromRenames(params, deps)
  if (moves.length === 0) return null

  const files = await deps.getWorkspaceSpwFiles()
  const planned = await deps.mapWithConcurrency(files, RENAME_SCAN_CONCURRENCY, file => editsFor(file, moves, deps))

  const changes: Record<string, LspTextEdit[]> = {}
  for (const entry of planned) {
    if (entry) changes[entry[0]] = entry[1]
  }
  if (Object.keys(changes).length === 0) return null
  deps.log(`willRenameFiles moves=${moves.length} files=${Object.keys(changes).length}`)
  return { changes }
}
