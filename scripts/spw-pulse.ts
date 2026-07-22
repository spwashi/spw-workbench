#!/usr/bin/env tsx

import process from 'node:process'
import {
  runSpwPulseCli,
  SPW_PULSE_SCHEMA_VERSION,
  SPW_PULSE_SURFACE,
  type PulseErrorEnvelope,
} from '../packages/spw-cli/src/pulse'

await runSpwPulseCli(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  if (process.argv.slice(2).includes('--json')) {
    const envelope = {
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: SPW_PULSE_SURFACE,
      mode: 'error',
      ok: false,
      errors: [message],
    } satisfies PulseErrorEnvelope
    console.log(JSON.stringify(envelope, null, 2))
  } else {
    console.error(`spw-pulse: ${message}`)
  }
  process.exitCode = 1
})
