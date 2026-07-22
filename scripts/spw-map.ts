#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwMapCli } from '../packages/spw-cli/src/map'

await runSpwMapCli(process.argv).catch((error) => {
  console.error(`spw-map: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
