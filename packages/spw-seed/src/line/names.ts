/**
 * The names a slot reading uses: the five slots of one line, the brace pair
 * each pair slot is written with, the joins between two lines and the bonds
 * they name, and the separators a body's parts are written with.
 *
 * Reader names agree with learn/readers.ts (CONTAINER_READER_NAMES,
 * OPERATOR_READER_NAMES); names.test.ts holds them together. They are copied
 * rather than imported so the reader slice does not pull in the AST walker.
 */

/** The slots of one line: the word, and the four pairs that may follow or lead it. */
export const SLOT_KEYS = ['word', 'mode', 'body', 'scene', 'concept'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]
export type PairKey = Exclude<SlotKey, 'word'>

/** Which lite-scanner bound each pair slot is written with. */
export type PairBound = 'frame' | 'body' | 'scope' | 'capsule'

export const PAIRS: Readonly<Record<PairKey, { open: string; close: string; bound: PairBound }>> = Object.freeze({
  mode: { open: '[', close: ']', bound: 'frame' },
  body: { open: '{', close: '}', bound: 'body' },
  scene: { open: '(', close: ')', bound: 'scope' },
  concept: { open: '<', close: '>', bound: 'capsule' },
})

/** The pair slot a lite-scanner bound opens, if any. */
export const PAIR_OF_BOUND: Readonly<Partial<Record<string, PairKey>>> = Object.freeze({
  frame: 'mode',
  body: 'body',
  scope: 'scene',
  capsule: 'concept',
})

/**
 * Each slot's names: the brace pair it is written with, the name a reader
 * gives it (docs/theory/spw/operators.spw `containers`), and the key a
 * consumer's slot reader has used for it (subject, scope, projection).
 */
export const SLOT_NAMES: Readonly<Record<SlotKey, { pair: string | null; reader: string; site: string }>> = Object.freeze({
  word: { pair: null, reader: 'word', site: 'subject' },
  mode: { pair: '[]', reader: 'mode', site: 'mode' },
  body: { pair: '{}', reader: 'definition', site: 'body' },
  scene: { pair: '()', reader: 'scene', site: 'scope' },
  concept: { pair: '< >', reader: 'concept', site: 'projection' },
})

/** Marks that join two lines, and the bond each one names. */
export const JOIN_MARKS = ['~', '^', '&', '@'] as const
export type JoinMark = (typeof JOIN_MARKS)[number]
export type BondName = 'potential' | 'ascension' | 'subject' | 'perspective'

export const BONDS: Readonly<Record<JoinMark, BondName>> = Object.freeze({
  '~': 'potential',
  '^': 'ascension',
  '&': 'subject',
  '@': 'perspective',
})

/** Body separators, in the precedence a body is split by: a sequence, a list, a movement, a tight body. */
export const SEPARATORS = [';', ',', '~>', '.'] as const
export type Separator = (typeof SEPARATORS)[number] | ''

/** Valence words that may lead a line as its charge: bone.boon home[x]. */
export const VALENCE_WORDS = ['bone', 'boon', 'bane', 'bonk', 'honk'] as const
