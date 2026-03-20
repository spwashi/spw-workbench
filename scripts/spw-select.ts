#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwSelectCli } from '../packages/spw-cli/src/select'

await runSpwSelectCli(process.argv).catch((error) => {
  console.error(`spw-select: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
