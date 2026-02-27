import type { ParseEvent, ExpressionNode, ParserOptions } from '../types'
import type { ParseOutput } from './output'
import { DEFAULT_OPTIONS } from '../types'
import { lex, resolveLexProfile } from '../lexer'
import { createTokenStream } from '../combinators'
import { expressionNode } from '../grammar'

/**
 * Parse only an expression (not full seed)
 */
export function parseExpression(
  input: string,
  options: Partial<ParserOptions> = {}
): ParseOutput<ExpressionNode> {
  const startTime = performance.now()
  const opts: ParserOptions = { ...DEFAULT_OPTIONS, ...options }
  const events: ParseEvent[] = []
  const errors: ParseEvent[] = []
  const warnings: ParseEvent[] = []

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const { tokens } = lex(input, { profile: lexProfile })

  const filteredTokens = opts.includeWhitespace
    ? tokens
    : tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT')

  const stream = createTokenStream(filteredTokens, opts.contextMode)
  const parseGen = expressionNode(stream, 0)
  let parseStep = parseGen.next()

  while (!parseStep.done) {
    events.push(parseStep.value)
    if (parseStep.value.type === 'error') {
      errors.push(parseStep.value)
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
