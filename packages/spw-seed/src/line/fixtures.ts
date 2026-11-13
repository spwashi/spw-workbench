/**
 * Lines the slot reader is held to: the forms on the interpretation-trials
 * cards, the lines a canvas host lost text on, and the edges of the reading
 * (unclosed pairs, repeats, quotes, nesting, a second line). Each row says
 * what a reader should see; the laws in write.test.ts run over every row.
 */

import type { BondName, PairKey, Separator, SlotKey } from './names'

export interface LineFixture {
  line: string
  note: string
  word?: string
  order?: SlotKey[]
  slots?: Partial<Record<PairKey, string>>
  lead?: Array<'scene' | 'concept'>
  parts?: string[]
  separator?: Separator
  charge?: string[]
  rest?: string
  whole?: boolean
  /** For a join: its bond, then the words of its two sides. */
  join?: { bond: BondName; left: string; right: string; spaced: boolean }
}

export const LINE_FIXTURES: readonly LineFixture[] = [
  {
    line: '^kept[thursday]{ .day["2026-11-27"] .chapter[15] }',
    note: 'a dot after a gap is the ground mark leading a word, not a tight join: the body is not split at it',
    word: '^kept',
    order: ['word', 'mode', 'body'],
    slots: { mode: 'thursday', body: '.day["2026-11-27"] .chapter[15]' },
    parts: ['.day["2026-11-27"] .chapter[15]'],
    separator: '',
    whole: true,
  },
  {
    line: 'key{ a.b .c }',
    note: 'a tight dot still splits where one is written; a led word beside it stays whole',
    word: 'key',
    parts: ['a', 'b .c'],
    separator: '.',
  },
  {
    line: 'home[hook]{software.art.practice}(atlas)<person>',
    note: 'the canvas host standing line: every slot, a tight body',
    word: 'home',
    order: ['word', 'mode', 'body', 'scene', 'concept'],
    slots: { mode: 'hook', body: 'software.art.practice', scene: 'atlas', concept: 'person' },
    parts: ['software', 'art', 'practice'],
    separator: '.',
    whole: true,
  },
  { line: '<person>home', note: 'a concept written first leads the word', word: 'home', lead: ['concept'], order: ['concept', 'word'], whole: true },
  { line: '(atlas)home{a}', note: 'a scene written first leads the word', word: 'home', lead: ['scene'], order: ['scene', 'word', 'body'], whole: true },
  {
    line: 'beans<food>(kitchen)[mode]{stew}',
    note: 'pairs in any order; a canvas host wrote this back as beans<food>',
    word: 'beans',
    order: ['word', 'concept', 'scene', 'mode', 'body'],
    slots: { concept: 'food', scene: 'kitchen', mode: 'mode', body: 'stew' },
    whole: true,
  },
  {
    line: 'home<person>(atlas)[hook]{x}',
    note: 'a canvas host dropped (atlas)[hook]{x}',
    order: ['word', 'concept', 'scene', 'mode', 'body'],
    whole: true,
  },
  { line: 'word[mode]{body}(scene)<concept>', note: 'slot order, concept last', order: ['word', 'mode', 'body', 'scene', 'concept'], whole: true },
  { line: 'word<concept>(scene)[mode]{body}', note: 'slot order, concept first', order: ['word', 'concept', 'scene', 'mode', 'body'], whole: true },
  { line: 'home(atlas){a}', note: 'scene before body', order: ['word', 'scene', 'body'], whole: true },
  { line: 'home{a}(atlas)', note: 'scene after body', order: ['word', 'body', 'scene'], whole: true },
  { line: 'key = value', note: 'a spaced = is not a slot; a canvas host wrote this back as key', word: 'key', rest: ' = value', whole: false },
  { line: 'plan = @plan', note: 'a handle after a spaced = joins nothing', word: 'plan', rest: ' = @plan', whole: false },
  { line: 'bagel<scent>coffee', note: '<…> followed by a word is a relation, not a slot', word: 'bagel', rest: '<scent>coffee', whole: false },
  { line: 'foo<5>bar', note: 'a relation with a number channel', word: 'foo', rest: '<5>bar', whole: false },
  {
    line: '{chronicles} <of> (narnia)',
    note: 'a line with no word: a performance of a title',
    word: '',
    order: ['body', 'concept', 'scene'],
    slots: { body: 'chronicles', concept: 'of', scene: 'narnia' },
    whole: true,
  },
  {
    line: 'ecestudent@ece.120~?[transistors work.how]',
    note: 'two joins, grouping left: (ecestudent@ece.120)~(?[…])',
    join: { bond: 'potential', left: '', right: '?', spaced: false },
    whole: true,
  },
  {
    line: 'ecestudent @ ece.120 ~ ?[transistors work.how]',
    note: 'the same joins, spaced alike on both sides',
    join: { bond: 'potential', left: '', right: '?', spaced: true },
    whole: true,
  },
  { line: '@plan', note: 'a handle alone joins nothing', word: '@plan', whole: true },
  { line: 'door~', note: 'a mark that touches one side stays with its word', word: 'door~', whole: true },
  { line: 'home{a ~> b}', note: 'a movement body', parts: ['a', 'b'], separator: '~>', whole: true },
  { line: 'home{a; b, c}', note: 'a sequence outranks a list', parts: ['a', 'b, c'], separator: ';', whole: true },
  { line: 'home{a{b}, c[d]}', note: 'parts that are expressions', parts: ['a{b}', 'c[d]'], separator: ',', whole: true },
  { line: 'home{"a, b", c}', note: 'a quoted comma is not a separator', parts: ['"a, b"', 'c'], separator: ',', whole: true },
  { line: "home{don't stop}", note: 'an apostrophe opens no string', slots: { body: "don't stop" }, whole: true },
  { line: 'home{a..b}', note: '.. is a connector, not two tight dots', parts: ['a..b'], separator: '', whole: true },
  { line: 'home[a][b]', note: 'a slot kind once; the repeat is unread', slots: { mode: 'a' }, rest: '[b]', whole: false },
  { line: 'home{a', note: 'an unclosed pair is left unread, never closed for the writer', word: 'home', rest: '{a', whole: false },
  { line: 'home[hook] {x}', note: 'spaces between pairs', order: ['word', 'mode', 'body'], whole: true },
  { line: 'bone.boon home[x]', note: 'a leading valence chain is charge', charge: ['bone', 'boon'], word: 'home', whole: true },
  { line: 'one<tag>\ntwo', note: 'a reading stops at the line; the next line is rest', word: 'one', slots: { concept: 'tag' }, rest: '\ntwo', whole: false },
  {
    line: '$box[measure]{presence.flow}<measurement>',
    note: 'an operator-led word keeps its concept slot',
    word: '$box',
    order: ['word', 'mode', 'body', 'concept'],
    whole: true,
  },
  { line: '?<a, b>[reg=pipeline]', note: 'a stream list after ? reads as a concept slot here; parity with the parser is open', word: '?', slots: { concept: 'a, b', mode: 'reg=pipeline' }, whole: true },
  { line: 'home{ a , b }', note: 'padding inside a body is kept', parts: ['a', 'b'], separator: ',', whole: true },
]
