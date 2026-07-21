#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwPulseCli } from '../packages/spw-cli/src/pulse'

await runSpwPulseCli(process.argv).catch((error) => {
  console.error(`spw-pulse: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
