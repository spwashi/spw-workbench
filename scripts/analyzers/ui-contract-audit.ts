#!/usr/bin/env tsx

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface CLI {
  mode: 'ui-selectors' | 'context-panel'
  format: 'plain' | 'json'
  update: boolean
}

interface SelectorAuditResult {
  mode: 'ui-selectors'
  filesScanned: number
  selectorHits: number
  componentDataHits: number
  updateRequested: boolean
}

interface ContextPanelAuditResult {
  mode: 'context-panel'
  filesScanned: number
  panelMentions: number
}

type UiContractAuditResult = SelectorAuditResult | ContextPanelAuditResult

function parseArgs(argv: string[]): CLI {
  let mode: CLI['mode'] = 'ui-selectors'
  let format: CLI['format'] = 'plain'
  let update = false

  for (const arg of argv.slice(2)) {
    if (arg === '--mode=context-panel') mode = 'context-panel'
    if (arg === '--mode=ui-selectors') mode = 'ui-selectors'
    if (arg === '--json' || arg === '--format=json') format = 'json'
    if (arg === '--format=plain') format = 'plain'
    if (arg === '--update') update = true
  }

  return { mode, format, update }
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

async function runAudit(cli: CLI): Promise<UiContractAuditResult> {
  const files = await walk(path.resolve('.'))

  if (cli.mode === 'ui-selectors') {
    let selectorHits = 0
    let componentDataHits = 0

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      selectorHits += (content.match(/\[data-[a-z-]+(?:=[^\]]+)?\]/g) ?? []).length
      componentDataHits += (content.match(/data-spw-component/g) ?? []).length
    }

    return {
      mode: 'ui-selectors',
      filesScanned: files.length,
      selectorHits,
      componentDataHits,
      updateRequested: cli.update,
    }
  }

  let panelMentions = 0
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    panelMentions += (content.match(/context panel/gi) ?? []).length
  }

  return {
    mode: 'context-panel',
    filesScanned: files.length,
    panelMentions,
  }
}

function printPlain(result: UiContractAuditResult): void {
  if (result.mode === 'ui-selectors') {
    console.log(`ui selectors discovered: ${result.selectorHits}`)
    console.log(`data-spw-component references: ${result.componentDataHits}`)
    if (result.updateRequested) {
      console.log('update flag set: baseline refresh acknowledged (no persistent baseline file in rewrite snapshot)')
    }
    return
  }

  console.log(`context panel mentions: ${result.panelMentions}`)
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv)
  const result = await runAudit(cli)

  if (cli.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  printPlain(result)
}

main().catch(error => {
  console.error(`ui contract audit failed: ${String(error)}`)
  process.exit(1)
})
