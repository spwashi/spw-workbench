import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { loadSpwMountResolution } from '@spwashi/spw-runtime'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

type CheckStatus = 'ok' | 'warn' | 'fail'

export interface DoctorCheck {
  id: string
  status: CheckStatus
  summary: string
  fix?: string
}

export interface DoctorReport {
  root: string
  status: CheckStatus
  checks: DoctorCheck[]
  next: string[]
}

interface DoctorArgs {
  targetDir: string
  json: boolean
  fix: boolean
  help: boolean
}

const WORKBENCH_ADD_COMMAND = 'git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench'
const WORKBENCH_INSTALL_COMMAND = 'cd .spw/_workbench && npm install'
const SCAFFOLD_COMMAND = 'cd .spw/_workbench && npm run spw:init -- ../..'

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

  return {
    targetDir: args.find((arg) => !arg.startsWith('--')) ?? '.',
    json: args.includes('--json'),
    fix: args.includes('--fix'),
    help: common.flags.help,
  }
}

function summarizeStatus(checks: DoctorCheck[]): CheckStatus {
  if (checks.some((check) => check.status === 'fail')) return 'fail'
  if (checks.some((check) => check.status === 'warn')) return 'warn'
  return 'ok'
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

export async function inspectDoctorTarget(targetDir: string): Promise<DoctorReport> {
  const root = path.resolve(process.cwd(), targetDir)
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

  const hasWorkbench = await exists(workbenchRoot)
  checks.push({
    id: 'workbench-root',
    status: hasWorkbench ? 'ok' : 'fail',
    summary: hasWorkbench
      ? `${path.relative(root, workbenchRoot) || '.spw/_workbench'} present`
      : `missing ${path.relative(root, workbenchRoot) || '.spw/_workbench'} workbench checkout`,
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
    ['site-index', path.join(spwRoot, 'index.spw')],
    ['site-workspace', path.join(spwRoot, 'workspace.spw')],
    ['site-mount', path.join(spwRoot, 'mount.spw')],
  ]

  for (const [id, target] of scaffoldChecks) {
    const rel = path.relative(root, target) || path.basename(target)
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
  return {
    root,
    status: summarizeStatus(checks),
    checks,
    next,
  }
}

export function printDoctorHelp(): void {
  printHelpPage({
    title: 'Spw Doctor',
    usage: [
      'spw doctor [target-directory] [--json]',
      'npm run spw -- doctor [target-directory] [--json]',
      'npm run spw:doctor -- [target-directory] [--json]',
    ],
    sections: [
      {
        title: 'Checks',
        lines: [
          'git repository presence',
          '.spw scaffold presence (README, index, workspace, mount)',
          '.spw/_workbench checkout and package metadata',
          'workbench dependency install state',
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
          '--fix   seed missing scaffold files and refresh the local commit gate',
        ],
      },
    ],
  })
}

export function printDoctorReport(report: DoctorReport): void {
  console.log(`spw-doctor: root=${report.root} status=${report.status}`)
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

  const report = await inspectDoctorTarget(args.targetDir)
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printDoctorReport(report)
  }

  if (report.status === 'fail') {
    process.exitCode = 1
  }
}
