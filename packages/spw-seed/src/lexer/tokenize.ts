import type { Token, ParseEvent, TokenEventData, ErrorEventData, LexOptions } from '../types'
import {
  createLexerState,
  getPosition,
  advance,
  isAtEnd,
} from './state'
import {
  type TokenMatcher,
  matchWhitespace,
  matchLineComment,
  matchComparison,
  matchContainer,
  matchModifier,
  matchBoolean,
  matchAnnotation,
  matchApposition,
  matchParticle,
  createStringMatcher,
  matchNumber,
  matchIdentifier,
  matchDot,
  matchColon,
  matchComma,
  createOperatorMatcher,
  createConnectorMatcher,
  matchSpread,
  matchArrow,
  matchPhrase,
} from './matchers'
import { buildConnectorMap, buildOperatorMap, resolveLexProfile } from './profiles'

/**
 * Tokenize input, yielding ParseEvents for each token and returning all tokens.
 */
export function* tokenize(
  input: string,
  depth: number = 0,
  options: LexOptions = {}
): Generator<ParseEvent, Token[], void> {
  const state = createLexerState(input)
  const tokens: Token[] = []
  const lexProfile = resolveLexProfile(options.profile)
  const operatorMatcher = createOperatorMatcher(buildOperatorMap(lexProfile))
  const connectorMatcher = createConnectorMatcher(buildConnectorMap(lexProfile))
  const stringMatcher = createStringMatcher(lexProfile.stringQuotes)

  const matchers: TokenMatcher[] = [
    matchWhitespace,
    matchLineComment,
    matchSpread,
    connectorMatcher,
    matchComparison,
    matchArrow,
    matchParticle,
    operatorMatcher,
    matchContainer,
    matchModifier,
    matchBoolean,
    // Both open with `~#`; the apposition form must claim `~#(` and `~#name(`
    // before the annotation matcher takes the name and stops.
    matchApposition,
    matchAnnotation,
    stringMatcher,
    matchNumber,
    matchPhrase,
    matchIdentifier,
    matchDot,
    matchColon,
    matchComma,
  ]

  yield {
    type: 'enter',
    rule: 'tokenize',
    position: getPosition(state),
    data: { input: input.slice(0, 50) + (input.length > 50 ? '...' : '') },
    timestamp: performance.now(),
    depth,
  }

  while (!isAtEnd(state)) {
    let matched = false

    for (const matcher of matchers) {
      const gen = matcher(state, depth + 1)
      let result = gen.next()

      while (!result.done) {
        yield result.value
        result = gen.next()
      }

      if (result.value !== null) {
        tokens.push(result.value)
        matched = true
        break
      }
    }

    if (!matched) {
      const pos = getPosition(state)
      const char = state.input[state.offset]

      if (lexProfile.unknownAsText) {
        advance(state)
        const token: Token<'TEXT'> = {
          type: 'TEXT',
          value: char,
          span: { start: pos, end: getPosition(state) },
        }
        tokens.push(token)
        yield {
          type: 'token',
          rule: 'text',
          position: pos,
          data: { token } as TokenEventData,
          timestamp: performance.now(),
          depth,
        }
      } else {
        yield {
          type: 'error',
          rule: 'tokenize',
          position: pos,
          data: {
            message: `Unexpected character: ${char}`,
            found: char,
            recoverable: true,
          } as ErrorEventData,
          timestamp: performance.now(),
          depth,
        }

        advance(state)
      }
    }
  }

  const eofToken: Token<'EOF'> = {
    type: 'EOF',
    value: '',
    span: { start: getPosition(state), end: getPosition(state) },
  }
  tokens.push(eofToken)

  yield {
    type: 'token',
    rule: 'eof',
    position: getPosition(state),
    data: { token: eofToken } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  yield {
    type: 'exit',
    rule: 'tokenize',
    position: getPosition(state),
    data: { success: true, consumed: state.offset, result: tokens },
    timestamp: performance.now(),
    depth,
  }

  return tokens
}
