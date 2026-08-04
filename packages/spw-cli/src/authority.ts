/**
 * spw authority — compare a surface's authority claims against its subject.
 *
 * effect.l0.measure: reads a `.spw` surface and the JavaScript/TypeScript file
 * its `@self` names, and reports where the two disagree. Never writes.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  readAuthorityDeclarations,
  reconcileAuthority,
  type AuthorityFinding,
} from '@spwashi/spw-seed'
import { extractAuthority } from './authority-extract'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

interface CliArgs {
  targets: string[]
  json: boolean
  help: boolean
  /** Report `stale` claims too, not just leaks. */
  all: boolean
}

interface SubjectReport {
  file: string
  self: string
  resolved: string
  findings: AuthorityFinding[]
  error?: string
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '_workbench'])
const SUBJECT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const parsed: CliArgs = { targets: [], json: false, help: common.flags.help, all: false }

  for (const arg of common.args) {
    if (arg === 'authority') continue
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--all') {
      parsed.all = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    if (arg.startsWith('-')) throw new Error(`spw authority: unknown flag ${arg}`)
    parsed.targets.push(arg)
  }

  if (parsed.targets.length === 0) parsed.targets.push('.')
  return parsed
}

export function printSpwAuthorityHelp(): void {
  printHelpPage({
    title: 'Spw Authority — declared claims vs what the subject does',
    usage: [
      'spw authority [targets...]',
      'spw authority modules --all',
      'spw authority src --json',
    ],
    sections: [
      {
        title: 'What it reads',
        lines: [
          '^["module"]{',
          '  @self: ~"../js/kernel/dom-contracts.js"',
          '  !writes: << dataset[*] ; style[*] >>',
          '  &joins: << MutationObserver ; pointerdown >>',
          '}',
          'Claim lists separate on ; , or newline. A [*] qualifier covers every',
          'use of that name.',
        ],
      },
      {
        title: 'Verdicts',
        lines: [
          'leak      the subject does it and the surface never said so',
          'stale     the surface claims it and the subject no longer does it',
          'declared  claim and subject agree (shown with --all)',
        ],
      },
      {
        title: 'What the extractor sees',
        lines: [
          'writes    dataset/style/textContent/innerHTML/className/value assignment,',
          '          setAttribute and friends, classList calls, dispatchEvent',
          'joins     addEventListener by event name, observer/socket constructors, fetch',
          'reads     static and dynamic import specifiers',
          'Recognition is syntactic: it sees el.dataset.x, not el[prop] via an alias.',
          'A leak is evidence the surface is stale; no findings is not proof it is complete.',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--all    Include stale and agreeing claims, not just leaks',
          '--json   Machine-readable report',
        ],
      },
    ],
  })
}

async function collectSpwFiles(target: string): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats
  try {
    stats = await fs.stat(absolute)
  } catch {
    return []
  }
  if (stats.isFile()) return absolute.endsWith('.spw') ? [absolute] : []
  if (!stats.isDirectory()) return []

  const out: string[] = []
  for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) out.push(...(await collectSpwFiles(entryPath)))
    else if (entry.isFile() && entry.name.endsWith('.spw')) out.push(entryPath)
  }
  return out
}

function symbol(verdict: AuthorityFinding['verdict']): string {
  if (verdict === 'leak') return '!'
  if (verdict === 'stale') return '~'
  return '='
}

export async function runSpwAuthorityCli(argv: string[] = process.argv): Promise<void> {
  let cli: CliArgs
  try {
    cli = parseArgs(argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
    return
  }

  if (cli.help) {
    printSpwAuthorityHelp()
    return
  }

  const repoRoot = process.cwd()
  const fileSet = new Set<string>()
  for (const target of cli.targets) {
    for (const file of await collectSpwFiles(target)) fileSet.add(file)
  }

  const reports: SubjectReport[] = []
  let leaks = 0
  let stale = 0

  for (const file of Array.from(fileSet).sort()) {
    const source = await fs.readFile(file, 'utf8')
    for (const declaration of readAuthorityDeclarations(source)) {
      const rel = path.relative(repoRoot, file) || file

      if (!declaration.self) {
        reports.push({
          file: rel,
          self: '—',
          resolved: '—',
          findings: [],
          error: 'authority declared without @self — nothing to compare against',
        })
        continue
      }

      const resolved = path.resolve(path.dirname(file), declaration.self)
      if (!SUBJECT_EXTENSIONS.includes(path.extname(resolved))) {
        reports.push({
          file: rel,
          self: declaration.self,
          resolved: path.relative(repoRoot, resolved),
          findings: [],
          error: `subject is not JavaScript or TypeScript (${path.extname(resolved) || 'no extension'})`,
        })
        continue
      }

      let subject: string
      try {
        subject = await fs.readFile(resolved, 'utf8')
      } catch {
        reports.push({
          file: rel,
          self: declaration.self,
          resolved: path.relative(repoRoot, resolved),
          findings: [],
          error: 'subject not found',
        })
        continue
      }

      const observed = extractAuthority(subject, path.relative(repoRoot, resolved))
      const findings = reconcileAuthority(declaration.claims, observed)
      leaks += findings.filter(f => f.verdict === 'leak').length
      stale += findings.filter(f => f.verdict === 'stale').length

      reports.push({
        file: rel,
        self: declaration.self,
        resolved: path.relative(repoRoot, resolved),
        findings,
      })
    }
  }

  if (cli.json) {
    console.log(JSON.stringify({ version: 'spw.authority/1', reports, leaks, stale }, null, 2))
  } else if (reports.length === 0) {
    console.log('spw authority: no surfaces declare !writes, &joins, or !reads.')
  } else {
    for (const report of reports) {
      if (report.error) {
        console.log(`! ${report.file} — ${report.error}`)
        continue
      }
      const shown = cli.all
        ? report.findings
        : report.findings.filter(f => f.verdict === 'leak')
      if (shown.length === 0) continue

      console.log(`# ${report.file}  @self ${report.self}`)
      for (const finding of shown) {
        const where = finding.sites?.length ? `  ${finding.sites.slice(0, 3).join(' ')}` : ''
        console.log(
          `  ${symbol(finding.verdict)} ${finding.kind.padEnd(7)} ${finding.name.padEnd(24)} ${finding.verdict}${where}`,
        )
      }
    }
  }

  console.log(
    `spw authority: ${reports.length} subject(s), ${leaks} leak(s), ${stale} stale claim(s).`,
  )
  if (leaks > 0) process.exitCode = 1
}
