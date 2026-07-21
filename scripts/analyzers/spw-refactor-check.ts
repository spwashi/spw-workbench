#!/usr/bin/env tsx
/**
 * Compare two Spw sources under an explicit structural projection.
 *
 * This is a guard for layout-only proposals, not proof of behavioral or
 * runtime equivalence. Both inputs must parse completely. Source spans are
 * excluded; all other enumerable AST fields remain in the projection.
 *
 * Usage:
 *   node --import tsx scripts/analyzers/spw-refactor-check.ts before.spw after.spw
 *   node --import tsx scripts/analyzers/spw-refactor-check.ts --json before.spw after.spw
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parse, type ASTNode } from '@spwashi/spw-seed'

export interface StructuralProjectionResult {
  equivalent: boolean
  diffs: string[]
  nodesA: number
  nodesB: number
  parseA: { success: boolean; structured: boolean; errorCount: number }
  parseB: { success: boolean; structured: boolean; errorCount: number }
  projection: 'ast-without-source-spans@1'
}

interface ProjectionResult {
  value: unknown
  nodeCount: number
}

function projectValue(value: unknown): ProjectionResult {
  let nodeCount = 0

  function visit(current: unknown): unknown {
    if (Array.isArray(current)) return current.map(visit)
    if (!current || typeof current !== 'object') return current

    const record = current as Record<string, unknown>
    if (typeof record.type === 'string' && 'span' in record) nodeCount += 1

    const projected: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
      if (key === 'span') continue
      const item = record[key]
      if (item !== undefined) projected[key] = visit(item)
    }
    return projected
  }

  return { value: visit(value), nodeCount }
}

function firstDifference(left: unknown, right: unknown, at = 'root'): string | undefined {
  if (Object.is(left, right)) return undefined

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return `shape mismatch at ${at}`
    }
    if (left.length !== right.length) {
      return `array length mismatch at ${at}: ${left.length} vs ${right.length}`
    }
    for (let index = 0; index < left.length; index += 1) {
      const difference = firstDifference(left[index], right[index], `${at}[${index}]`)
      if (difference) return difference
    }
    return undefined
  }

  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const leftKeys = Object.keys(leftRecord)
    const rightKeys = Object.keys(rightRecord)
    if (leftKeys.join('\u0000') !== rightKeys.join('\u0000')) {
      return `field mismatch at ${at}: [${leftKeys.join(', ')}] vs [${rightKeys.join(', ')}]`
    }
    for (const key of leftKeys) {
      const difference = firstDifference(leftRecord[key], rightRecord[key], `${at}.${key}`)
      if (difference) return difference
    }
    return undefined
  }

  return `value mismatch at ${at}: ${JSON.stringify(left)} vs ${JSON.stringify(right)}`
}

export function compareASTEquivalence(
  astA: ASTNode | undefined,
  astB: ASTNode | undefined,
): Omit<StructuralProjectionResult, 'parseA' | 'parseB' | 'projection'> {
  const projectedA = projectValue(astA)
  const projectedB = projectValue(astB)
  const difference = firstDifference(projectedA.value, projectedB.value)

  return {
    equivalent: difference === undefined,
    diffs: difference ? [difference] : [],
    nodesA: projectedA.nodeCount,
    nodesB: projectedB.nodeCount,
  }
}

export function compareSourceProjections(
  sourceA: string,
  sourceB: string,
): StructuralProjectionResult {
  const parsedA = parse(sourceA)
  const parsedB = parse(sourceB)
  const parseA = {
    success: parsedA.success,
    structured: parsedA.ast?.expression.type !== 'Prose',
    errorCount: parsedA.errors.length,
  }
  const parseB = {
    success: parsedB.success,
    structured: parsedB.ast?.expression.type !== 'Prose',
    errorCount: parsedB.errors.length,
  }
  const comparison = compareASTEquivalence(parsedA.ast, parsedB.ast)
  const parseDiffs: string[] = []

  if (!parseA.success || !parseA.structured || parseA.errorCount > 0) {
    parseDiffs.push(`source A is not a complete structured parse (${parseA.errorCount} errors)`)
  }
  if (!parseB.success || !parseB.structured || parseB.errorCount > 0) {
    parseDiffs.push(`source B is not a complete structured parse (${parseB.errorCount} errors)`)
  }

  return {
    ...comparison,
    equivalent: parseDiffs.length === 0 && comparison.equivalent,
    diffs: [...parseDiffs, ...comparison.diffs],
    parseA,
    parseB,
    projection: 'ast-without-source-spans@1',
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: node --import tsx scripts/analyzers/spw-refactor-check.ts [--json] before.spw after.spw')
    process.exit(0)
  }

  const json = args.includes('--json')
  const files = args.filter(arg => !arg.startsWith('-'))
  if (files.length !== 2) {
    console.error('Error: provide exactly two .spw files (before and after).')
    process.exit(2)
  }

  const [fileA, fileB] = files
  const [sourceA, sourceB] = await Promise.all([
    fs.readFile(path.resolve(fileA), 'utf8'),
    fs.readFile(path.resolve(fileB), 'utf8'),
  ])
  const result = compareSourceProjections(sourceA, sourceB)

  if (json) {
    console.log(JSON.stringify({ fileA, fileB, ...result }, null, 2))
  } else if (result.equivalent) {
    console.log(`✓ Structural projection preserved: ${fileA} <==> ${fileB}`)
    console.log(`  projection=${result.projection} nodes=${result.nodesA}`)
  } else {
    console.error(`✗ Structural projection differs: ${fileA} <==> ${fileB}`)
    for (const difference of result.diffs) console.error(`  - ${difference}`)
  }

  process.exit(result.equivalent ? 0 : 1)
}

if (
  import.meta.url.startsWith('file:') &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
