/**
 * Named intermediate representation kinds — the composition spine.
 *
 * Not every kind is materialized on every path; the graph of refs is the model.
 *
 * @see docs/theory/spw/ir-interconnect.spw
 */

export const IR_KINDS = [
  'preprocess',
  'lex',
  'parse',
  'onf',
  'stack',
  'identity',
  'form',
  'graph',
  'attention',
  'bias',
  'measure',
  'probe',
  'resonance',
  'selection',
  'plan',
  /** Patch product — selection + differential + narrative (apply under ceiling). */
  'patch',
  'stream',
  'precipitate',
  'cache',
  'algo',
  'opt',
  'envelope',
  'kb',
  'flow',
  'phrase',
  'charge',
] as const

export type IrKind = (typeof IR_KINDS)[number]

/** Edge semantics between IR nodes — how interconnectedness is named. */
export const IR_EDGE_KINDS = [
  'produces', // A → B: stage output
  'consumes', // A ← B: input dependency
  'projects', // A → view of B
  'resonates', // soft geometric/event couple
  'precipitates', // stage fallout
  'optimizes', // rewrite/memo channel
  'traverses', // crawl/lens walk
  'gates', // channel forbids/allows
  'cites', // pathRef / =exp / bias
] as const

export type IrEdgeKind = (typeof IR_EDGE_KINDS)[number]
