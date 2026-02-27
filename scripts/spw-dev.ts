#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { canonicalize, parse } from '../src/seed'

const ROOT = path.resolve('.spw')
const POLL_MS = 1000
const knownMtimes = new Map<string, number>()

function nowIso(): string {
  return new Date().toISOString()
}

function phaseHint(kind: 'create' | 'change' | 'remove'): string {
  if (kind === 'create') return '?~'
  if (kind === 'change') return '@'
  return '^'
}

async function collectSpwFiles(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSpwFiles(fullPath))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(fullPath)
    }
  }
  return files
}

async function formatAndValidate(filePath: string, kind: 'create' | 'change'): Promise<void> {
  let source: string
  try {
    source = await fs.readFile(filePath, 'utf8')
  } catch {
    return
  }

  const formatted = canonicalize(source, {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: false,
  }).source

  if (formatted !== source) {
    await fs.writeFile(filePath, formatted, 'utf8')
    source = formatted
  }

  const output = parse(source)
  const rel = path.relative(process.cwd(), filePath)
  const beat = phaseHint(kind)

  if (output.success) {
    console.log(`[${nowIso()}] beat=${beat} ok ${rel} tokens=${output.tokens.length}`)
    return
  }

  const first = output.errors[0]
  if (!first) {
    console.error(`[${nowIso()}] beat=${beat} fail ${rel} errors=${output.errors.length}`)
    return
  }

  console.error(
    `[${nowIso()}] beat=${beat} fail ${rel} ${first.position.line}:${first.position.column} errors=${output.errors.length}`
  )
}

async function pollOnce(): Promise<void> {
  const files = await collectSpwFiles(ROOT)
  const seen = new Set(files)

  for (const file of files) {
    let stat
    try {
      stat = await fs.stat(file)
    } catch {
      continue
    }

    const prev = knownMtimes.get(file)
    const next = stat.mtimeMs

    if (prev === undefined) {
      knownMtimes.set(file, next)
      await formatAndValidate(file, 'create')
      continue
    }

    if (next > prev) {
      knownMtimes.set(file, next)
      await formatAndValidate(file, 'change')
    }
  }

  for (const existing of Array.from(knownMtimes.keys())) {
    if (seen.has(existing)) continue
    knownMtimes.delete(existing)
    console.log(`[${nowIso()}] beat=${phaseHint('remove')} removed ${path.relative(process.cwd(), existing)}`)
  }
}

async function main(): Promise<void> {
  const exists = await fs.stat(ROOT).then(() => true).catch(() => false)
  if (!exists) {
    console.error('spw-dev: .spw directory not found. Run npm run spw:reset after creating tracked .spw files.')
    process.exitCode = 1
    return
  }

  await pollOnce()
  console.log(`[${nowIso()}] polling ${path.relative(process.cwd(), ROOT)} every ${POLL_MS}ms`)

  const timer = setInterval(() => {
    void pollOnce()
  }, POLL_MS)

  process.on('SIGINT', () => {
    clearInterval(timer)
    process.exit(0)
  })
}

main().catch((error) => {
  console.error(`spw-dev: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
