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
  matchHashLineProse,
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
import { entryLineEnd, figureEnd, readEntryMarker } from './stream-entry'
import { readCommitRef } from './commit-ref'

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
  let streamDepth = 0

  const matchers: TokenMatcher[] = [
    matchWhitespace,
    matchLineComment,
    // Before operator `#`: narrative titles `# Title - subtitle`
    matchHashLineProse,
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

  function* push(token: Token, rule: string): Generator<ParseEvent, void, void> {
    tokens.push(token)
    yield {
      type: 'token',
      rule,
      position: token.span.start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
  }

  /** One token by the ordinary rules: a commit ref in plan files, then the matchers in order. */
  function* lexOne(): Generator<ParseEvent, void, void> {
    const commitRef = options.planStream ? readCommitRef(state) : null
    if (commitRef) {
      yield* push(commitRef, 'commitRef')
      return
    }

    for (const matcher of matchers) {
      const gen = matcher(state, depth + 1)
      let result = gen.next()

      while (!result.done) {
        yield result.value
        result = gen.next()
      }

      if (result.value !== null) {
        tokens.push(result.value)
        if (result.value.type === 'STREAM_OPEN') streamDepth++
        if (result.value.type === 'STREAM_CLOSE') streamDepth = Math.max(0, streamDepth - 1)
        return
      }
    }

    const pos = getPosition(state)
    const char = state.input[state.offset]

    if (lexProfile.unknownAsText) {
      advance(state)
      yield* push({ type: 'TEXT', value: char, span: { start: pos, end: getPosition(state) } } as Token<'TEXT'>, 'text')
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

  /** An entry's body to the end of its line: prose as TEXT, each figure lexed by the ordinary rules. */
  function* lexEntryBody(): Generator<ParseEvent, void, void> {
    const lineEnd = entryLineEnd(state.input, state.offset)
    const bodyStart = state.offset
    let text = getPosition(state)
    const flushText = function* (): Generator<ParseEvent, void, void> {
      if (state.offset === text.offset) return
      const value = state.input.slice(text.offset, state.offset)
      yield* push({ type: 'TEXT', value, span: { start: text, end: getPosition(state) } } as Token<'TEXT'>, 'streamEntry')
    }

    while (state.offset < lineEnd) {
      const end = figureEnd(state.input, state.offset, bodyStart, lineEnd)
      if (end === null) {
        advance(state)
        continue
      }
      yield* flushText()
      while (state.offset < end) yield* lexOne()
      text = getPosition(state)
    }
    yield* flushText()
  }

  while (!isAtEnd(state)) {
    // A line-start >> entry owns its line in every dialect; commit refs stay a plan-file token.
    const marker = readEntryMarker(state, streamDepth)
    if (marker) {
      yield* push(marker, 'streamEntry')
      yield* lexEntryBody()
      continue
    }
    yield* lexOne()
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
