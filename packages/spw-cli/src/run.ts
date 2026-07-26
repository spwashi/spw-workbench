import { parseCommand, parseCommonFlags } from './args'
import { findCommand, knownCommands, printRootHelp } from './commands'
import { setExitCode } from './exit'
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
    // Usage / option errors are exit 2 (see SpwExit / spw-q-candidate-spec §2.1).
    setExitCode('usage')
    return
  }

  if (common.flags.help) {
    spec.printHelp(command)
    return
  }

  await spec.run(command, common.args)
}
