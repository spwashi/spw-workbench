#!/usr/bin/env tsx
/**
 * Hear the braces of a line or a surface — `npm run sound:pairs -- --line '<spw>' --out clicks.wav`
 * or `npm run sound:pairs -- path/to/file.spw --out clicks.wav`.
 *
 * Writes one WAV file: the start phrase, a click for every brace in order, the stop phrase.
 * A label gives its pair a timbre, a close is its open backward, and an edge with no partner
 * carries a rough tone. Prints each click and, for a line, how the line is said in names.
 * The sound is a first guess nobody has heard: this is how to hear it.
 *
 * @see packages/spw-seed/src/experimental/pair-sound.ts
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pairSound, renderPairSound, scanPairLabels, spokenLine, wavBytes } from '../../packages/spw-seed/src/index'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}
const out = flag('--out')
const line = flag('--line')
const gap = Number(flag('--gap') ?? 0.09)
const file = args.find((arg, i) => !arg.startsWith('--') && !['--out', '--line', '--gap'].includes(args[i - 1] ?? ''))

if (!out || (!line && !file)) {
  console.error("usage: sound:pairs -- (--line '<spw>' | <file.spw>) --out <file.wav> [--gap seconds]")
  process.exit(2)
}

const source = line ?? (await fs.readFile(path.resolve(file!), 'utf8'))
const scan = scanPairLabels(source)
const sound = pairSound(scan)
const samples = renderPairSound(sound, { gap })
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true })
await fs.writeFile(path.resolve(out), wavBytes(samples))

if (line) console.log(`said: ${spokenLine(line).text}`)
for (const click of sound.clicks.slice(0, 40)) {
  const overtones = click.timbre.some((s) => s > 0) ? ` overtones ${click.timbre.join(' ')}` : ''
  console.log(`  line ${click.line} ${click.edge.padEnd(5)} ${click.kind} ${Math.round(click.pitch)} Hz${click.label ? ` _${click.label}` : ''}${overtones}${click.paired ? '' : ' (no partner)'}`)
}
if (sound.clicks.length > 40) console.log(`  … ${sound.clicks.length - 40} more`)
console.log(`${sound.clicks.length} clicks, ${scan.pairs.length} pairs, ${scan.unreleased.length + scan.stray.length} without a partner, ${(samples.length / 44100).toFixed(1)} s → ${out}`)
