#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwExpandCli } from '../packages/spw-cli/src/expand'

await runSpwExpandCli(process.argv).catch((error) => {
  console.error(`spw-expand: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
