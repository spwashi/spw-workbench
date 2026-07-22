#!/usr/bin/env tsx

import process from 'node:process'
import { runSpwGeometryCli } from '../packages/spw-cli/src/geometry'

await runSpwGeometryCli(process.argv).catch((error) => {
  console.error(`spw-geometry: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
