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
import { emitDetail, emitHeader, emitNext, formatTable } from './view'

export const SOURCE_INSPECTION_SURFACE = 'inspect.source/1' as const

export interface SourceInspection {
  surface: typeof SOURCE_INSPECTION_SURFACE
  status: 'observational'
  file: string
  request: SourceProductDepth
  products: SourceProduct[]
}

export interface BuildSourceInspectionOptions {
  file?: string
  product?: SourceProductDepth
  eventPolicy?: ParseEventPolicy
  observe?: (product: SourceProduct) => void
}

export interface FormatSourceInspectionOptions {
  limit?: number
}

export interface RunSourceInspectionOptions extends FormatSourceInspectionOptions {
  file: string
  product?: SourceProductDepth
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
  const result = produceSourceProducts(source, {
    product: options.product ?? 'structure',
    eventPolicy: options.eventPolicy ?? 'diagnostics',
    path: file === '<memory>' ? undefined : file,
    uri: file,
  }, options.observe)

  return {
    surface: SOURCE_INSPECTION_SURFACE,
    status: 'observational',
    file,
    request: result.request,
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
    facet.atom('status', inspection.status),
    facet.path('file', inspection.file),
    facet.atom('request', inspection.request),
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
        facet.str('value', token.value),
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

export async function runSourceInspection(options: RunSourceInspectionOptions): Promise<void> {
  const abs = path.resolve(options.file)
  const source = await fs.readFile(abs, 'utf8')
  const file = path.relative(process.cwd(), abs) || path.basename(abs)
  const request = options.product ?? 'structure'

  emitHeader('inspect', {
    plane: 'source',
    file,
    product: request,
  })

  const inspection = buildSourceInspection(source, {
    file,
    product: request,
    eventPolicy: options.eventPolicy,
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
      request,
      stages: inspection.products.length,
    }))
    return
  }

  if (options.showSpw) {
    console.log(formatSourceInspectionSpw(inspection, { limit: options.limit }))
    return
  }

  emitDetail('observational: requested depth selects disclosure and may stop before deeper stages')
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
  emitNext(
    `spw inspect source ${file} --product tokens --spw`,
    `spw inspect source ${file} --product trace --ndjson`,
  )
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
