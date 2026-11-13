/**
 * spw hear — a click for every brace of a text, written to a WAV file
 * (seed's pairSound, tuned by an ear line).
 *
 * The start phrase, a click per brace in order, the stop phrase. A label gives
 * its pair a timbre (or a phrase, in the modal voice), and a brace with no
 * partner carries a rough tone. --ear takes a tuning line such as
 * ^ear{ =voice[modal] %level[-24] }, so one source can be written under two
 * tunings to two files and compared. Experimental (spw.pair-sound/1,
 * spw.earcons/1); nothing it writes has been heard by anyone.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PAIR_SOUND, pairSound, readEarcons, renderPairSound, scanPairLabels, spokenLine, wavBytes } from '@spwashi/spw-seed'
import { printHelpPage } from './help'
import { readLineInput, splitArgs } from './line-input'

const SAMPLE_RATE = 44100
const SHOWN = 40

export function printHearHelp(): void {
  printHelpPage({
    title: 'Spw Hear — a click for every brace, written to a WAV file',
    usage: [
      "spw hear --line '<spw>' --out clicks.wav [--ear '^ear{ =voice[modal] }']",
      'spw hear <file.spw> --out clicks.wav [--gap 0.09]',
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          '--out <path> / -o <path>  The WAV file to write (16-bit mono, 44.1 kHz); required',
          "--line '<spw>'            Hear one line given on the command line",
          '--stdin                   Hear standard input',
          "--ear '<line>'            Tune the sound with an ear line: %body[392] %step[2] =voice[modal] %level[-24] …",
          '--gap <seconds>           Silence between clicks (default 0.09)',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Prints each click (line, edge, kind, pitch, label) and, for --line, how the line is said.',
          'A word the ear line does not know is reported and left out; an empty ear line is the default sound.',
          'Experimental (spw.pair-sound/1, spw.earcons/1). Nothing here has been heard.',
        ],
      },
    ],
  })
}

export async function runSpwHearCli(args: string[]): Promise<void> {
  const split = splitArgs(args)
  const out = split.values.get('--out') ?? split.values.get('-o')
  if (!out) throw new Error('spw hear: --out <file.wav> is required')
  const input = await readLineInput('hear', split)

  const ear = split.values.get('--ear')
  const reading = ear !== undefined ? readEarcons(ear) : null
  for (const problem of reading?.problems ?? []) {
    console.error(`spw hear: ear ${problem.word}: ${problem.problem}${problem.written ? ` (${problem.written})` : ''}`)
  }
  const settings = reading?.settings ?? PAIR_SOUND
  const gap = Number(split.values.get('--gap') ?? 0.09)
  if (!Number.isFinite(gap) || gap < 0) throw new Error(`spw hear: --gap ${split.values.get('--gap')} is not a number of seconds`)

  const scan = scanPairLabels(input.text)
  const sound = pairSound(scan, settings)
  const samples = renderPairSound(sound, { gap, settings, sampleRate: SAMPLE_RATE })
  await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true })
  await fs.writeFile(path.resolve(out), wavBytes(samples, SAMPLE_RATE))

  if (input.isLine) console.log(`said: ${spokenLine(input.text).text}`)
  for (const click of sound.clicks.slice(0, SHOWN)) {
    const timbre = click.timbre.some((s) => s > 0) ? `  overtones ${click.timbre.join(' ')}` : ''
    console.log(`  line ${click.line} ${click.edge.padEnd(5)} ${click.kind} ${Math.round(click.pitch)} Hz${click.label ? `  _${click.label}` : ''}${timbre}${click.paired ? '' : '  (no partner)'}`)
  }
  if (sound.clicks.length > SHOWN) console.log(`  … ${sound.clicks.length - SHOWN} more`)
  const unpaired = scan.unreleased.length + scan.stray.length
  console.log(`${sound.clicks.length} clicks, ${scan.pairs.length} pairs, ${unpaired} without a partner, voice ${settings.voice ?? 'click'}, ${(samples.length / SAMPLE_RATE).toFixed(1)} s → ${out}`)
}
