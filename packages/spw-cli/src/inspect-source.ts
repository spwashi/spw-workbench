import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  facet,
  formatSpwCard,
  produceSourceProducts,
  SOURCE_PRODUCT_IDS,
  type ParseEventPolicy,
  type SourceProduct,
  type SourceProductDepth,
  type SpwCardPart,
} from '@spwashi/spw-seed'
import { buildEnvelope, formatJsonEnvelope } from './envelope'
import { emitDetail, emitHeader, emitRecommendations, formatTable, shellArg } from './view'

export const SOURCE_INSPECTION_SURFACE = 'inspect.source/1' as const

export interface SourceInspection {
  surface: typeof SOURCE_INSPECTION_SURFACE
  status: 'observational'
  file: string
  request: SourceProductDepth
  controls: {
    through: SourceProductDepth
    events: ParseEventPolicy
  }
  products: SourceProduct[]
}

export interface BuildSourceInspectionOptions {
  file?: string
  through?: SourceProductDepth
  events?: ParseEventPolicy
  /** @deprecated Use through. */
  product?: SourceProductDepth
  /** @deprecated Use events. */
  eventPolicy?: ParseEventPolicy
  observe?: (product: SourceProduct) => void
}

export interface FormatSourceInspectionOptions {
  limit?: number
}

export interface RunSourceInspectionOptions extends FormatSourceInspectionOptions {
  file?: string
  /** In-memory source for --stdin, --text, or editor buffers. */
  source?: string
  through?: SourceProductDepth
  events?: ParseEventPolicy
  /** @deprecated Use through. */
  product?: SourceProductDepth
  /** @deprecated Use events. */
  eventPolicy?: ParseEventPolicy
  json?: boolean
  ndjson?: boolean
  showSpw?: boolean
}

export function buildSourceInspection(
  source: string,
  options: BuildSourceInspectionOptions = {},
): SourceInspection {
  const file = options.file ?? '<memory>'
  const through = options.through ?? options.product ?? 'structure'
  const requestedEvents = options.events ?? options.eventPolicy ?? 'diagnostics'
  const effectiveEvents = through === 'trace' ? 'trace' : requestedEvents
  const result = produceSourceProducts(source, {
    through,
    eventPolicy: effectiveEvents,
    path: file.startsWith('<') ? undefined : file,
    uri: file,
  }, options.observe)

  return {
    surface: SOURCE_INSPECTION_SURFACE,
    status: 'observational',
    file,
    request: result.through,
    controls: {
      through: result.through,
      events: effectiveEvents,
    },
    products: result.products,
  }
}

export function formatSourceInspectionSpw(
  inspection: SourceInspection,
  options: FormatSourceInspectionOptions = {},
): string {
  const limit = options.limit ?? 16
  const parts: SpwCardPart[] = [
    facet.atom('surface', inspection.surface),
    facet.atom('plane', 'source'),
    facet.atom('status', inspection.status),
    facet.path('file', inspection.file),
    facet.atom('request', inspection.request),
    facet.group('controls', [
      facet.atom('through', inspection.controls.through),
      facet.atom('events', inspection.controls.events),
      facet.atom('sample', limit),
    ]),
    facet.atom('stages', inspection.products.length),
  ]

  for (const product of inspection.products) {
    const details = productDetails(product)
    parts.push(facet.group(`stage-${product.sequence.index}`, [
      facet.atom('product', product.product),
      facet.atom('ir', product.ir),
      facet.atom('stage', product.stage),
      facet.atom('status', product.status),
      facet.atom('sequence', `${product.sequence.index}/${product.sequence.total}`),
      facet.atom('completeness', product.completeness.value),
      facet.atom('elapsed_ms', roundMilliseconds(product.elapsedMs)),
      facet.list('included', [...product.completeness.included]),
      facet.list('omitted', [...product.completeness.omitted]),
      facet.list('deferred', [...product.deferred]),
      ...Object.entries(details).map(([key, value]) => facet.atom(key, value)),
    ]))
  }

  const tokens = inspection.products.find(product => product.product === SOURCE_PRODUCT_IDS.tokens)
  if (tokens) {
    for (const [index, token] of tokens.data.tokens.slice(0, limit).entries()) {
      parts.push(facet.group(`token-${index}`, [
        facet.atom('type', token.type),
        facet.str('value_visible', visibleTokenValue(token.value)),
        facet.atom('start', token.span.start.offset),
        facet.atom('end', token.span.end.offset),
      ]))
    }
    if (tokens.data.tokens.length > limit) {
      parts.push(facet.atom('omitted_tokens', tokens.data.tokens.length - limit))
    }
  }

  const trace = inspection.products.find(product => product.product === SOURCE_PRODUCT_IDS.trace)
  if (trace) {
    for (const [index, event] of trace.data.events.slice(0, limit).entries()) {
      parts.push(facet.group(`event-${index}`, [
        facet.atom('type', event.type),
        facet.atom('rule', event.rule),
        facet.atom('offset', event.position.offset),
        facet.atom('depth', event.depth),
      ]))
    }
    if (trace.data.events.length > limit) {
      parts.push(facet.atom('omitted_events', trace.data.events.length - limit))
    }
  }

  return formatSpwCard('source', parts)
}

export function formatSourceInspectionSamples(
  inspection: SourceInspection,
  options: FormatSourceInspectionOptions = {},
): string {
  const limit = options.limit ?? 16
  const sections: string[] = []
  const tokens = inspection.products.find(product => product.product === SOURCE_PRODUCT_IDS.tokens)
  if (tokens) {
    sections.push('token sample')
    sections.push(formatTable(
      ['#', 'type', 'value_visible', 'start', 'end'],
      tokens.data.tokens.slice(0, limit).map((token, index) => [
        String(index),
        token.type,
        visibleTokenValue(token.value),
        String(token.span.start.offset),
        String(token.span.end.offset),
      ]),
      { maxCol: 36 },
    ))
    if (tokens.data.tokens.length > limit) {
      sections.push(`… ${tokens.data.tokens.length - limit} more tokens (raise --sample)`)
    }
  }

  const trace = inspection.products.find(product => product.product === SOURCE_PRODUCT_IDS.trace)
  if (trace) {
    sections.push('event sample')
    sections.push(formatTable(
      ['#', 'type', 'rule', 'offset', 'depth'],
      trace.data.events.slice(0, limit).map((event, index) => [
        String(index),
        event.type,
        event.rule,
        String(event.position.offset),
        String(event.depth),
      ]),
      { maxCol: 36 },
    ))
    if (trace.data.events.length > limit) {
      sections.push(`… ${trace.data.events.length - limit} more events (raise --sample)`)
    }
  }

  return sections.join('\n')
}

export async function runSourceInspection(options: RunSourceInspectionOptions): Promise<void> {
  const { source, file } = await loadSourceInput(options.file, options.source)
  const through = options.through ?? options.product ?? 'structure'
  const requestedEvents = options.events ?? options.eventPolicy ?? 'diagnostics'
  const events = through === 'trace' ? 'trace' : requestedEvents
  const sample = options.limit ?? 16

  emitHeader('inspect', {
    plane: 'source',
    file,
    through,
    events,
    sample,
  })

  const inspection = buildSourceInspection(source, {
    file,
    through,
    events,
    observe: options.ndjson
      ? product => console.log(JSON.stringify(buildEnvelope('inspect.source.stage', product, {
          sequence: product.sequence.index,
          total: product.sequence.total,
          stage: product.stage,
        })))
      : undefined,
  })

  if (options.ndjson) return

  if (options.json) {
    console.log(formatJsonEnvelope('inspect.source', inspection, {
      through,
      events,
      sample,
      stages: inspection.products.length,
    }))
    return
  }

  if (options.showSpw) {
    console.log(formatSourceInspectionSpw(inspection, { limit: sample }))
    return
  }

  emitDetail('observational: through selects executed stages; sample bounds display only')
  emitDetail(`controls  through=${through} events=${events} sample=${sample}`)
  if (through === 'trace' && requestedEvents !== 'trace') {
    emitDetail('trace requires full event retention; effective events=trace')
  }
  console.log(formatTable(
    ['seq', 'product', 'ir', 'status', 'complete', 'elapsed', 'deferred'],
    inspection.products.map(product => [
      `${product.sequence.index}/${product.sequence.total}`,
      product.product,
      product.ir,
      product.status,
      formatCompleteness(product.completeness.value),
      `${roundMilliseconds(product.elapsedMs)}ms`,
      product.deferred.join(','),
    ]),
    { maxCol: 30 },
  ))

  for (const product of inspection.products) {
    const details = productDetails(product)
    emitDetail(`${product.stage.padEnd(9)} ${Object.entries(details).map(([key, value]) => `${key}=${value}`).join(' ')}`)
  }
  console.log('')
  console.log(formatSourceInspectionSamples(inspection, { limit: sample }))
  const target = file.startsWith('<') ? '--stdin' : shellArg(file)
  emitRecommendations(
    {
      command: `spw inspect source ${target} --through tokens --events none --sample ${sample} --spw`,
      purpose: 'ask what the lexer sees without building structure',
      cost: `token stage only; Spw view shows ${sample} examples and names omissions`,
    },
    {
      command: `spw inspect source ${target} --through trace --events trace --ndjson`,
      purpose: 'observe when each progressive source product becomes available',
      cost: 'full parse plus retained trace events',
    },
  )
}

async function loadSourceInput(
  file: string | undefined,
  source: string | undefined,
): Promise<{ source: string; file: string }> {
  if (source !== undefined) return { source, file: file ?? '<memory>' }
  if (!file) throw new Error('spw inspect source: expected a file, --stdin, or --text')
  const abs = path.resolve(file)
  return {
    source: await fs.readFile(abs, 'utf8'),
    file: path.relative(process.cwd(), abs) || path.basename(abs),
  }
}

function productDetails(product: SourceProduct): Record<string, string | number | boolean> {
  switch (product.product) {
    case SOURCE_PRODUCT_IDS.tokens:
      return {
        tokens: product.data.tokens.length,
        gaps: product.data.gaps.length,
        errors: product.data.diagnostics.errors.length,
        events_generated: product.data.events.generated,
        events_retained: product.data.events.retained,
      }
    case SOURCE_PRODUCT_IDS.structure:
      return {
        parse_ok: product.data.success,
        parse_complete: product.completeness.complete,
        consumed_end: product.completeness.consumed.end.offset,
        remaining_chars: product.completeness.remaining.text.length,
        expected_root: product.completeness.expectedRootKind,
        prose_fallback: product.completeness.proseFallback,
        errors: product.data.diagnostics.errors.length,
        warnings: product.data.diagnostics.warnings.length,
        events_generated: product.data.events.generated,
        events_retained: product.data.events.retained,
      }
    case SOURCE_PRODUCT_IDS.trace:
      return {
        events_generated: product.data.counts.generated,
        events_retained: product.data.counts.retained,
      }
  }
}

function formatCompleteness(value: number): string {
  return `${Math.round(value * 100)}%`
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1000) / 1000
}

function visibleTokenValue(value: string): string {
  if (value.length === 0) return '∅'
  return value
    .replace(/\r/g, '␍')
    .replace(/\n/g, '↵')
    .replace(/\t/g, '⇥')
    .replace(/ /g, '·')
}
