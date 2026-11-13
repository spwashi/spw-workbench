/**
 * spw say — each line said in the names of its parts (seed's spokenLine).
 *
 * The string a host can use as an accessible name or a text face for a line:
 * ~garden[care]{seed, water} is said potential garden, mode care, definition,
 * list of 2: seed, water. Experimental (spw.spoken/1); nothing it prints has
 * been heard by a listener.
 */

import { SPOKEN_NAMES, SPOKEN_NAMES_SITE, SPOKEN_SCHEMA, spokenLine, type SpokenLine } from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { readLineInput, splitArgs } from './line-input'
import { meta } from './view'

export function printSayHelp(): void {
  printHelpPage({
    title: 'Spw Say — each line said in the names of its parts',
    usage: [
      "spw say --line '~garden[care]{seed, water}'",
      'spw say <file.spw> [--clauses] [--names site] [--json]',
      'cat surface.spw | spw say --stdin',
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          "--line '<spw>'      Say one line given on the command line",
          '--stdin             Say the lines of standard input',
          '--clauses           Show each clause with the column span it says',
          '--names <table>     Slot words: reader (definition, scene, …; default) or site (body, scope, …)',
          '--json              Each line, its said text, its clauses and what was left unread',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'A file is said a line at a time; blank lines are skipped. A brace that closes on a later line is said as unread on its own line.',
          'Experimental (spw.spoken/1). The words are tables a host may replace; nothing here has been heard.',
        ],
      },
    ],
  })
}

export async function runSpwSayCli(args: string[]): Promise<void> {
  const split = splitArgs(args)
  const input = await readLineInput('say', split)
  const names = split.values.get('--names') === 'site' ? SPOKEN_NAMES_SITE : SPOKEN_NAMES
  const lines = input.text.split('\n')
  const said: Array<{ line: number; spoken: SpokenLine }> = []
  lines.forEach((text, index) => {
    if (text.trim()) said.push({ line: index + 1, spoken: spokenLine(text, { names }) })
  })

  if (split.switches.has('--json')) {
    const unread = said.reduce((sum, s) => sum + s.spoken.unread, 0)
    console.log(
      formatJsonEnvelope(
        'say',
        said.map(({ line, spoken }) => ({ line, source: spoken.source, said: spoken.text, unread: spoken.unread, clauses: spoken.clauses })),
        { uri: input.uri, schema: SPOKEN_SCHEMA, lines: said.length, unread },
      ),
    )
    return
  }

  if (!input.isLine) meta(`# spw say  ${input.uri}  lines=${said.length}`)
  const width = String(lines.length).length
  for (const { line, spoken } of said) {
    console.log(input.isLine ? spoken.text : `${String(line).padStart(width)}  ${spoken.text}`)
    if (split.switches.has('--clauses')) {
      for (const clause of spoken.clauses) {
        if (!clause.says) continue
        console.log(`${' '.repeat(width + 2)}  ${String(clause.start).padStart(3)}–${String(clause.end).padEnd(3)} ${clause.role.padEnd(6)} ${clause.says}`)
      }
    }
  }
}
