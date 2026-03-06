#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  extractSpwMarkers,
  markerMatchesAttributeFilter,
  normalizeMarkerQuery,
  parseMarkerAttributeFilter,
  type MarkerAttributeFilter,
  type ParsedMarkerAttribute,
  type ParsedSpwMarker,
} from './marker-schema'

type Format = 'plain' | 'md' | 'json'

interface CLI {
  format: Format
  family: string | null
  marker: string | null
  attribute: MarkerAttributeFilter | null
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
  signature: string
  qualifiers: string[]
  kind: ParsedSpwMarker['kind']
  form: ParsedSpwMarker['form']
  attributes: Record<string, string | string[]>
  attributeEntries: ParsedMarkerAttribute[]
  count: number
}

const SCAN_ROOTS = ['src', 'docs', 'lib', 'scripts', 'extensions', '.agents/skills']
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.md', '.spw'])
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', 'build'])

function parseArgs(argv: string[]): CLI {
  let format: Format = 'plain'
  let family: string | null = null
  let marker: string | null = null
  let attribute: MarkerAttributeFilter | null = null

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

    if (arg.startsWith('--attribute=')) {
      attribute = parseMarkerAttributeFilter(arg.slice('--attribute='.length))
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

  return { format, family, marker, attribute }
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
  const byAttribute = new Map<string, number>()
  const byFile = new Map<string, number>()

  for (const hit of hits) {
    byFamily.set(hit.family, (byFamily.get(hit.family) ?? 0) + 1)
    for (const entry of hit.attributeEntries) {
      byAttribute.set(entry.key, (byAttribute.get(entry.key) ?? 0) + 1)
    }

    const existingMarker = byMarker.get(hit.signature)
    if (existingMarker) {
      existingMarker.count += 1
    } else {
      byMarker.set(hit.signature, {
        family: hit.family,
        marker: hit.normalized,
        signature: hit.signature,
        qualifiers: [...hit.qualifiers],
        kind: hit.kind,
        form: hit.form,
        attributes: { ...hit.attributes },
        attributeEntries: hit.attributeEntries.map(entry => ({
          key: entry.key,
          values: [...entry.values],
        })),
        count: 1,
      })
    }
    byFile.set(hit.file, (byFile.get(hit.file) ?? 0) + 1)
  }

  const families = sortBuckets([...byFamily.entries()].map(([name, count]) => ({ name, count })))
  const attributes = sortBuckets([...byAttribute.entries()].map(([name, count]) => ({ name, count })))
  const markers = [...byMarker.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    return left.signature.localeCompare(right.signature)
  })
  const contracts = markers.filter(marker => marker.form === 'contract')
  const files = sortBuckets([...byFile.entries()].map(([name, count]) => ({ name, count }))).slice(0, 20)
  return { families, attributes, markers, contracts, files }
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
  const { families, attributes, markers, files } = summarize(hits)
  console.log(`@spw markers: ${hits.length}`)

  if (families.length === 0) {
    console.log('No markers found.')
    return
  }

  console.log('Families:')
  for (const family of families) {
    console.log(`- ${family.name}: ${family.count}`)
  }

  if (attributes.length > 0) {
    console.log('Attributes:')
    for (const attribute of attributes) {
      console.log(`- ${attribute.name}: ${attribute.count}`)
    }
  }

  console.log('Markers:')
  for (const marker of markers) {
    const suffix = marker.form === 'contract'
      ? ' (contract)'
      : marker.qualifiers.length > 0
        ? ` (${marker.kind})`
        : ''
    console.log(`- ${marker.signature}: ${marker.count}${suffix}`)
  }

  const contractCount = markers.filter(marker => marker.form === 'contract').length
  if (contractCount > 0) {
    console.log(`Contracts: ${contractCount}`)
  }

  console.log('Top files:')
  for (const file of files) {
    console.log(`- ${file.name}: ${file.count}`)
  }
}

function formatAttributes(entries: ParsedMarkerAttribute[]): string {
  if (entries.length === 0) {
    return '—'
  }

  return entries
    .map(entry => `${entry.key}=${entry.values.join('|')}`)
    .join(', ')
}

function printMarkdown(hits: MarkerHit[]): void {
  const { families, attributes, markers, contracts, files } = summarize(hits)
  console.log('# Spw Marker Audit')
  console.log('')
  console.log(`Total markers: **${hits.length}**`)
  if (contracts.length > 0) {
    console.log(`Contract markers: **${contracts.length}**`)
  }
  console.log('')
  console.log('## Families')
  console.log('| Family | Count |')
  console.log('|---|---:|')
  for (const family of families) {
    console.log(`| ${family.name} | ${family.count} |`)
  }
  if (attributes.length > 0) {
    console.log('')
    console.log('## Attributes')
    console.log('| Attribute | Count |')
    console.log('|---|---:|')
    for (const attribute of attributes) {
      console.log(`| ${attribute.name} | ${attribute.count} |`)
    }
  }
  console.log('')
  console.log('## Markers')
  console.log('| Signature | Family | Qualifiers | Attributes | Count |')
  console.log('|---|---|---|---|---:|')
  for (const marker of markers) {
    const qualifierLabel = marker.qualifiers.length > 0
      ? marker.qualifiers.join(', ')
      : '—'
    console.log(`| ${marker.signature} | ${marker.family} | ${qualifierLabel} | ${formatAttributes(marker.attributeEntries)} | ${marker.count} |`)
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
  const { families, attributes, markers, contracts, files } = summarize(hits)
  console.log(JSON.stringify({
    total: hits.length,
    contractHits: hits.filter(hit => hit.form === 'contract').length,
    contractMarkers: contracts.length,
    families: families.map(family => ({ family: family.name, count: family.count })),
    tags: families.map(family => ({ tag: family.name, count: family.count })),
    attributes: attributes.map(attribute => ({ attribute: attribute.name, count: attribute.count })),
    markers: markers,
    contracts: contracts,
    files: files.map(file => ({ file: file.name, count: file.count })),
    hits: hits.map(hit => ({
      file: hit.file,
      line: hit.line,
      raw: hit.raw,
      marker: hit.normalized,
      signature: hit.signature,
      family: hit.family,
      qualifiers: hit.qualifiers,
      kind: hit.kind,
      form: hit.form,
      attributes: hit.attributes,
      attributeEntries: hit.attributeEntries,
    })),
    scanRoots: SCAN_ROOTS,
  }, null, 2))
}

function filterHits(hits: MarkerHit[], cli: CLI): MarkerHit[] {
  let filtered = hits

  if (cli.marker) {
    const wantsSignature = cli.marker.includes('[')
    filtered = filtered.filter(hit => wantsSignature
      ? hit.signature === cli.marker
      : hit.normalized === cli.marker
    )
  }

  if (cli.family) {
    filtered = filtered.filter(hit => hit.family === cli.family)
  }

  if (cli.attribute) {
    filtered = filtered.filter(hit => markerMatchesAttributeFilter(hit, cli.attribute!))
  }

  return filtered
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
