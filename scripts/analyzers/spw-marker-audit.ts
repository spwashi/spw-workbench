#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

type Format = 'plain' | 'md' | 'json'

interface CLI {
  format: Format
  tag: string | null
}

interface MarkerHit {
  file: string
  line: number
  tag: string
  raw: string
}

const SCAN_ROOTS = ['src', 'docs', 'lib', '.agents/skills']
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.md', '.spw'])
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', 'build'])

function parseArgs(argv: string[]): CLI {
  let format: Format = 'plain'
  let tag: string | null = null

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--format=')) {
      const value = arg.slice('--format='.length) as Format
      if (value === 'plain' || value === 'md' || value === 'json') {
        format = value
      }
      continue
    }

    if (arg.startsWith('--tag=')) {
      tag = arg.slice('--tag='.length)
      continue
    }
  }

  return { format, tag }
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
  const markerPattern = /@spw:([a-z0-9_-]+)/gi

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null
    while ((match = markerPattern.exec(line)) !== null) {
      hits.push({
        file: relPath,
        line: index + 1,
        tag: match[1].toLowerCase(),
        raw: match[0],
      })
    }
  })

  return hits
}

function summarize(hits: MarkerHit[]) {
  const byTag = new Map<string, number>()
  const byFile = new Map<string, number>()

  for (const hit of hits) {
    byTag.set(hit.tag, (byTag.get(hit.tag) ?? 0) + 1)
    byFile.set(hit.file, (byFile.get(hit.file) ?? 0) + 1)
  }

  const tags = [...byTag.entries()].sort((a, b) => b[1] - a[1])
  const files = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  return { tags, files }
}

function printPlain(hits: MarkerHit[]): void {
  const { tags, files } = summarize(hits)
  console.log(`@spw markers: ${hits.length}`)

  if (tags.length === 0) {
    console.log('No markers found.')
    return
  }

  console.log('Tags:')
  for (const [tag, count] of tags) {
    console.log(`- ${tag}: ${count}`)
  }

  console.log('Top files:')
  for (const [file, count] of files) {
    console.log(`- ${file}: ${count}`)
  }
}

function printMarkdown(hits: MarkerHit[]): void {
  const { tags, files } = summarize(hits)
  console.log('# Spw Marker Audit')
  console.log('')
  console.log(`Total markers: **${hits.length}**`)
  console.log('')
  console.log('## Tags')
  console.log('| Tag | Count |')
  console.log('|---|---:|')
  for (const [tag, count] of tags) {
    console.log(`| ${tag} | ${count} |`)
  }
  console.log('')
  console.log('## Top Files')
  console.log('| File | Count |')
  console.log('|---|---:|')
  for (const [file, count] of files) {
    console.log(`| ${file} | ${count} |`)
  }
}

function printJson(hits: MarkerHit[]): void {
  const { tags, files } = summarize(hits)
  console.log(JSON.stringify({
    total: hits.length,
    tags: tags.map(([tag, count]) => ({ tag, count })),
    files: files.map(([file, count]) => ({ file, count })),
  }, null, 2))
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

  const filtered = cli.tag
    ? hits.filter(hit => hit.tag === cli.tag)
    : hits

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
