#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwFormulaCli } from '../packages/spw-cli/src/formula'

await runSpwFormulaCli(process.argv).catch((error) => {
  console.error(`spw-formula: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
