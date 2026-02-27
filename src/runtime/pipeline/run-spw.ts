import { parse } from '../../seed/parser'
import { parseDesugared } from '../../seed/normalize'
import { interpretSeed } from '../interpreter/interpreter'
import { RegisterBank } from '../state/register-bank'
import type { RuntimeIssue, RunSpwOptions, RunSpwResult } from './types'

function parseIssueMessage(event: { data?: unknown }): string {
  const data = event.data as { message?: string } | undefined
  return data?.message ?? 'Parse error'
}

export function runSpw(source: string, options: RunSpwOptions = {}): RunSpwResult {
  const desugar = options.desugar ?? true
  const parsed = desugar
    ? parseDesugared(source)
    : { source, ast: parse(source) }

  const parseOutput = parsed.ast
  const hasParseErrors = parseOutput.errors.length > 0
  if (!parseOutput.success || !parseOutput.ast || hasParseErrors) {
    const issues: RuntimeIssue[] = parseOutput.errors.map(error => ({
      stage: 'parse',
      message: parseIssueMessage(error),
    }))
    if (issues.length === 0) {
      issues.push({
        stage: 'parse',
        message: 'Parse did not produce executable AST',
      })
    }

    return {
      success: false,
      source: parsed.source,
      parse: parseOutput,
      issues,
    }
  }

  const registers = options.registers ?? new RegisterBank()
  const runtime = interpretSeed(
    parseOutput.ast,
    { captureTrace: options.captureTrace ?? true },
    registers
  )

  return {
    success: true,
    source: parsed.source,
    parse: parseOutput,
    runtime,
  }
}
