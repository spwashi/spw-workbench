/**
 * spw pivot — each fragment of a line, what surrounds it, and the lines one
 * nuance away, each read back by the line reader, the parser and the spoken
 * reader (seed experimental/pivots.ts, spw.pivots/1).
 */

import { PIVOT_NAMES, pivotReadCounts, pivotsOf, readFragments, type PivotOptions } from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { meta } from './view'

export function printPivotHelp(): void {
  printHelpPage({
    title: 'Spw Pivot — the fragments of a line and the lines one nuance away',
    usage: [
      "spw pivot '=foo@(<bar>)'",
      "spw pivot '~<long_alley>@the_stranger' --order '~#.?!*&@^'",
      "spw pivot '=foo@(<bar>)' --json",
    ],
    sections: [
      {
        title: 'What it shows',
        lines: [
          'Fragments: each name the line holds, with the marks before it, the marks after it, its walls ([ ] mode, { } body, ( ) scene, < > concept) and which side of a bond it sits on.',
          'Bonds: a mark joining two expressions (@ perspective, ~ potential, ^ ascension, & subject); a tight bond touches both sides, so both attachments are listed as open.',
          'Pivots: a mark moved to the other side of its name, a mark turned to its neighbours in an order, the innermost wall turned, a bond turned, spaced or exchanged.',
          'Each pivot is read back three ways: line (the line reader finds it where the pivot put it), parser (no error, no warning, no more statements than before), spoken (each moved mark is named). A pivot the line reader cannot read back is not read.',
        ],
      },
      {
        title: 'Flags',
        lines: [
          "--order '<marks>'     The order a mark turns along, as a run of marks or comma-separated; a host passes its own (a ring, a progression)",
          '--json               Everything as JSON',
        ],
      },
    ],
  })
}

const named = (marks: readonly string[]) => marks.map((m) => `${PIVOT_NAMES.marks[m] ?? m} (${m})`).join(', ')
const tick = (ok: boolean) => (ok ? 'yes' : '.')

export async function runSpwPivotCli(args: string[]): Promise<void> {
  const at = args.indexOf('--order')
  const orderText = at >= 0 ? args[at + 1] : undefined
  const line = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--order')
  if (!line) throw new Error("spw pivot: give a line: spw pivot '=foo@(<bar>)'")
  const options: PivotOptions = orderText ? { order: orderText.includes(',') ? orderText.split(',').map((s) => s.trim()).filter(Boolean) : [...orderText] } : {}
  const { fragments, bonds } = readFragments(line)
  const pivots = pivotsOf(line, options)
  const counts = pivotReadCounts(pivots)

  if (args.includes('--json')) {
    console.log(formatJsonEnvelope('pivot', { line, fragments, bonds, pivots, counts }, { fragments: fragments.length, bonds: bonds.length, pivots: pivots.length }))
    return
  }
  meta(`# spw pivot  ${line}  fragments=${fragments.length} bonds=${bonds.length} pivots=${pivots.length} (${pivots.filter((p) => p.status === 'read').length} read)`)
  console.log('fragments')
  for (const f of fragments) {
    const around = [
      f.before.length ? `before: ${named(f.before)}` : '',
      f.after.length ? `after: ${named(f.after)}` : '',
      f.walls.length ? `walls: ${f.walls.map((w) => PIVOT_NAMES.walls[w]).join(' then ')}` : '',
      f.sides.length ? `side: ${f.sides.join(' then ')}` : '',
    ].filter(Boolean)
    console.log(`  ${f.name.padEnd(16)} ${around.join('; ')}`)
  }
  if (bonds.length) {
    console.log('bonds')
    for (const b of bonds) console.log(`  ${b.mark} ${PIVOT_NAMES.bonds[b.mark]}  ${b.spaced ? 'spaced' : 'tight'}${b.attaches.length ? `; open: after the left, or before the right` : ''}`)
  }
  console.log('pivots                                                     line parser spoken')
  for (const p of pivots) {
    console.log(`  ${p.kind.padEnd(9)} ${(p.fragment ?? '(bond)').padEnd(14)} ${p.line.padEnd(30).slice(0, 30)}  ${tick(p.read.line).padEnd(4)} ${tick(p.read.parser).padEnd(6)} ${tick(p.read.spoken)}${p.status === 'not_read' ? '   not read' : ''}`)
  }
  console.log('read back, by kind')
  for (const [kind, c] of Object.entries(counts)) console.log(`  ${kind.padEnd(9)} ${c.total} offered: line ${c.line}, parser ${c.parser}, spoken ${c.spoken}`)
}
