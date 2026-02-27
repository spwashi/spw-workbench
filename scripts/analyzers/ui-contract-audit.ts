#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface CLI {
  mode: 'ui-selectors' | 'context-panel'
  update: boolean
}

function parseArgs(argv: string[]): CLI {
  let mode: CLI['mode'] = 'ui-selectors'
  let update = false

  for (const arg of argv.slice(2)) {
    if (arg === '--mode=context-panel') mode = 'context-panel'
    if (arg === '--mode=ui-selectors') mode = 'ui-selectors'
    if (arg === '--update') update = true
  }

  return { mode, update }
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(full))
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.(ts|tsx|css|spw|md)$/.test(entry.name)) continue
    files.push(full)
  }

  return files
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv)
  const files = await walk(path.resolve('.'))

  if (cli.mode === 'ui-selectors') {
    let selectorHits = 0
    let componentDataHits = 0

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      selectorHits += (content.match(/\[data-[a-z-]+(?:=[^\]]+)?\]/g) ?? []).length
      componentDataHits += (content.match(/data-spw-component/g) ?? []).length
    }

    console.log(`ui selectors discovered: ${selectorHits}`)
    console.log(`data-spw-component references: ${componentDataHits}`)
    if (cli.update) {
      console.log('update flag set: baseline refresh acknowledged (no persistent baseline file in rewrite snapshot)')
    }
    return
  }

  let panelMentions = 0
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    panelMentions += (content.match(/context panel/gi) ?? []).length
  }

  console.log(`context panel mentions: ${panelMentions}`)
}

main().catch(error => {
  console.error(`ui contract audit failed: ${String(error)}`)
  process.exit(1)
})
