#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwSkimCli } from '../packages/spw-cli/src/skim'

await runSpwSkimCli(process.argv).catch((error) => {
  console.error(`spw-skim: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
