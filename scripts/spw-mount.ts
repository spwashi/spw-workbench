#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwMountCli } from '../packages/spw-cli/src/mount'

await runSpwMountCli(process.argv).catch((error) => {
  console.error(`spw-mount: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
