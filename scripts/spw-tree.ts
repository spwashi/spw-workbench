#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwTreeCli } from '../packages/spw-cli/src/tree'

await runSpwTreeCli(process.argv).catch((error) => {
  console.error(`spw-tree: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
