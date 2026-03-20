#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { canonicalize, parse } from '@spw/seed'

type Command = 'check' | 'init' | 'help'

interface CliArgs {
  command: Command
  json: boolean
  strict: boolean
}

interface ParseReport {
  file: string
  success: boolean
  errors: number
  recoverableErrors: number
}

interface CheckReport {
  root: string
  required: Array<{ path: string; exists: boolean }>
  parse: ParseReport[]
  mount: {
    hasOnfSeed: boolean
    hasCanonSeed: boolean
    hasProfileHints: boolean
  }
  index: {
    hasMountRef: boolean
    hasWorkspaceRef: boolean
    hasHarnessRef: boolean
    hasRestructureRefs: boolean
  }
  workspace: {
    hasIndexRoot: boolean
    hasMountRoot: boolean
    hasIndexInLspRoots: boolean
    hasRestructureRegistryRefs: boolean
  }
  semicolon: {
    prefixedLines: number
    inlineCount: number
  }
  lock: {
    markers: number
  }
  status: 'ok' | 'warn' | 'fail'
  notes: string[]
}

const SPW_ROOT = path.resolve('.spw')
const REQUIRED_CORE = [
  '.spw/index.spw',
  '.spw/mount.spw',
  '.spw/canon-mount.spw',
  '.spw/workspace.spw',
  '.spw/harness/evals/baseline-evals.spw',
]
const REQUIRED_RESTRUCTURE = [
  '.spw/registries/curiosity-brace.spw',
  '.spw/registries/dialect-spec.spw',
  '.spw/registries/register-bank.spw',
  '.spw/conventions/index.spw',
  '.spw/conventions/selection.spw',
  '.spw/conventions/naming.spw',
  '.spw/conventions/cli.spw',
  '.spw/patterns/index.spw',
  '.spw/patterns/literate-architecture.spw',
  '.spw/patterns/query-composition.spw',
  '.spw/applications/symmetry/symmetry-applications.spw',
  '.spw/applications/symmetry/symmetry-ui-design.spw',
  '.spw/applications/symmetry/symmetry-forecast-projection-sound.spw',
  '.spw/applications/symmetry/symmetry-cognitive-engine.spw',
  '.spw/applications/symmetry/symmetry-spellcasting-pattern.spw',
  '.spw/tooling/intellij-plugin.spw',
]
const REQUIRED = [...REQUIRED_CORE, ...REQUIRED_RESTRUCTURE]

const STRICT_ONF_CRITICAL = new Set<string>([
  '.spw/index.spw',
  '.spw/mount.spw',
  '.spw/workspace.spw',
  '.spw/harness/evals/baseline-evals.spw',
])

const INDEX_RESTRUCTURE_REFS = [
  './registries/curiosity-brace.spw',
  './registries/dialect-spec.spw',
  './registries/register-bank.spw',
  './applications/symmetry/symmetry-applications.spw',
  './applications/symmetry/symmetry-ui-design.spw',
  './applications/symmetry/symmetry-forecast-projection-sound.spw',
  './applications/symmetry/symmetry-cognitive-engine.spw',
  './applications/symmetry/symmetry-spellcasting-pattern.spw',
  './conventions/index.spw',
  './conventions/selection.spw',
  './conventions/naming.spw',
  './conventions/cli.spw',
  './patterns/index.spw',
  './patterns/literate-architecture.spw',
  './patterns/query-composition.spw',
  './literate/architecture/index.spw',
  './tooling/intellij-plugin.spw',
]

const WORKSPACE_RESTRUCTURE_REFS = [
  '@index: ~"./index.spw"',
  '@mount: ~"./mount.spw"',
  '~#index_roots: [~"./", ~"./index.spw", ~"../docs", ~"../lib/spw-v0.2.0-alpha", ~"../src/seed"]',
  '~#curiosity_brace_registry: ~"./registries/curiosity-brace.spw"',
  '~#dialect_registry: ~"./registries/dialect-spec.spw"',
  '~#register_bank_registry: ~"./registries/register-bank.spw"',
  '~#symmetry_application_registry: ~"./applications/symmetry/symmetry-applications.spw"',
  '~#symmetry_ui_registry: ~"./applications/symmetry/symmetry-ui-design.spw"',
  '~#symmetry_forecast_registry: ~"./applications/symmetry/symmetry-forecast-projection-sound.spw"',
  '~#symmetry_cognitive_registry: ~"./applications/symmetry/symmetry-cognitive-engine.spw"',
  '~#symmetry_spellcasting_registry: ~"./applications/symmetry/symmetry-spellcasting-pattern.spw"',
  '~#conventions_root: ~"./conventions"',
  '~#conventions_spec: ~"./conventions/index.spw"',
  '~#selection_conventions: ~"./conventions/selection.spw"',
  '~#naming_conventions: ~"./conventions/naming.spw"',
  '~#cli_conventions: ~"./conventions/cli.spw"',
  '~#patterns_root: ~"./patterns"',
  '~#patterns_spec: ~"./patterns/index.spw"',
  '~#pattern_literate_architecture: ~"./patterns/literate-architecture.spw"',
  '~#pattern_query_composition: ~"./patterns/query-composition.spw"',
  '~#literate_architecture_exhibits: ~"./literate/architecture/index.spw"',
  '~#tooling_intellij_registry: ~"./tooling/intellij-plugin.spw"',
]

function printHelp(): void {
  console.log(`
Spw Mount Utility

Usage:
  node --import tsx scripts/spw-mount.ts [check|init] [--json] [--strict]

Commands:
  check   Validate mount v0.1 invariants for .spw root surfaces (default).
  init    Create missing .spw/index.spw and .spw/mount.spw templates.

Flags:
  --json   Emit JSON output.
  --strict Fail on parser diagnostics in ONF-critical required files.
`)
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const first = args.find((arg) => !arg.startsWith('--'))
  const command = (first === 'init' || first === 'help' || first === 'check' ? first : 'check') as Command
  return {
    command,
    json: args.includes('--json'),
    strict: args.includes('--strict'),
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function canonical(source: string): string {
  return canonicalize(source, {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: false,
  }).source
}

async function collectSpwFiles(dir: string): Promise<string[]> {
  const out: string[] = []

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(target)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.spw')) {
        out.push(target)
      }
    }
  }

  if (!await exists(dir)) return []
  await walk(dir)
  return out.sort()
}

function countSemicolons(source: string): { prefixedLines: number; inlineCount: number } {
  let prefixedLines = 0
  let inlineCount = 0
  let quote: '"' | '\'' | '`' | null = null
  let escaped = false

  const lines = source.split(/\r?\n/)
  for (const line of lines) {
    if (/^\s*;/.test(line)) prefixedLines += 1
  }

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      quote = ch
      continue
    }

    if (ch === ';') inlineCount += 1
  }

  return { prefixedLines, inlineCount }
}

async function parseFile(filePath: string): Promise<ParseReport> {
  const source = await fs.readFile(filePath, 'utf8')
  const out = parse(source)
  let recoverableErrors = 0
  for (const err of out.errors) {
    if ((err.data as { recoverable?: boolean } | undefined)?.recoverable) {
      recoverableErrors += 1
    }
  }

  return {
    file: path.relative(process.cwd(), filePath),
    success: out.success,
    errors: out.errors.length,
    recoverableErrors,
  }
}

async function loadText(target: string): Promise<string> {
  return fs.readFile(path.resolve(target), 'utf8')
}

async function runCheck(strict: boolean): Promise<CheckReport> {
  const required = await Promise.all(
    REQUIRED.map(async (entry) => ({ path: entry, exists: await exists(path.resolve(entry)) }))
  )

  const parseTargets = required.filter((entry) => entry.exists).map((entry) => path.resolve(entry.path))
  const parseReports = await Promise.all(parseTargets.map((target) => parseFile(target)))

  const mountText = (await exists(path.resolve('.spw/mount.spw')))
    ? await loadText('.spw/mount.spw')
    : ''
  const canonText = (await exists(path.resolve('.spw/canon-mount.spw')))
    ? await loadText('.spw/canon-mount.spw')
    : ''
  const indexText = (await exists(path.resolve('.spw/index.spw')))
    ? await loadText('.spw/index.spw')
    : ''
  const workspaceText = (await exists(path.resolve('.spw/workspace.spw')))
    ? await loadText('.spw/workspace.spw')
    : ''

  const allSpwFiles = await collectSpwFiles(SPW_ROOT)
  let semicolonPrefixed = 0
  let semicolonInline = 0
  let lockMarkers = 0

  for (const filePath of allSpwFiles) {
    const text = await fs.readFile(filePath, 'utf8')
    const semi = countSemicolons(text)
    semicolonPrefixed += semi.prefixedLines
    semicolonInline += semi.inlineCount
    const lockHits = text.match(/@lock\b/g)
    if (lockHits) lockMarkers += lockHits.length
  }

  const notes: string[] = []
  const missing = required.filter((entry) => !entry.exists)
  if (missing.length > 0) {
    notes.push(`missing required files: ${missing.map((m) => m.path).join(', ')}`)
  }

  const hardParseFailures = parseReports.filter((entry) => !entry.success)
  if (hardParseFailures.length > 0) {
    notes.push(`parse failed in: ${hardParseFailures.map((f) => f.file).join(', ')}`)
  }

  const strictAllowedRecoverables: string[] = []
  const strictViolations = strict ? parseReports.filter((entry) => {
    if (entry.errors === 0) return false
    const onlyRecoverable = entry.errors === entry.recoverableErrors
    if (onlyRecoverable && !STRICT_ONF_CRITICAL.has(entry.file)) {
      strictAllowedRecoverables.push(entry.file)
      return false
    }
    return true
  }) : []
  if (strictViolations.length > 0) {
    notes.push(`strict mode: parser diagnostics present in ${strictViolations.map((f) => f.file).join(', ')}`)
  }
  if (strictAllowedRecoverables.length > 0) {
    notes.push(`strict mode: allowed recoverable diagnostics in ${strictAllowedRecoverables.join(', ')}`)
  }

  const missingIndexRefs = INDEX_RESTRUCTURE_REFS.filter((needle) => !indexText.includes(needle))
  if (missingIndexRefs.length > 0) {
    notes.push(`index missing restructure refs: ${missingIndexRefs.join(', ')}`)
  }

  const missingWorkspaceRefs = WORKSPACE_RESTRUCTURE_REFS.filter((needle) => !workspaceText.includes(needle))
  if (missingWorkspaceRefs.length > 0) {
    notes.push(`workspace missing restructure refs: ${missingWorkspaceRefs.join(', ')}`)
  }

  if (semicolonPrefixed > 0 || semicolonInline > 0) {
    notes.push('semicolon usage detected; treated as advisory unless grammar promotion is explicitly enabled')
  }

  if (lockMarkers === 0) {
    notes.push('no @lock markers detected; lock policy currently advisory in mount v0.1')
  }

  const report: CheckReport = {
    root: path.relative(process.cwd(), SPW_ROOT),
    required,
    parse: parseReports,
    mount: {
      hasOnfSeed: mountText.includes('Workbench.Mount.V01.ONF'),
      hasCanonSeed: canonText.includes('Workbench.SpwDir.Mount'),
      hasProfileHints: canonText.includes('@profile:Spw.') || mountText.includes('@profile:Spw.'),
    },
    index: {
      hasMountRef: indexText.includes('./mount.spw'),
      hasWorkspaceRef: indexText.includes('./workspace.spw'),
      hasHarnessRef: indexText.includes('./harness/evals/baseline-evals.spw'),
      hasRestructureRefs: missingIndexRefs.length === 0,
    },
    workspace: {
      hasIndexRoot: workspaceText.includes('@index: ~"./index.spw"'),
      hasMountRoot: workspaceText.includes('@mount: ~"./mount.spw"'),
      hasIndexInLspRoots: workspaceText.includes('~#index_roots: [~"./", ~"./index.spw"'),
      hasRestructureRegistryRefs: missingWorkspaceRefs.length === 0,
    },
    semicolon: {
      prefixedLines: semicolonPrefixed,
      inlineCount: semicolonInline,
    },
    lock: {
      markers: lockMarkers,
    },
    status: 'ok',
    notes,
  }

  const fail = (
    missing.length > 0 ||
    hardParseFailures.length > 0 ||
    strictViolations.length > 0 ||
    missingIndexRefs.length > 0 ||
    missingWorkspaceRefs.length > 0
  )
  if (fail) report.status = 'fail'
  else if (notes.length > 0) report.status = 'warn'

  return report
}

async function ensureFile(target: string, template: string): Promise<'created' | 'exists'> {
  const abs = path.resolve(target)
  if (await exists(abs)) return 'exists'
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, canonical(template), 'utf8')
  return 'created'
}

const INDEX_TEMPLATE = `# Spw Index
#
# Canon-root index for .spw surfaces.

#>spw_index
#:index #!canon

^"intent"{
  ~#goal: "Provide one root entrypoint for mount, workspace, biome, harness, and projection surfaces."
}

^"roots"{
  @spw: ~"."
  @workspace: ~"./workspace.spw"
  @mount: ~"./mount.spw"
  @canon_mount: ~"./canon-mount.spw"
  @dialect_registry: ~"./registries/dialect-spec.spw"
  @register_bank_registry: ~"./registries/register-bank.spw"
  @curiosity_brace: ~"./registries/curiosity-brace.spw"
  @symmetry_apps: ~"./applications/symmetry/symmetry-applications.spw"
  @symmetry_ui: ~"./applications/symmetry/symmetry-ui-design.spw"
  @symmetry_fps: ~"./applications/symmetry/symmetry-forecast-projection-sound.spw"
  @symmetry_cog: ~"./applications/symmetry/symmetry-cognitive-engine.spw"
  @symmetry_spell: ~"./applications/symmetry/symmetry-spellcasting-pattern.spw"
  @tooling_intellij: ~"./tooling/intellij-plugin.spw"
  @conventions: ~"./conventions/index.spw"
  @selection_conventions: ~"./conventions/selection.spw"
  @naming_conventions: ~"./conventions/naming.spw"
  @cli_conventions: ~"./conventions/cli.spw"
  @patterns: ~"./patterns/index.spw"
  @pattern_literate_architecture: ~"./patterns/literate-architecture.spw"
  @pattern_query_composition: ~"./patterns/query-composition.spw"
  @biome: ~"./biome/ocean/index.spw"
  @literate_architecture: ~"./literate/architecture/index.spw"
  @harness: ~"./harness/evals/baseline-evals.spw"
  @gen: ~"./gen/index.spw"
  @hot: ~"./hot.spw"
  @topology: ~"./topology.spw"
}

^"dispatch"{
  mount: @mount
  workspace: @workspace
  biome: @biome
  harness: @harness
  projections: @gen
  runtime_hot: @hot
  routing: @topology
  conventions: @conventions
  conventions_selection: @selection_conventions
  conventions_naming: @naming_conventions
  conventions_cli: @cli_conventions
  patterns: @patterns
  pattern_literate_architecture: @pattern_literate_architecture
  pattern_query_composition: @pattern_query_composition
  literate_architecture: @literate_architecture
  dialect: @dialect_registry
  registers: @register_bank_registry
  curiosity: @curiosity_brace
  symmetry_applications: @symmetry_apps
  symmetry_ui: @symmetry_ui
  symmetry_forecast_projection_sound: @symmetry_fps
  symmetry_cognitive: @symmetry_cog
  symmetry_spellcasting_pattern: @symmetry_spell
  tooling_intellij: @tooling_intellij
}
`

const MOUNT_TEMPLATE = `# Mount
#
# ONF-safe mount source of truth for .spw canon-root behavior.

#>spw_mount
#:mount #!canon

^seed[Workbench.Mount.V01.ONF v:0.1 @profile:Spw.m @intent:mount-slice]
?(
  @(Orchestrator,#[SyntaxEvolver,CanonicalizerHasher,FuzzerAdversary,ParserGrammar,ProjectionMedia]),
  "implement Mount v0.1 slice; treat .spw as canon root and validate mount invariants"
)
`

async function runInit(): Promise<void> {
  const indexStatus = await ensureFile('.spw/index.spw', INDEX_TEMPLATE)
  const mountStatus = await ensureFile('.spw/mount.spw', MOUNT_TEMPLATE)
  console.log(`spw-mount:init index=${indexStatus} mount=${mountStatus}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.command === 'help') {
    printHelp()
    return
  }

  if (args.command === 'init') {
    await runInit()
    return
  }

  const report = await runCheck(args.strict)
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`spw-mount: root=${report.root} status=${report.status}`)
    const requiredLine = report.required.map((item) => `${item.path}:${item.exists ? 'ok' : 'missing'}`).join(' ')
    console.log(`required: ${requiredLine}`)
    console.log(`mount: onf=${report.mount.hasOnfSeed} canon=${report.mount.hasCanonSeed} profiles=${report.mount.hasProfileHints}`)
    console.log(`index: mount=${report.index.hasMountRef} workspace=${report.index.hasWorkspaceRef} harness=${report.index.hasHarnessRef} restructure=${report.index.hasRestructureRefs}`)
    console.log(`workspace: indexRoot=${report.workspace.hasIndexRoot} mountRoot=${report.workspace.hasMountRoot} lspIndex=${report.workspace.hasIndexInLspRoots} restructure=${report.workspace.hasRestructureRegistryRefs}`)
    console.log(`semicolon: prefixed=${report.semicolon.prefixedLines} inline=${report.semicolon.inlineCount}`)
    console.log(`lock: markers=${report.lock.markers}`)
    for (const entry of report.parse) {
      console.log(`parse: ${entry.file} success=${entry.success} errors=${entry.errors} recoverable=${entry.recoverableErrors}`)
    }
    for (const note of report.notes) {
      console.log(`note: ${note}`)
    }
  }

  if (report.status === 'fail') {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`spw-mount: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
