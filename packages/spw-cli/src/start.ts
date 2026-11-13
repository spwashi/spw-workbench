/**
 * What bare `spw` prints: where to start, read from the .spw tree it runs in.
 *
 * Outside any workspace it offers to make one. Inside, it names the workspace
 * (canonical or a mounted consumer), suggests a walk through its own declared
 * roots and index, and lists the surfaces changed most recently: the places the
 * tree was last worked on, read from file times. It ends by saying what reading
 * the tree cost (files looked at, milliseconds), so the price of the page is
 * visible, and a workspace can lower it.
 *
 * A workspace tunes the page in .spw/workspace.spw with a ^"start" frame:
 *
 *   ^"start"{
 *    chapters: "spw tree @chapters --depth 2"
 *    index: "spw outline @index"
 *    recent: 3
 *   }
 *
 * Each binding with a quoted spw command is a start line, said by its key.
 * recent sets how many recently changed surfaces are listed; 0 skips the walk
 * that finds them, which is the only part of the page that reads more than two
 * files. Without the frame the page is derived from the declared roots.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { collectSpwFiles } from './fs-walk'
import { COMMAND_GROUPS, COMMANDS } from './commands'
import { renderHelpPage, type HelpSection } from './help'
import { tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

export interface StartLine {
  command: string
  says: string
}

export interface StartPage {
  /** none: no .spw/mount.spw above the start path. */
  mode: SpwWorkspace['mode'] | 'none'
  where: string
  start: StartLine[]
  /** Surfaces changed most recently, newest first, as paths relative to where the command runs. */
  recent: Array<{ path: string; changed: Date }>
  /** What reading the tree cost. */
  cost: { files: number; ms: number }
  /** Where the start lines came from. */
  source: 'workspace' | 'derived' | 'none'
}

export interface StartFrame {
  lines: StartLine[]
  recent?: number
}

const DEFAULT_RECENT = 3
/** Folders tools write into; a surface there changed because a tool ran, not because someone worked on it. */
const WRITTEN_BY_TOOLS = [`${path.sep}.agents${path.sep}state${path.sep}`, `${path.sep}.spw${path.sep}gen${path.sep}`]

/** Read a ^"start"{ … } frame out of a workspace manifest's text. */
export function readStartFrame(text: string): StartFrame | null {
  const open = text.search(/\^"start"\s*\{/)
  if (open < 0) return null
  let depth = 0
  let end = -1
  for (let i = text.indexOf('{', open); i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) {
      end = i
      break
    }
  }
  if (end < 0) return null
  const body = text.slice(text.indexOf('{', open) + 1, end)
  const lines: StartLine[] = []
  let recent: number | undefined
  for (const m of body.matchAll(/^\s*([A-Za-z_][\w-]*)\s*:\s*(?:"([^"]*)"|(\d+))\s*$/gm)) {
    const [, key, quoted, number] = m
    if (key === 'recent' && number !== undefined) recent = Number(number)
    else if (quoted !== undefined && quoted.trim().startsWith('spw ')) lines.push({ command: quoted.trim(), says: key!.replace(/_/g, ' ') })
  }
  return { lines, ...(recent !== undefined ? { recent } : {}) }
}

const rel = (from: string, to: string): string => {
  const r = path.relative(from, to)
  return r === '' ? '.' : r.startsWith('..') ? to : r
}

function derivedLines(workspace: SpwWorkspace): StartLine[] {
  const lines: StartLine[] = [{ command: 'spw quest', says: 'walk the first steps into Spw, one checked line at a time' }]
  lines.push({
    command: 'spw doctor',
    says: workspace.mode === 'mounted-consumer' ? 'check this workspace and the workbench it mounts' : 'check this workspace and its tools',
  })
  const place = workspace.roots.find((r) => r.kind === 'directory' && !['repo', 'spw'].includes(r.sigil) && r.role !== 'infrastructure' && r.role !== 'external')
  lines.push(place ? { command: `spw tree @${place.sigil} --depth 2`, says: `list the .spw files under @${place.sigil}` } : { command: 'spw tree', says: 'list the .spw files here' })
  const index = workspace.roots.find((r) => r.sigil === 'index' && r.kind === 'file')
  if (index) lines.push({ command: 'spw outline @index', says: 'read the index by its landmarks' })
  return lines
}

/** Build the start page for a path: what the tree there says, and what it cost to read. */
export async function startPage(cwd: string = process.cwd()): Promise<StartPage> {
  const began = performance.now()
  let files = 0
  const workspace = await tryDiscoverSpwWorkspace(cwd).catch(() => null)
  if (!workspace) {
    return {
      mode: 'none',
      where: cwd,
      start: [
        { command: 'spw init', says: 'make a .spw workspace here' },
        { command: 'spw quest', says: 'walk the first steps into Spw, one checked line at a time' },
        { command: "spw say --line '~garden[care]{seed, water}'", says: 'hear a line said in the names of its parts' },
      ],
      recent: [],
      cost: { files: 1, ms: Math.round(performance.now() - began) },
      source: 'none',
    }
  }
  files += 2 // mount.spw and workspace.spw
  let frame: StartFrame | null = null
  try {
    frame = readStartFrame(await fs.readFile(workspace.manifestPath, 'utf8'))
  } catch {
    frame = null
  }
  const start = frame && frame.lines.length ? frame.lines : derivedLines(workspace)
  const wanted = frame?.recent ?? DEFAULT_RECENT

  let recent: StartPage['recent'] = []
  if (wanted > 0) {
    const paths = await collectSpwFiles(workspace.consumerRoot)
    files += paths.length
    const authored = paths.filter((p) => !WRITTEN_BY_TOOLS.some((dir) => p.includes(dir)))
    const stamped = await Promise.all(authored.map(async (p) => ({ p, at: (await fs.stat(p).catch(() => null))?.mtime })))
    recent = stamped
      .filter((s): s is { p: string; at: Date } => Boolean(s.at))
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, wanted)
      .map((s) => ({ path: rel(cwd, s.p), changed: s.at }))
  }

  return {
    mode: workspace.mode,
    where: rel(cwd, workspace.consumerRoot),
    start,
    recent,
    cost: { files, ms: Math.round(performance.now() - began) },
    source: frame && frame.lines.length ? 'workspace' : 'derived',
  }
}

function ago(when: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - when.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

/** The page as text. */
export function renderStartPage(page: StartPage, now: Date = new Date()): string {
  const width = Math.max(...page.start.map((l) => l.command.length), ...page.recent.map((r) => `spw outline ${r.path}`.length))
  const sections: HelpSection[] = []
  const heading =
    page.mode === 'none'
      ? 'Start here (no .spw workspace above this folder)'
      : `Start here (${page.mode === 'canonical' ? 'the workbench' : 'a workspace that mounts the workbench'}${page.where === '.' ? '' : `, at ${page.where}`}${page.source === 'workspace' ? ', lines from its ^"start" frame' : ''})`
  sections.push({ title: heading, lines: page.start.map((l) => `${l.command.padEnd(width)}  ${l.says}`) })
  if (page.recent.length) {
    sections.push({
      title: 'Changed most recently',
      lines: page.recent.map((r) => `${`spw outline ${r.path}`.padEnd(width)}  ${ago(r.changed, now)}`),
    })
  }
  const counts = COMMAND_GROUPS.map((group) => `${group.title.toLowerCase()} ${COMMANDS.filter((spec) => spec.group === group.id).length}`)
  sections.push({
    title: 'Everything else',
    lines: [
      `spw help          all ${COMMANDS.length} commands, by group (${counts.join(', ')})`,
      'spw help --json   the same as data, every flag included, for tools and agents',
    ],
  })
  const tune = page.mode === 'none' ? '' : page.recent.length ? ' (to skip the walk, write recent: 0 in a ^"start" frame of .spw/workspace.spw)' : ''
  sections.push({ title: 'Read', lines: [`${page.cost.files} file${page.cost.files === 1 ? '' : 's'} in ${page.cost.ms} ms${tune}`] })
  return renderHelpPage({ title: 'Spw CLI', usage: ['spw <command> [arguments] [options]', 'spw <command> --help'], sections })
}

export async function printStartPage(cwd: string = process.cwd()): Promise<void> {
  console.log(renderStartPage(await startPage(cwd)))
}
