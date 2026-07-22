#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwBeatCli } from '../packages/spw-cli/src/beat'

await runSpwBeatCli(process.argv).catch((error) => {
  console.error(`spw-beat: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
