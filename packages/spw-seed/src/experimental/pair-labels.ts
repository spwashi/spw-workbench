/**
 * Pair labels — a label written on a brace pair, read beside the parser.
 *
 * Seed has written this form since `desugar` (normalize.ts): `A{}` becomes
 * `{_A }_A`, and form geometry moves labels on and off a pair. Container
 * nodes reserve `openLabel` and `closeLabel`, and no grammar rule sets them:
 * the parser reads an open label as the body's first member and a label after
 * the close as a loose term. This pass reads the labels from the tokens the
 * lexer already makes and changes none of them, so every line parses as it
 * did.
 *
 * Two close spellings are read. The repeated close writes the label after the
 * brace, `}_A`, as desugar does. The mirrored close writes it reversed before
 * the brace, `A_}` for a one-letter label, `lebal_}` for `label`: read
 * leftward from its brace it spells what the open spells rightward, so a scan
 * that starts at the end of a text meets the same characters in the same
 * order as one that starts at the beginning.
 *
 * A label makes a class of its own. A brace pairs only with a brace of its
 * kind that carries the same label, and bare braces pair with bare braces;
 * within a class the pairing is ordinary bracket matching. Classes do not see
 * each other, so labeled pairs may overlap without nesting, `{_A {_B }_A }_B`,
 * which a mounted consumer's notes call load-bearing for selection spans.
 * Where two pairs cross is reported, since a tree can hold a label only on a
 * pair that nests.
 *
 * A scan runs forward or backward. Forward, an open accumulates and a close
 * releases; backward, a close accumulates and an open releases. Both return
 * the same pairs for any text; what differs is the order of events and which
 * edges a cut text leaves waiting. Accumulate and release are the registry's
 * words for the two sides of a pair (.spw/registries/brace-physics.spw).
 *
 * A label on one end only finds no partner: `{_axes … }` leaves a labeled
 * open waiting and a bare close stray. Ten theory surfaces in this repo write
 * that form, so the scan also says what the leftover edges would pair as by
 * kind alone (`loose`). That reading is advisory: it lets a bare close hide a
 * missing labeled one, which the pairing proper never does.
 *
 * Not read here: angle capsules, streams and n-ranges (at the token level `>`
 * also ends a particle and an arrow).
 *
 * Experimental: what a pair label means is a trial (wonder_trial_pair_label),
 * and spw.pair-labels/1 may change.
 */

import type { LexProfile, Token } from '../types'
import { lex } from '../lexer'

export const PAIR_LABELS_SCHEMA = 'spw.pair-labels/1' as const

export type BraceKind = '{' | '[' | '('

/** The close of each brace kind. */
export const BRACE_CLOSE: Readonly<Record<BraceKind, string>> = Object.freeze({ '{': '}', '[': ']', '(': ')' })
export type PairScanDirection = 'forward' | 'backward'
export type PairCloseSpelling = 'repeated' | 'mirrored'

export interface BraceEdge {
  kind: BraceKind
  edge: 'open' | 'close'
  /** Offset of the brace character. */
  at: number
  /** One-based line of the brace character. */
  line: number
  /** The label as the open writes it, without its underscore; absent on a bare brace. */
  label?: string
  /** How a close wrote its label. */
  spelling?: PairCloseSpelling
}

export interface BracePair {
  kind: BraceKind
  /** The label both ends carry; absent on a bare pair, and on a loose pair whose ends differ. */
  label?: string
  open: BraceEdge
  close: BraceEdge
  /** How many pairs of the scan contain this one; zero on a loose pair. */
  depth: number
}

export interface BraceEvent {
  act: 'accumulate' | 'release' | 'stray'
  edge: BraceEdge
  /** For a release: the offset of the edge it released. */
  released?: number
}

export interface PairLabelScan {
  schema: typeof PAIR_LABELS_SCHEMA
  direction: PairScanDirection
  /** In source order, by where each opens. */
  pairs: BracePair[]
  /** Accumulated and never released, in source order: what a cut text leaves waiting. */
  unreleased: BraceEdge[]
  /** Releasing edges that found nothing of their class to release, in source order. */
  stray: BraceEdge[]
  /**
   * Advisory: what the unreleased and stray edges would pair as by kind alone,
   * such as a labeled open closed by a bare brace, or two ends whose labels differ.
   */
  loose: BracePair[]
  /** Pairs that overlap without nesting, as indexes into pairs, the earlier open first. */
  crossings: Array<[number, number]>
  /** Every brace in scan order, with what it did. */
  events: BraceEvent[]
  /** True when every brace found its partner. */
  whole: boolean
  /** True when no two pairs cross, so the pairs can be held as a tree. */
  tree: boolean
}

export interface PairLabelOptions {
  direction?: PairScanDirection
  /** Lex profile for the text; the default profile when absent. */
  profile?: LexProfile | string
}

const OPEN_OF: Record<string, BraceKind> = { '{': '{', '}': '{', '[': '[', ']': '[', '(': '(', ')': '(' }
const isBrace = (token: Token | undefined): token is Token =>
  !!token && (token.type === 'CONTAINER_OPEN' || token.type === 'CONTAINER_CLOSE') && token.value in OPEN_OF
const isOpen = (token: Token | undefined): boolean => isBrace(token) && token.type === 'CONTAINER_OPEN'

const touches = (left: Token | undefined, right: Token | undefined): boolean =>
  !!left && !!right && left.span.end.offset === right.span.start.offset

/** The token before index i that is not whitespace. */
function before(tokens: readonly Token[], i: number): Token | undefined {
  for (let j = i - 1; j >= 0; j--) if (tokens[j].type !== 'WHITESPACE') return tokens[j]
  return undefined
}

/**
 * `_name` against the brace before it. Not a label when it is a key (`_id:`),
 * a word with its own brace (`_b{`), or an open brace's whole content (`{_001}`).
 */
function leadingLabel(tokens: readonly Token[], i: number): string | undefined {
  const word = tokens[i + 1]
  if (!word || word.type !== 'IDENTIFIER' || !touches(tokens[i], word)) return undefined
  if (word.value.length < 2 || !word.value.startsWith('_')) return undefined
  const next = tokens[i + 2]
  if (touches(word, next)) {
    if (next.type === 'COLON' || isOpen(next)) return undefined
    if (isBrace(next) && isOpen(tokens[i])) return undefined
  }
  return word.value.slice(1)
}

/**
 * `eman_` against the close after it. Not a label when it is a binding's value
 * (`k: done_}`) or the brace's whole content (`{a_}`).
 */
function mirroredLabel(tokens: readonly Token[], i: number): string | undefined {
  const word = tokens[i - 1]
  if (!word || word.type !== 'IDENTIFIER' || !touches(word, tokens[i])) return undefined
  if (word.value.length < 2 || !word.value.endsWith('_')) return undefined
  if (touches(tokens[i - 2], word) && isOpen(tokens[i - 2])) return undefined
  if (before(tokens, i - 1)?.type === 'COLON') return undefined
  return [...word.value.slice(0, -1)].reverse().join('')
}

/** Every brace in the tokens, in source order, with the label it carries. */
export function braceEdges(tokens: readonly Token[]): BraceEdge[] {
  const edges: BraceEdge[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!isBrace(token)) continue
    const kind = OPEN_OF[token.value]
    const at = token.span.start.offset
    const line = token.span.start.line
    if (token.type === 'CONTAINER_OPEN') {
      const label = leadingLabel(tokens, i)
      edges.push(label === undefined ? { kind, edge: 'open', at, line } : { kind, edge: 'open', at, line, label })
      continue
    }
    const mirrored = mirroredLabel(tokens, i)
    const repeated = mirrored === undefined ? leadingLabel(tokens, i) : undefined
    if (mirrored !== undefined) edges.push({ kind, edge: 'close', at, line, label: mirrored, spelling: 'mirrored' })
    else if (repeated !== undefined) edges.push({ kind, edge: 'close', at, line, label: repeated, spelling: 'repeated' })
    else edges.push({ kind, edge: 'close', at, line })
  }
  return edges
}

const classOf = (edge: BraceEdge): string => `${edge.kind}${edge.label === undefined ? '' : `_${edge.label}`}`
const kindOf = (edge: BraceEdge): string => edge.kind
const bySource = (a: BraceEdge, b: BraceEdge): number => a.at - b.at

/** First index whose close is not below x, in a list ascending by close. */
function lowerBound(sorted: ReadonlyArray<{ close: number }>, x: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid].close < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

interface Matching {
  pairs: BracePair[]
  unreleased: BraceEdge[]
  stray: BraceEdge[]
  events: BraceEvent[]
}

/** Bracket matching within each class the key names, in one direction. */
function matchWithin(
  edges: readonly BraceEdge[],
  direction: PairScanDirection,
  keyOf: (edge: BraceEdge) => string,
): Matching {
  const accumulates = direction === 'forward' ? 'open' : 'close'
  const ordered = direction === 'forward' ? edges : [...edges].reverse()
  const waiting = new Map<string, BraceEdge[]>()
  const pairs: BracePair[] = []
  const stray: BraceEdge[] = []
  const events: BraceEvent[] = []

  for (const edge of ordered) {
    const key = keyOf(edge)
    if (edge.edge === accumulates) {
      const held = waiting.get(key)
      if (held) held.push(edge)
      else waiting.set(key, [edge])
      events.push({ act: 'accumulate', edge })
      continue
    }
    const partner = waiting.get(key)?.pop()
    if (!partner) {
      stray.push(edge)
      events.push({ act: 'stray', edge })
      continue
    }
    const open = direction === 'forward' ? partner : edge
    const close = direction === 'forward' ? edge : partner
    pairs.push(open.label !== undefined && open.label === close.label
      ? { kind: edge.kind, label: open.label, open, close, depth: 0 }
      : { kind: edge.kind, open, close, depth: 0 })
    events.push({ act: 'release', edge, released: partner.at })
  }

  pairs.sort((a, b) => a.open.at - b.open.at)
  return { pairs, unreleased: [...waiting.values()].flat().sort(bySource), stray: stray.sort(bySource), events }
}

/** Pair the edges in one direction. Total: any sequence of edges gets a reading. */
export function scanBraceEdges(edges: readonly BraceEdge[], direction: PairScanDirection = 'forward'): PairLabelScan {
  const { pairs, unreleased, stray, events } = matchWithin(edges, direction, classOf)
  const loose = matchWithin([...unreleased, ...stray].sort(bySource), direction, kindOf).pairs

  // Pairs still open at this pair's open either close after it (they contain it) or before it (they cross it).
  const open: Array<{ close: number; index: number }> = []
  const crossings: Array<[number, number]> = []
  pairs.forEach((pair, index) => {
    while (open.length && open[0].close < pair.open.at) open.shift()
    const at = lowerBound(open, pair.close.at)
    for (let i = 0; i < at; i++) crossings.push([open[i].index, index])
    pair.depth = open.length - at
    open.splice(at, 0, { close: pair.close.at, index })
  })
  crossings.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  return {
    schema: PAIR_LABELS_SCHEMA,
    direction,
    pairs,
    unreleased,
    stray,
    loose,
    crossings,
    events,
    whole: unreleased.length + stray.length === 0,
    tree: crossings.length === 0,
  }
}

/** Read the labels written on a text's braces, from its start or from its end. */
export function scanPairLabels(source: string, options: PairLabelOptions = {}): PairLabelScan {
  const { tokens } = lex(source, { profile: options.profile, eventPolicy: 'none' })
  return scanBraceEdges(braceEdges(tokens), options.direction ?? 'forward')
}

/** The labels of the pairs around an offset, by where each opens; a bare pair gives null. */
export function pairLabelsAround(scan: PairLabelScan, offset: number): Array<string | null> {
  return scan.pairs
    .filter((pair) => pair.open.at < offset && offset <= pair.close.at)
    .map((pair) => pair.label ?? null)
}

/**
 * The mirrored close for a label, or null when the lexer would not keep it as
 * one word: a label that ends in a digit or a hyphen has no mirror.
 */
export function mirrorPairLabel(label: string): string | null {
  if (!label) return null
  const mirrored = `${[...label].reverse().join('')}_`
  const { tokens } = lex(mirrored, { eventPolicy: 'none' })
  const words = tokens.filter((token) => token.type !== 'EOF')
  return words.length === 1 && words[0].type === 'IDENTIFIER' && words[0].value === mirrored ? mirrored : null
}
