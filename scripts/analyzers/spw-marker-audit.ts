#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { extractSpwMarkers, normalizeMarkerQuery, type ParsedSpwMarker } from './marker-schema'

type Format = 'plain' | 'md' | 'json'

interface CLI {
  format: Format
  family: string | null
  marker: string | null
}

interface MarkerHit extends ParsedSpwMarker {
  file: string
  line: number
}

interface SummaryBucket {
  name: string
  count: number
}

interface MarkerSummary {
  family: string
  marker: string
  qualifiers: string[]
  kind: ParsedSpwMarker['kind']
  count: number
}

const SCAN_ROOTS = ['src', 'docs', 'lib', 'scripts', 'extensions', '.agents/skills']
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.md', '.spw'])
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', 'build'])

function parseArgs(argv: string[]): CLI {
  let format: Format = 'plain'
  let family: string | null = null
  let marker: string | null = null

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length) as Format
      if (value === 'plain' || value === 'md' || value === 'json') {
        format = value
      }
      continue
    }

    if (arg.startsWith('--family=')) {
      family = normalizeMarkerQuery(arg.slice('--family='.length))
      continue
    }

    if (arg.startsWith('--marker=')) {
      marker = normalizeMarkerQuery(arg.slice('--marker='.length))
      continue
    }

    if (arg.startsWith('--tag=')) {
      const query = normalizeMarkerQuery(arg.slice('--tag='.length))
      if (query.includes(':')) {
        marker = query
      } else {
        family = query
      }
      continue
    }
  }

  return { format, family, marker }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walk(full))
      continue
    }

    if (!entry.isFile()) continue
    if (!ALLOWED_EXT.has(path.extname(entry.name))) continue
    files.push(full)
  }

  return files
}

async function collectFiles(): Promise<string[]> {
  const files: string[] = []
  for (const root of SCAN_ROOTS) {
    const absolute = path.resolve(root)
    try {
      const stat = await fs.stat(absolute)
      if (!stat.isDirectory()) continue
      files.push(...await walk(absolute))
    } catch {
      // Ignore missing roots.
    }
  }
  return files.sort()
}

function markerHits(content: string, relPath: string): MarkerHit[] {
  const hits: MarkerHit[] = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    for (const marker of extractSpwMarkers(line)) {
      hits.push({
        file: relPath,
        line: index + 1,
        ...marker,
      })
    }
  })

  return hits
}

function summarize(hits: MarkerHit[]) {
  const byFamily = new Map<string, number>()
  const byMarker = new Map<string, MarkerSummary>()
  const byFile = new Map<string, number>()

  for (const hit of hits) {
    byFamily.set(hit.family, (byFamily.get(hit.family) ?? 0) + 1)
    const existingMarker = byMarker.get(hit.normalized)
    if (existingMarker) {
      existingMarker.count += 1
    } else {
      byMarker.set(hit.normalized, {
        family: hit.family,
        marker: hit.normalized,
        qualifiers: [...hit.qualifiers],
        kind: hit.kind,
        count: 1,
      })
    }
    byFile.set(hit.file, (byFile.get(hit.file) ?? 0) + 1)
  }

  const families = sortBuckets([...byFamily.entries()].map(([name, count]) => ({ name, count })))
  const markers = [...byMarker.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    return left.marker.localeCompare(right.marker)
  })
  const files = sortBuckets([...byFile.entries()].map(([name, count]) => ({ name, count }))).slice(0, 20)
  return { families, markers, files }
}

function sortBuckets(buckets: SummaryBucket[]): SummaryBucket[] {
  return buckets.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    return left.name.localeCompare(right.name)
  })
}

function printPlain(hits: MarkerHit[]): void {
  const { families, markers, files } = summarize(hits)
  console.log(`@spw markers: ${hits.length}`)

  if (families.length === 0) {
    console.log('No markers found.')
    return
  }

  console.log('Families:')
  for (const family of families) {
    console.log(`- ${family.name}: ${family.count}`)
  }

  console.log('Markers:')
  for (const marker of markers) {
    const qualifierSuffix = marker.qualifiers.length > 0
      ? ` (${marker.kind})`
      : ''
    console.log(`- ${marker.marker}: ${marker.count}${qualifierSuffix}`)
  }

  console.log('Top files:')
  for (const file of files) {
    console.log(`- ${file.name}: ${file.count}`)
  }
}

function printMarkdown(hits: MarkerHit[]): void {
  const { families, markers, files } = summarize(hits)
  console.log('# Spw Marker Audit')
  console.log('')
  console.log(`Total markers: **${hits.length}**`)
  console.log('')
  console.log('## Families')
  console.log('| Family | Count |')
  console.log('|---|---:|')
  for (const family of families) {
    console.log(`| ${family.name} | ${family.count} |`)
  }
  console.log('')
  console.log('## Markers')
  console.log('| Marker | Family | Qualifiers | Count |')
  console.log('|---|---|---|---:|')
  for (const marker of markers) {
    const qualifierLabel = marker.qualifiers.length > 0
      ? marker.qualifiers.join(', ')
      : '—'
    console.log(`| ${marker.marker} | ${marker.family} | ${qualifierLabel} | ${marker.count} |`)
  }
  console.log('')
  console.log('## Top Files')
  console.log('| File | Count |')
  console.log('|---|---:|')
  for (const file of files) {
    console.log(`| ${file.name} | ${file.count} |`)
  }
}

function printJson(hits: MarkerHit[]): void {
  const { families, markers, files } = summarize(hits)
  console.log(JSON.stringify({
    total: hits.length,
    families: families.map(family => ({ family: family.name, count: family.count })),
    tags: families.map(family => ({ tag: family.name, count: family.count })),
    markers: markers,
    files: files.map(file => ({ file: file.name, count: file.count })),
    hits: hits.map(hit => ({
      file: hit.file,
      line: hit.line,
      raw: hit.raw,
      marker: hit.normalized,
      family: hit.family,
      qualifiers: hit.qualifiers,
      kind: hit.kind,
    })),
    scanRoots: SCAN_ROOTS,
  }, null, 2))
}

function filterHits(hits: MarkerHit[], cli: CLI): MarkerHit[] {
  if (cli.marker) {
    return hits.filter(hit => hit.normalized === cli.marker)
  }
  if (cli.family) {
    return hits.filter(hit => hit.family === cli.family)
  }
  return hits
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv)
  const files = await collectFiles()
  const hits: MarkerHit[] = []

  for (const file of files) {
    const rel = path.relative(process.cwd(), file)
    const content = await fs.readFile(file, 'utf8')
    hits.push(...markerHits(content, rel))
  }

  const filtered = filterHits(hits, cli)

  if (cli.format === 'json') {
    printJson(filtered)
    return
  }
  if (cli.format === 'md') {
    printMarkdown(filtered)
    return
  }

  printPlain(filtered)
}

main().catch(error => {
  console.error(`spw marker audit failed: ${String(error)}`)
  process.exit(1)
})
