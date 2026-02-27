#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

const REQUIRED_FILES = [
  'lib/spw-v0.2.0-alpha/ARCHITECTURE.md',
  'lib/spw-v0.2.0-alpha/LAYOUT.md',
  'lib/spw-v0.2.0-alpha/architecture/index.spw',
  'lib/spw-v0.2.0-alpha/architecture/layout.spw',
  'lib/spw-v0.2.0-alpha/architecture/theory-bridge.spw',
]

const REQUIRED_ARCH_HEADINGS = [
  '## Status',
  '## Layout Principles',
  '## Brace-First Thesis',
  '## Plane-Axis Selection Model',
  '## How To Falsify',
]

const REQUIRED_AXES = [
  'liminality',
  'tangibility',
  'conception',
  'familiarity',
  'salience',
  'objectivity_subjectivity',
  'valence',
  'composition',
]

const REQUIRED_BRACES = ['<>', '()', '[]', '{}']
const REQUIRED_OPERATORS = ['!', '^', '~', '?', '*', '=', '@', '#', '.', '&', '$', '%']

interface Issue {
  file: string
  message: string
}

async function exists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.resolve(relPath))
    return true
  } catch {
    return false
  }
}

function checkIncludes(file: string, content: string, required: string[], label: string): Issue[] {
  const issues: Issue[] = []
  for (const token of required) {
    if (!content.includes(token)) {
      issues.push({
        file,
        message: `missing ${label}: ${token}`,
      })
    }
  }
  return issues
}

async function main(): Promise<void> {
  const issues: Issue[] = []

  for (const relPath of REQUIRED_FILES) {
    if (!(await exists(relPath))) {
      issues.push({
        file: relPath,
        message: 'required architecture support file missing',
      })
    }
  }

  const architecturePath = 'lib/spw-v0.2.0-alpha/ARCHITECTURE.md'
  const theoryBridgePath = 'lib/spw-v0.2.0-alpha/architecture/theory-bridge.spw'

  if (await exists(architecturePath)) {
    const content = await fs.readFile(path.resolve(architecturePath), 'utf8')
    issues.push(...checkIncludes(architecturePath, content, REQUIRED_ARCH_HEADINGS, 'heading'))

    if (!content.includes('Unified Augmentation Language')) {
      issues.push({
        file: architecturePath,
        message: 'missing UAL framing',
      })
    }

    if (!content.toLowerCase().includes('opposite spin')) {
      issues.push({
        file: architecturePath,
        message: 'missing opposite-spin prompt',
      })
    }
  }

  if (await exists(theoryBridgePath)) {
    const content = await fs.readFile(path.resolve(theoryBridgePath), 'utf8')
    issues.push(...checkIncludes(theoryBridgePath, content, REQUIRED_AXES, 'plane axis'))
    issues.push(...checkIncludes(theoryBridgePath, content, REQUIRED_BRACES, 'primordial brace'))
    issues.push(...checkIncludes(theoryBridgePath, content, REQUIRED_OPERATORS, 'operator reality token'))

    if (!content.includes('Unified Augmentation Language')) {
      issues.push({
        file: theoryBridgePath,
        message: 'missing UAL definition',
      })
    }
  }

  if (issues.length === 0) {
    console.log('v0.2.0 library architecture check passed')
    return
  }

  console.error('v0.2.0 library architecture check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message}`)
  }
  process.exitCode = 1
}

main().catch(error => {
  console.error(`v0.2.0 library architecture check failed: ${String(error)}`)
  process.exit(1)
})
