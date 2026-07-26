/**
 * spw emit — collapse Spw PE / brief surfaces to host packets.
 *
 *   spw emit pack <file.spw> [--register name] [--host plain|mj|…] [--hosts a,b]
 *   spw emit fractal <file.spw> --profile fractal_merge [--max-depth N] [--context production] [--hosts …]
 *   spw emit expand <file.spw> --bind k=v [--strict-holes] [--out]
 *   spw emit holes <file.spw> | templates
 *   spw emit ir | fields | registers | profiles
 */

import { resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { printHelpPage } from './help'
import {
  emitPackFromFile,
  listBuiltinRegisters,
  renderPack,
  EMIT_HOSTS,
  listFractalProfiles,
  resolveFractalProfile,
  mergeFractalConfig,
  runFractalEmit,
  parseHostList,
  parseCoordinateList,
  renderFractalResult,
  parseAxisContext,
  expandTemplate,
  extractPackBindings,
  reportHoles,
  parseBindingsList,
  stampDerivative,
  renderHoleReport,
  renderExpandResult,
  BUILTIN_TEMPLATE_IDS,
  BUILTIN_TEMPLATE_PATHS,
  type EmitHost,
  type EmitMeasure,
  type FractalCoordinate,
  type FractalObjective,
  type AxisContext,
} from './emit/index'
import { collectSpwFiles } from './fs-walk'
import { tryDiscoverSpwWorkspace, resolveWorkspacePath } from './workspace'

const HOST_LIST = EMIT_HOSTS.join('|')

export async function runSpwEmitCli(argv: string[] = process.argv): Promise<void> {
  const args = argv.slice(2)
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

  if (sub === 'profiles' || sub === 'list-profiles') {
    for (const name of listFractalProfiles()) {
      console.log(name)
    }
    return
  }

  if (sub === 'templates' || sub === 'list-templates') {
    for (const id of BUILTIN_TEMPLATE_IDS) {
      console.log(`${id}  ${BUILTIN_TEMPLATE_PATHS[id]}`)
    }
    return
  }

  if (sub === 'packs' || sub === 'list-packs') {
    await listPacks(rest[1])
    return
  }

  if (sub === 'help') {
    printEmitHelp()
    return
  }

  const mode =
    sub === 'ir' ||
    sub === 'pack' ||
    sub === 'fields' ||
    sub === 'fractal' ||
    sub === 'plan' ||
    sub === 'expand' ||
    sub === 'holes'
      ? sub
      : 'pack'
  const pathArgs = mode === sub ? rest.slice(1) : rest
  const parsed = parseEmitArgs(pathArgs)

  if (!parsed.file) {
    printEmitHelp()
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const filePath = parsed.file
    ? workspace
      ? await resolveWorkspacePath(workspace, parsed.file)
      : resolve(parsed.file)
    : ''

  if (mode === 'holes' || mode === 'expand') {
    await runTemplateMode(filePath, parsed, mode)
    return
  }

  if (mode === 'fractal' || mode === 'plan') {
    await runFractalMode(filePath, parsed, mode)
    return
  }

  const hosts = parsed.hosts?.length ? parsed.hosts : [parsed.host]

  if (hosts.length > 1 || (parsed.hosts?.length ?? 0) > 0) {
    await runMultiHostPack(filePath, parsed, hosts, mode)
    return
  }

  const result = await emitPackFromFile(filePath, {
    register: parsed.register,
    set: parsed.set,
    host: mode === 'ir' ? 'json' : parsed.host,
    strictPositive: parsed.strict,
    strictContinuity: parsed.strictContinuity,
    strictStyle: parsed.strictStyle,
    strictSubject: parsed.strictSubject,
    strictGenre: parsed.strictGenre,
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
        anchors: result.ir.anchors,
        styleAnchors: result.ir.styleAnchors,
        subjectAnchors: result.ir.subjectAnchors,
        genreAnchors: result.ir.genreAnchors,
        line: result.ir.line,
      },
      null,
      2,
    )
    await output(body, parsed.out)
    return
  }

  const body = renderPack(result, parsed.host === 'json' ? 'json' : parsed.host)
  await output(body, parsed.out)
  if (parsed.measure || !result.pack.measure.hold_positive) {
    printMeasure(result.pack.measure)
  }
}

async function runTemplateMode(
  filePath: string,
  parsed: ReturnType<typeof parseEmitArgs>,
  mode: 'expand' | 'holes',
): Promise<void> {
  const source = await readFile(filePath, 'utf8')
  if (mode === 'holes') {
    const report = reportHoles(source)
    await output(renderHoleReport(report, parsed.json ? 'json' : 'text'), parsed.out)
    return
  }

  // Layer order (lowest -> highest priority): pack bindings, then --bind, then --set.
  const bindings: Record<string, string> = {}
  if (parsed.fromPack) {
    const workspace = await tryDiscoverSpwWorkspace()
    const packPath = workspace
      ? await resolveWorkspacePath(workspace, parsed.fromPack)
      : resolve(parsed.fromPack)
    const packSource = await readFile(packPath, 'utf8')
    Object.assign(bindings, extractPackBindings(packSource))
  }
  Object.assign(bindings, parseBindingsList(parsed.binds ?? []))
  // --set only fills what --bind (and the pack) left unset, matching prior behavior.
  for (const [k, v] of Object.entries(parsed.set)) {
    if (bindings[k] === undefined) bindings[k] = String(v)
  }

  let result = expandTemplate(source, bindings, {
    strictHoles: parsed.strictHoles,
    applyDefaults: true,
    fillBareHoles: parsed.fillBareHoles,
    bareHoleValue: parsed.bareHoleValue,
  })

  if (parsed.derivative) {
    const [modeRaw, base, id, revRaw] = parsed.derivative.split(':')
    const dMode = modeRaw as 'in_place' | 'fork' | 'overlay'
    if (dMode !== 'in_place' && dMode !== 'fork' && dMode !== 'overlay') {
      throw new Error('spw emit expand: --derivative mode:base:id[:rev] (mode=in_place|fork|overlay)')
    }
    result = {
      ...result,
      text: stampDerivative(result.text, {
        mode: dMode,
        base: base || filePath,
        derivative_id: id || `derived.${Date.now()}`,
        revision: revRaw ? Number(revRaw) : 1,
      }),
    }
  }

  await output(renderExpandResult(result, parsed.json ? 'json' : 'text'), parsed.out)
  if (parsed.measure || !result.complete) {
    console.error(
      `── expand complete=${result.complete} filled=${result.filled.length} open=${result.open.length} bare=${result.bareHolesRemaining}`,
    )
    if (result.open.length) console.error(`  open: ${result.open.join(', ')}`)
  }
}

async function runFractalMode(
  filePath: string,
  parsed: ReturnType<typeof parseEmitArgs>,
  mode: 'fractal' | 'plan',
): Promise<void> {
  const profileName = parsed.profile ?? 'fractal_merge'
  let config = resolveFractalProfile(profileName)
  config = mergeFractalConfig(config, {
    maxDepth: parsed.maxDepth,
    hosts: parsed.hosts,
    register: parsed.register,
    set: parsed.set,
    depthWeights: parsed.depthWeights,
    coordinates: parsed.coordinates,
    ladders: parsed.ladders,
    objective: parsed.objective,
    holdRatio: parsed.holdRatio,
    context: parsed.context,
    strictPositive: parsed.strict || undefined,
    strictContinuity: parsed.strictContinuity || undefined,
    strictStyle: parsed.strictStyle || undefined,
    strictSubject: parsed.strictSubject || undefined,
    strictGenre: parsed.strictGenre || undefined,
    foldRequired: parsed.foldRequired,
    bonkMax: parsed.bonkMax,
    nestLoci: parsed.nestLoci,
  })

  const source = await readFile(filePath, 'utf8')
  const result = runFractalEmit(source, filePath, config)

  if (mode === 'plan') {
    await output(renderFractalResult(result, 'plan'), parsed.out)
    return
  }

  const format = parsed.json ? 'json' : 'text'
  await output(renderFractalResult(result, format), parsed.out)
  if (parsed.measure) {
    console.error('')
    console.error('── fractal composite ──────────────────────')
    console.error(`  profile:    ${result.config.mutation.profile}`)
    console.error(`  context:    ${result.composite.context}`)
    console.error(`  objective:  ${result.composite.objective}`)
    console.error(`  score:      ${result.composite.score.toFixed(3)}  (F2 Hold under α(c))`)
    console.error(
      `  literacy L: ${result.composite.literacy.L.toFixed(3)}  (F·A·E·M)`,
    )
    console.error(`  maxDepth:   ${result.config.mutation.maxDepth}`)
    console.error(`  hosts:      ${result.config.emit.hosts.join(', ')}`)
    console.error(`  axes:       ${result.axes.version} top relations=${result.axes.salientRelations.length}`)
    for (const [host, h] of Object.entries(result.composite.byHost)) {
      console.error(
        `  ${host}: hold=${h.hold.toFixed(2)} pos=${h.positive} cont=${h.continuity.toFixed(2)} style=${h.style.toFixed(2)} subj=${h.subject.toFixed(2)} genre=${h.genre.toFixed(2)} thrift=${h.thrift.toFixed(2)}`,
      )
    }
    for (const w of result.composite.warnings) {
      console.error(`  ! ${w}`)
    }
  }
}

async function runMultiHostPack(
  filePath: string,
  parsed: ReturnType<typeof parseEmitArgs>,
  hosts: EmitHost[],
  mode: string,
): Promise<void> {
  if (mode === 'ir' || mode === 'fields') {
    // Single IR regardless of hosts
    const result = await emitPackFromFile(filePath, {
      register: parsed.register,
      set: parsed.set,
      host: 'json',
    })
    if (mode === 'ir') {
      await output(JSON.stringify(result.ir, null, 2), parsed.out)
    } else {
      await output(
        JSON.stringify(
          {
            register: result.ir.register,
            traits: result.ir.traits,
            slots: result.ir.slots,
            dims: result.ir.dims,
            anchors: result.ir.anchors,
          },
          null,
          2,
        ),
        parsed.out,
      )
    }
    return
  }

  const parts: string[] = []
  for (const host of hosts) {
    const result = await emitPackFromFile(filePath, {
      register: parsed.register,
      set: parsed.set,
      host,
      strictPositive: parsed.strict,
      strictContinuity: parsed.strictContinuity,
      strictStyle: parsed.strictStyle,
      strictSubject: parsed.strictSubject,
      strictGenre: parsed.strictGenre,
    })
    parts.push(`## host=${host}\n${renderPack(result, host === 'json' ? 'json' : host).trim()}`)
    if (parsed.measure) printMeasure(result.pack.measure, host)
  }
  await output(parts.join('\n\n'), parsed.out)
}

export function printEmitHelp(): void {
  printHelpPage({
    title: 'Spw Emit',
    usage: [
      `npm run spw -- emit pack <file.spw> [--register voice_web_quiet] [--host ${HOST_LIST}] [--hosts a,b] [--set density.sparse=0.85] [--out file] [--measure] [--strict-positive] [--strict-continuity] [--strict-style]`,
      'npm run spw -- emit fractal <file.spw> --profile fractal_merge [--context production] [--max-depth 2] [--hosts brief,mj,social] [--measure] [--json]',
      'npm run spw -- emit plan <file.spw> --profile pe_style_lock',
      'npm run spw -- emit expand <template.spw> --bind title="…" --bind claim="…" [--strict-holes] [--out filled.spw]',
      'npm run spw -- emit holes <template.spw> [--json]',
      'npm run spw -- emit ir <file.spw> [--register name] [--out file.json]',
      'npm run spw -- emit fields <file.spw>',
      'npm run spw -- emit registers',
      'npm run spw -- emit profiles',
      'npm run spw -- emit templates',
      'npm run spw -- emit packs [root]',
      'npm run spw -- emit expand <template.spw> --from-pack <pack.spw> [--bind k="…"]',
    ],
    sections: [
      {
        title: 'Modes',
        lines: [
          'pack      Collapse to one or more host packs',
          'fractal   Nest/fold plan + multi-host emit + F2 Hold score + axis cache',
          'plan      Emit fractal mutation stream only (>> steps)',
          'expand    Fill ${slots} / $name from --bind / --from-pack (template thrift)',
          'holes     Report open template slots and bare _',
          'ir        EmitDocument JSON only (spw.emit/1)',
          'fields    Traits, slots, dims, anchors',
          'registers List #voice_* registers',
          'profiles  List fractal run profiles',
          'templates List builtin script template ids → paths',
          'packs     List prompts/**/packs/*.spw ready-made binding bundles',
        ],
      },
      {
        title: 'Template fill',
        lines: [
          '--bind k=v           Slot binding (repeatable); also --bind=k=v',
          '--from-pack <file>   Seed bindings from a pack\'s ^"emit"{} frame (--bind overrides it)',
          '--strict-holes       Fail if required slots or bare _ remain',
          '--fill-bare-holes    Replace bare _ with --bare-value (default empty)',
          '--bare-value <s>     Value for bare holes when filling',
          '--derivative mode:base:id[:rev]  Stamp lineage (in_place|fork|overlay)',
          'Catalog: prompts/templates/  Math includes: prompts/math/  Packs: prompts/domains/*/packs/',
        ],
      },
      {
        title: 'Combination wizard',
        lines: [
          '1. spw emit packs                         — see what\'s already curated',
          '2. spw emit holes <template.spw>           — see what that template still needs',
          '3. spw emit expand <template.spw> --from-pack <pack.spw> --bind <remaining k=v>',
        ],
      },
      {
        title: 'Fractal knobs',
        lines: [
          '--profile <id>       pe_style_lock | fractal_merge | fractal_style_repo | line_propagate | pe_thrift_social',
          '--context <id>       production|canon|research|pedagogy|merch|layout|thrift (salience α(c); not genotype)',
          '--max-depth <n>      nest budget (default from profile)',
          '--depth-weights a,b  objective weights w(d)',
          '--coordinates a,b    mutate allow-list',
          '--ladders op:&,body  form ladders for seed enrichment',
          '--hosts a,b,c        multi-host fan-out',
          '--hold-ratio 0.67    soft hold threshold for style/subject/genre',
          '--fold-required / --no-fold-required',
          '--objective hold_composite|fractal_hold|thrift_first',
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
        title: 'Try',
        lines: [
          'npm run spw -- emit fractal prompts/domains/publishing/packs/quiet-craft-line.spw --profile fractal_merge --measure',
          'npm run spw -- emit plan prompts/domains/publishing/packs/quiet-board.spw --profile pe_style_lock',
          'npm run spw -- emit pack prompts/domains/publishing/packs/quiet-board.spw --hosts brief,social --measure',
          'npm run spw -- emit holes prompts/templates/publish/job-instance.spw',
          'npm run spw -- emit expand prompts/templates/media/brief.spw --bind title="Quiet Board" --bind claim="Keep the work visible." --bind goal="Launch" --bind acceptance="Anchors hold"',
          'npm run spw -- emit templates',
          'npm run spw -- emit profiles',
        ],
      },
    ],
  })
}

function parseEmitArgs(args: string[]): {
  file?: string
  register?: string
  host: EmitHost
  hosts?: EmitHost[]
  set: Record<string, number>
  out?: string
  measure: boolean
  json: boolean
  strict: boolean
  strictContinuity: boolean
  strictStyle: boolean
  strictSubject: boolean
  strictGenre: boolean
  profile?: string
  maxDepth?: number
  depthWeights?: number[]
  coordinates?: FractalCoordinate[]
  ladders?: string[]
  objective?: FractalObjective
  holdRatio?: number
  context?: AxisContext
  foldRequired?: boolean
  bonkMax?: number
  nestLoci?: string[]
  binds?: string[]
  fromPack?: string
  strictHoles?: boolean
  fillBareHoles?: boolean
  bareHoleValue?: string
  derivative?: string
} {
  let file: string | undefined
  let register: string | undefined
  let host: EmitHost = 'plain'
  let hosts: EmitHost[] | undefined
  let out: string | undefined
  let measure = false
  let json = false
  let strict = false
  let strictContinuity = false
  let strictStyle = false
  let strictSubject = false
  let strictGenre = false
  let profile: string | undefined
  let maxDepth: number | undefined
  let depthWeights: number[] | undefined
  let coordinates: FractalCoordinate[] | undefined
  let ladders: string[] | undefined
  let objective: FractalObjective | undefined
  let holdRatio: number | undefined
  let context: AxisContext | undefined
  let foldRequired: boolean | undefined
  let bonkMax: number | undefined
  let nestLoci: string[] | undefined
  const binds: string[] = []
  let fromPack: string | undefined
  let strictHoles = false
  let fillBareHoles = false
  let bareHoleValue: string | undefined
  let derivative: string | undefined
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
    if (arg === '--hosts') {
      hosts = parseHostList(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--hosts=')) {
      hosts = parseHostList(arg.slice('--hosts='.length))
      continue
    }
    if (arg === '--profile' || arg === '-p') {
      profile = args[++i]
      continue
    }
    if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length)
      continue
    }
    if (arg === '--context' || arg === '-C') {
      context = parseAxisContext(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--context=')) {
      context = parseAxisContext(arg.slice('--context='.length))
      continue
    }
    if (arg === '--bind' || arg === '-b') {
      binds.push(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--bind=')) {
      binds.push(arg.slice('--bind='.length))
      continue
    }
    if (arg === '--from-pack') {
      fromPack = args[++i]
      continue
    }
    if (arg.startsWith('--from-pack=')) {
      fromPack = arg.slice('--from-pack='.length)
      continue
    }
    if (arg === '--strict-holes') {
      strictHoles = true
      continue
    }
    if (arg === '--fill-bare-holes') {
      fillBareHoles = true
      continue
    }
    if (arg === '--bare-value') {
      bareHoleValue = args[++i] ?? ''
      fillBareHoles = true
      continue
    }
    if (arg.startsWith('--bare-value=')) {
      bareHoleValue = arg.slice('--bare-value='.length)
      fillBareHoles = true
      continue
    }
    if (arg === '--derivative') {
      derivative = args[++i] ?? ''
      continue
    }
    if (arg.startsWith('--derivative=')) {
      derivative = arg.slice('--derivative='.length)
      continue
    }
    if (arg === '--max-depth') {
      maxDepth = Number(args[++i])
      continue
    }
    if (arg.startsWith('--max-depth=')) {
      maxDepth = Number(arg.slice('--max-depth='.length))
      continue
    }
    if (arg === '--depth-weights') {
      depthWeights = parseNumberList(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--depth-weights=')) {
      depthWeights = parseNumberList(arg.slice('--depth-weights='.length))
      continue
    }
    if (arg === '--coordinates') {
      coordinates = parseCoordinateList(args[++i] ?? '')
      continue
    }
    if (arg.startsWith('--coordinates=')) {
      coordinates = parseCoordinateList(arg.slice('--coordinates='.length))
      continue
    }
    if (arg === '--ladders') {
      ladders = (args[++i] ?? '').split(/[,+\s]+/).filter(Boolean)
      continue
    }
    if (arg.startsWith('--ladders=')) {
      ladders = arg.slice('--ladders='.length).split(/[,+\s]+/).filter(Boolean)
      continue
    }
    if (arg === '--objective') {
      objective = args[++i] as FractalObjective
      continue
    }
    if (arg.startsWith('--objective=')) {
      objective = arg.slice('--objective='.length) as FractalObjective
      continue
    }
    if (arg === '--hold-ratio') {
      holdRatio = Number(args[++i])
      continue
    }
    if (arg.startsWith('--hold-ratio=')) {
      holdRatio = Number(arg.slice('--hold-ratio='.length))
      continue
    }
    if (arg === '--nest-loci') {
      nestLoci = (args[++i] ?? '').split(/\|/).map(s => s.trim()).filter(Boolean)
      continue
    }
    if (arg.startsWith('--nest-loci=')) {
      nestLoci = arg.slice('--nest-loci='.length).split(/\|/).map(s => s.trim()).filter(Boolean)
      continue
    }
    if (arg === '--bonk-max') {
      bonkMax = Number(args[++i])
      continue
    }
    if (arg.startsWith('--bonk-max=')) {
      bonkMax = Number(arg.slice('--bonk-max='.length))
      continue
    }
    if (arg === '--fold-required') {
      foldRequired = true
      continue
    }
    if (arg === '--no-fold-required') {
      foldRequired = false
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
    if (arg === '--json') {
      json = true
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
    if (arg === '--strict-style') {
      strictStyle = true
      continue
    }
    if (arg === '--strict-subject') {
      strictSubject = true
      continue
    }
    if (arg === '--strict-genre') {
      strictGenre = true
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`spw emit: unknown flag ${arg}`)
    }
    if (!file) file = arg
  }

  return {
    file,
    register,
    host,
    hosts,
    set,
    out,
    measure,
    json,
    strict,
    strictContinuity,
    strictStyle,
    strictSubject,
    strictGenre,
    profile,
    maxDepth: Number.isFinite(maxDepth) ? maxDepth : undefined,
    depthWeights,
    coordinates,
    ladders,
    objective,
    holdRatio: Number.isFinite(holdRatio) ? holdRatio : undefined,
    context,
    foldRequired,
    bonkMax: Number.isFinite(bonkMax) ? bonkMax : undefined,
    nestLoci,
    binds,
    fromPack,
    strictHoles,
    fillBareHoles,
    bareHoleValue,
    derivative,
  }
}

function parseNumberList(raw: string): number[] {
  return raw
    .split(/[,+\s]+/)
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n))
}

function parseSet(raw: string): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw.trim()) return out
  for (const part of raw.split(',')) {
    const [k, v] = part.split('=').map(s => s.trim())
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

/** List prompts/**\/packs/*.spw as ready-made binding bundles (the combination wizard's catalog). */
async function listPacks(root = 'prompts'): Promise<void> {
  const workspace = await tryDiscoverSpwWorkspace()
  const absRoot = workspace ? await resolveWorkspacePath(workspace, root) : resolve(root)
  const files = (await collectSpwFiles(absRoot)).filter(f => f.includes(`${'/'}packs${'/'}`))
  const base = workspace?.consumerRoot ?? process.cwd()

  if (!files.length) {
    console.log(`(no packs found under ${root})`)
    return
  }

  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8')
    const intent = extractPackBindings(source, 'intent')
    const rel = file.startsWith(base) ? file.slice(base.length + 1) : file
    console.log(`${rel}`)
    if (intent.goal) console.log(`  goal:  ${intent.goal}`)
    if (intent.taste) console.log(`  taste: ${intent.taste}`)
  }
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

function printMeasure(m: EmitMeasure, host?: string): void {
  console.error('')
  console.error(`── measure${host ? ` (${host})` : ''} ─────────────────────────`)
  console.error(`  hold_positive:       ${m.hold_positive}`)
  console.error(`  negation_spine_hits: ${m.negation_spine_hits}`)
  console.error(`  traits/slots:        ${m.trait_count}/${m.slot_count}`)
  console.error(`  sentence_estimate:   ${m.sentence_estimate}`)
  console.error(
    `  continuity:          ${m.continuity.ok} (${m.continuity.anchors_hit}/${m.continuity.anchors_checked})`,
  )
  console.error(
    `  style_hold:          ${m.style_hold.ok} (${m.style_hold.anchors_hit}/${m.style_hold.anchors_checked})`,
  )
  console.error(
    `  subject_hold:        ${m.subject_hold.ok} (${m.subject_hold.anchors_hit}/${m.subject_hold.anchors_checked})`,
  )
  console.error(
    `  genre_hold:          ${m.genre_hold.ok} (${m.genre_hold.anchors_hit}/${m.genre_hold.anchors_checked})`,
  )
  for (const w of m.warnings) {
    console.error(`  ! ${w}`)
  }
}
