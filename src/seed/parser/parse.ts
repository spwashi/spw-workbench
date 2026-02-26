import type { ParseEvent, SeedNode, ParserOptions } from '../types'
import type { ParseOutput } from './output'
import { tokenize, resolveLexProfile } from '../lexer'
import { createTokenStream } from '../combinators'
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
  const events: ParseEvent[] = []
  const errors: ParseEvent[] = []
  const warnings: ParseEvent[] = []

  const lexProfile = resolveLexProfile(options.lexProfile)
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

  const filteredTokens = options.includeWhitespace
    ? tokens
    : tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT')

  const stream = createTokenStream(filteredTokens)
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
  const duration = performance.now() - startTime

  return {
    success: result.success,
    ast: result.value,
    tokens,
    events,
    errors,
    warnings,
    duration,
    lexProfile: lexProfile.id,
  }
}
