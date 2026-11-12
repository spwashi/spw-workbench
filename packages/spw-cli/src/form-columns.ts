/**
 * spw form --columns and --rhymes — the parse tree as columns, and the shapes a corpus repeats.
 *
 * --columns (one surface): how the tree's nodes fall into bands, the widths of
 * the bottom-up passes, or with --json the spw.parse-columns/1 columns a reader
 * in another host can take without the parser. --rhymes (any surfaces form
 * walks): the largest subtrees alike in shape and not in content, as a template
 * with holes and the words that filled them, or refrains alike in content too.
 * Both read seed's experimental parse columns and likeness rungs.
 */

import {
  findRhymes,
  parseColumns,
  columnsToJson,
  type ParseColumns,
  type Rhyme,
  type RhymeSurface,
} from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { meta } from './view'

export interface FormSource {
  uri: string
  text: string
}

export interface FormRhymeOptions {
  json: boolean
  /** Smallest shape counted, in nodes. */
  min: number
  /** Rhymes printed (JSON keeps all). */
  top: number
  /** Only shapes that open with an operation writing this sigil. */
  sigil?: string
}

function bandWidths(tree: ParseColumns): number[] {
  const { offsets } = tree.bands
  const widths: number[] = []
  for (let k = 0; k + 1 < offsets.length; k++) widths.push(offsets[k + 1]! - offsets[k]!)
  return widths
}

/** One surface's columns: bands as text, or the columns as JSON. Returns the exit code. */
export function printFormColumns(source: FormSource, json: boolean): number {
  const tree = parseColumns(source.text)
  if (!tree) {
    console.error(`spw form --columns: the parser returned no tree for ${source.uri}`)
    return 1
  }
  if (json) {
    console.log(formatJsonEnvelope('form', columnsToJson(tree), { uri: source.uri, nodes: tree.nodes, complete: tree.receipt.complete }))
    return 0
  }
  const widths = bandWidths(tree)
  const r = tree.receipt
  meta(`# spw form --columns  ${source.uri}  nodes=${tree.nodes} depth=${tree.maxDepth} glyphs=${tree.glyphs.length - 1} complete=${r.complete} prose=${r.proseFallback}`)
  console.log(`bands (deepest first): ${widths.join(' ')}`)
  console.log(`widest pass ${Math.max(...widths)} nodes; ${tree.nodes} nodes in ${widths.length} passes`)
  return r.proseFallback ? 1 : 0
}

function oneLine(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function printRhymes(rhymes: Rhyme[], top: number): void {
  for (const rhyme of rhymes.slice(0, top)) {
    console.log(`${rhyme.kind.padEnd(7)} ×${rhyme.instances.length}  ${rhyme.nodes} nodes  ${rhyme.files} file${rhyme.files === 1 ? '' : 's'}  ${oneLine(rhyme.template)}`)
    for (const hole of rhyme.holes.slice(0, 4)) {
      const more = hole.distinct > hole.fillers.length ? ` …(${hole.distinct})` : ''
      console.log(`    _ ${hole.kind}: ${hole.fillers.map(f => oneLine(f, 32)).join(' | ')}${more}`)
    }
    if (rhyme.holes.length > 4) console.log(`    … ${rhyme.holes.length - 4} more holes`)
    const at = rhyme.instances.slice(0, 3).map(i => `${i.file}:${i.line}`).join(', ')
    console.log(`    at ${at}${rhyme.instances.length > 3 ? ', …' : ''}`)
  }
}

/** Rhymes and refrains across the surfaces form walked. */
export function printFormRhymes(sources: FormSource[], options: FormRhymeOptions): void {
  const surfaces: RhymeSurface[] = []
  for (const source of sources) {
    const columns = parseColumns(source.text)
    if (columns) surfaces.push({ file: source.uri, source: source.text, columns })
  }
  const rhymes = findRhymes(surfaces, { minRows: options.min, sigil: options.sigil })
  const nodes = surfaces.reduce((sum, s) => sum + s.columns.nodes, 0)
  const refrains = rhymes.filter(r => r.kind === 'refrain').length
  if (options.json) {
    console.log(formatJsonEnvelope('form', { schema: 'spw.rhymes/1', surfaces: surfaces.length, nodes, rhymes }, {
      surfaces: surfaces.length,
      rhymes: rhymes.length - refrains,
      refrains,
    }))
    return
  }
  meta(`# spw form --rhymes  surfaces=${surfaces.length} nodes=${nodes} rhymes=${rhymes.length - refrains} refrains=${refrains}${options.sigil !== undefined ? ` sigil=${options.sigil}` : ''}`)
  if (!rhymes.length) console.log('(no shape written twice at this size)')
  printRhymes(rhymes, options.top)
}

export interface FormColumnModes {
  columns: boolean
  rhymes: boolean
  json: boolean
  min: number
  limit: number
  /** Whether --limit was written; rhymes print 12 unless it was. */
  limitGiven: boolean
  sigil?: string
  /** Whether the walk stopped at --max-files, so some surfaces were not read. */
  capped: boolean
  maxFiles: number
}

/** spw form --columns or --rhymes over the surfaces form gathered. Returns the exit code. */
export function runFormColumnModes(sources: FormSource[], modes: FormColumnModes): number {
  if (modes.rhymes) {
    if (modes.capped) meta(`# the walk stopped at --max-files ${modes.maxFiles}; raise it to read every surface`)
    printFormRhymes(sources, { json: modes.json, min: modes.min, top: modes.limitGiven ? modes.limit : 12, sigil: modes.sigil })
    return 0
  }
  if (sources.length > 1) {
    console.error('spw form --columns: one surface at a time; --rhymes reads several')
    return 2
  }
  return printFormColumns(sources[0]!, modes.json)
}
