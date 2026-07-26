import process from 'node:process'
import { parseCommand, parseCommonFlags } from './args'
import { findCommand, knownCommands, printRootHelp } from './commands'
import { suggestClosest } from './view'

export async function runSpwCli(argv: string[]): Promise<void> {
  const { command, args: rawArgs } = parseCommand(argv)
  const common = parseCommonFlags(rawArgs)

  if (command === 'help' || command === '--help' || command === '-h') {
    printRootHelp()
    return
  }

  const spec = findCommand(command)

  if (!spec) {
    console.error(`spw: unknown command "${command}"`)
    const hint = suggestClosest(command, knownCommands())
    if (hint.length) console.error(`  did you mean: ${hint.join(', ')}?`)
    printRootHelp()
    process.exitCode = 1
    return
  }

  if (common.flags.help) {
    spec.printHelp(command)
    return
  }

  await spec.run(command, common.args)
}
