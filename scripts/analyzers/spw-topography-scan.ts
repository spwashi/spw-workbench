#!/usr/bin/env tsx
/**
 * Spw Topography & Depth Analyzer
 *
 * Scans .spw files and measures operational topography metrics:
 * - maxAstDepth: Maximum ancestor depth in AST
 * - maxPairedContainerDepth: Maximum nested container boundary depth
 * - recognizedPairedContainers: Parsed container kinds (scope, frame, body, capsule, stream, nrange)
 * - explicitCoupleOperations: Parsed uses of the distinct <> operator
 * - parseHealth: Epistemic status (complete_structured, recovered, invalid)
 *
 * Usage:
 *   node --import tsx scripts/analyzers/spw-topography-scan.ts [options] [targets...]
 *
 * Options:
 *   --json             Emit structured JSON summary
 *   -v, --verbose      Show per-file breakdown
 *   -e, --exclude <p>  Exclude paths matching pattern
 *   -h, --help         Show help
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  snapshotTopography,
  type PairedContainerCounts,
  type ParseHealth,
} from '@spwashi/spw-seed'

interface ParseEvidence {
  parserSuccess: boolean
  proseFallback: boolean
  lexemesClosed: boolean
  topographyAuthority: 'seed_snapshot_topography'
  reasons: string[]
}

export interface TopographyFileResult {
  file: string
  rel: string
  parseHealth: ParseHealth
  parseEvidence: ParseEvidence
  tokenCount: number | null
  significantTokens: number | null
  maxAstDepth: number | null
  maxPairedContainerDepth: number | null
  recognizedPairedContainers: PairedContainerCounts | null
  explicitCoupleOperations: number | null
}

export interface TopographySummary {
  totalFiles: number
  completeStructured: number
  recovered: number
  invalid: number
  filesWithPartialMetrics: number
  totalTokens: number
  maxObservedAstDepth: number | null
  maxObservedPairedContainerDepth: number | null
  totalRecognizedPairedContainers: PairedContainerCounts
  totalExplicitCoupleOperations: number
  files: TopographyFileResult[]
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`Usage: node --import tsx scripts/analyzers/spw-topography-scan.ts [options] [targets...]`)
    console.log(`Options:\n  --json\tEmit JSON report\n  -v, --verbose\tVerbose breakdown\n  -e, --exclude <p>\tExclude path pattern`)
    process.exit(0)
  }

  const json = args.includes('--json')
  const verbose = args.includes('-v') || args.includes('--verbose')
  const excludePatterns = getOptionValues(args, '-e', '--exclude')
  const targets: string[] = []

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-e' || arg === '--exclude') {
      i += 1
    } else if (!arg.startsWith('-')) {
      targets.push(arg)
    }
  }

  const scanRoots = targets.length > 0 ? targets : ['.spw', 'docs', 'lib', 'packages']
  const filePaths: string[] = []

  for (const root of scanRoots) {
    await collectSpwFiles(path.resolve(root), filePaths, excludePatterns)
  }

  const fileResults: TopographyFileResult[] = []
  for (const file of [...new Set(filePaths)].sort()) {
    const rel = path.relative(process.cwd(), file)
    let content: string
    try {
      content = await fs.readFile(file, 'utf8')
    } catch (err: any) {
      if (verbose) console.error(`Error reading ${rel}:`, err?.stack ?? err)
      fileResults.push({
        file: rel,
        rel,
        parseHealth: 'invalid',
        parseEvidence: {
          parserSuccess: false,
          proseFallback: false,
          lexemesClosed: false,
          topographyAuthority: 'seed_snapshot_topography',
          reasons: ['read_failure'],
        },
        tokenCount: null,
        significantTokens: null,
        maxAstDepth: null,
        maxPairedContainerDepth: null,
        recognizedPairedContainers: null,
        explicitCoupleOperations: null,
      })
      continue
    }
    fileResults.push(analyzeTopography(file, rel, content))
  }

  const summary: TopographySummary = computeSummary(fileResults)

  if (json) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  console.log(`# Spw Operational Topography Report`)
  console.log(`Files scanned: ${summary.totalFiles}`)
  console.log(`Parse health: ${summary.completeStructured} complete_structured, ${summary.recovered} recovered, ${summary.invalid} invalid`)
  console.log(`Partial metric files: ${summary.filesWithPartialMetrics}`)
  console.log(`Max AST depth: ${summary.maxObservedAstDepth ?? 'n/a'}`)
  console.log(`Max paired-container depth: ${summary.maxObservedPairedContainerDepth ?? 'n/a'}`)
  console.log(`Total tokens: ${summary.totalTokens}`)
  console.log(`Recognized paired containers: () scope=${summary.totalRecognizedPairedContainers.scope}, [] frame=${summary.totalRecognizedPairedContainers.frame}, {} body=${summary.totalRecognizedPairedContainers.body}, <...> capsule=${summary.totalRecognizedPairedContainers.capsule}, <<...>> stream=${summary.totalRecognizedPairedContainers.stream}, ((...)) nrange=${summary.totalRecognizedPairedContainers.nrange}`)
  console.log(`Explicit <> operations: ${summary.totalExplicitCoupleOperations}`)

  if (verbose) {
    console.log(`\n## File Breakdown`)
    for (const f of fileResults) {
      console.log(`- ${f.rel} [health=${f.parseHealth}, astDepth=${f.maxAstDepth ?? 'n/a'}, pairedContainerDepth=${f.maxPairedContainerDepth ?? 'n/a'}, explicitCouple=${f.explicitCoupleOperations ?? 'n/a'}, reasons=${f.parseEvidence.reasons.join('|') || 'none'}]`)
    }
  }
}

export function analyzeTopography(_file: string, rel: string, source: string): TopographyFileResult {
  const topography = snapshotTopography(source)

  return {
    file: rel,
    rel,
    parseHealth: topography.parseHealth,
    parseEvidence: {
      parserSuccess: topography.parserSuccess,
      proseFallback: topography.proseFallback,
      lexemesClosed: topography.lexemesClosed,
      topographyAuthority: 'seed_snapshot_topography',
      reasons: [...topography.reasons],
    },
    tokenCount: topography.tokenCount,
    significantTokens: topography.significantTokens,
    maxAstDepth: topography.maxAstDepth,
    maxPairedContainerDepth: topography.maxPairedContainerDepth,
    recognizedPairedContainers: topography.recognizedPairedContainers
      ? { ...topography.recognizedPairedContainers }
      : null,
    explicitCoupleOperations: topography.explicitCoupleOperations,
  }
}

function emptyPairedContainerCounts(): PairedContainerCounts {
  return { scope: 0, frame: 0, body: 0, capsule: 0, stream: 0, nrange: 0 }
}

function computeSummary(results: TopographyFileResult[]): TopographySummary {
  const summary: TopographySummary = {
    totalFiles: results.length,
    completeStructured: 0,
    recovered: 0,
    invalid: 0,
    filesWithPartialMetrics: 0,
    totalTokens: 0,
    maxObservedAstDepth: null,
    maxObservedPairedContainerDepth: null,
    totalRecognizedPairedContainers: emptyPairedContainerCounts(),
    totalExplicitCoupleOperations: 0,
    files: results,
  }

  for (const r of results) {
    if (r.parseHealth === 'complete_structured') summary.completeStructured += 1
    else if (r.parseHealth === 'recovered') summary.recovered += 1
    else summary.invalid += 1

    if (r.parseHealth !== 'complete_structured' && r.recognizedPairedContainers) {
      summary.filesWithPartialMetrics += 1
    }
    if (r.tokenCount !== null) summary.totalTokens += r.tokenCount
    if (r.maxAstDepth !== null && (summary.maxObservedAstDepth === null || r.maxAstDepth > summary.maxObservedAstDepth)) {
      summary.maxObservedAstDepth = r.maxAstDepth
    }
    if (r.maxPairedContainerDepth !== null && (summary.maxObservedPairedContainerDepth === null || r.maxPairedContainerDepth > summary.maxObservedPairedContainerDepth)) {
      summary.maxObservedPairedContainerDepth = r.maxPairedContainerDepth
    }

    if (r.recognizedPairedContainers) {
      summary.totalRecognizedPairedContainers.scope += r.recognizedPairedContainers.scope
      summary.totalRecognizedPairedContainers.frame += r.recognizedPairedContainers.frame
      summary.totalRecognizedPairedContainers.body += r.recognizedPairedContainers.body
      summary.totalRecognizedPairedContainers.capsule += r.recognizedPairedContainers.capsule
      summary.totalRecognizedPairedContainers.stream += r.recognizedPairedContainers.stream
      summary.totalRecognizedPairedContainers.nrange += r.recognizedPairedContainers.nrange
    }
    if (r.explicitCoupleOperations !== null) {
      summary.totalExplicitCoupleOperations += r.explicitCoupleOperations
    }
  }

  return summary
}

async function collectSpwFiles(dir: string, files: string[], excludePatterns: string[]): Promise<void> {
  const stat = await fs.stat(dir).catch(() => null)
  if (!stat) return
  if (stat.isFile()) {
    if (dir.endsWith('.spw') && !excludePatterns.some((p) => dir.includes(p))) {
      files.push(dir)
    }
    return
  }
  if (!stat.isDirectory()) return

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (excludePatterns.some((p) => fullPath.includes(p))) continue
    if (entry.isDirectory()) {
      await collectSpwFiles(fullPath, files, excludePatterns)
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(fullPath)
    }
  }
}

function getOptionValues(args: string[], flag: string, longFlag: string): string[] {
  const values: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag || args[i] === longFlag) {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        values.push(args[i + 1])
        i += 1
      }
    }
  }
  return values
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
