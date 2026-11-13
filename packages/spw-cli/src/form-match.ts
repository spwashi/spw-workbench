/**
 * spw form --match '<example>' — every place the surfaces write a form, given by example.
 *
 * The example is Spw with holes (seed experimental/shape-match): _ for any one
 * subtree, ... for any further siblings, and _ alone inside a word (lens(_)) for
 * any text there. Each hit prints where it starts and what filled each hole;
 * the paradigm lists what each hole was filled with across all hits, most
 * frequent first. Columns come from the nearest cache tier (columns-cache.ts),
 * and a last line says which tiers gave them and what they cost.
 */

import { compileShape, findShape, isShapePattern, type ShapeHit, type ShapeSurface } from '@spwashi/spw-seed'
import { ColumnsCache } from './columns-cache'
import { formatJsonEnvelope } from './envelope'
import { meta } from './view'

export interface FormMatchOptions {
  example: string
  json: boolean
  /** Hits printed (JSON keeps all). */
  limit: number
  /** Include matches inside another match. */
  nested: boolean
  cacheDir: string | null
  cacheMode: 'on' | 'read' | 'off'
}

const PROBLEMS: Record<string, string> = {
  unparsed: 'the example does not parse',
  empty: 'the example is empty',
  only_a_hole: 'the example is only holes, which would match everything',
  rest_not_last: '... may stand only for the last siblings of a body or a frame',
}

/** What filled each hole across hits: one list per hole, most frequent first. */
export function paradigm(hits: ShapeHit[]): Array<Array<{ filler: string; count: number }>> {
  const holes = Math.max(0, ...hits.map((h) => h.fillers.length))
  return Array.from({ length: holes }, (_, i) => {
    const counts = new Map<string, number>()
    for (const hit of hits) {
      const filler = (hit.fillers[i] ?? '').replace(/\s+/g, ' ').trim()
      counts.set(filler, (counts.get(filler) ?? 0) + 1)
    }
    return [...counts].map(([filler, count]) => ({ filler, count })).sort((a, b) => b.count - a.count || (a.filler < b.filler ? -1 : 1))
  })
}

const cut = (text: string, width: number): string => (text.length > width ? `${text.slice(0, width - 1)}…` : text)

export async function printFormMatch(sources: Array<{ uri: string; text: string }>, options: FormMatchOptions): Promise<number> {
  const pattern = compileShape(options.example)
  if (!isShapePattern(pattern)) {
    console.error(`spw form --match: ${PROBLEMS[pattern.problem] ?? pattern.problem}`)
    return 2
  }
  const cache = new ColumnsCache({ dir: options.cacheDir, mode: options.cacheMode })
  const surfaces: ShapeSurface[] = []
  for (const source of sources) surfaces.push({ ...source, tree: (await cache.get(source.text)).tree })
  const began = performance.now()
  const hits = findShape(pattern, surfaces, { outermost: !options.nested })
  const matchMs = Math.round(performance.now() - began)
  const words = paradigm(hits)

  if (options.json) {
    console.log(
      formatJsonEnvelope('form', { hits, paradigm: words }, {
        example: options.example,
        surfaces: sources.length,
        hits: hits.length,
        holes: pattern.holes.length,
        columns: cache.stats,
        matchMs,
      }),
    )
    return 0
  }

  meta(`# spw form --match ${JSON.stringify(options.example)}  surfaces=${sources.length} hits=${hits.length} holes=${words.length}`)
  for (const hit of hits.slice(0, options.limit)) {
    console.log(`${hit.uri}:${hit.line}:${hit.column}  ${cut(hit.head.trim(), 96)}`)
    if (hit.fillers.length) console.log(`    ${hit.fillers.map((f, i) => `_${i + 1} ${cut(f.replace(/\s+/g, ' ').trim() || '∅', 40)}`).join('   ')}`)
  }
  if (hits.length > options.limit) console.log(`… ${hits.length - options.limit} more (--limit N, or --json for all)`)
  if (words.length && hits.length) {
    console.log('Paradigm (what filled each hole, most frequent first):')
    words.forEach((list, i) => {
      if (list.length > 1 && list.every(({ count }) => count === 1)) {
        console.log(`  _${i + 1}  ${list.length} different, none twice; e.g. ${list.slice(0, 2).map(({ filler }) => cut(filler || '∅', 32)).join(' · ')}`)
        return
      }
      const shown = list.slice(0, 6).map(({ filler, count }) => `${cut(filler || '∅', 32)} ×${count}`)
      console.log(`  _${i + 1}  ${shown.join(' · ')}${list.length > 6 ? ` · ${list.length - 6} more` : ''}`)
    })
  }
  meta(`# ${cache.describe()}; match ${matchMs} ms`)
  return 0
}
