#!/usr/bin/env tsx

import { runSpwLsCli } from './spw-ls-core'

runSpwLsCli({ entryName: 'spw:seq', compatNotice: true }).catch((error) => {
  console.error(`spw:seq: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
