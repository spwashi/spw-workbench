import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { facet, formatSpwCard, type SpwCardPart } from '@spwashi/spw-seed'
import { loadSpwMountResolution } from '@spwashi/spw-runtime'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

type CheckStatus = 'ok' | 'warn' | 'fail'
export type DoctorPathMode = 'relative' | 'absolute'
export type DoctorCheckoutState = 'clean' | 'dirty' | 'unavailable'
export type DoctorPinStatus = 'match' | 'drift' | 'not-declared' | 'unavailable'

export interface DoctorCheck {
  id: string
  status: CheckStatus
  summary: string
  fix?: string
}

export interface DoctorReport {
  surface: 'spw.doctor/1'
  root: string
  paths: {
    mode: DoctorPathMode
    consumerRoot: string
    spwRoot: string
    workbenchRoot: string
  }
  workbench: {
    head: string | null
    checkout: DoctorCheckoutState
    declaredPin: string | null
    pin: DoctorPinStatus
  }
  scan: {
    defaultExclusions: string[]
  }
  status: CheckStatus
  checks: DoctorCheck[]
  next: string[]
}

interface DoctorArgs {
  targetDir: string
  format: 'human' | 'json' | 'spw'
  paths: DoctorPathMode
  fix: boolean
  help: boolean
}

export interface InspectDoctorOptions {
  paths?: DoctorPathMode
}

const WORKBENCH_ADD_COMMAND = 'git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench'
const WORKBENCH_INSTALL_COMMAND = 'cd .spw/_workbench && npm install'
const SCAFFOLD_COMMAND = 'cd .spw/_workbench && npm run spw:init -- ../..'
const execFileAsync = promisify(execFile)

export const DEFAULT_DOCTOR_SCAN_EXCLUSIONS = [
  '.git',
  'node_modules',
  'dist',
  'release',
  '_workbench',
  '.agents',
  '.spw/gen',
] as const

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function normalizeDoctorArgs(argv: string[]): string[] {
  const args = argv.slice(2)
  const [head, ...rest] = args
  if (head === 'doctor') return rest
  return args
}

function parseDoctorArgs(argv: string[]): DoctorArgs {
  const common = parseCommonFlags(normalizeDoctorArgs(argv))
  const args = common.args
  let targetDir = '.'
  let hasTarget = false
  let format: DoctorArgs['format'] = 'human'
  let paths: DoctorPathMode = 'relative'
  let fix = false

  const selectFormat = (next: DoctorArgs['format'], flag: string): void => {
    if (format !== 'human' && format !== next) {
      throw new Error(`spw doctor: ${flag} cannot be combined with --${format}`)
    }
    format = next
  }

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === '--json') {
      selectFormat('json', '--json')
      continue
    }
    if (argument === '--spw') {
      selectFormat('spw', '--spw')
      continue
    }
    if (argument === '--fix') {
      fix = true
      continue
    }
    if (argument === '--paths') {
      const value = args[index + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('spw doctor: --paths requires relative or absolute')
      }
      paths = parseDoctorPathMode(value)
      index++
      continue
    }
    if (argument.startsWith('--paths=')) {
      paths = parseDoctorPathMode(argument.slice('--paths='.length))
      continue
    }
    if (argument.startsWith('-')) {
      throw new Error(`spw doctor: unknown option ${argument}`)
    }
    if (hasTarget) {
      throw new Error(`spw doctor: unexpected argument ${argument}`)
    }
    targetDir = argument
    hasTarget = true
  }

  return {
    targetDir,
    format,
    paths,
    fix,
    help: common.flags.help,
  }
}

function parseDoctorPathMode(value: string): DoctorPathMode {
  if (value === 'relative' || value === 'absolute') return value
  throw new Error(`spw doctor: --paths must be relative or absolute (got ${value})`)
}

function summarizeStatus(checks: DoctorCheck[]): CheckStatus {
  if (checks.some((check) => check.status === 'fail')) return 'fail'
  if (checks.some((check) => check.status === 'warn')) return 'warn'
  return 'ok'
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

function portablePath(value: string): string {
  return value.split(path.sep).join('/')
}

function displayPath(root: string, target: string, mode: DoctorPathMode): string {
  if (mode === 'absolute') return portablePath(path.resolve(target))
  return portablePath(path.relative(root, target) || '.')
}

async function gitOutput(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8' })
    return stdout.trim()
  } catch {
    return null
  }
}

async function inspectCheckout(root: string): Promise<{
  head: string | null
  checkout: DoctorCheckoutState
}> {
  const [head, porcelain] = await Promise.all([
    gitOutput(root, ['rev-parse', '--short=12', 'HEAD']),
    gitOutput(root, ['status', '--porcelain', '--untracked-files=normal']),
  ])
  return {
    head: head || null,
    checkout: porcelain === null ? 'unavailable' : porcelain.length > 0 ? 'dirty' : 'clean',
  }
}

/** Read an optional hexadecimal workbench pin without interpreting unrelated version fields. */
export function readDoctorWorkbenchPin(source: string): string | null {
  const direct = source.match(
    /(?:~#)?workbench[_-](?:revision|commit|pin)\s*[:=]\s*["'`]?([0-9a-f]{7,40})/i,
  )
  if (direct?.[1]) return direct[1].toLowerCase()

  const note = source.match(
    /workbench(?:\s+|[_-])(?:revision|commit|pin)\s*[:=]\s*["'`]?([0-9a-f]{7,40})/i,
  )
  if (note?.[1]) return note[1].toLowerCase()

  const workbenchFrame = source.match(
    /\^\s*(?:\[\s*)?["']?workbench["']?(?:\s*\])?\s*\{([\s\S]*?)^\s*\}/im,
  )
  const framed = workbenchFrame?.[1]?.match(
    /(?:~#)?(?:revision|commit|pin)\s*[:=]\s*["'`]?([0-9a-f]{7,40})/i,
  )
  return framed?.[1]?.toLowerCase() ?? null
}

function comparePin(declaredPin: string | null, head: string | null): DoctorPinStatus {
  if (!declaredPin) return 'not-declared'
  if (!head) return 'unavailable'
  return declaredPin.startsWith(head) || head.startsWith(declaredPin) ? 'match' : 'drift'
}

export async function inspectDoctorTarget(
  targetDir: string,
  options: InspectDoctorOptions = {},
): Promise<DoctorReport> {
  const root = path.resolve(process.cwd(), targetDir)
  const pathMode = options.paths ?? 'relative'
  const spwRoot = path.join(root, '.spw')
  const checks: DoctorCheck[] = []

  const hasGit = await exists(path.join(root, '.git'))
  checks.push({
    id: 'git-root',
    status: hasGit ? 'ok' : 'warn',
    summary: hasGit ? 'git repository detected' : 'target is not a git repository yet',
    fix: hasGit ? undefined : 'git init',
  })

  const hasSpwRoot = await exists(spwRoot)
  checks.push({
    id: 'spw-root',
    status: hasSpwRoot ? 'ok' : 'fail',
    summary: hasSpwRoot ? '.spw directory present' : 'missing .spw directory',
  })

  const mountResolution = hasSpwRoot ? await loadSpwMountResolution(root) : null
  const workbenchRoot = mountResolution?.workbenchRoot ?? path.join(spwRoot, '_workbench')
  const displayedWorkbenchRoot = displayPath(root, workbenchRoot, pathMode)

  const hasWorkbench = await exists(workbenchRoot)
  checks.push({
    id: 'workbench-root',
    status: hasWorkbench ? 'ok' : 'fail',
    summary: hasWorkbench
      ? `${displayedWorkbenchRoot} present`
      : `missing ${displayedWorkbenchRoot} workbench checkout`,
    fix: hasWorkbench ? undefined : WORKBENCH_ADD_COMMAND,
  })

  const hasWorkbenchPackage = hasWorkbench && await exists(path.join(workbenchRoot, 'package.json'))
  checks.push({
    id: 'workbench-package',
    status: hasWorkbenchPackage ? 'ok' : hasWorkbench ? 'fail' : 'warn',
    summary: hasWorkbenchPackage
      ? 'workbench package metadata found'
      : hasWorkbench
        ? 'workbench checkout is missing package.json'
        : 'workbench package metadata cannot be checked until .spw/_workbench exists',
    fix: hasWorkbench && !hasWorkbenchPackage ? 'git submodule update --init --recursive .spw/_workbench' : undefined,
  })

  const checkout = hasWorkbench
    ? await inspectCheckout(workbenchRoot)
    : { head: null, checkout: 'unavailable' as const }
  const mountSource = hasSpwRoot
    ? await fs.readFile(path.join(spwRoot, 'mount.spw'), 'utf8').catch(() => '')
    : ''
  const declaredPin = readDoctorWorkbenchPin(mountSource)
  const pin = comparePin(declaredPin, checkout.head)

  checks.push({
    id: 'workbench-revision',
    status: checkout.head ? 'ok' : 'warn',
    summary: checkout.head
      ? `workbench HEAD ${checkout.head}`
      : 'workbench HEAD unavailable',
  })
  checks.push({
    id: 'workbench-checkout',
    status: checkout.checkout === 'clean' ? 'ok' : 'warn',
    summary: checkout.checkout === 'unavailable'
      ? 'workbench checkout state unavailable'
      : `workbench checkout ${checkout.checkout}`,
  })
  checks.push({
    id: 'workbench-pin',
    status: pin === 'drift' || pin === 'unavailable' ? 'warn' : 'ok',
    summary: pin === 'match'
      ? `declared workbench pin ${declaredPin} matches HEAD`
      : pin === 'drift'
        ? `declared workbench pin ${declaredPin} differs from HEAD ${checkout.head}`
        : pin === 'unavailable'
          ? `declared workbench pin ${declaredPin} cannot be compared without HEAD`
          : 'no optional workbench revision pin declared',
  })

  const hasWorkbenchRuntime = hasWorkbench && await exists(path.join(workbenchRoot, 'node_modules'))
  checks.push({
    id: 'workbench-runtime',
    status: hasWorkbenchRuntime ? 'ok' : hasWorkbench ? 'warn' : 'warn',
    summary: hasWorkbenchRuntime
      ? 'workbench dependencies installed'
      : hasWorkbench
        ? 'workbench dependencies are not installed yet'
        : 'workbench runtime cannot be checked until .spw/_workbench exists',
    fix: hasWorkbenchRuntime || !hasWorkbench ? undefined : WORKBENCH_INSTALL_COMMAND,
  })

  const scaffoldChecks: Array<[string, string]> = [
    ['consumer-index', path.join(spwRoot, 'index.spw')],
    ['consumer-workspace', path.join(spwRoot, 'workspace.spw')],
    ['consumer-mount', path.join(spwRoot, 'mount.spw')],
  ]

  for (const [id, target] of scaffoldChecks) {
    const rel = portablePath(path.relative(root, target) || path.basename(target))
    const present = await exists(target)
    checks.push({
      id,
      status: present ? 'ok' : 'fail',
      summary: present ? `${rel} present` : `missing ${rel}`,
      fix: present || !hasWorkbench ? undefined : SCAFFOLD_COMMAND,
    })
  }

  const orientationReadme = path.join(spwRoot, 'README.md')
  const hasOrientationReadme = await exists(orientationReadme)
  checks.push({
    id: 'consumer-orientation',
    status: hasOrientationReadme ? 'ok' : 'warn',
    summary: hasOrientationReadme ? '.spw/README.md present' : 'missing optional .spw/README.md prompt entrypoint',
    fix: hasOrientationReadme || !hasWorkbench ? undefined : SCAFFOLD_COMMAND,
  })

  const next = unique(checks.flatMap((check) => (check.fix ? [check.fix] : [])))
  const consumerRoot = pathMode === 'absolute' ? portablePath(root) : '.'
  return {
    surface: 'spw.doctor/1',
    root: consumerRoot,
    paths: {
      mode: pathMode,
      consumerRoot,
      spwRoot: displayPath(root, spwRoot, pathMode),
      workbenchRoot: displayedWorkbenchRoot,
    },
    workbench: {
      head: checkout.head,
      checkout: checkout.checkout,
      declaredPin,
      pin,
    },
    scan: {
      defaultExclusions: [...DEFAULT_DOCTOR_SCAN_EXCLUSIONS],
    },
    status: summarizeStatus(checks),
    checks,
    next,
  }
}

export function printDoctorHelp(): void {
  printHelpPage({
    title: 'Spw Doctor',
    usage: [
      'spw doctor [target-directory] [--spw|--json] [--paths relative|absolute]',
      'npm run spw -- doctor [target-directory] [--json]',
      'npm run spw:doctor -- [target-directory] [--paths absolute]',
    ],
    sections: [
      {
        title: 'Checks',
        lines: [
          'git repository presence',
          '.spw scaffold presence (README, index, workspace, mount)',
          '.spw/_workbench checkout and package metadata',
          'workbench dependency install state',
          'workbench HEAD, dirty/clean state, and optional mount pin drift',
          'default corpus scan exclusions',
        ],
      },
      {
        title: 'Typical flow',
        lines: [
          'git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench',
          'cd .spw/_workbench && npm install',
          'cd .spw/_workbench && npm run spw:init -- ../..',
        ],
      },
      {
        title: 'Options',
        lines: [
          '--paths relative|absolute   relative is the portable default; absolute is explicit disclosure',
          '--spw                       source-shaped Spw card',
          '--json                      complete structured report',
          '--fix                       seed missing scaffold files and refresh the local commit gate',
        ],
      },
    ],
  })
}

export function printDoctorReport(report: DoctorReport): void {
  console.log(`spw-doctor: status=${report.status} root=${report.root}`)
  console.log(
    `workbench: path=${report.paths.workbenchRoot} head=${report.workbench.head ?? 'unavailable'} checkout=${report.workbench.checkout} pin=${report.workbench.pin}`,
  )
  console.log(`scan-exclusions: ${report.scan.defaultExclusions.join(', ')}`)
  for (const check of report.checks) {
    console.log(`${check.status}: ${check.id} ${check.summary}`)
    if (check.fix) {
      console.log(`fix: ${check.fix}`)
    }
  }
  if (report.next.length > 0) {
    console.log('next:')
    for (const step of report.next) {
      console.log(`- ${step}`)
    }
  }
}

export function formatDoctorSpw(report: DoctorReport): string {
  const parts: SpwCardPart[] = [
    facet.atom('surface', report.surface),
    facet.atom('status', report.status),
    facet.group('paths', [
      facet.atom('mode', report.paths.mode),
      facet.path('consumer', report.paths.consumerRoot),
      facet.path('spw', report.paths.spwRoot),
      facet.path('workbench', report.paths.workbenchRoot),
    ]),
    facet.group('workbench', [
      facet.atom('head', report.workbench.head),
      facet.atom('checkout', report.workbench.checkout),
      facet.atom('pin_status', report.workbench.pin),
      facet.atom('declared_pin', report.workbench.declaredPin),
    ]),
    facet.list('default_scan_exclusions', report.scan.defaultExclusions),
  ]

  for (const check of report.checks) {
    parts.push(facet.group(`check-${check.id}`, [
      facet.atom('status', check.status),
      facet.str('summary', check.summary),
      ...(check.fix ? [facet.str('fix', check.fix)] : []),
    ]))
  }
  if (report.next.length > 0) parts.push(facet.list('next', report.next))
  return formatSpwCard('doctor', parts)
}

export async function runSpwDoctorCli(argv: string[] = process.argv): Promise<void> {
  const args = parseDoctorArgs(argv)
  if (args.help) {
    printDoctorHelp()
    return
  }

  if (args.fix) {
    const { applyDoctorFixes } = await import('./init')
    await applyDoctorFixes(args.targetDir)
  }

  const report = await inspectDoctorTarget(args.targetDir, { paths: args.paths })
  if (args.format === 'json') {
    console.log(JSON.stringify(report, null, 2))
  } else if (args.format === 'spw') {
    console.log(formatDoctorSpw(report))
  } else {
    printDoctorReport(report)
  }

  if (report.status === 'fail') {
    process.exitCode = 1
  }
}
