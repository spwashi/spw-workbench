#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwRootsCli } from '../packages/spw-cli/src/roots'

await runSpwRootsCli(process.argv).catch((error) => {
  console.error(`spw-roots: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
