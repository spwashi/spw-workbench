#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { canonicalize } from '../src/seed'

interface CliArgs {
  targets: string[]
  check: boolean
  help: boolean
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '.agents'])

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const parsed: CliArgs = { targets: [], check: false, help: false }

  for (const arg of args) {
    if (arg === '--check') {
      parsed.check = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    parsed.targets.push(arg)
  }

  if (parsed.targets.length === 0) {
    parsed.targets.push('.spw')
  }

  return parsed
}

function printHelp(): void {
  console.log(`
Spw Formatter (canonical mode)

Usage:
  node --import tsx scripts/spw-format.ts [targets...] [--check]

Behavior:
  - Formats .spw files by applying canonicalize():
    normalize newlines + trim trailing whitespace + ensure final newline.
  - Directories are walked recursively.

Examples:
  npm run spw:format
  npm run spw:format:check
  node --import tsx scripts/spw-format.ts docs/design/spw
`)
}

async function collectSpwFiles(target: string): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats

  try {
    stats = await fs.stat(absolute)
  } catch {
    return []
  }

  if (stats.isFile()) {
    return absolute.endsWith('.spw') ? [absolute] : []
  }

  if (!stats.isDirectory()) {
    return []
  }

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue
    }

    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSpwFiles(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(entryPath)
    }
  }

  return files
}

async function formatFile(filePath: string, check: boolean): Promise<boolean> {
  const original = await fs.readFile(filePath, 'utf8')
  const formatted = canonicalize(original, {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: false,
  }).source

  if (formatted === original) {
    return false
  }

  if (!check) {
    await fs.writeFile(filePath, formatted, 'utf8')
  }

  return true
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv)
  if (cli.help) {
    printHelp()
    return
  }

  const repoRoot = process.cwd()
  const fileSet = new Set<string>()

  for (const target of cli.targets) {
    const files = await collectSpwFiles(target)
    for (const file of files) fileSet.add(file)
  }

  const files = Array.from(fileSet).sort()
  if (files.length === 0) {
    console.log('spw-format: no .spw files found.')
    return
  }

  let changed = 0
  for (const file of files) {
    const didChange = await formatFile(file, cli.check)
    if (didChange) {
      changed += 1
      const rel = path.relative(repoRoot, file)
      console.log(`${cli.check ? 'needs-format' : 'formatted'}: ${rel}`)
    }
  }

  if (cli.check && changed > 0) {
    console.error(`spw-format: ${changed} file(s) need formatting.`)
    process.exitCode = 1
    return
  }

  console.log(`spw-format: ${files.length} file(s) scanned, ${changed} ${cli.check ? 'need' : 'updated'}.`)
}

main().catch((error) => {
  console.error(`spw-format: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
