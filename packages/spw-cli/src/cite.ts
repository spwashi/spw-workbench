/**
 * spw cite / spw follow — bytecode pointers without host JSON.
 *
 * effect.l0.measure by default.
 * --remember is effect.l2-ish only for `.spw/gen/session/` handle cards
 * (never rewrites authored sources).
 *
 * Dual-read:
 *   cite  → point  (@bc:<hash>)
 *   follow → soft resolve under grain
 *   follow --collapse → hard evaluate (* @bc under channel law)
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createHotSession, type HotCiteHandle } from '@spwashi/spw-runtime'
import {
  genSurfacePath,
  type GranularityDepth,
  type GranularityFollow,
  type GranularityPlane,
} from '@spwashi/spw-seed'
import { printHelpPage } from './help'

interface CiteArgs {
  help: boolean
  target?: string
  channel: string
  depth?: GranularityDepth
  plane?: GranularityPlane
  follow?: GranularityFollow
  scheme?: string
  remember: boolean
  collapse: boolean
  hard: boolean
  list: boolean
  pathHint?: string
}

function parseArgs(argv: string[], verb: 'cite' | 'follow'): CiteArgs {
  const raw = argv.slice(2)
  const tokens = raw[0] === verb ? raw.slice(1) : raw
  const args: CiteArgs = {
    help: false,
    channel: 'trial',
    remember: false,
    collapse: false,
    hard: false,
    list: false,
  }

  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!
    if (a === '--help' || a === '-h') args.help = true
    else if (a === '--remember') args.remember = true
    else if (a === '--collapse') args.collapse = true
    else if (a === '--hard') {
      args.hard = true
      args.follow = 'hard'
    }
    else if (a === '--list') args.list = true
    else if (a === '--channel') args.channel = tokens[++i] ?? 'trial'
    else if (a.startsWith('--channel=')) args.channel = a.slice('--channel='.length)
    else if (a === '--depth') args.depth = tokens[++i] as GranularityDepth
    else if (a.startsWith('--depth=')) args.depth = a.slice('--depth='.length) as GranularityDepth
    else if (a === '--plane') args.plane = tokens[++i] as GranularityPlane
    else if (a.startsWith('--plane=')) args.plane = a.slice('--plane='.length) as GranularityPlane
    else if (a === '--scheme') args.scheme = tokens[++i]
    else if (a.startsWith('--scheme=')) args.scheme = a.slice('--scheme='.length)
    else if (a === '--path') args.pathHint = tokens[++i]
    else if (a.startsWith('--path=')) args.pathHint = a.slice('--path='.length)
    else if (a === '--json' || a === '--ndjson') {
      throw new Error(`spw ${verb}: use Spw dual-read stdout (no --json). Prefer default output.`)
    }
    else if (a === '--write' || a === '--fix') {
      throw new Error(
        `spw ${verb}: does not rewrite authored trees. Use --remember for .spw/gen/session handles only.`,
      )
    }
    else if (a.startsWith('-')) throw new Error(`spw ${verb}: unknown flag ${a}`)
    else if (!args.target) args.target = a
    else throw new Error(`spw ${verb}: unexpected argument ${a}`)
  }
  return args
}

export function printCiteHelp(): void {
  printHelpPage({
    title: 'Spw Cite — point at form bytecode (@bc)',
    usage: [
      'spw cite <file.spw> [--channel trial] [--depth card] [--remember]',
      'spw cite <file.spw> --plane resonance --scheme agent',
    ],
    sections: [
      {
        title: 'What it does',
        lines: [
          'effect.l0.measure — prepares + inspects; prints Spw dual-read card',
          'Emits pointer @bc:<contentHash> for later follow/collapse',
          '--remember writes handle under .spw/gen/session/ (not authored sources)',
        ],
      },
      {
        title: 'Compose',
        lines: [
          'spw cite x.spw --remember',
          'spw follow @bc:… --path x.spw',
          'spw follow x.spw --collapse',
          'Pair with: spw form --spw · spw cycle · spw inspect compose',
        ],
      },
    ],
  })
}

export function printFollowHelp(): void {
  printHelpPage({
    title: 'Spw Follow — resolve @bc or re-inspect a surface',
    usage: [
      'spw follow <file.spw> [--hard|--collapse] [--channel trial]',
      'spw follow @bc:<hash> --path <file.spw>',
      'spw follow @bc:<hash>          # if --remember wrote .spw/gen/session',
    ],
    sections: [
      {
        title: 'What it does',
        lines: [
          'Soft follow: refresh inspect under granularity',
          '--hard / --collapse: evaluate (* @bc) when channel allows',
          'No authored tree writes; no host JSON',
        ],
      },
      {
        title: 'Compose',
        lines: [
          'spw cite a.spw --remember && spw follow @bc:…',
          'spw follow a.spw --collapse --channel live',
        ],
      },
    ],
  })
}

function grainOpts(args: CiteArgs) {
  return {
    depth: args.depth,
    plane: args.plane,
    follow: args.follow ?? (args.collapse || args.hard ? 'hard' : undefined),
    resonanceScheme: args.scheme,
  }
}

function printHandle(
  session: ReturnType<typeof createHotSession>,
  handle: HotCiteHandle,
  extra?: string,
): void {
  // Dual-read cite card: uri + mask + grain; pointer is mask interop only (not soft tag).
  console.log(session.formatCiteSpw(handle))
  if (handle.evaluate) {
    console.log(
      `^["eval"]{ ok: ${handle.evaluate.result.success ? '#yes' : '#no'}, hit: ${handle.evaluate.cacheHit ? '#yes' : '#no'} }`,
    )
  }
  const card = handle.inspect
  if (card && card.geometric.resonances.length) {
    const top = card.geometric.resonances
      .slice(0, 6)
      .map(r => `${r.type}@${r.strength}`)
      .join(' ; ')
    console.log(
      `^["resonance"]{ scheme: ${card.geometric.scheme}, n: ${card.geometric.resonances.length}, top: #[ ${top} ] }`,
    )
  }
  if (extra) console.log(`// ${extra}`)
}

async function rememberHandle(handle: HotCiteHandle): Promise<string> {
  const hash = handle.ref.contentHash ?? 'unknown'
  const rel = genSurfacePath('session', hash)
  const abs = path.resolve(process.cwd(), rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  const dialect = handle.inspect?.prepared.stack.dialect ?? 'Spw.b'
  const body = [
    `# session handle — not corpus canon; invent/map skip .spw/gen`,
    `@dialect:${dialect}`,
    `^seed[Hot.Handle v:0.1 @profile:${dialect} @intent:bc_pointer]`,
    `^["handle"]{`,
    `  pointer: ${handle.pointer}`,
    `  path: ${handle.path ? `~"${handle.path}"` : '_'}`,
    `  bytecode: ${hash}`,
    `  dialect: ${dialect}`,
    `}`,
    '',
  ].join('\n')
  await fs.writeFile(abs, body, 'utf8')
  return rel
}

async function loadRememberedPath(pointer: string): Promise<string | undefined> {
  const hash = pointer.replace(/^@bc:/, '')
  const rel = genSurfacePath('session', hash)
  const abs = path.resolve(process.cwd(), rel)
  try {
    const text = await fs.readFile(abs, 'utf8')
    const m = text.match(/path:\s*~"([^"]+)"/)
    return m?.[1]
  } catch {
    return undefined
  }
}

async function readSource(file: string): Promise<{ path: string; text: string }> {
  const abs = path.resolve(file)
  const text = await fs.readFile(abs, 'utf8')
  const rel = path.relative(process.cwd(), abs) || file
  return { path: rel, text }
}

export async function runSpwCiteCli(argv: string[] = process.argv): Promise<void> {
  let args: CiteArgs
  try {
    args = parseArgs(argv, 'cite')
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
    return
  }
  if (args.help || !args.target) {
    printCiteHelp()
    if (!args.help) process.exitCode = 1
    return
  }
  if (args.target.startsWith('@bc:')) {
    console.error('spw cite: pass a .spw file to point; use spw follow @bc:… to resolve')
    process.exitCode = 1
    return
  }

  try {
    const { path: rel, text } = await readSource(args.target)
    const session = createHotSession({ channel: args.channel, id: 'cli-cite' })
    const handle = session.cite(text, {
      path: rel,
      grain: grainOpts(args),
      resonanceScheme: args.scheme,
    })
    printHandle(session, handle)
    if (args.remember) {
      const dest = await rememberHandle(handle)
      console.log(`// remembered ~"${dest}"`)
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  }
}

export async function runSpwFollowCli(argv: string[] = process.argv): Promise<void> {
  let args: CiteArgs
  try {
    args = parseArgs(argv, 'follow')
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
    return
  }
  if (args.help) {
    printFollowHelp()
    return
  }
  if (!args.target && !args.list) {
    printFollowHelp()
    process.exitCode = 1
    return
  }

  try {
    const session = createHotSession({ channel: args.channel, id: 'cli-follow' })

    if (args.list) {
      // list remembered handles under gen/session
      const dir = path.resolve(process.cwd(), '.spw/gen/session')
      let names: string[] = []
      try {
        names = (await fs.readdir(dir)).filter(n => n.endsWith('.spw'))
      } catch {
        names = []
      }
      console.log(`// remembered handles under .spw/gen/session  n=${names.length}`)
      for (const n of names.slice(0, 40)) {
        console.log(`  @bc:${n.replace(/\.spw$/, '')}`)
      }
      return
    }

    const target = args.target!
    let filePath = args.pathHint
    let pointer: string | undefined

    if (target.startsWith('@bc:')) {
      pointer = target
      filePath = filePath ?? (await loadRememberedPath(target))
      if (!filePath) {
        console.error(
          'spw follow: @bc pointer needs --path <file.spw> or a prior `spw cite … --remember`',
        )
        process.exitCode = 1
        return
      }
    } else {
      filePath = target
    }

    const { path: rel, text } = await readSource(filePath!)
    const grain = grainOpts(args)
    // Always cite first so pointer is in-session
    const cited = session.cite(text, {
      path: rel,
      grain,
      resonanceScheme: args.scheme,
    })

    if (pointer && cited.pointer !== pointer && cited.ref.contentHash !== pointer.replace(/^@bc:/, '')) {
      console.error(
        `spw follow: pointer mismatch — file ${rel} is ${cited.pointer}, asked for ${pointer}`,
      )
      process.exitCode = 1
      return
    }

    const wantCollapse = args.collapse || args.hard || grain.follow === 'hard'
    if (wantCollapse) {
      const col = session.collapse(cited.pointer, {
        path: rel,
        grain: { ...grain, follow: 'hard', plane: 'eval' },
      })
      const followed = session.follow(cited.pointer, {
        path: rel,
        grain: { ...grain, follow: 'hard', plane: 'eval' },
      })
      if (followed) printHandle(session, followed, col.note)
      else printHandle(session, cited, col.note)
      if (!col.ok) process.exitCode = 1
    } else {
      const followed = session.follow(cited.pointer, { path: rel, grain })
      printHandle(session, followed ?? cited)
    }

  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  }
}
