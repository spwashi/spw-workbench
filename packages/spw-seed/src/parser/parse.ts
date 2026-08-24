import type { ParseEvent, SeedNode, ParserOptions } from '../types'
import { DEFAULT_OPTIONS, retainsParseEvent } from '../types'
import type { ParseOutput } from './output'
import { classifyTokenGaps, tokenize, resolveLexProfile } from '../lexer'
import { createTokenStream, current, skipWhitespace, getPosition } from '../combinators'
import { seedNode } from '../grammar'
import {
  applyDialectPreprocess,
  collectMachineLintWarnings,
  isDialectId,
  resolveSurfaceProfile,
  type DialectId,
} from '../dialect'
import { scanExperimentalRefs } from '../experimental'

/**
 * Parse Spw source code into AST.
 *
 * When `autoDialect` is enabled (default), detects Spw.b/l/m/x/q/f/p/t from
 * headers/pragmas/path and applies dialect metasyntax (e.g. Spw.l newline-as-space).
 *
 * @spw:portable:seed[layer=parser,system=seed-parser,extract=candidate,basis=no-dom|core-invariants]
 * @spw:seed:kernel[system=seed-parser,extract=candidate,density=kernel,basis=core-invariants]
 * @spw:lens:syntactic
 */
export function parse(
  input: string,
  options: Partial<ParserOptions> = {}
): ParseOutput<SeedNode> {
  const startTime = performance.now()
  const opts: ParserOptions = { ...DEFAULT_OPTIONS, ...options }
  const events: ParseEvent[] = []
  const errors: ParseEvent[] = []
  const warnings: ParseEvent[] = []
  let generatedEvents = 0

  const observeEvent = (event: ParseEvent): void => {
    generatedEvents++
    if (event.type === 'error') errors.push(event)
    if (event.type === 'warning') warnings.push(event)
    if (retainsParseEvent(opts.eventPolicy, event)) events.push(event)
  }

  const auto = opts.autoDialect !== false
  let source = input
  let dialect: string | undefined
  let dialectSource: string | undefined
  let dialectPreprocessed = false

  if (auto || opts.dialect || opts.path) {
    const explicit = opts.dialect && isDialectId(opts.dialect) ? opts.dialect as DialectId : undefined
    const stack = resolveSurfaceProfile(input, {
      dialect: explicit,
      path: opts.path,
    })
    dialect = stack.dialect
    dialectSource = stack.dialectSource

    if (!opts.contextMode || options.contextMode === undefined) {
      opts.contextMode = stack.contextMode
    }
    if (!opts.lexProfile) {
      opts.lexProfile = stack.lex === 'prose' || stack.metasyntax.unknownAsText
        ? 'prose'
        : stack.lex
    }

    if (stack.metasyntax.newlineAsSpace) {
      const next = applyDialectPreprocess(input, stack.dialect, true)
      if (next !== input) {
        source = next
        dialectPreprocessed = true
      }
    }

    if (stack.metasyntax.machineLint) {
      for (const msg of collectMachineLintWarnings(input)) {
        const evt = {
          type: 'warning' as const,
          rule: 'dialect.machine_lint',
          position: { offset: 0, line: 1, column: 1 },
          data: { message: msg },
          timestamp: performance.now(),
          depth: 0,
        }
        observeEvent(evt)
      }
    }
  }

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const lexGen = tokenize(source, 0, { profile: lexProfile })
  let lexStep = lexGen.next()

  while (!lexStep.done) {
    observeEvent(lexStep.value)
    lexStep = lexGen.next()
  }

  const tokens = lexStep.value
  const filteredTokens = tokens.filter(t => {
    if (!opts.includeWhitespace && t.type === 'WHITESPACE') return false
    if (!opts.includeComments && t.type === 'COMMENT') return false
    return true
  })

  const stream = createTokenStream(filteredTokens, opts.contextMode)
  const parseGen = seedNode(stream, 0)
  let parseStep = parseGen.next()

  while (!parseStep.done) {
    observeEvent(parseStep.value)
    parseStep = parseGen.next()
  }

  const result = parseStep.value

  // Enforce full consumption: a successful parse must end at EOF.
  let success = result.success
  if (success) {
    skipWhitespace(stream)
    if (current(stream).type !== 'EOF') {
      success = false
      const pos = getPosition(stream)
      const found = current(stream)
      const evt = {
        type: 'error' as const,
        rule: 'parse',
        position: pos,
        data: {
          message: `Unexpected trailing tokens starting at ${found.type} (${JSON.stringify(found.value)})`,
          expected: ['EOF'],
          found: found.type,
          recoverable: false,
        },
        timestamp: performance.now(),
        depth: 0,
      }
      observeEvent(evt)
    }
  }

  const duration = performance.now() - startTime
  const expScan = scanExperimentalRefs(input)

  return {
    success,
    ast: result.value,
    tokens,
    gaps: classifyTokenGaps(source, tokens),
    events,
    eventPolicy: opts.eventPolicy,
    eventCounts: { generated: generatedEvents, retained: events.length },
    errors,
    warnings,
    duration,
    lexProfile: lexProfile.id,
    dialect,
    dialectSource,
    dialectPreprocessed,
    experimentalRefs: expScan.ids.length > 0 ? expScan.ids : undefined,
  }
}
