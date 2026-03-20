#!/usr/bin/env tsx

import { runSpwCli } from '@spw/cli'

runSpwCli(process.argv).catch((error) => {
  console.error(`spw: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
