import { runSpwCli } from './run'

try {
  await runSpwCli(process.argv)
} catch (error) {
  console.error(`spw: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
