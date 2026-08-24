import type { ParseEvent, SeedNode, ParserOptions } from '../types'
import type { ParseOutput } from './output'
import { DEFAULT_OPTIONS, retainsParseEvent } from '../types'
import { classifyTokenGaps, tokenize, resolveLexProfile } from '../lexer'
import { createTokenStream, current, getPosition, skipWhitespace } from '../combinators'
import { seedNode } from '../grammar'
import { buildParseCompletenessReceipt } from './completeness'

/**
 * Streaming parser - yields events as they occur
 */
export function* parseStream(
  input: string,
  options: Partial<ParserOptions> = {}
): Generator<ParseEvent, ParseOutput<SeedNode>, void> {
  const startTime = performance.now()
  const opts: ParserOptions = { ...DEFAULT_OPTIONS, ...options }
  const events: ParseEvent[] = []
  const errors: ParseEvent[] = []
  const warnings: ParseEvent[] = []
  let generatedEvents = 0

  const observeEvent = (event: ParseEvent): boolean => {
    generatedEvents++
    if (event.type === 'error') errors.push(event)
    if (event.type === 'warning') warnings.push(event)
    if (!retainsParseEvent(opts.eventPolicy, event)) return false
    events.push(event)
    return true
  }

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const lexGen = tokenize(input, 0, { profile: lexProfile })
  let lexStep = lexGen.next()

  while (!lexStep.done) {
    if (observeEvent(lexStep.value)) yield lexStep.value
    lexStep = lexGen.next()
  }

  const tokens = lexStep.value

  const filteredTokens = tokens.filter(token => {
    if (!opts.includeWhitespace && token.type === 'WHITESPACE') return false
    if (!opts.includeComments && token.type === 'COMMENT') return false
    return true
  })

  const stream = createTokenStream(filteredTokens, opts.contextMode)
  const parseGen = seedNode(stream, 0)
  let parseStep = parseGen.next()

  while (!parseStep.done) {
    if (observeEvent(parseStep.value)) yield parseStep.value
    parseStep = parseGen.next()
  }

  const result = parseStep.value
  let success = result.success
  let outputError = result.success ? undefined : result.error
  if (success) {
    skipWhitespace(stream)
    if (current(stream).type !== 'EOF') {
      success = false
      const found = current(stream)
      outputError = {
        message: `Unexpected trailing tokens starting at ${found.type} (${JSON.stringify(found.value)})`,
        expected: ['EOF'],
        found: found.type,
        recoverable: false,
      }
      const event: ParseEvent = {
        type: 'error',
        rule: 'parse',
        position: getPosition(stream),
        data: {
          ...outputError,
          recoverable: false,
        },
        timestamp: performance.now(),
        depth: 0,
      }
      if (observeEvent(event)) yield event
    }
  }

  const completeness = buildParseCompletenessReceipt({
    source: input,
    tokens,
    expectedRootKind: 'Seed',
    actualRoot: result.value,
    remainingToken: current(stream),
    proseFallback: result.value?.expression.type === 'Prose',
  })
  const duration = performance.now() - startTime

  return {
    success,
    completeness,
    ast: result.value,
    tokens,
    gaps: classifyTokenGaps(input, tokens),
    events,
    eventPolicy: opts.eventPolicy,
    eventCounts: { generated: generatedEvents, retained: events.length },
    errors,
    warnings,
    error: outputError,
    duration,
    lexProfile: lexProfile.id,
  }
}
