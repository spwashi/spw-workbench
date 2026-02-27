import type { ParseEvent, SeedNode, ParserOptions } from '../types'
import { DEFAULT_OPTIONS } from '../types'
import type { ParseOutput } from './output'
import { tokenize, resolveLexProfile } from '../lexer'
import { createTokenStream, current, skipWhitespace, getPosition } from '../combinators'
import { seedNode } from '../grammar'

/**
 * Parse Spw source code into AST
 *
 * @spw:lens:syntactic - structure recognition, form → tree
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

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const lexGen = tokenize(input, 0, { profile: lexProfile })
  let lexStep = lexGen.next()

  while (!lexStep.done) {
    events.push(lexStep.value)
    if (lexStep.value.type === 'error') {
      errors.push(lexStep.value)
    }
    if (lexStep.value.type === 'warning') {
      warnings.push(lexStep.value)
    }
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
    events.push(parseStep.value)
    if (parseStep.value.type === 'error') {
      errors.push(parseStep.value)
    }
    if (parseStep.value.type === 'warning') {
      warnings.push(parseStep.value)
    }
    parseStep = parseGen.next()
  }

  const result = parseStep.value

  // Enforce full consumption: a successful parse must end at EOF.
  // This prevents partial parses (common source of false-positive lints).
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
      events.push(evt)
      errors.push(evt)
    }
  }

  const duration = performance.now() - startTime

  return {
    success,
    ast: result.value,
    tokens,
    events,
    errors,
    warnings,
    duration,
    lexProfile: lexProfile.id,
  }
}
