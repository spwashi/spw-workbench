import { parseCommand, parseCommonFlags } from './args'
import { findCommand, knownCommands, printRootHelp } from './commands'
import { printStartPage } from './start'
import { setExitCode } from './exit'
import { loadLocOverrides } from './loc'
import { helpLoc } from './help'
import { printCommandHelpJson, printRootHelpJson } from './help-json'
import { suggestClosest } from './view'

export async function runSpwCli(argv: string[]): Promise<void> {
  loadLocOverrides()
  if (argv.slice(2).length === 0) {
    await printStartPage()
    return
  }
  const { command, args: rawArgs } = parseCommand(argv)
  const common = parseCommonFlags(rawArgs)

  if (command === 'help' || command === '--help' || command === '-h') {
    if (common.flags.json) printRootHelpJson()
    else printRootHelp()
    return
  }

  const spec = findCommand(command)

  if (!spec) {
    console.error(
      helpLoc('error.prefix', {
        message: helpLoc('error.unknown_command', { command }),
      }),
    )
    const hint = suggestClosest(command, knownCommands())
    if (hint.length) {
      console.error(
        helpLoc('error.prefix', {
          message: helpLoc('error.did_you_mean', { hints: hint.join(', ') }),
        }),
      )
    }
    printRootHelp()
    // Usage / option errors are exit 2 (see SpwExit / spw-q-candidate-spec §2.1).
    setExitCode('usage')
    return
  }

  if (common.flags.help) {
    if (common.flags.json) printCommandHelpJson(spec)
    else spec.printHelp(command)
    return
  }

  await spec.run(command, common.args)
}
