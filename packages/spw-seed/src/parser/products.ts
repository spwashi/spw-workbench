import type {
  ParseEvent,
  ParseEventCounts,
  ParseEventPolicy,
  ParserOptions,
  SeedNode,
  Token,
  TokenGap,
} from '../types'
import { DEFAULT_OPTIONS, retainsParseEvent } from '../types'
import { classifyTokenGaps, resolveLexProfile, tokenize } from '../lexer'
import { createTokenStream, current, getPosition, skipWhitespace } from '../combinators'
import { seedNode } from '../grammar'
import {
  applyDialectPreprocess,
  collectMachineLintWarnings,
  isDialectId,
  resolveSurfaceProfile,
  type DialectId,
} from '../dialect'
import { scanExperimentalRefs } from '../experimental'
import {
  buildProgressiveProduct,
  type ProgressiveProductRecord,
} from '../ir/progressive'
import type { ParseOutput } from './output'

export const SOURCE_PRODUCT_DEPTHS = ['tokens', 'structure', 'trace'] as const
export type SourceProductDepth = (typeof SOURCE_PRODUCT_DEPTHS)[number]

export const SOURCE_PRODUCT_IDS = {
  tokens: 'source.tokens/1',
  structure: 'source.structure/1',
  trace: 'source.trace/1',
} as const

export interface SourceProductIdentity {
  uri: string
  sourceLength: number
}

export interface SourceProductProfile {
  dialect?: string
  dialectSource?: string
  lexProfile: string
  dialectPreprocessed: boolean
}

export interface SourceProductDiagnostics {
  errors: ParseEvent[]
  warnings: ParseEvent[]
}

export interface SourceProductEvents {
  policy: ParseEventPolicy
  generated: number
  retained: number
}

export interface SourceTokensData {
  source: SourceProductIdentity
  profile: SourceProductProfile
  tokens: Token[]
  gaps: TokenGap[]
  diagnostics: SourceProductDiagnostics
  events: SourceProductEvents
}

export interface SourceStructureData {
  source: SourceProductIdentity
  profile: SourceProductProfile
  success: boolean
  ast?: SeedNode
  error?: ParseOutput['error']
  diagnostics: SourceProductDiagnostics
  events: SourceProductEvents
  experimentalRefs?: string[]
}

export interface SourceTraceData {
  source: SourceProductIdentity
  profile: SourceProductProfile
  events: ParseEvent[]
  counts: ParseEventCounts
}

export type SourceTokensProduct = ProgressiveProductRecord<
  typeof SOURCE_PRODUCT_IDS.tokens,
  'lex',
  SourceTokensData
>

export type SourceStructureProduct = ProgressiveProductRecord<
  typeof SOURCE_PRODUCT_IDS.structure,
  'parse',
  SourceStructureData
>

export type SourceTraceProduct = ProgressiveProductRecord<
  typeof SOURCE_PRODUCT_IDS.trace,
  'trace',
  SourceTraceData
>

export type SourceProduct = SourceTokensProduct | SourceStructureProduct | SourceTraceProduct
export type SourceProductObserver = (product: SourceProduct) => void

export interface SourceProductOptions extends Partial<ParserOptions> {
  through?: SourceProductDepth
  /** @deprecated Use through. */
  product?: SourceProductDepth
  uri?: string
}

export interface SourceProductResult {
  through: SourceProductDepth
  /** @deprecated Use through. */
  request: SourceProductDepth
  products: SourceProduct[]
  output?: ParseOutput<SeedNode>
}

interface PipelineControls {
  through: SourceProductDepth
  collect: boolean
  observe?: SourceProductObserver
}

const PRODUCT_TOTALS = {
  tokens: 1,
  structure: 2,
  trace: 3,
} as const satisfies Record<SourceProductDepth, number>

export function produceSourceProducts(
  input: string,
  options: SourceProductOptions = {},
  observe?: SourceProductObserver,
): SourceProductResult {
  const through = options.through ?? options.product ?? 'structure'
  return runSourcePipeline(input, options, { through, collect: true, observe })
}

/** Parser-compatible path that avoids allocating progressive records. */
export function parseSourceStructure(
  input: string,
  options: Partial<ParserOptions> = {},
): ParseOutput<SeedNode> {
  const result = runSourcePipeline(input, options, {
    through: 'structure',
    collect: false,
  })
  return result.output!
}

function runSourcePipeline(
  input: string,
  options: SourceProductOptions,
  controls: PipelineControls,
): SourceProductResult {
  const startedAt = performance.now()
  const opts: ParserOptions = { ...DEFAULT_OPTIONS, ...options }
  if (controls.through === 'trace') opts.eventPolicy = 'trace'

  const products: SourceProduct[] = []
  const events: ParseEvent[] = []
  const errors: ParseEvent[] = []
  const warnings: ParseEvent[] = []
  let generatedEvents = 0

  const publish = (product: SourceProduct): void => {
    if (controls.collect) products.push(product)
    controls.observe?.(product)
  }
  const observeEvent = (event: ParseEvent): void => {
    generatedEvents++
    if (event.type === 'error') errors.push(event)
    if (event.type === 'warning') warnings.push(event)
    if (retainsParseEvent(opts.eventPolicy, event)) events.push(event)
  }

  const auto = opts.autoDialect !== false
  let preparedSource = input
  let dialect: string | undefined
  let dialectSource: string | undefined
  let dialectPreprocessed = false

  if (auto || opts.dialect || opts.path) {
    const explicit = opts.dialect && isDialectId(opts.dialect)
      ? opts.dialect as DialectId
      : undefined
    const stack = resolveSurfaceProfile(input, { dialect: explicit, path: opts.path })
    dialect = stack.dialect
    dialectSource = stack.dialectSource

    if (!opts.contextMode || options.contextMode === undefined) opts.contextMode = stack.contextMode
    if (!opts.lexProfile) {
      opts.lexProfile = stack.lex === 'prose' || stack.metasyntax.unknownAsText
        ? 'prose'
        : stack.lex
    }

    if (stack.metasyntax.newlineAsSpace) {
      const next = applyDialectPreprocess(input, stack.dialect, true)
      if (next !== input) {
        preparedSource = next
        dialectPreprocessed = true
      }
    }

    if (stack.metasyntax.machineLint) {
      for (const message of collectMachineLintWarnings(input)) {
        observeEvent({
          type: 'warning',
          rule: 'dialect.machine_lint',
          position: { offset: 0, line: 1, column: 1 },
          data: { message },
          timestamp: performance.now(),
          depth: 0,
        })
      }
    }
  }

  const lexProfile = resolveLexProfile(opts.lexProfile)
  const lexGen = tokenize(preparedSource, 0, { profile: lexProfile })
  let lexStep = lexGen.next()
  while (!lexStep.done) {
    observeEvent(lexStep.value)
    lexStep = lexGen.next()
  }

  const tokens = lexStep.value
  const gaps = classifyTokenGaps(preparedSource, tokens)
  const identity: SourceProductIdentity = {
    uri: options.uri ?? options.path ?? '<memory>',
    sourceLength: input.length,
  }
  const profile: SourceProductProfile = {
    dialect,
    dialectSource,
    lexProfile: lexProfile.id,
    dialectPreprocessed,
  }
  const eventReceipt = (): SourceProductEvents => ({
    policy: opts.eventPolicy,
    generated: generatedEvents,
    retained: events.length,
  })
  const diagnostics = (): SourceProductDiagnostics => ({
    errors: [...errors],
    warnings: [...warnings],
  })
  const total = PRODUCT_TOTALS[controls.through]

  if (controls.collect || controls.observe) {
    publish(buildProgressiveProduct({
      product: SOURCE_PRODUCT_IDS.tokens,
      revision: 1,
      ir: 'lex',
      sequence: { index: 1, total },
      stage: 'lex',
      included: ['source', 'profile', 'tokens', 'gaps', 'diagnostics', 'eventCounts'],
      deferred: ['ast', 'trace', 'index', 'semantic'],
      elapsedMs: performance.now() - startedAt,
      data: {
        source: identity,
        profile,
        tokens,
        gaps,
        diagnostics: diagnostics(),
        events: eventReceipt(),
      },
    }))
  }

  if (controls.through === 'tokens') {
    return { through: controls.through, request: controls.through, products }
  }

  const filteredTokens = tokens.filter(token => {
    if (!opts.includeWhitespace && token.type === 'WHITESPACE') return false
    if (!opts.includeComments && token.type === 'COMMENT') return false
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
  let success = result.success
  if (success) {
    skipWhitespace(stream)
    if (current(stream).type !== 'EOF') {
      success = false
      const found = current(stream)
      observeEvent({
        type: 'error',
        rule: 'parse',
        position: getPosition(stream),
        data: {
          message: `Unexpected trailing tokens starting at ${found.type} (${JSON.stringify(found.value)})`,
          expected: ['EOF'],
          found: found.type,
          recoverable: false,
        },
        timestamp: performance.now(),
        depth: 0,
      })
    }
  }

  const experimentalRefs = scanExperimentalRefs(input).ids
  const duration = performance.now() - startedAt
  const output: ParseOutput<SeedNode> = {
    success,
    ast: result.value,
    tokens,
    gaps,
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
    experimentalRefs: experimentalRefs.length > 0 ? experimentalRefs : undefined,
  }

  if (controls.collect || controls.observe) {
    publish(buildProgressiveProduct({
      product: SOURCE_PRODUCT_IDS.structure,
      revision: 1,
      ir: 'parse',
      sequence: { index: 2, total },
      stage: 'parse',
      included: result.value
        ? ['source', 'profile', 'ast', 'diagnostics', 'eventCounts']
        : ['source', 'profile', 'diagnostics', 'eventCounts'],
      omitted: result.value ? [] : ['ast'],
      deferred: ['trace', 'index', 'semantic'],
      elapsedMs: duration,
      data: {
        source: identity,
        profile,
        success,
        ast: result.value,
        error: output.error,
        diagnostics: diagnostics(),
        events: eventReceipt(),
        experimentalRefs: output.experimentalRefs,
      },
    }))
  }

  if (controls.through === 'trace' && (controls.collect || controls.observe)) {
    publish(buildProgressiveProduct({
      product: SOURCE_PRODUCT_IDS.trace,
      revision: 1,
      ir: 'parse',
      sequence: { index: 3, total },
      stage: 'trace',
      included: ['events', 'eventCounts'],
      deferred: ['index', 'semantic'],
      elapsedMs: performance.now() - startedAt,
      data: {
        source: identity,
        profile,
        events: [...events],
        counts: { generated: generatedEvents, retained: events.length },
      },
    }))
  }

  return { through: controls.through, request: controls.through, products, output }
}
