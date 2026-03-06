#!/usr/bin/env tsx

import { execFile } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

type Format = 'plain' | 'json'
type AuditStatus = 'ok' | 'warn' | 'fail'
type AuditSeverity = 'info' | 'warning' | 'error'

interface CLI {
  format: Format
}

interface AuditCheckResult {
  id: 'markers' | 'ui-selectors' | 'ui-context-panel' | 'spw-syntax'
  label: string
  status: AuditStatus
  severity: AuditSeverity
  summary: string
  durationMs: number
  counts: Record<string, number>
  details: unknown
}

interface AuditReport {
  generatedAt: string
  status: AuditStatus
  totals: {
    checks: number
    ok: number
    warn: number
    fail: number
  }
  checks: AuditCheckResult[]
}

interface ScriptRun<T> {
  exitCode: number
  durationMs: number
  payload: T
}

interface MarkerAuditPayload {
  total: number
  contractHits: number
  contractMarkers: number
  files: Array<{ file: string; count: number }>
}

interface UiSelectorsPayload {
  mode: 'ui-selectors'
  filesScanned: number
  selectorHits: number
  componentDataHits: number
}

interface UiContextPanelPayload {
  mode: 'context-panel'
  filesScanned: number
  panelMentions: number
}

interface SpwSyntaxPayload {
  total: number
  passed: number
  failed: number
  warnings: number
  tokens: number
  duration: number
  failures: Array<{ file: string; errors: Array<{ line: number; column: number; message: string }> }>
  warningFiles: Array<{ file: string; warnings: Array<{ line: number; column: number; message: string }> }>
}

function parseArgs(argv: string[]): CLI {
  let format: Format = 'plain'

  for (const arg of argv.slice(2)) {
    if (arg === '--json' || arg === '--format=json') {
      format = 'json'
      continue
    }
    if (arg === '--format=plain') {
      format = 'plain'
    }
  }

  return { format }
}

async function runNodeScript<T>(scriptPath: string, args: string[]): Promise<ScriptRun<T>> {
  const startedAt = Date.now()

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...args],
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    return {
      exitCode: 0,
      durationMs: Date.now() - startedAt,
      payload: JSON.parse(stdout) as T,
    }
  } catch (error) {
    const execError = error as Error & {
      code?: number
      stdout?: string
      stderr?: string
    }

    const stdout = execError.stdout?.trim() ?? ''
    if (stdout === '') {
      throw new Error(execError.stderr?.trim() || execError.message)
    }

    return {
      exitCode: execError.code ?? 1,
      durationMs: Date.now() - startedAt,
      payload: JSON.parse(stdout) as T,
    }
  }
}

async function runMarkerAudit(): Promise<AuditCheckResult> {
  const scriptPath = path.resolve('scripts/analyzers/spw-marker-audit.ts')
  const run = await runNodeScript<MarkerAuditPayload>(scriptPath, ['--format=json'])

  return {
    id: 'markers',
    label: 'Markers',
    status: 'ok',
    severity: 'info',
    summary: `${run.payload.total} markers across ${run.payload.files.length} top files (${run.payload.contractMarkers} contract markers)`,
    durationMs: run.durationMs,
    counts: {
      markers: run.payload.total,
      contractHits: run.payload.contractHits,
      contractMarkers: run.payload.contractMarkers,
      files: run.payload.files.length,
    },
    details: run.payload,
  }
}

async function runUiSelectorsAudit(): Promise<AuditCheckResult> {
  const scriptPath = path.resolve('scripts/analyzers/ui-contract-audit.ts')
  const run = await runNodeScript<UiSelectorsPayload>(scriptPath, ['--mode=ui-selectors', '--format=json'])

  return {
    id: 'ui-selectors',
    label: 'UI Selectors',
    status: 'ok',
    severity: 'info',
    summary: `${run.payload.selectorHits} selectors and ${run.payload.componentDataHits} component refs across ${run.payload.filesScanned} files`,
    durationMs: run.durationMs,
    counts: {
      files: run.payload.filesScanned,
      selectors: run.payload.selectorHits,
      componentDataRefs: run.payload.componentDataHits,
    },
    details: run.payload,
  }
}

async function runUiContextPanelAudit(): Promise<AuditCheckResult> {
  const scriptPath = path.resolve('scripts/analyzers/ui-contract-audit.ts')
  const run = await runNodeScript<UiContextPanelPayload>(scriptPath, ['--mode=context-panel', '--format=json'])

  return {
    id: 'ui-context-panel',
    label: 'UI Context Panel',
    status: 'ok',
    severity: 'info',
    summary: `${run.payload.panelMentions} context panel mentions across ${run.payload.filesScanned} files`,
    durationMs: run.durationMs,
    counts: {
      files: run.payload.filesScanned,
      mentions: run.payload.panelMentions,
    },
    details: run.payload,
  }
}

async function runSpwSyntaxAudit(): Promise<AuditCheckResult> {
  const scriptPath = path.resolve('scripts/analyzers/spw-syntax-validate.ts')
  const run = await runNodeScript<SpwSyntaxPayload>(scriptPath, ['--json', '--exclude', '.agents'])

  const status: AuditStatus = run.payload.failed > 0
    ? 'fail'
    : run.payload.warnings > 0
      ? 'warn'
      : 'ok'

  const severity: AuditSeverity = run.payload.failed > 0
    ? 'error'
    : run.payload.warnings > 0
      ? 'warning'
      : 'info'

  const warningSuffix = run.payload.warnings > 0 ? `, ${run.payload.warnings} warnings` : ''
  const failureSuffix = run.payload.failed > 0 ? `, ${run.payload.failed} failed` : ''

  return {
    id: 'spw-syntax',
    label: 'Spw Syntax',
    status,
    severity,
    summary: `${run.payload.passed}/${run.payload.total} files passed${failureSuffix}${warningSuffix}`,
    durationMs: run.durationMs,
    counts: {
      files: run.payload.total,
      passed: run.payload.passed,
      failed: run.payload.failed,
      warnings: run.payload.warnings,
      tokens: run.payload.tokens,
    },
    details: run.payload,
  }
}

function summarizeReport(checks: AuditCheckResult[]): AuditReport {
  const totals = {
    checks: checks.length,
    ok: checks.filter(check => check.status === 'ok').length,
    warn: checks.filter(check => check.status === 'warn').length,
    fail: checks.filter(check => check.status === 'fail').length,
  }

  const status: AuditStatus = totals.fail > 0
    ? 'fail'
    : totals.warn > 0
      ? 'warn'
      : 'ok'

  return {
    generatedAt: new Date().toISOString(),
    status,
    totals,
    checks,
  }
}

function printPlain(report: AuditReport): void {
  console.log(`audit:full status=${report.status}`)
  for (const check of report.checks) {
    console.log(`- ${check.id} [${check.severity}] ${check.summary} (${check.durationMs}ms)`)
  }
  console.log(`totals: ${report.totals.checks} checks, ${report.totals.ok} ok, ${report.totals.warn} warn, ${report.totals.fail} fail`)
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv)
  const checks = await Promise.all([
    runMarkerAudit(),
    runUiSelectorsAudit(),
    runUiContextPanelAudit(),
    runSpwSyntaxAudit(),
  ])

  const report = summarizeReport(checks)

  if (cli.format === 'json') {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printPlain(report)
  }

  if (report.status === 'fail') {
    process.exit(1)
  }
}

main().catch(error => {
  console.error(`audit full failed: ${String(error)}`)
  process.exit(1)
})
