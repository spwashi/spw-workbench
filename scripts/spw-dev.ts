#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwDevCli } from '../packages/spw-cli/src/dev'

await runSpwDevCli().catch((error) => {
  console.error(`spw-dev: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
