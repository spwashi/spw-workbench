#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwMutateCli } from '../packages/spw-cli/src/mutate'

await runSpwMutateCli(process.argv).catch((error) => {
  console.error(`spw-mutate: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
