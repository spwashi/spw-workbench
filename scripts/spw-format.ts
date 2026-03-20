#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwFormatCli } from '../packages/spw-cli/src/format'

await runSpwFormatCli(process.argv).catch((error) => {
  console.error(`spw-format: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
