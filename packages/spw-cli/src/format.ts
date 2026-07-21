import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { canonicalize } from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

interface CliArgs {
  targets: string[]
  check: boolean
  full: boolean
  help: boolean
  mode: 'canonical' | 'equiv'
}

interface MutationCounts {
  seqAliasToLs: number
  dotPostfixNormalized: number
  wildcardExpanded: number
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', 'build', '_workbench', '.agents'])
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
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--check') {
      parsed.check = true
      continue
    }
    if (arg === '--full') {
      parsed.full = true
      continue
    }
    if (arg === '--mode') {
      const next = (args[i + 1] ?? 'canonical').toLowerCase()
      parsed.mode = next === 'equiv' ? 'equiv' : 'canonical'
      i += 1
      continue
    }
    if (arg === '--mode=equiv' || arg === 'equiv') {
      parsed.mode = 'equiv'
      continue
    }
    if (arg === '--mode=canonical' || arg === 'canonical') {
      parsed.mode = 'canonical'
      continue
    }
    parsed.targets.push(arg)
  }

  if (parsed.targets.length === 0) {
    parsed.targets.push('.spw')
  }

  return parsed
}

export function printSpwFormatHelp(): void {
  printHelpPage({
    title: 'Spw Format',
    usage: [
      'npm run spw:format -- [targets...] [--check] [--mode canonical|equiv] [--full]',
      'npm run spw -- format [targets...] [--check] [--mode canonical|equiv] [--full]',
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          '--check                   Report files that would change without writing',
          '--mode <canonical|equiv>  Canonical formatting or canonical+equivalence rewrites',
          '--full                    Expand default targets from .spw to repo semantic surfaces',
        ],
      },
      {
        title: 'Defaults',
        lines: [
          'Without targets, the formatter scans .spw only.',
          'With --full, the formatter scans index.spw, .spw, docs, lib, packages, prompts, and src.',
          'Directories are walked recursively; .git, node_modules, dist, release, build, _workbench, and .agents are skipped.',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'npm run spw:format',
          'npm run spw:format -- --full',
          'npm run spw:format:check -- --full',
          'npm run spw -- format docs/design/spw --mode equiv',
        ],
      },
    ],
  })
}

function resolveTargets(cli: CliArgs): string[] {
  if (cli.targets.length === 0) {
    return cli.full ? FULL_REPO_TARGETS : DEFAULT_TARGETS
  }

  if (!cli.full) {
    return cli.targets
  }

  return [...FULL_REPO_TARGETS, ...cli.targets]
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

  if (!stats.isDirectory()) {
    return []
  }

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue
    }

    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSpwFiles(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(entryPath)
    }
  }

  return files
}

function zeroMutations(): MutationCounts {
  return {
    seqAliasToLs: 0,
    dotPostfixNormalized: 0,
    wildcardExpanded: 0,
  }
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
  return mutations.seqAliasToLs > 0 || mutations.dotPostfixNormalized > 0 || mutations.wildcardExpanded > 0
}

async function formatFile(filePath: string, check: boolean, mode: 'canonical' | 'equiv'): Promise<{ changed: boolean; mutations: MutationCounts }> {
  const original = await fs.readFile(filePath, 'utf8')
  const mutationStep = mode === 'equiv' ? applyEquivMutations(original) : { source: original, mutations: zeroMutations() }
  const formatted = canonicalize(mutationStep.source, {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: false,
  }).source

  if (formatted === original) {
    return { changed: false, mutations: mutationStep.mutations }
  }

  if (!check) {
    await fs.writeFile(filePath, formatted, 'utf8')
  }

  return { changed: true, mutations: mutationStep.mutations }
}

export async function runSpwFormatCli(argv: string[] = process.argv): Promise<void> {
  const cli = parseArgs(argv)
  if (cli.help) {
    printSpwFormatHelp()
    return
  }

  const repoRoot = process.cwd()
  const fileSet = new Set<string>()

  for (const target of resolveTargets(cli)) {
    const files = await collectSpwFiles(target)
    for (const file of files) fileSet.add(file)
  }

  const files = Array.from(fileSet).sort()
  if (files.length === 0) {
    console.log('spw-format: no .spw files found.')
    return
  }

  let changed = 0
  let contour = zeroMutations()
  for (const file of files) {
    const result = await formatFile(file, cli.check, cli.mode)
    contour = mergeMutations(contour, result.mutations)
    if (result.changed) {
      changed += 1
      const rel = path.relative(repoRoot, file)
      let suffix = ''
      if (cli.mode === 'equiv' && hasMutations(result.mutations)) {
        suffix = ` [mutations seq->ls=${result.mutations.seqAliasToLs}, dot=${result.mutations.dotPostfixNormalized}, wildcard=${result.mutations.wildcardExpanded}]`
      }
      console.log(`${cli.check ? 'needs-format' : 'formatted'}: ${rel}${suffix}`)
    }
  }

  if (cli.check && changed > 0) {
    console.error(`spw-format: ${changed} file(s) need formatting.`)
    process.exitCode = 1
    return
  }

  if (cli.mode === 'equiv') {
    console.log(
      `spw-format contour: seq->ls=${contour.seqAliasToLs}, dot-postfix=${contour.dotPostfixNormalized}, wildcard-expand=${contour.wildcardExpanded}`,
    )
  }

  console.log(`spw-format: ${files.length} file(s) scanned, ${changed} ${cli.check ? 'need' : 'updated'}.`)
}
