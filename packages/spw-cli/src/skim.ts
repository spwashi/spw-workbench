/**
 * spw skim / spw read — fast outline and line windows for .spw surfaces.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { parseSkimArgs } from './args'
import { printHelpPage } from './help'
import type { SkimArgs } from './types'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'
import { meta, metaBlock, renderOutline, skimOutline, sliceLines } from './view'

export async function runSpwSkimCli(argv: string[] = process.argv): Promise<void> {
  const raw = argv.slice(2)
  const cmd = raw[0] === 'skim' || raw[0] === 'read' ? raw[0] : 'skim'
  const args = parseSkimArgs(raw[0] === 'skim' || raw[0] === 'read' ? raw.slice(1) : raw)

  if (!args.file) {
    printSkimHelp(cmd)
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const filePath = workspace ? await resolveWorkspacePath(workspace, args.file) : resolve(args.file)

  let source: string
  try {
    source = await readFile(filePath, 'utf8')
  } catch {
    console.error(`spw ${cmd}: cannot read ${args.file}`)
    process.exitCode = 1
    return
  }

  const lineCount = source.split(/\r?\n/).length
  meta(`# spw ${cmd}  file=${args.file}  lines=${lineCount}`)

  // Line window read mode
  if (args.lines || args.around) {
    const { start, end } = resolveLineWindow(args, lineCount)
    console.log(sliceLines(source, start, end))
    meta(`  window ${start}-${end}`)
    return
  }

  const outline = skimOutline(source, args.limit)

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: cmd,
          file: args.file,
          lines: lineCount,
          outline,
        },
        null,
        2,
      ),
    )
    return
  }

  if (args.outline) {
    if (outline.length === 0) {
      console.log('(no outline landmarks — try spw select --skim --selector all)')
    } else {
      console.log(renderOutline(outline))
    }
  }

  if (args.paths) {
    const paths = outline.filter(o => o.kind === 'path')
    console.log('')
    console.log('## paths')
    for (const p of paths) {
      console.log(`  ${String(p.line).padStart(4)}  ${p.label}`)
    }
  }

  const frames = outline.filter(o => o.kind === 'frame').length
  const roots = outline.filter(o => o.kind === 'root').length
  const paths = outline.filter(o => o.kind === 'path').length
  metaBlock('skim', [
    ['frames', String(frames)],
    ['roots', String(roots)],
    ['paths', String(paths)],
    ['shown', String(outline.length)],
  ])

  if (cmd === 'read' && !args.lines) {
    meta('  tip: spw read <file> --lines 1-40   or   --around 20 -C 8')
  }
}

export function printSkimHelp(cmd: string = 'skim'): void {
  printHelpPage({
    title: cmd === 'read' ? 'Spw Read' : 'Spw Skim',
    usage: [
      'spw skim <file.spw> [--limit 80] [--paths] [--json]',
      'spw read <file.spw> --lines 10-40',
      'spw read <file.spw> --around 120 --context 8',
    ],
    sections: [
      {
        title: 'What it does',
        lines: [
          'skim   Structural outline: frames ^"…", @roots, key traits, path refs',
          'read   Same, or a numbered line window for close reading',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--limit N / -n     Max outline items (default 80)',
          '--paths            Extra path-ref list',
          '--lines a-b / -L   Print numbered lines a through b',
          '--around N / -a    Center window on line N (with --context)',
          '--context N / -C   Window radius for --around (default 2)',
          '--json             Machine outline',
          '--no-outline       Skip outline (use with --lines)',
        ],
      },
      {
        title: 'Related',
        lines: [
          'spw select <file> --skim --selector navigable',
          'spw query --from prompts --skim --selector pathRefs --limit 30',
          'spw tree @prompts --depth 2',
        ],
      },
      {
        title: 'Try',
        lines: [
          'spw skim prompts/index.spw',
          'spw skim prompts/templates/index.spw --paths',
          'spw read prompts/sagas/profiles.spw --lines 1-50',
          'spw read docs/runtime/md/spw-emit.md --around 40 -C 5',
        ],
      },
    ],
  })
}

function resolveLineWindow(args: SkimArgs, lineCount: number): { start: number; end: number } {
  if (args.around) {
    const c = args.context
    const start = Math.max(1, args.around - c)
    const end = Math.min(lineCount, args.around + c)
    return { start, end }
  }
  if (args.lines) {
    const m = args.lines.match(/^(\d+)\s*[-:]\s*(\d+)$/)
    if (m) {
      return {
        start: Math.max(1, Number(m[1])),
        end: Math.min(lineCount, Number(m[2])),
      }
    }
    const n = Number(args.lines)
    if (Number.isFinite(n) && n > 0) {
      return { start: n, end: Math.min(lineCount, n + Math.max(args.context, 1) * 2) }
    }
  }
  return { start: 1, end: Math.min(lineCount, 40) }
}

