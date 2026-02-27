#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

const REQUIRED_HEADINGS = [
  '## Status',
  '## v0.2.0 Contract Stub',
  '## Invariants',
  '## Implementation Hooks',
  '## Open Questions',
]

const CORE_DIR = path.resolve('lib/spw-v0.2.0-alpha/core')

interface Issue {
  file: string
  message: string
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(dir, entry.name))
    .sort()
}

function checkContent(file: string, content: string): Issue[] {
  const issues: Issue[] = []
  const rel = path.relative(process.cwd(), file)

  if (content.includes('Redirect stub.')) {
    issues.push({
      file: rel,
      message: 'contains legacy "Redirect stub." marker',
    })
  }

  for (const heading of REQUIRED_HEADINGS) {
    if (!content.includes(heading)) {
      issues.push({
        file: rel,
        message: `missing required heading: ${heading}`,
      })
    }
  }

  return issues
}

async function main(): Promise<void> {
  const files = await listMarkdownFiles(CORE_DIR)
  const issues: Issue[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    issues.push(...checkContent(file, content))
  }

  if (issues.length === 0) {
    console.log(`v0.2.0 core stub check passed (${files.length} file(s))`)
    return
  }

  console.error('v0.2.0 core stub check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`)
  }
  process.exitCode = 1
}

main().catch(error => {
  console.error(`v0.2.0 core stub check failed: ${String(error)}`)
  process.exit(1)
})
