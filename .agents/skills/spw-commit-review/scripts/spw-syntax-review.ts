import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type SyntaxReviewScope = 'staged' | 'changed' | 'working'
export type SyntaxReviewFormat = 'text' | 'hook' | 'json'
export type SyntaxProfileId =
  | 'historical'
  | 'agent_surface'
  | 'runtime_state'
  | 'canon_surface'
  | 'narrative_surface'
  | 'strict_surface'

export type PatternId = 'quoted_frame' | 'domain_meta' | 'trait_hash' | 'trait_bare'
export type PatternPolicy = 'allowed' | 'discouraged' | 'historical'
export type ReviewLevel = 'ok' | 'warn' | 'waive'

export interface SyntaxProfile {
  id: SyntaxProfileId
  label: string
  note: string
}

export interface PatternReview {
  id: PatternId
  label: string
  fullCount: number
  addedCount: number
  policy: PatternPolicy
}

export interface SyntaxReviewResult {
  filePath: string
  normalizedPath: string
  profile: SyntaxProfile
  patterns: PatternReview[]
  level: ReviewLevel
  message: string
}

type CliOptions = {
  scope: SyntaxReviewScope
  format: SyntaxReviewFormat
  help: boolean
  files: string[]
}

type PatternSpec = {
  id: PatternId
  label: string
  regex: RegExp
}

const PATTERNS: PatternSpec[] = [
  { id: 'quoted_frame', label: '^"…" {', regex: /^\s*\^"(?:[^"\n]|\\.)*"\s*\{/gm },
  { id: 'domain_meta', label: '@domain:', regex: /@domain:/g },
  { id: 'trait_hash', label: '~#…', regex: /~#/g },
  { id: 'trait_bare', label: '~name:', regex: /^\s*~(?!#)[A-Za-z_][A-Za-z0-9_]*:/gm },
]

const PROFILE_POLICIES: Record<SyntaxProfileId, Record<PatternId, PatternPolicy>> = {
  historical: {
    quoted_frame: 'historical',
    domain_meta: 'historical',
    trait_hash: 'historical',
    trait_bare: 'historical',
  },
  agent_surface: {
    quoted_frame: 'allowed',
    domain_meta: 'discouraged',
    trait_hash: 'allowed',
    trait_bare: 'allowed',
  },
  runtime_state: {
    quoted_frame: 'allowed',
    domain_meta: 'discouraged',
    trait_hash: 'allowed',
    trait_bare: 'allowed',
  },
  canon_surface: {
    quoted_frame: 'allowed',
    domain_meta: 'discouraged',
    trait_hash: 'allowed',
    trait_bare: 'allowed',
  },
  narrative_surface: {
    quoted_frame: 'allowed',
    domain_meta: 'discouraged',
    trait_hash: 'allowed',
    trait_bare: 'allowed',
  },
  strict_surface: {
    quoted_frame: 'discouraged',
    domain_meta: 'discouraged',
    trait_hash: 'discouraged',
    trait_bare: 'discouraged',
  },
}

const PROFILE_LABELS: Record<SyntaxProfileId, string> = {
  historical: 'historical',
  agent_surface: 'agent_surface',
  runtime_state: 'runtime_state',
  canon_surface: 'canon_surface',
  narrative_surface: 'narrative_surface',
  strict_surface: 'strict_surface',
}

const PROFILE_NOTES: Record<SyntaxProfileId, string> = {
  historical: 'archival surfaces keep historical forms without hook pressure',
  agent_surface: 'plans and agent support surfaces allow concise planning idioms',
  runtime_state: 'runtime/state snapshots favor legibility over strict normalization',
  canon_surface: 'workspace canon surfaces allow quoted frames and concise traits',
  narrative_surface: 'docs/spec/story surfaces allow the current narrative idiom mix',
  strict_surface: 'strict machine surfaces prefer explicit modern structural forms',
}

export async function reviewFiles(
  filePaths: string[],
  scope: SyntaxReviewScope,
): Promise<SyntaxReviewResult[]> {
  const results: SyntaxReviewResult[] = []

  for (const filePath of filePaths) {
    const result = await reviewFile(filePath, scope)
    if (result) {
      results.push(result)
    }
  }

  return results.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath))
}

export async function reviewFile(
  filePath: string,
  scope: SyntaxReviewScope,
): Promise<SyntaxReviewResult | null> {
  const normalizedPath = normalizePath(filePath)
  const source = await readSourceForScope(filePath, scope)
  if (source === null) return null

  const addedText = await readAddedText(filePath, scope, source)
  const profile = detectSyntaxProfile(normalizedPath)
  const policies = PROFILE_POLICIES[profile.id]
  const patterns = PATTERNS.map((pattern) => ({
    id: pattern.id,
    label: pattern.label,
    fullCount: countMatches(source, pattern.regex),
    addedCount: countMatches(addedText, pattern.regex),
    policy: policies[pattern.id],
  })).filter((pattern) => pattern.fullCount > 0 || pattern.addedCount > 0)

  const warned = patterns.filter((pattern) => pattern.policy === 'discouraged' && pattern.addedCount > 0)
  const waived = patterns.filter((pattern) => pattern.policy === 'historical' && pattern.fullCount > 0)
  const allowed = patterns.filter((pattern) => pattern.policy === 'allowed' && pattern.fullCount > 0)

  const level: ReviewLevel = warned.length > 0 ? 'warn' : waived.length > 0 ? 'waive' : 'ok'
  const message = renderSummary(profile, allowed, warned, waived, patterns)

  return {
    filePath,
    normalizedPath,
    profile,
    patterns,
    level,
    message,
  }
}

export function detectSyntaxProfile(normalizedPath: string): SyntaxProfile {
  if (
    normalizedPath.includes('/_archive/')
    || normalizedPath.startsWith('docs/archive/')
    || normalizedPath.startsWith('lib/spw-v0.1.0-alpha/')
    || normalizedPath.startsWith('lib/spw-v0.2.0-alpha/')
  ) {
    return profile('historical')
  }

  if (normalizedPath.startsWith('.agents/')) {
    return profile('agent_surface')
  }

  if (
    normalizedPath.endsWith('.state.spw')
    || normalizedPath.startsWith('.agents/state/')
    || normalizedPath.startsWith('.spw/state/')
  ) {
    return profile('runtime_state')
  }

  if (
    normalizedPath === '.spw'
    || normalizedPath === 'index.spw'
    || normalizedPath.startsWith('.spw/')
  ) {
    return profile('canon_surface')
  }

  if (
    normalizedPath.startsWith('docs/')
    || normalizedPath.startsWith('lib/')
    || normalizedPath.includes('/docs/')
  ) {
    return profile('narrative_surface')
  }

  return profile('strict_surface')
}

export function printHelp(): void {
  const lines = [
    'Spw Syntax Review',
    '',
    'Usage:',
    '  node --import tsx .agents/skills/spw-commit-review/scripts/spw-syntax-review.ts [options] -- <file.spw>...',
    '',
    'Options:',
    '  --scope=staged|changed|working   Source and diff scope (default: working)',
    '  --format=text|hook|json          Output format (default: text)',
    '  -h, --help                       Show this help',
    '',
    'Review model:',
    '  - profile-based review, not generation buckets',
    '  - warnings only for newly introduced discouraged forms',
    '  - historical/archive surfaces are waived, not warned',
  ]

  process.stdout.write(`${lines.join('\n')}\n`)
}

function profile(id: SyntaxProfileId): SyntaxProfile {
  return {
    id,
    label: PROFILE_LABELS[id],
    note: PROFILE_NOTES[id],
  }
}

function renderSummary(
  profile: SyntaxProfile,
  allowed: PatternReview[],
  warned: PatternReview[],
  waived: PatternReview[],
  patterns: PatternReview[],
): string {
  if (warned.length > 0) {
    return `profile=${profile.label}; introduced discouraged forms: ${renderCounts(warned, 'added')}`
  }

  if (waived.length > 0) {
    const waivedCounts = renderCounts(waived, 'full')
    return `profile=${profile.label}; historical forms waived: ${waivedCounts}`
  }

  if (allowed.length > 0) {
    return `profile=${profile.label}; allowed forms: ${renderCounts(allowed, 'full')}`
  }

  if (patterns.length > 0) {
    return `profile=${profile.label}; reviewed forms present with no action`
  }

  return `profile=${profile.label}; no reviewed forms detected`
}

function renderCounts(items: PatternReview[], mode: 'full' | 'added'): string {
  return items
    .map((item) => `${item.label}${mode === 'added' ? ` +${item.addedCount}` : `×${item.fullCount}`}`)
    .join(', ')
}

function countMatches(content: string, regex: RegExp): number {
  const matches = content.match(regex)
  return matches ? matches.length : 0
}

async function readSourceForScope(filePath: string, scope: SyntaxReviewScope): Promise<string | null> {
  if (scope === 'staged') {
    return gitRead(['show', `:${filePath}`])
  }

  try {
    return await fs.readFile(path.resolve(filePath), 'utf8')
  } catch {
    return null
  }
}

async function readAddedText(filePath: string, scope: SyntaxReviewScope, workingSource: string): Promise<string> {
  if (scope === 'working') {
    return ''
  }

  const chunks: string[] = []

  if (scope === 'staged' || scope === 'changed') {
    chunks.push(extractAddedLines(gitRead(['diff', '--cached', '--unified=0', '--', filePath]) ?? ''))
  }

  if (scope === 'changed') {
    chunks.push(extractAddedLines(gitRead(['diff', '--unified=0', '--', filePath]) ?? ''))
    if (!(await isTracked(filePath))) {
      return workingSource
    }
  }

  return chunks.filter(Boolean).join('\n')
}

async function isTracked(filePath: string): Promise<boolean> {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'ignore'],
    })
    return true
  } catch {
    return false
  }
}

function extractAddedLines(diffText: string): string {
  return diffText
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n')
}

function gitRead(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '')
}

function parseArgs(argv: string[]): CliOptions {
  const files: string[] = []
  let scope: SyntaxReviewScope = 'working'
  let format: SyntaxReviewFormat = 'text'
  let help = false
  let treatRestAsFiles = false

  for (const arg of argv) {
    if (treatRestAsFiles) {
      files.push(arg)
      continue
    }

    if (arg === '--') {
      treatRestAsFiles = true
      continue
    }
    if (arg === '-h' || arg === '--help') {
      help = true
      continue
    }
    if (arg.startsWith('--scope=')) {
      const value = arg.slice('--scope='.length)
      if (value === 'staged' || value === 'changed' || value === 'working') {
        scope = value
        continue
      }
      throw new Error(`Invalid --scope value: ${value}`)
    }
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length)
      if (value === 'text' || value === 'hook' || value === 'json') {
        format = value
        continue
      }
      throw new Error(`Invalid --format value: ${value}`)
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    files.push(arg)
  }

  return { scope, format, help, files }
}

function renderText(results: SyntaxReviewResult[]): string {
  return results
    .map((result) => `${iconForLevel(result.level)} ${result.normalizedPath} — ${result.message}`)
    .join('\n')
}

function renderHook(results: SyntaxReviewResult[]): string {
  return results
    .map((result) => `${result.level.toUpperCase()}\t${result.normalizedPath}\t${result.message}`)
    .join('\n')
}

function iconForLevel(level: ReviewLevel): string {
  switch (level) {
    case 'warn':
      return '⚠'
    case 'waive':
      return '○'
    case 'ok':
    default:
      return '✓'
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const results = await reviewFiles(options.files, options.scope)
  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
    return
  }

  const text = options.format === 'hook' ? renderHook(results) : renderText(results)
  if (text) {
    process.stdout.write(`${text}\n`)
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  void main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`spw-syntax-review: ${message}`)
    process.exitCode = 1
  })
}
