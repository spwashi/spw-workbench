import { setExitCode } from './exit'
import { runSpwCli } from './run'

try {
  await runSpwCli(process.argv)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message.startsWith('spw ') || message.startsWith('spw:') ? message : `spw: ${message}`)
  // Unhandled handler throws default to usage/runtime failure class 2.
  setExitCode('usage')
}
