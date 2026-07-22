#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwAnalyzeCli } from '../packages/spw-cli/src/analyze'

await runSpwAnalyzeCli(process.argv).catch((error) => {
  console.error(`spw-analyze: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
