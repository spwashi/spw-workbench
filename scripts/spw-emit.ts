#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwEmitCli } from '../packages/spw-cli/src/emit'

await runSpwEmitCli(process.argv).catch((error) => {
  console.error(`spw-emit: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
