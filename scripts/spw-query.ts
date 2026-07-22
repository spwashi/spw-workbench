#!/usr/bin/env tsx

import process from 'node:process'
import { parseQueryArgs } from '../packages/spw-cli/src/args'
import { runQueryCli } from '../packages/spw-cli/src/query'

await runQueryCli(parseQueryArgs(process.argv.slice(2))).catch((error) => {
  console.error(`spw-query: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
