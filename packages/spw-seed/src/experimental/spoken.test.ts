/**
 * A line said in names. The laws: a join is heard, a nested body says where it
 * ends, a label names its body on both ends, nothing written goes unsaid and
 * nothing is said twice. No test here knows what a screen reader or a listener
 * does with the words.
 */
import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from '../line/fixtures'
import { BONDS, SLOT_NAMES } from '../line/names'
import { OPERATOR_READER_NAMES } from '../learn/readers'
import { SPOKEN_NAMES, SPOKEN_NAMES_SITE, SPOKEN_SCHEMA, spokenLine, unsaid, type SpokenLine } from './spoken'

const say = (line: string): string => spokenLine(line).text

const KEPT = '^kept[thursday]{_thursday .day["2026-11-27"] .chapter[15] .carrier[porter] *kept_place{ ~warm[4] } yadsruht_}'

const SAMPLES = [
  '~garden[care]{seed, water}',
  'bone.boon home[x]',
  '<person>home(atlas){ a ~> b }',
  'ecestudent@ece.120~?[transistors work.how]',
  KEPT,
  '^board{ @hold[upright] *lanes[3] ~pace[calm] }',
  '#>anchor_name',
  '#:layer #!semantics',
  '~#title: "Plates"',
  '.{ surfaces: 1368, braces: 148819 }',
  '?["Heard once, does a line keep its shape?"]{',
  'home{a{b}, c[d]}',
  '*kept_place{ ~warm[8] !ready &with[berry] #says["the place is set"] }',
  'home{a',
  '}}} ]]',
  '{chronicles} <of> (narnia)',
  ' >>[2026-11-12 19:05] verify — 22 tests pass',
  '',
]

/** The written text of every clause and every spoken-for span, in written order, with the gaps taken out. */
function readBack(line: SpokenLine): string {
  const spans = [...line.clauses.map((c) => [c.start, c.end] as [number, number]), ...line.implied].sort((a, b) => a[0] - b[0])
  return spans.map(([start, end]) => line.source.slice(start, end)).join('').replace(/\s+/g, '')
}

function overlaps(line: SpokenLine): string[] {
  const spans = [...line.clauses.map((c) => ({ start: c.start, end: c.end, what: c.role as string })), ...line.implied.map(([start, end]) => ({ start, end, what: 'implied' }))]
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const out: string[] = []
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) out.push(`${spans[i - 1].what}[${spans[i - 1].start},${spans[i - 1].end}) and ${spans[i].what}[${spans[i].start},${spans[i].end})`)
  }
  return out
}

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const PIECES = ['home', 'seed', 'water', 'kept_place', '_a', 'a_', '~', '#', '.', '?', '!', '*', '&', '@', '^', '$', '%', '=', '#>', '{', '}', '[', ']', '(', ')', '<', '>', ',', ';', '~>', ':', ' ', ' ', '"', 'x: ', '12', '..']

function generated(rand: () => number): string {
  const count = 1 + Math.floor(rand() * 14)
  let out = ''
  for (let i = 0; i < count; i++) out += PIECES[Math.floor(rand() * PIECES.length)]
  return out
}

describe('spokenLine', () => {
  it('says a line in the names of its mark, its slots and its join', () => {
    const line = spokenLine('~garden[care]{seed, water}')
    expect(line.schema).toBe(SPOKEN_SCHEMA)
    expect(line.text).toBe('potential garden, mode care, definition, list of 2: seed, water')
    expect(line.clauses.map((c) => c.role)).toEqual(['mark', 'word', 'slot', 'slot', 'join', 'word', 'word'])
    expect(line.unread).toBe(0)
  })

  it('says three lines that differ only in their join three ways', () => {
    const said = [',', ';', '.', ' ~> '].map((join) => say(`~garden[care]{seed${join}water}`))
    expect(new Set(said).size).toBe(4)
    expect(said).toEqual([
      'potential garden, mode care, definition, list of 2: seed, water',
      'potential garden, mode care, definition, sequence of 2: seed, water',
      'potential garden, mode care, definition, tight of 2: seed, water',
      'potential garden, mode care, definition, movement of 2: seed, water',
    ])
  })

  it('takes its words from tables a host may replace', () => {
    expect(spokenLine('~garden[care]{seed, water}', { names: SPOKEN_NAMES_SITE, counts: false }).text).toBe('potential garden, mode care, body, list: seed, water')
    const plain = { ...SPOKEN_NAMES, joins: { ...SPOKEN_NAMES.joins, ',': '' } }
    expect(spokenLine('~garden[care]{seed, water}', { names: plain }).text).toBe('potential garden, mode care, definition, seed, water')
    expect(spokenLine('*kept_place', { word: (written) => written }).text).toBe('value kept_place')
  })

  it('keeps the operator, bond and slot names the reader tables hold', () => {
    for (const [mark, name] of Object.entries(OPERATOR_READER_NAMES)) expect(SPOKEN_NAMES.marks[mark], mark).toBe(name)
    expect(SPOKEN_NAMES.bonds).toEqual(BONDS)
    expect(SPOKEN_NAMES.slots.body).toBe(SLOT_NAMES.body.reader)
    expect(SPOKEN_NAMES_SITE.slots.scene).toBe(SLOT_NAMES.scene.site)
  })

  it('says where a body ends when it held another pair, and not when it held words', () => {
    expect(say('home{a, b}')).toBe('home, definition, list of 2: a, b')
    expect(say('home{a{b}, c[d]}')).toBe('home, definition, list of 2: a, definition, b; c, mode d; end home')
    expect(spokenLine('home{a, b}', { ends: 'all' }).text).toBe('home, definition, list of 2: a, b; end home')
    expect(spokenLine('home{a{b}, c[d]}', { ends: 'none' }).text).toBe('home, definition, list of 2: a, definition, b; c, mode d')
  })

  it('says a pair label as the name of its body, the same for a repeated and a mirrored close', () => {
    const mirrored = spokenLine(KEPT)
    const repeated = spokenLine(KEPT.replace(' yadsruht_}', ' }_thursday'))
    expect(mirrored.text).toBe(
      'ascension kept, mode thursday, definition, labeled thursday, ground day, mode 2026-11-27, ground chapter, mode 15, ground carrier, mode porter, value kept place, definition, potential warm, mode 4; end kept place; end thursday',
    )
    expect(repeated.text).toBe(mirrored.text)
    expect(mirrored.clauses.filter((c) => c.role === 'label')).toHaveLength(1)
    expect(mirrored.unread + repeated.unread).toBe(0)
  })

  it('says parts set beside each other one after another, and a game state line whole', () => {
    expect(say('^board{ @hold[upright] *lanes[3] ~pace[calm] }')).toBe(
      'ascension board, definition, perspective hold, mode upright, value lanes, mode 3, potential pace, mode calm; end board',
    )
    expect(say('.{ surfaces: 1368, braces: 148819 }')).toBe('ground definition, list of 2: key surfaces, 1368, key braces, 148819')
    expect(say('#:layer #!semantics')).toBe('lens layer, focus semantics')
  })

  it('says a join between two lines by its bond', () => {
    expect(say('ecestudent@ece.120~?[transistors work.how]')).toBe('ecestudent, perspective, ece.120, potential, wonder mode transistors work.how')
  })

  it('says a mark that stands alone by its name, not as something unread', () => {
    const line = spokenLine('^~x')
    expect(line.clauses.map((c) => c.role)).toEqual(['mark', 'bond', 'word'])
    expect(line.text).toBe('ascension potential, x')
    expect(line.unread).toBe(0)
  })

  it('says what no slot read as written, and counts it', () => {
    const cut = spokenLine('home{a')
    expect(cut.text).toBe('home, unread {a')
    expect(cut.unread).toBe(2)
    expect(spokenLine('}}} ]]').unread).toBe(5)
    expect(spokenLine('').clauses).toEqual([])
  })

  it('reads the first line only', () => {
    expect(spokenLine('one[a]\ntwo[b]').text).toBe('one, mode a')
  })

  it('leaves nothing written unsaid and says nothing twice, on every fixture and sample', () => {
    for (const line of [...LINE_FIXTURES.map((f) => f.line), ...SAMPLES]) {
      const said = spokenLine(line)
      expect(unsaid(said).map((i) => said.source[i]).join(''), line).toBe('')
      expect(overlaps(said), line).toEqual([])
      expect(readBack(said), line).toBe(said.source.replace(/\s+/g, ''))
    }
  })

  it('holds the same on generated text, garbled text included', () => {
    const rand = seeded(20261112)
    for (let i = 0; i < 1500; i++) {
      const line = generated(rand)
      const said = spokenLine(line)
      expect(unsaid(said), line).toEqual([])
      expect(overlaps(said), line).toEqual([])
      expect(readBack(said), line).toBe(said.source.replace(/\s+/g, ''))
      for (const clause of said.clauses) {
        expect(clause.start, line).toBeGreaterThanOrEqual(0)
        expect(clause.end, line).toBeLessThanOrEqual(said.source.length)
      }
      expect(spokenLine(line).text, line).toBe(said.text)
    }
  })
})
