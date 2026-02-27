#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

const RUNTIME_ROOT = path.resolve('src/runtime')
const DIRECTORY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const FILE_PATTERN = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\.(?:test|spec))?\.(?:ts|md|spw)$/
const ALLOWED_SPECIAL = new Set(['README.md'])

interface Issue {
  path: string
  message: string
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(fullPath)
      files.push(...await walk(fullPath))
      continue
    }
    files.push(fullPath)
  }

  return files
}

function validatePath(target: string): Issue | null {
  const rel = path.relative(RUNTIME_ROOT, target)
  if (!rel || rel.startsWith('..')) return null

  const parts = rel.split(path.sep)
  const base = parts.at(-1) ?? ''
  const isDirectory = !path.extname(base)

  if (isDirectory) {
    if (base === '__tests__') return null
    if (!DIRECTORY_PATTERN.test(base)) {
      return {
        path: path.relative(process.cwd(), target),
        message: 'directory is not kebab-case',
      }
    }
    return null
  }

  if (ALLOWED_SPECIAL.has(base)) return null

  if (!FILE_PATTERN.test(base)) {
    return {
      path: path.relative(process.cwd(), target),
      message: 'file name is not normalized kebab-case',
    }
  }

  return null
}

async function main(): Promise<void> {
  const entries = await walk(RUNTIME_ROOT)
  const issues = entries
    .map(validatePath)
    .filter((issue): issue is Issue => issue !== null)

  if (issues.length === 0) {
    console.log('runtime filename check passed')
    return
  }

  console.error('runtime filename check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.path}: ${issue.message}`)
  }
  process.exitCode = 1
}

main().catch(error => {
  console.error(`runtime filename check failed: ${String(error)}`)
  process.exit(1)
})
