/**
 * spw pairs — the brace pairs of a text, read label by label (seed's scanPairLabels).
 *
 * Lists labeled pairs ({_label … }_label, or a mirrored close lebal_}), the
 * places two labeled pairs cross, and every brace that found no partner; with
 * --at, the pairs around one place. The parser's reading is not changed.
 * Experimental (spw.pair-labels/1).
 */

import { BRACE_CLOSE, PAIR_LABELS_SCHEMA, scanPairLabels, type BracePair, type PairLabelScan } from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { readLineInput, splitArgs } from './line-input'
import { meta } from './view'

const CLOSE: Readonly<Record<string, string>> = BRACE_CLOSE

export function printPairsHelp(): void {
  printHelpPage({
    title: 'Spw Pairs — brace pairs read label by label',
    usage: [
      'spw pairs <file.spw> [--all] [--json]',
      'spw pairs <file.spw> --at <line:column>',
      "spw pairs --line '{_A x {_B y }_A z }_B'",
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          "--line '<spw>'        Read one line given on the command line",
          '--stdin               Read standard input',
          '--at <line:column>    The pairs around one place, outermost first (both one-based)',
          '--all                 List bare pairs too, not only labeled ones',
          '--json                The whole scan as spw.pair-labels/1',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'A label makes a class: a brace pairs only with a brace of its kind carrying the same label, so labeled pairs may cross.',
          'Unpaired lists every brace with no partner; a missing labeled close loses only its own pair.',
          'Experimental (spw.pair-labels/1); the parser reads the text as it did.',
        ],
      },
    ],
  })
}

/** Offset of a one-based line:column in text, or null when it lies outside. */
export function offsetAt(text: string, at: string): number | null {
  const m = at.match(/^(\d+):(\d+)$/)
  if (!m) return null
  const lines = text.split('\n')
  const line = Number(m[1])
  const column = Number(m[2])
  if (line < 1 || line > lines.length || column < 1 || column > lines[line - 1]!.length + 1) return null
  let offset = 0
  for (let i = 0; i < line - 1; i++) offset += lines[i]!.length + 1
  return offset + column - 1
}

/** The pairs that hold an offset, outermost first: open before it, close at or after it. */
export function pairsAround(scan: PairLabelScan, offset: number): BracePair[] {
  return scan.pairs.filter((p) => p.open.at < offset && offset <= p.close.at).sort((a, b) => a.open.at - b.open.at)
}

const describe = (p: BracePair): string =>
  `${String(p.open.line).padStart(5)}–${String(p.close.line).padEnd(5)} ${p.kind}${CLOSE[p.kind]}  ${p.label ? `_${p.label}` : '(bare)'}${p.close.spelling ? `  ${p.close.spelling}` : ''}  depth ${p.depth}`

export async function runSpwPairsCli(args: string[]): Promise<void> {
  const split = splitArgs(args)
  const input = await readLineInput('pairs', split)
  const scan = scanPairLabels(input.text)
  const unpaired = [...scan.unreleased, ...scan.stray].sort((a, b) => a.at - b.at)

  const at = split.values.get('--at')
  if (at !== undefined) {
    const offset = offsetAt(input.text, at)
    if (offset === null) throw new Error(`spw pairs: --at ${at} is not a line:column inside ${input.uri}`)
    const around = pairsAround(scan, offset)
    if (split.switches.has('--json')) {
      console.log(formatJsonEnvelope('pairs', around, { uri: input.uri, schema: PAIR_LABELS_SCHEMA, at }))
      return
    }
    meta(`# spw pairs  ${input.uri}  at ${at}  inside ${around.length}`)
    for (const pair of around) console.log(describe(pair))
    return
  }

  if (split.switches.has('--json')) {
    const { events: _events, ...rest } = scan
    console.log(formatJsonEnvelope('pairs', rest, { uri: input.uri, schema: PAIR_LABELS_SCHEMA, pairs: scan.pairs.length, whole: scan.whole }))
    return
  }

  const labeled = scan.pairs.filter((p) => p.label)
  meta(`# spw pairs  ${input.uri}  pairs=${scan.pairs.length} labeled=${labeled.length} crossings=${scan.crossings.length} unpaired=${unpaired.length} whole=${scan.whole} tree=${scan.tree}`)
  const listed = split.switches.has('--all') ? scan.pairs : labeled
  if (listed.length) {
    console.log(split.switches.has('--all') ? 'Pairs:' : 'Labeled pairs:')
    for (const pair of listed) console.log(describe(pair))
  }
  if (scan.crossings.length) {
    console.log('Crossings:')
    for (const [a, b] of scan.crossings) console.log(`  _${scan.pairs[a]!.label ?? ''} (line ${scan.pairs[a]!.open.line}) crosses _${scan.pairs[b]!.label ?? ''} (line ${scan.pairs[b]!.open.line})`)
  }
  if (unpaired.length) {
    console.log('Unpaired:')
    for (const edge of unpaired) console.log(`  line ${edge.line}  ${edge.edge} ${edge.edge === 'open' ? edge.kind : CLOSE[edge.kind]}${edge.label ? `  _${edge.label}` : ''}`)
  }
  if (!listed.length && !scan.crossings.length && !unpaired.length) console.log(labeled.length ? '' : 'No labeled pairs; every brace pairs. --all lists bare pairs.')
}
