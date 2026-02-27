#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOTS = ['src', 'docs', 'lib']
const IGNORED = new Set(['.git', 'node_modules', 'dist', 'release', 'build'])
const EXT = new Set(['.ts', '.tsx', '.md', '.spw'])

const TERMS = [
  'liminality',
  'tangibility',
  'conception',
  'familiarity',
  'salience',
  'objectivity',
  'subjectivity',
  'valence',
  'composition',
  'operator',
  'brace',
  'register',
]

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(full))
      continue
    }
    if (!entry.isFile()) continue
    if (!EXT.has(path.extname(entry.name))) continue
    files.push(full)
  }

  return files
}

function countOccurrences(haystack: string, needle: string): number {
  const pattern = new RegExp(`\\b${needle}\\b`, 'gi')
  return [...haystack.matchAll(pattern)].length
}

async function main(): Promise<void> {
  const corpusFiles: string[] = []
  for (const root of ROOTS) {
    try {
      corpusFiles.push(...await walk(path.resolve(root)))
    } catch {
      // ignore missing roots
    }
  }

  const corpus = (await Promise.all(corpusFiles.map(file => fs.readFile(file, 'utf8')))).join('\n')

  const rows = TERMS.map(term => ({
    term,
    count: countOccurrences(corpus, term),
  })).sort((a, b) => b.count - a.count)

  console.log('# Perturbation Scan')
  console.log('')
  console.log('| Term | Count |')
  console.log('|---|---:|')
  for (const row of rows) {
    console.log(`| ${row.term} | ${row.count} |`)
  }
}

main().catch(error => {
  console.error(`perturbation scan failed: ${String(error)}`)
  process.exit(1)
})
