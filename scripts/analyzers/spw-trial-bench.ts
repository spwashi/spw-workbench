/**
 * spw-trial-bench — every form on a trial card, read by each of seed's readers, side by side.
 *
 * A trial card (.agents/plans/interpretation-trials) lists the forms whose reading is in
 * question. The bench reads the cards with the parser, then reads each form twice: with the
 * parser and with the line reader (packages/spw-seed/src/line). It prints both readings and
 * says where they part: on how many lines a form is, on how many parts its body has, or on
 * the marks those parts lead with. It judges nothing; a card's judgment stays the owner's.
 *
 * Usage: node --import tsx scripts/analyzers/spw-trial-bench.ts [cards.spw] [--card name] [--parted] [--json]
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse, readLine } from '@spwashi/spw-seed'
import type { BodyNode, ExpressionNode, SeedExpressionNode, SlotReading } from '@spwashi/spw-seed'

type TermNode = ExpressionNode['terms'][number]

export const TRIAL_BENCH_CONTRACT = 'trial.bench/1'
const DEFAULT_CARDS = '.agents/plans/interpretation-trials/interpretation-trials.spw'

export interface TrialCard {
  name: string
  question: string
  forms: string[]
}

/** What the two readers can be compared on. */
export type Parting = 'lines' | 'parts' | 'marks'

export interface FormReading {
  form: string
  parser: { errors: number; lines: number; parts: number | null; marks: string[] }
  line: { whole: boolean; lines: number; parts: number | null; marks: string[]; separator: string; order: string; rest: string }
  parted: Parting[]
}

export interface BenchReport {
  contract: typeof TRIAL_BENCH_CONTRACT
  cards: Array<TrialCard & { readings: FormReading[] }>
  totals: { cards: number; forms: number; parted: number; by: Record<Parting, number> }
}

const LEADING_MARK = /^[^A-Za-z0-9_"'`\s]+/

function expressionsOf(node: SeedExpressionNode | undefined): ExpressionNode[] {
  if (!node) return []
  if (node.type === 'Sequence') return node.expressions
  return node.type === 'Expression' ? [node] : []
}

/** A string literal's text; a token keeps its quotes and escapes as written. */
function unquote(raw: string): string {
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value === 'string') return value
  } catch {
    // Not JSON-shaped (a phrase, a backtick string): fall through to the bare slice.
  }
  return raw.length >= 2 ? raw.slice(1, -1) : raw
}

function stringsOf(expression: ExpressionNode): string[] {
  const strings: string[] = []
  for (const item of expression.frame?.content ?? []) {
    if (item.type === 'Parameter' && item.value.type === 'Literal') strings.push(unquote(String(item.value.token.value)))
  }
  return strings
}

/** The cards of a trials file: each `#>anchor` followed by a `?["question"]{ … ~#forms: […] … }`. */
export function readTrialCards(source: string): TrialCard[] {
  const cards: TrialCard[] = []
  let anchor = ''
  for (const expression of expressionsOf(parse(source).ast?.expression)) {
    const head = expression.terms[0]
    if (head?.type === 'Particle' && head.aim === '>') {
      anchor = String(head.name.value)
      continue
    }
    if (head?.type !== 'Operation' || head.operator.value !== '?' || !head.body) continue
    const asked = head.frame?.content[0]
    const question = asked?.type === 'Parameter' && asked.value.type === 'Literal' ? unquote(String(asked.value.token.value)) : ''
    const forms: string[] = []
    for (const field of head.body.sequence.expressions) {
      const key = field.terms[0]
      if (key?.type === 'Annotation' && key.name.value === 'forms') forms.push(...stringsOf(field))
    }
    cards.push({ name: anchor, question, forms })
    anchor = ''
  }
  return cards
}

function bodyOf(expression: ExpressionNode): BodyNode | undefined {
  if (expression.body) return expression.body
  const head = expression.terms[0]
  return head?.type === 'Operation' ? head.body : undefined
}

function parserMark(term: TermNode | undefined): string {
  if (!term) return ''
  if (term.type === 'Operation') return term.position === 'postfix' ? '' : String(term.operator.value)
  if (term.type === 'Reference') return '@'
  if (term.type === 'Particle') return `#${term.aim}`
  return ''
}

function lineMark(reading: SlotReading): string {
  return LEADING_MARK.exec(reading.word.text)?.[0] ?? ''
}

/** What a reading left unread, at its own level and inside each body part. */
function unreadOf(reading: SlotReading): string {
  if (reading.compound) return [unreadOf(reading.compound.left), unreadOf(reading.compound.right)].filter(Boolean).join(' … ')
  return [...reading.parts.map(part => unreadOf(part.reading)), reading.rest.trim()].filter(Boolean).join(' … ')
}

function joinedLines(reading: SlotReading): number {
  return reading.compound ? joinedLines(reading.compound.left) + joinedLines(reading.compound.right) : 1
}

/** One form through both readers, and where they part. */
export function benchForm(form: string): FormReading {
  const parsed = parse(form)
  const expressions = expressionsOf(parsed.ast?.expression)
  const parserBody = expressions[0] ? bodyOf(expressions[0]) : undefined
  const parserParts = parserBody ? parserBody.sequence.expressions : null
  const parser = {
    errors: parsed.errors?.length ?? 0,
    lines: expressions.length,
    parts: parserParts ? parserParts.length : null,
    marks: (parserParts ?? []).map(part => parserMark(part.terms[0])),
  }

  const reading = readLine(form)
  const hasBody = !reading.compound && reading.slots.body !== undefined
  const line = {
    whole: reading.whole,
    lines: joinedLines(reading),
    parts: hasBody ? reading.parts.length : null,
    marks: hasBody ? reading.parts.map(part => lineMark(part.reading)) : [],
    separator: reading.separator,
    order: reading.order.join(' '),
    rest: unreadOf(reading),
  }

  const parted: Parting[] = []
  if (parser.lines !== line.lines || !line.whole) parted.push('lines')
  if (parser.parts !== null && line.parts !== null) {
    if (parser.parts !== line.parts) parted.push('parts')
    else if (parser.marks.join(' ') !== line.marks.join(' ')) parted.push('marks')
  }
  return { form, parser, line, parted }
}

export function benchCards(cards: TrialCard[]): BenchReport {
  const by: Record<Parting, number> = { lines: 0, parts: 0, marks: 0 }
  let forms = 0
  let parted = 0
  const read = cards.map(card => {
    const readings = card.forms.map(benchForm)
    for (const reading of readings) {
      forms++
      if (reading.parted.length) parted++
      for (const kind of reading.parted) by[kind]++
    }
    return { ...card, readings }
  })
  return { contract: TRIAL_BENCH_CONTRACT, cards: read, totals: { cards: cards.length, forms, parted, by } }
}

function count(n: number | null, noun: string): string {
  return n === null ? `no ${noun}` : `${n} ${noun}${n === 1 ? '' : 's'}`
}

export function renderReport(report: BenchReport, options: { partedOnly?: boolean } = {}): string {
  const out: string[] = []
  for (const card of report.cards) {
    const readings = options.partedOnly ? card.readings.filter(reading => reading.parted.length) : card.readings
    if (!readings.length) continue
    out.push(`${card.name}  ${card.question}`)
    for (const reading of readings) {
      const { parser, line } = reading
      out.push(`  ${reading.form}`)
      out.push(`    parser  ${count(parser.lines, 'line')}, ${count(parser.parts, 'part')}${parser.marks.some(Boolean) ? `, marks ${parser.marks.map(mark => mark || '·').join(' ')}` : ''}${parser.errors ? `, ${parser.errors} errors` : ''}`)
      out.push(`    line    ${count(line.lines, 'line')}, ${count(line.parts, 'part')}${line.marks.some(Boolean) ? `, marks ${line.marks.map(mark => mark || '·').join(' ')}` : ''}${line.separator ? `, joined by ${line.separator}` : ''}${line.rest ? `, unread ${JSON.stringify(line.rest)}` : ''}`)
      if (reading.parted.length) out.push(`    part on ${reading.parted.join(', ')}`)
    }
    out.push('')
  }
  const { totals } = report
  out.push(`${totals.cards} cards, ${totals.forms} forms; the readers part on ${totals.parted} (lines ${totals.by.lines}, parts ${totals.by.parts}, marks ${totals.by.marks})`)
  return out.join('\n')
}

function main(): void {
  const args = process.argv.slice(2)
  const flag = (name: string): boolean => args.includes(name)
  const cardAt = args.indexOf('--card')
  const only = cardAt >= 0 ? args[cardAt + 1] : undefined
  const file = args.find((arg, index) => !arg.startsWith('--') && (cardAt < 0 || index !== cardAt + 1)) ?? DEFAULT_CARDS
  let cards = readTrialCards(readFileSync(file, 'utf8'))
  if (only) cards = cards.filter(card => card.name === only || card.name === `wonder_trial_${only}`)
  if (!cards.length) {
    console.error(`no trial cards found in ${file}${only ? ` named ${only}` : ''}`)
    process.exit(1)
  }
  const report = benchCards(cards)
  console.log(flag('--json') ? JSON.stringify(report, null, 2) : renderReport(report, { partedOnly: flag('--parted') }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main()
