import type {
  ParseEvent,
  ExpressionNode,
  ParserOptions,
  SeedExpressionNode,
  SequenceNode,
} from '../types'
import type { ParseOutput } from './output'
import { DEFAULT_OPTIONS, retainsParseEvent } from '../types'
import { lex, resolveLexProfile } from '../lexer'
import { createTokenStream, current, getPosition, skipWhitespace } from '../combinators'
import { sequenceNode } from '../grammar'
import { proseNode } from '../grammar/prose'
import { buildParseCompletenessReceipt } from './completeness'

function standaloneNode(sequence: SequenceNode): ExpressionNode | SequenceNode {
  if (sequence.expressions.length === 1 && sequence.separators?.length === 0) {
    return sequence.expressions[0]!
  }
  return sequence
}

/**
 * Parse only an expression (not full seed)
 */
export function parseExpression(
  input: string,
  options: Partial<ParserOptions> = {}
): ParseOutput<SeedExpressionNode> {
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

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const lexed = lex(input, { profile: lexProfile, eventPolicy: 'none' })
  const { tokens, gaps } = lexed
  generatedEvents += lexed.eventCounts.generated

  const filteredTokens = tokens.filter(token => {
    if (!opts.includeWhitespace && token.type === 'WHITESPACE') return false
    if (!opts.includeComments && token.type === 'COMMENT') return false
    return true
  })

  const stream = createTokenStream(filteredTokens, opts.contextMode)
  const parseGen = sequenceNode(stream, 0)
  let parseStep = parseGen.next()

  while (!parseStep.done) {
    observeEvent(parseStep.value)
    parseStep = parseGen.next()
  }

  const structured = parseStep.value
  skipWhitespace(stream)
  const structuredStall = current(stream)
  const hasStructuredPrefix = structured.success && structured.consumed > 0
  let ast: SeedExpressionNode | undefined = hasStructuredPrefix
    ? standaloneNode(structured.value!)
    : undefined
  let success = hasStructuredPrefix && structuredStall.type === 'EOF'
  let proseFallback = false
  let error = structured.error

  if (hasStructuredPrefix && !success) {
    const message = `Unexpected trailing tokens starting at ${structuredStall.type} (${JSON.stringify(structuredStall.value)})`
    error = {
      message,
      expected: ['EOF'],
      found: structuredStall.type,
      recoverable: false,
    }
    observeEvent({
      type: 'error',
      rule: 'parseExpression',
      position: getPosition(stream),
      data: error,
      timestamp: performance.now(),
      depth: 0,
    })
  } else if (!hasStructuredPrefix) {
    proseFallback = true
    const message = structuredStall.type === 'EOF'
      ? 'Structured expression parse consumed nothing; surface degraded to prose.'
      : `Structured expression parse stopped at ${structuredStall.type} ${JSON.stringify(structuredStall.value)}; surface degraded to prose.`
    observeEvent({
      type: 'warning',
      rule: 'parseExpression',
      position: structuredStall.span.start,
      data: {
        message,
        code: 'prose-degradation',
        found: structuredStall.type,
      },
      timestamp: performance.now(),
      depth: 0,
    })

    stream.position = 0
    const proseGen = proseNode(stream, 0)
    let proseStep = proseGen.next()
    while (!proseStep.done) {
      observeEvent(proseStep.value)
      proseStep = proseGen.next()
    }
    if (proseStep.value.success) ast = proseStep.value.value
    skipWhitespace(stream)
    success = false
    error = structured.error ?? {
      message: 'Expected a structured expression; input degraded to prose.',
      expected: ['Expression'],
      found: structuredStall.type,
      recoverable: false,
    }
  }

  const completeness = buildParseCompletenessReceipt({
    source: input,
    tokens,
    expectedRootKind: 'Expression',
    actualRoot: ast,
    remainingToken: current(stream),
    proseFallback,
  })
  const duration = performance.now() - startTime

  return {
    success,
    completeness,
    ast,
    tokens,
    gaps,
    events,
    eventPolicy: opts.eventPolicy,
    eventCounts: { generated: generatedEvents, retained: events.length },
    errors,
    warnings,
    error,
    duration,
    lexProfile: lexProfile.id,
  }
}
