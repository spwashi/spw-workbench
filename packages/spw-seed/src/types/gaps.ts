import type { Span } from './position'

/**
 * Observable spacing classes between adjacent lexical anchors.
 *
 * Width may collapse within a class. Moving between classes is a separate,
 * potentially semantic operation for profiles that opt into gap affinity.
 */
export const GAP_CLASSES = ['tight', 'open', 'cadence', 'episode'] as const

export type GapClass = (typeof GAP_CLASSES)[number]

/** The exact source interval between two non-trivia, non-EOF tokens. */
export interface TokenGap {
  index: number
  class: GapClass
  raw: string
  span: Span
  /** Indices into the sibling LexOutput/ParseOutput token array. */
  leftTokenIndex: number
  rightTokenIndex: number
  /** Token indices for whitespace and comments contained by the interval. */
  triviaTokenIndices: number[]
  lineBreaks: number
}
