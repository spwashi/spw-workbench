/**
 * spw geometry — inspect braces + operators to learn form geometry.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { formatGeometryReport, inspectGeometry } from '@spwashi/spw-seed'
import { printHelpPage } from './help'
import { meta } from './view'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

interface GeomArgs {
  files: string[]
  json: boolean
  stdin: boolean
}

function parseArgs(argv: string[]): GeomArgs {
  const args = argv[0] === 'geometry' || argv[0] === 'geom' ? argv.slice(1) : argv
  const parsed: GeomArgs = { files: [], json: false, stdin: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') {
      parsed.json = true
      continue
    }
    if (a === '--stdin') {
      parsed.stdin = true
      continue
    }
    if (a === '--help' || a === '-h') {
      parsed.files.push('--help')
      continue
    }
    if (!a.startsWith('-')) {
      parsed.files.push(a)
      continue
    }
    throw new Error(`spw geometry: unknown flag ${a}`)
  }
  return parsed
}

export function printGeometryHelp(): void {
  printHelpPage({
    title: 'Spw Geometry — braces + operators',
    usage: [
      'spw geometry <file.spw> [--json]',
      'cat surface.spw | spw geometry --stdin --json',
      'spw geom docs/examples/spw/form-sequence.spw',
    ],
    sections: [
      {
        title: 'What you learn',
        lines: [
          'Paired bound counts: () [] {} <> <<>> (())',
          'Medial capsules + channels, couple ops, projection signature',
          'Operator rhythm (% of sigils) with roles',
          'Nesting depth + short lessons toward form-ladders',
        ],
      },
      {
        title: 'Pair with',
        lines: [
          'spw skim <file> · spw pulse <file> --check',
          'VS Code: Spw: Inspect Geometry · surface decorations',
          'docs/theory/spw/form-ladders.spw · docs/learn/cheat-sheet.md',
        ],
      },
    ],
  })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

export async function runSpwGeometryCli(argv: string[] = process.argv): Promise<void> {
  let args: GeomArgs
  try {
    args = parseArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.files.includes('--help') || (!args.files.length && !args.stdin)) {
    printGeometryHelp()
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const sources: Array<{ label: string; text: string }> = []

  if (args.stdin) {
    sources.push({ label: 'stdin', text: await readStdin() })
  }

  for (const f of args.files) {
    if (f === '--help') continue
    const abs = workspace ? await resolveWorkspacePath(workspace, f) : path.resolve(f)
    try {
      sources.push({ label: f, text: await fs.readFile(abs, 'utf8') })
    } catch {
      console.error(`spw geometry: cannot read ${f}`)
      process.exitCode = 1
      return
    }
  }

  if (!sources.length) {
    printGeometryHelp()
    process.exitCode = 1
    return
  }

  for (const s of sources) {
    const report = inspectGeometry(s.text)
    if (args.json) {
      console.log(JSON.stringify({ command: 'geometry', file: s.label, ...report }, null, 2))
    } else {
      if (sources.length > 1) meta(`# file=${s.label}`)
      console.log(formatGeometryReport(report))
      if (sources.length > 1) console.log('')
    }
  }
}
