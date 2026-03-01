#!/usr/bin/env tsx

import { runSpwLsCli } from './spw-ls-core'

const args = process.argv.slice(2)
const entryIdx = args.indexOf('--entry-name')
const entryName = entryIdx >= 0 && args[entryIdx + 1] ? args[entryIdx + 1] : 'spw:ls'
const compatNotice = args.includes('--compat')

runSpwLsCli({ entryName, compatNotice }).catch((error) => {
  console.error(`${entryName}: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
