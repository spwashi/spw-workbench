#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwInitCli } from '../packages/spw-cli/src/init'

await runSpwInitCli(process.argv).catch((error) => {
  console.error(`spw-install: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
