/**
 * spw format — indentation, layout, block-level prose reflow.
 *
 * Profiles (CanonicalOptions bundles):
 *   canonical  hygiene only (historical default)
 *   pretty     indent + frames + prose wrap + collapse blanks
 *   layout     indent + frames + align comments (no prose rewrite)
 *   prose      prose wrap + hygiene (no re-indent)
 *   equiv      pretty-ish hygiene + equivalence script rewrites
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  canonicalize,
  resolveFormatProfile,
  type CanonicalOptions,
  type FormatProfileId,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

type FormatMode = FormatProfileId | 'equiv'

interface CliArgs {
  targets: string[]
  check: boolean
  full: boolean
  help: boolean
  mode: FormatMode
  indent?: boolean
  prose?: boolean
  frames?: boolean
  alignComments?: boolean
  collapseBlanks?: boolean
  indentSize?: number
  width?: number
  diff: boolean
  quiet: boolean
}

interface MutationCounts {
  seqAliasToLs: number
  dotPostfixNormalized: number
  wildcardExpanded: number
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '_workbench', '.agents'])
const DEFAULT_TARGETS = ['.spw']
const FULL_REPO_TARGETS = ['index.spw', '.spw', 'docs', 'lib', 'packages', 'prompts', 'src']

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const args = common.args
  const parsed: CliArgs = {
    targets: [],
    check: false,
    full: false,
    help: common.flags.help,
    mode: 'canonical',
    diff: false,
    quiet: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!

    if (arg === '--check') {
      parsed.check = true
      continue
    }
    if (arg === '--full') {
      parsed.full = true
      continue
    }
    if (arg === '--diff') {
      parsed.diff = true
      continue
    }
    if (arg === '--quiet' || arg === '-q') {
      parsed.quiet = true
      continue
    }
    if (arg === '--indent') {
      parsed.indent = true
      continue
    }
    if (arg === '--no-indent') {
      parsed.indent = false
      continue
    }
    if (arg === '--prose' || arg === '--reflow') {
      parsed.prose = true
      continue
    }
    if (arg === '--no-prose') {
      parsed.prose = false
      continue
    }
    if (arg === '--frames') {
      parsed.frames = true
      continue
    }
    if (arg === '--no-frames') {
      parsed.frames = false
      continue
    }
    if (arg === '--align-comments') {
      parsed.alignComments = true
      continue
    }
    if (arg === '--collapse-blanks') {
      parsed.collapseBlanks = true
      continue
    }
    if (arg === '--indent-size') {
      parsed.indentSize = Math.max(1, Number(args[++i] ?? 2) || 2)
      continue
    }
    if (arg.startsWith('--indent-size=')) {
      parsed.indentSize = Math.max(1, Number(arg.slice('--indent-size='.length)) || 2)
      continue
    }
    if (arg === '--width' || arg === '-w') {
      parsed.width = Math.max(40, Number(args[++i] ?? 88) || 88)
      continue
    }
    if (arg.startsWith('--width=')) {
      parsed.width = Math.max(40, Number(arg.slice('--width='.length)) || 88)
      continue
    }
    if (arg === '--profile' || arg === '--mode') {
      const next = (args[i + 1] ?? 'canonical').toLowerCase()
      parsed.mode = parseMode(next)
      i += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      parsed.mode = parseMode(arg.slice('--profile='.length))
      continue
    }
    if (arg.startsWith('--mode=')) {
      parsed.mode = parseMode(arg.slice('--mode='.length))
      continue
    }
    // bare profile tokens
    if (
      arg === 'pretty' ||
      arg === 'layout' ||
      arg === 'prose' ||
      arg === 'canonical' ||
      arg === 'equiv'
    ) {
      parsed.mode = parseMode(arg)
      continue
    }
    if (arg.startsWith('-')) {
      throw new Error(`spw format: unknown flag ${arg}`)
    }
    parsed.targets.push(arg)
  }

  if (parsed.targets.length === 0) {
    parsed.targets.push('.spw')
  }

  return parsed
}

function parseMode(raw: string): FormatMode {
  const v = raw.toLowerCase()
  if (v === 'equiv' || v === 'pretty' || v === 'layout' || v === 'prose' || v === 'canonical') {
    return v
  }
  throw new Error(
    `spw format: unknown profile "${raw}" (canonical|pretty|layout|prose|equiv)`,
  )
}

export function printSpwFormatHelp(): void {
  printHelpPage({
    title: 'Spw Format',
    usage: [
      'spw format [targets...] [--profile pretty|layout|prose|canonical|equiv] [flags]',
      'spw format prompts --profile pretty --check',
      'spw format path/to/file.spw --indent --prose --width 88',
    ],
    sections: [
      {
        title: 'Profiles',
        lines: [
          'canonical  Whitespace hygiene only (default; historical)',
          'pretty     Indent braces + frame blanks + prose reflow + collapse blanks',
          'layout     Indent + frame blanks + align trailing # comments (no prose rewrite)',
          'prose      Block-level # / // reflow + hygiene (no re-indent)',
          'equiv      Equivalence script rewrites + layout_bundle hygiene',
        ],
      },
      {
        title: 'Layout flags',
        lines: [
          '--indent / --no-indent     Brace/bracket depth indent (default from profile)',
          '--indent-size N            Spaces per level (default 2)',
          '--frames / --no-frames     Blank line between top-level ^ frames',
          '--align-comments           Align trailing # comments in blocks',
          '--collapse-blanks          Max one blank line in a row',
          '--prose / --reflow         Wrap block-level # / // prose to --width',
          '--width N / -w N           Print width for prose (default 88)',
        ],
      },
      {
        title: 'Run flags',
        lines: [
          '--check                    Report files that would change (exit 1 if any)',
          '--diff                     With --check, print a short unified-ish diff',
          '--full                     Scan repo semantic surfaces (index, .spw, docs, …)',
          '--quiet / -q               Only print summary counts',
        ],
      },
      {
        title: 'Defaults',
        lines: [
          'Without targets, scans .spw only.',
          'With --full: index.spw, .spw, docs, lib, packages, prompts, src.',
          'Skips .git, node_modules, dist, _workbench, .agents.',
          'Prose reflow never rewrites #>/#:/#! directives or code strings.',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw format prompts/templates --profile pretty',
          'spw format prompts/index.spw --prose --width 72',
          'spw format --profile layout --check --diff prompts/sagas',
          'spw format --full --profile canonical --check',
          'spw format docs --mode equiv',
        ],
      },
    ],
  })
}

function resolveTargets(cli: CliArgs): string[] {
  if (cli.targets.length === 0) {
    return cli.full ? FULL_REPO_TARGETS : DEFAULT_TARGETS
  }
  if (!cli.full) return cli.targets
  return [...FULL_REPO_TARGETS, ...cli.targets]
}

function buildOptions(cli: CliArgs): CanonicalOptions {
  let profile: FormatProfileId = 'canonical'
  if (cli.mode === 'pretty' || cli.mode === 'layout' || cli.mode === 'prose') {
    profile = cli.mode
  } else if (cli.mode === 'canonical') {
    // Flag-only upgrades when profile left at default
    if (cli.indent === true || cli.frames === true) profile = 'pretty'
    else if (cli.prose === true) profile = 'prose'
  }
  // equiv → canonical base + script rewrites applied separately

  const overrides: Partial<CanonicalOptions> = {}
  if (cli.indent !== undefined) overrides.indentBraces = cli.indent
  if (cli.prose !== undefined) overrides.reflowProse = cli.prose
  if (cli.frames !== undefined) overrides.blankLineBetweenFrames = cli.frames
  if (cli.alignComments !== undefined) overrides.alignComments = cli.alignComments
  if (cli.collapseBlanks !== undefined) overrides.collapseBlankLines = cli.collapseBlanks
  if (cli.indentSize !== undefined) overrides.indentSize = cli.indentSize
  if (cli.width !== undefined) overrides.printWidth = cli.width

  return resolveFormatProfile(profile, overrides)
}

async function collectSpwFiles(target: string): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats
  try {
    stats = await fs.stat(absolute)
  } catch {
    return []
  }

  if (stats.isFile()) {
    return absolute.endsWith('.spw') ? [absolute] : []
  }
  if (!stats.isDirectory()) return []

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSpwFiles(entryPath)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.spw')) files.push(entryPath)
  }
  return files
}

function zeroMutations(): MutationCounts {
  return { seqAliasToLs: 0, dotPostfixNormalized: 0, wildcardExpanded: 0 }
}

function applyEquivMutations(source: string): { source: string; mutations: MutationCounts } {
  const mutations = zeroMutations()
  let next = source

  next = next.replace(/npm run spw:seq --/g, () => {
    mutations.seqAliasToLs += 1
    return 'npm run spw:ls --'
  })
  next = next.replace(/\.\*/g, () => {
    mutations.wildcardExpanded += 1
    return '*()'
  })
  next = next.replace(/\.([!?~@&*=%#$^_])/g, (_match, token: string) => {
    mutations.dotPostfixNormalized += 1
    return token
  })
  return { source: next, mutations }
}

function mergeMutations(a: MutationCounts, b: MutationCounts): MutationCounts {
  return {
    seqAliasToLs: a.seqAliasToLs + b.seqAliasToLs,
    dotPostfixNormalized: a.dotPostfixNormalized + b.dotPostfixNormalized,
    wildcardExpanded: a.wildcardExpanded + b.wildcardExpanded,
  }
}

function hasMutations(mutations: MutationCounts): boolean {
  return (
    mutations.seqAliasToLs > 0 ||
    mutations.dotPostfixNormalized > 0 ||
    mutations.wildcardExpanded > 0
  )
}

/** Compact line-oriented diff for --check --diff (not a full unified patch). */
export function shortDiff(before: string, after: string, maxHunks = 12): string {
  const a = before.split('\n')
  const b = after.split('\n')
  const lines: string[] = []
  const max = Math.max(a.length, b.length)
  let hunks = 0
  for (let i = 0; i < max && hunks < maxHunks; i++) {
    const left = a[i]
    const right = b[i]
    if (left === right) continue
    hunks++
    if (left !== undefined) lines.push(`- ${left}`)
    if (right !== undefined) lines.push(`+ ${right}`)
  }
  if (hunks >= maxHunks) lines.push('…')
  return lines.join('\n')
}

async function formatFile(
  filePath: string,
  check: boolean,
  mode: FormatMode,
  options: CanonicalOptions,
): Promise<{ changed: boolean; mutations: MutationCounts; before: string; after: string }> {
  const original = await fs.readFile(filePath, 'utf8')
  const mutationStep =
    mode === 'equiv'
      ? applyEquivMutations(original)
      : { source: original, mutations: zeroMutations() }

  const formatted = canonicalize(mutationStep.source, options).source

  if (formatted === original) {
    return {
      changed: false,
      mutations: mutationStep.mutations,
      before: original,
      after: formatted,
    }
  }

  if (!check) {
    await fs.writeFile(filePath, formatted, 'utf8')
  }

  return {
    changed: true,
    mutations: mutationStep.mutations,
    before: original,
    after: formatted,
  }
}

export async function runSpwFormatCli(argv: string[] = process.argv): Promise<void> {
  let cli: CliArgs
  try {
    cli = parseArgs(argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
    return
  }

  if (cli.help) {
    printSpwFormatHelp()
    return
  }

  const options = buildOptions(cli)
  const repoRoot = process.cwd()
  const fileSet = new Set<string>()

  for (const target of resolveTargets(cli)) {
    for (const file of await collectSpwFiles(target)) fileSet.add(file)
  }

  const files = Array.from(fileSet).sort()
  if (files.length === 0) {
    console.log('spw-format: no .spw files found.')
    return
  }

  if (!cli.quiet) {
    console.error(
      `# spw format  profile=${cli.mode}  indent=${options.indentBraces}  prose=${options.reflowProse}  frames=${options.blankLineBetweenFrames}  width=${options.printWidth}`,
    )
  }

  let changed = 0
  let contour = zeroMutations()
  for (const file of files) {
    const result = await formatFile(file, cli.check, cli.mode, options)
    contour = mergeMutations(contour, result.mutations)
    if (result.changed) {
      changed += 1
      const rel = path.relative(repoRoot, file)
      const display = rel.startsWith('..') ? file : rel || file
      if (!cli.quiet) {
        let suffix = ''
        if (cli.mode === 'equiv' && hasMutations(result.mutations)) {
          suffix = ` [mutations seq->ls=${result.mutations.seqAliasToLs}, dot=${result.mutations.dotPostfixNormalized}, wildcard=${result.mutations.wildcardExpanded}]`
        }
        console.log(`${cli.check ? 'needs-format' : 'formatted'}: ${display}${suffix}`)
        if (cli.check && cli.diff) {
          const d = shortDiff(result.before, result.after)
          if (d) {
            console.log(d)
            console.log('')
          }
        }
      }
    }
  }

  if (cli.check && changed > 0) {
    console.error(`spw-format: ${changed} file(s) need formatting.`)
    process.exitCode = 1
  }

  if (cli.mode === 'equiv' && !cli.quiet) {
    console.log(
      `spw-format contour: seq->ls=${contour.seqAliasToLs}, dot-postfix=${contour.dotPostfixNormalized}, wildcard-expand=${contour.wildcardExpanded}`,
    )
  }

  console.log(
    `spw-format: ${files.length} file(s) scanned, ${changed} ${cli.check ? 'need' : 'updated'}.`,
  )
}
