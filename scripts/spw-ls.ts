#!/usr/bin/env tsx

import { runSpwLsCli } from './spw-ls-core'

runSpwLsCli({ entryName: 'spw:ls' }).catch((error) => {
  console.error(`spw:ls: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
