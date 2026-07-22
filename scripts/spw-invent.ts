#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwInventCli } from '../packages/spw-cli/src/inventory'

await runSpwInventCli(process.argv).catch((error) => {
  console.error(`spw-invent: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
