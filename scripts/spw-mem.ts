#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwMemCli } from '../packages/spw-cli/src/mem'

await runSpwMemCli(process.argv).catch((error) => {
  console.error(`spw-mem: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
