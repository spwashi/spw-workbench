/**
 * Quest — the first steps into Spw, read from docs/learn/quest.spw.
 *
 * loadQuest walks the parsed quest file (never a regex over its text) and
 * returns the steps in file order. checkStep parses a line with the real parser
 * and tests it against the shape the step's `check` names in ^["checks"].
 * Every host — the CLI, the language server, an editor walkthrough — imports
 * these two functions so a step passes or fails the same way everywhere.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type {
  ASTNode,
  BindingNode,
  ExpressionNode,
  OperationNode,
  ParticleNode,
  SeedNode,
  SequenceNode,
  TermNode,
} from '../types'
import { parse } from '../parser'
import type { ParseOutput } from '../parser'
import { walkAST } from '../instrumentation'
import { readMarks, type LineReading } from './readers'

/** One quest step, fields as written in quest.spw. */
export interface QuestStep {
  id: string
  try: string
  /** Follow-on lines checked with the same step (empty when the step has none). */
  then: string[]
  reads: string
  notice: string
  /** Name of the shape in ^["checks"] that a line must have. */
  check: string
  grow: string
  /** Panel fields a host may draw; absent when the step does not set them. */
  scene?: string
  speaker?: string
  bubble?: string
  layer?: string
  /** Every field as written, the optional ones included. */
  fields: Record<string, string | string[]>
}

export interface Quest {
  /** The file's `#>` name. */
  name: string | null
  steps: QuestStep[]
  /** Check name → the shape it describes, from ^["checks"]. */
  checks: Record<string, string>
  /** Host name → what that host does, from ^["hosts"]. */
  hosts: Record<string, string>
  /** Every other top-level ^["name"] frame's `key = "text"` fields (storyboard, intent). */
  frames: Record<string, Record<string, string>>
}

/** Which line of a step a shape belongs to. */
export type QuestLineRole = 'try' | 'then'

export interface QuestCheckResult {
  step: string
  check: string
  line: string
  pass: boolean
  /** True when the parse succeeded. */
  parsed: boolean
  /** Parser error messages, if any. */
  errors: string[]
  /** For checks with a separate `then` shape: which shape the line met. */
  matched?: QuestLineRole
  /**
   * Set when the parser cannot decide the check: `commands` means a terminal or
   * agent host must run the commands and pass on their exit codes.
   */
  host?: 'commands'
  reading: LineReading
}

export interface CheckLineOptions {
  /** Check against the `try` or the `then` shape; omitted, either shape passes. */
  role?: QuestLineRole
}

export class QuestFormatError extends Error {
  constructor(message: string) {
    super(`quest: ${message}`)
    this.name = 'QuestFormatError'
  }
}

const STEP_FIELDS = ['try', 'reads', 'notice', 'check', 'grow'] as const

/** Sigils that make an Operation in `operation_before_word` (`@` parses as a Reference). */
const WORD_OPERATORS = new Set(['~', '?', '!', '*', '.', '^', '#', '&', '=', '%', '$'])

type Shape = (ast: SeedNode) => boolean

interface ShapeCheck {
  kind: 'shape'
  /** One shape for every line, or a shape per line role. */
  shape: Shape | Record<QuestLineRole, Shape>
}

interface HostCheck {
  kind: 'commands'
}

/** The shapes ^["checks"] names, implemented over the parse result. */
export const QUEST_CHECKS: Readonly<Record<string, ShapeCheck | HostCheck>> = Object.freeze({
  parses: { kind: 'shape', shape: () => true },
  operation_before_word: { kind: 'shape', shape: hasOperationBeforeWord },
  frame_and_body: { kind: 'shape', shape: hasFrameAndBody },
  frame_address_and_binding: {
    kind: 'shape',
    shape: { try: hasDeixisParticle, then: hasOperation('=') },
  },
  path_ref: { kind: 'shape', shape: hasCitedReference },
  wonder_with_probe: { kind: 'shape', shape: hasWonderWithProbe },
  commands_pass: { kind: 'commands' },
})

// ── Loading ─────────────────────────────────────────────────────────────────

/** Read the steps, checks and hosts from quest.spw source. Throws QuestFormatError. */
export function loadQuest(source: string): Quest {
  const output = parse(source)
  if (!output.success || !output.ast) {
    throw new QuestFormatError(`quest.spw does not parse (${errorMessages(output).join('; ') || 'no tree'})`)
  }
  const top = sequenceTerms(output.ast.expression)

  const stepsFrame = frameNamed(top, 'steps')
  if (!stepsFrame) throw new QuestFormatError('missing ^["steps"] frame')

  const checks = stringFields(frameNamed(top, 'checks'))
  const hosts = stringFields(frameNamed(top, 'hosts'))
  const steps = readSteps(stepsFrame)

  for (const step of steps) {
    if (!(step.check in QUEST_CHECKS)) {
      throw new QuestFormatError(`step ${step.id} names check "${step.check}", which no host implements`)
    }
    if (!(step.check in checks)) {
      throw new QuestFormatError(`step ${step.id} names check "${step.check}", which ^["checks"] does not describe`)
    }
  }

  const frames: Record<string, Record<string, string>> = {}
  for (const term of top) {
    const name = frameName(term)
    if (!name || name === 'steps' || name === 'checks' || name === 'hosts') continue
    const fields = stringFields(term as OperationNode)
    if (Object.keys(fields).length > 0) frames[name] = fields
  }

  const anchor = top.find((t): t is ParticleNode => t.type === 'Particle' && (t as ParticleNode).aim === '>')
  return { name: anchor?.name.value ?? null, steps, checks, hosts, frames }
}

function readSteps(stepsFrame: OperationNode): QuestStep[] {
  const steps: QuestStep[] = []
  for (const term of sequenceTerms(stepsFrame.body?.sequence)) {
    if (term.type !== 'Binding') continue
    const binding = term as BindingNode
    if (binding.key.type !== 'Identifier') continue
    const id = binding.key.token.value
    const facet = binding.value.terms.find(
      (t): t is OperationNode => t.type === 'Operation' && (t as OperationNode).operator.value === '.',
    )
    if (!facet?.body) throw new QuestFormatError(`step ${id} is not a .{ } facet`)

    const fields = assignments(sequenceTerms(facet.body.sequence))
    const missing = STEP_FIELDS.filter(field => typeof fields.get(field) !== 'string')
    if (missing.length > 0) {
      throw new QuestFormatError(`step ${id} is missing ${missing.join(', ')}`)
    }
    const then = fields.get('then')
    steps.push({
      id,
      try: fields.get('try') as string,
      then: Array.isArray(then) ? then : typeof then === 'string' ? [then] : [],
      reads: fields.get('reads') as string,
      notice: fields.get('notice') as string,
      check: fields.get('check') as string,
      grow: fields.get('grow') as string,
      ...panelFields(fields),
      fields: Object.fromEntries(fields),
    })
  }
  if (steps.length === 0) throw new QuestFormatError('^["steps"] holds no steps')
  return steps
}

const PANEL_FIELDS = ['scene', 'speaker', 'bubble', 'layer'] as const

function panelFields(fields: Map<string, string | string[]>): Partial<Pick<QuestStep, typeof PANEL_FIELDS[number]>> {
  const out: Partial<Pick<QuestStep, typeof PANEL_FIELDS[number]>> = {}
  for (const key of PANEL_FIELDS) {
    const value = fields.get(key)
    if (typeof value === 'string') out[key] = value
  }
  return out
}

/** `^["name"]{ … }` at the top of the file. */
function frameNamed(terms: TermNode[], name: string): OperationNode | undefined {
  return terms.find((term): term is OperationNode => frameName(term) === name)
}

/** The name of a `^["name"]{ … }` frame, or null for any other term. */
function frameName(term: TermNode): string | null {
  if (term.type !== 'Operation') return null
  if (term.operator.value !== '^' || !term.frame || !term.body) return null
  const first = term.frame.content[0]
  if (first?.type !== 'Parameter' || first.value.type !== 'Literal') return null
  return literalText(first.value.token.value)
}

/** `key = "value"` fields of a frame body; non-string values are skipped. */
function stringFields(frame: OperationNode | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!frame?.body) return out
  for (const [key, value] of assignments(sequenceTerms(frame.body.sequence))) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

/**
 * `key = value` arrives as three sibling steps: Identifier, `=` Operation, value.
 * Values are a literal's text, or a `#[ … ]` set of literals as an array.
 */
function assignments(terms: TermNode[]): Map<string, string | string[]> {
  const out = new Map<string, string | string[]>()
  for (let i = 0; i + 2 < terms.length; i++) {
    const key = terms[i]
    const eq = terms[i + 1]
    const value = terms[i + 2]
    if (key?.type !== 'Identifier') continue
    if (eq?.type !== 'Operation' || (eq as OperationNode).operator.value !== '=' || (eq as OperationNode).operatorLabel) continue
    const read = valueOf(value)
    if (read === undefined) continue
    out.set(key.token.value, read)
    i += 2
  }
  return out
}

function valueOf(term: TermNode | undefined): string | string[] | undefined {
  if (!term) return undefined
  if (term.type === 'Literal') return literalText(term.token.value)
  if (term.type === 'Operation' && term.operator.value === '#' && term.frame) {
    const items: string[] = []
    for (const part of term.frame.content) {
      if (part.type === 'Parameter' && part.value.type === 'Literal') items.push(literalText(part.value.token.value))
    }
    return items
  }
  return undefined
}

/** The terms of each step in a sequence, flattened (one term per step in quest.spw). */
function sequenceTerms(node: ASTNode | undefined): TermNode[] {
  if (!node) return []
  if (node.type === 'Expression') return (node as ExpressionNode).terms
  if (node.type !== 'Sequence') return []
  return (node as SequenceNode).expressions.flatMap(expression => expression.terms)
}

/** Text inside a string or phrase token, with `\x` escapes undone. */
export function literalText(raw: string): string {
  const open = raw[0]
  if ((open === '"' || open === "'" || open === '`') && raw.length >= 2 && raw.endsWith(open)) {
    return raw.slice(1, -1).replace(/\\(.)/g, '$1')
  }
  return raw
}

// ── Checking ────────────────────────────────────────────────────────────────

/** Check a line against one step of a loaded quest. */
export function checkStep(
  quest: Quest,
  stepId: string,
  line: string,
  options: CheckLineOptions = {},
): QuestCheckResult {
  const step = quest.steps.find(candidate => candidate.id === stepId)
  if (!step) {
    throw new QuestFormatError(`no step "${stepId}" (steps: ${quest.steps.map(s => s.id).join(', ')})`)
  }
  return { step: step.id, ...checkLine(step.check, line, options) }
}

/** Check a line against a named shape from ^["checks"]. */
export function checkLine(
  checkName: string,
  line: string,
  options: CheckLineOptions = {},
): Omit<QuestCheckResult, 'step'> {
  const check = QUEST_CHECKS[checkName]
  if (!check) throw new QuestFormatError(`unknown check "${checkName}"`)

  if (check.kind === 'commands') {
    return {
      check: checkName,
      line,
      pass: false,
      parsed: false,
      errors: [],
      host: 'commands',
      reading: { operators: [], containers: [] },
    }
  }

  const output = parse(line)
  const parsed = output.success && !!output.ast
  const errors = errorMessages(output)
  const reading = readMarks(output.ast)
  const base = { check: checkName, line, parsed, errors, reading }
  if (!parsed || !output.ast) return { ...base, pass: false }

  const ast = output.ast
  if (typeof check.shape === 'function') {
    return { ...base, pass: check.shape(ast) }
  }
  const roles: QuestLineRole[] = options.role ? [options.role] : ['try', 'then']
  const shapes = check.shape
  const matched = roles.find(role => shapes[role](ast))
  return matched ? { ...base, pass: true, matched } : { ...base, pass: false }
}

function errorMessages(output: ParseOutput<SeedNode>): string[] {
  return output.errors.map(event => {
    const data = event.data as { message?: unknown } | undefined
    return typeof data?.message === 'string' ? data.message : event.type
  })
}

// ── Shapes ──────────────────────────────────────────────────────────────────

function some(root: ASTNode, test: (node: ASTNode) => boolean): boolean {
  let found = false
  walkAST(root, node => {
    if (found) return false
    if (test(node)) {
      found = true
      return false
    }
    return undefined
  })
  return found
}

function isOperation(node: ASTNode, sigil?: string): node is OperationNode {
  return node.type === 'Operation' && (sigil === undefined || (node as OperationNode).operator.value === sigil)
}

/** An Operation on a word sigil applied to an Identifier, or `@word` (a Reference). */
function hasOperationBeforeWord(ast: SeedNode): boolean {
  return some(ast, node => {
    if (node.type === 'Reference') return true
    if (!isOperation(node) || !WORD_OPERATORS.has(node.operator.value)) return false
    return !!node.operatorLabel || node.subject?.type === 'Identifier'
  })
}

/** An Expression with a Frame holding a Parameter and a Body of at least two parts. */
function hasFrameAndBody(ast: SeedNode): boolean {
  return some(ast, node => {
    if (node.type !== 'Expression') return false
    const { frame, body } = node as ExpressionNode
    if (!frame || !body) return false
    return frame.content.some(part => part.type === 'Parameter') && body.sequence.expressions.length >= 2
  })
}

/** A `#>name` particle. */
function hasDeixisParticle(ast: SeedNode): boolean {
  return some(ast, node => node.type === 'Particle' && (node as ParticleNode).aim === '>')
}

function hasOperation(sigil: string): Shape {
  return ast => some(ast, node => isOperation(node, sigil))
}

/** `@name: ~"path"` — a Binding keyed by a Reference whose value holds a PathRef. */
function hasCitedReference(ast: SeedNode): boolean {
  return some(ast, node => {
    if (node.type !== 'Binding') return false
    const binding = node as BindingNode
    return binding.key.type === 'Reference' && some(binding.value, inner => inner.type === 'PathRef')
  })
}

/** `?[…]{ … !probe … }` — a framed wonder whose body holds an action named probe. */
function hasWonderWithProbe(ast: SeedNode): boolean {
  return some(ast, node => {
    if (!isOperation(node, '?') || !node.frame || !node.body) return false
    return some(node.body, inner => isOperation(inner, '!') && inner.operatorLabel?.value === 'probe')
  })
}
