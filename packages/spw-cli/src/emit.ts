/**
 * spw emit — collapse Spw PE / brief surfaces to host packets.
 *
 *   spw emit pack <file.spw> [--register name] [--host plain|mj|web_copy|eng_note|brief|copy|audio|social|json]
 *   spw emit ir <file.spw>
 *   spw emit registers
 */

import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { printHelpPage } from './help'
import {
  emitPackFromFile,
  listBuiltinRegisters,
  renderPack,
  EMIT_HOSTS,
  type EmitHost,
  type EmitMeasure,
} from './emit/index'
import { tryDiscoverSpwWorkspace, resolveWorkspacePath } from './workspace'

const HOST_LIST = EMIT_HOSTS.join('|')

export async function runSpwEmitCli(argv: string[] = process.argv): Promise<void> {
  const args = argv.slice(2)
  // argv is ['node', 'emit', ...] from run.ts toCliArgv
  const rest = args[0] === 'emit' ? args.slice(1) : args

  if (rest.length === 0 || rest[0] === '--help' || rest[0] === '-h') {
    printEmitHelp()
    return
  }

  const sub = rest[0]?.toLowerCase() ?? 'pack'
  if (sub === 'registers' || sub === 'list-registers') {
    for (const name of listBuiltinRegisters()) {
      console.log(`#${name}`)
    }
    return
  }

  if (sub === 'help') {
    printEmitHelp()
    return
  }

  const mode = sub === 'ir' || sub === 'pack' || sub === 'fields' ? sub : 'pack'
  const pathArgs = mode === sub ? rest.slice(1) : rest
  const parsed = parseEmitArgs(pathArgs)

  if (!parsed.file) {
    printEmitHelp()
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const filePath = workspace
    ? await resolveWorkspacePath(workspace, parsed.file)
    : resolve(parsed.file)

  const result = await emitPackFromFile(filePath, {
    register: parsed.register,
    set: parsed.set,
    host: mode === 'ir' ? 'json' : parsed.host,
    strictPositive: parsed.strict,
    strictContinuity: parsed.strictContinuity,
  })

  if (mode === 'ir') {
    const body = JSON.stringify(result.ir, null, 2)
    await output(body, parsed.out)
    if (parsed.measure) printMeasure(result.pack.measure)
    return
  }

  if (mode === 'fields') {
    const body = JSON.stringify(
      {
        register: result.ir.register,
        traits: result.ir.traits,
        slots: result.ir.slots,
        dims: result.ir.dims,
        includes: result.ir.includes,
        optics: result.ir.optics,
      },
      null,
      2,
    )
    await output(body, parsed.out)
    return
  }

  // pack
  const body = renderPack(result, parsed.host === 'json' ? 'json' : parsed.host)
  await output(body, parsed.out)
  if (parsed.measure || !result.pack.measure.hold_positive) {
    printMeasure(result.pack.measure)
  }
}

export function printEmitHelp(): void {
  printHelpPage({
    title: 'Spw Emit',
    usage: [
      `npm run spw -- emit pack <file.spw> [--register voice_web_quiet] [--host ${HOST_LIST}] [--set density.sparse=0.85] [--out file] [--measure] [--strict-positive] [--strict-continuity]`,
      'npm run spw -- emit ir <file.spw> [--register name] [--out file.json]',
      'npm run spw -- emit fields <file.spw>',
      'npm run spw -- emit registers',
    ],
    sections: [
      {
        title: 'Modes',
        lines: [
          'pack     Collapse to host text / pack (default)',
          'ir       EmitDocument JSON only (spw.emit/1)',
          'fields   Traits, slots, dims without full pack',
          'registers  List built-in #voice_* registers',
        ],
      },
      {
        title: 'Hosts',
        lines: [
          'plain / eng_note / json — general',
          'mj / web_copy — image pack and claim/proof/door',
          'brief / copy / audio / social — publishing pipeline',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Positive-ground: prefer filling wanted poles; --strict-positive fails on negation spines.',
          'Continuity: title / continuity anchors reappear in host text; --strict-continuity fails if missing.',
          'Registers are feel-physics only (no vendor names).',
          'Deterministic v1: extracts ^["emit"] slots and ~#traits; injects tone phrases for mj/plain compose.',
        ],
      },
      {
        title: 'Try',
        lines: [
          'npm run spw -- emit pack path/to/brief.spw --host plain --measure',
          'npm run spw -- emit pack prompts/domains/publishing/packs/quiet-board.spw --host brief --measure',
          'npm run spw -- emit pack prompts/domains/publishing/packs/quiet-board.spw --host social',
          'npm run spw -- emit registers',
        ],
      },
    ],
  })
}

function parseEmitArgs(args: string[]): {
  file?: string
  register?: string
  host: EmitHost
  set: Record<string, number>
  out?: string
  measure: boolean
  strict: boolean
  strictContinuity: boolean
} {
  let file: string | undefined
  let register: string | undefined
  let host: EmitHost = 'plain'
  let out: string | undefined
  let measure = false
  let strict = false
  let strictContinuity = false
  const set: Record<string, number> = {}

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (arg === '--register' || arg === '-r') {
      register = stripHash(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--register=')) {
      register = stripHash(arg.slice('--register='.length))
      continue
    }
    if (arg === '--host' || arg === '-H') {
      host = normalizeHost(args[++i] ?? 'plain')
      continue
    }
    if (arg.startsWith('--host=')) {
      host = normalizeHost(arg.slice('--host='.length))
      continue
    }
    if (arg === '--set') {
      Object.assign(set, parseSet(args[++i] ?? ''))
      continue
    }
    if (arg.startsWith('--set=')) {
      Object.assign(set, parseSet(arg.slice('--set='.length)))
      continue
    }
    if (arg === '--out' || arg === '-o') {
      out = args[++i]
      continue
    }
    if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length)
      continue
    }
    if (arg === '--measure') {
      measure = true
      continue
    }
    if (arg === '--strict-positive') {
      strict = true
      continue
    }
    if (arg === '--strict-continuity') {
      strictContinuity = true
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`spw emit: unknown flag ${arg}`)
    }
    if (!file) file = arg
  }

  return { file, register, host, set, out, measure, strict, strictContinuity }
}

function parseSet(raw: string): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw.trim()) return out
  for (const part of raw.split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim())
    if (!k || v === undefined) continue
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    out[k] = n
  }
  return out
}

function stripHash(name: string): string {
  return name.replace(/^#/, '')
}

function normalizeHost(raw: string): EmitHost {
  const h = raw.toLowerCase().replace(/-/g, '_') as EmitHost
  if ((EMIT_HOSTS as readonly string[]).includes(h)) return h
  throw new Error(`spw emit: unknown host "${raw}" (${HOST_LIST})`)
}

async function output(body: string, out?: string): Promise<void> {
  const text = body.endsWith('\n') ? body : `${body}\n`
  if (out) {
    await writeFile(resolve(out), text, 'utf8')
    console.error(`spw emit: wrote ${out}`)
  } else {
    process.stdout.write(text)
  }
}

function printMeasure(m: EmitMeasure): void {
  console.error('')
  console.error('── measure ──────────────────────────────────')
  console.error(`  hold_positive:       ${m.hold_positive}`)
  console.error(`  negation_spine_hits: ${m.negation_spine_hits}`)
  console.error(`  traits/slots:        ${m.trait_count}/${m.slot_count}`)
  console.error(`  sentence_estimate:   ${m.sentence_estimate}`)
  console.error(
    `  continuity:          ${m.continuity.ok} (${m.continuity.anchors_hit}/${m.continuity.anchors_checked})`,
  )
  for (const w of m.warnings) {
    console.error(`  ! ${w}`)
  }
}
