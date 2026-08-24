import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  GAP_CLASSES,
  facet,
  formatSpwCard,
  parse,
  type GapClass,
  type ParseEventPolicy,
  type SpwCardPart,
  type TokenGap,
  type TokenType,
} from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { emitDetail, emitHeader, emitNext, formatTable } from './view'

export const SPACING_INSPECTION_SURFACE = 'inspect.spacing/1' as const

export interface SpacingIdentifier {
  tokenIndex: number
  value: string
  segments: string[]
  line: number
  column: number
}

export interface SpacingGapAnchor {
  tokenIndex: number
  type: TokenType
  value: string
}

export interface SpacingGap extends Omit<TokenGap, 'leftTokenIndex' | 'rightTokenIndex'> {
  left: SpacingGapAnchor
  right: SpacingGapAnchor
}

export interface SpacingInspection {
  surface: typeof SPACING_INSPECTION_SURFACE
  status: 'observational'
  file: string
  sourceLength: number
  parse: {
    ok: boolean
    errors: number
    dialect?: string
    lexProfile?: string
  }
  events: {
    policy: ParseEventPolicy
    generated: number
    retained: number
  }
  gapCounts: Record<GapClass, number>
  gaps: SpacingGap[]
  tightIdentifiers: SpacingIdentifier[]
}

export interface BuildSpacingInspectionOptions {
  file?: string
  eventPolicy?: ParseEventPolicy
}

export interface FormatSpacingInspectionOptions {
  limit?: number
}

export interface RunSpacingInspectionOptions extends FormatSpacingInspectionOptions {
  file: string
  json?: boolean
  showSpw?: boolean
  eventPolicy?: ParseEventPolicy
}

export function buildSpacingInspection(
  source: string,
  options: BuildSpacingInspectionOptions = {},
): SpacingInspection {
  const file = options.file ?? '<memory>'
  const parsed = parse(source, {
    path: file === '<memory>' ? undefined : file,
    eventPolicy: options.eventPolicy ?? 'diagnostics',
  })
  const gapCounts = Object.fromEntries(GAP_CLASSES.map(kind => [kind, 0])) as Record<GapClass, number>

  for (const gap of parsed.gaps) gapCounts[gap.class]++

  const tightIdentifiers: SpacingIdentifier[] = []
  for (let tokenIndex = 0; tokenIndex < parsed.tokens.length; tokenIndex++) {
    const token = parsed.tokens[tokenIndex]!
    if (token.type !== 'IDENTIFIER' || !token.identifier?.qualified) continue
    tightIdentifiers.push({
      tokenIndex,
      value: token.value,
      segments: [...token.identifier.segments],
      line: token.span.start.line,
      column: token.span.start.column,
    })
  }

  const gaps: SpacingGap[] = parsed.gaps.map(gap => {
    const left = parsed.tokens[gap.leftTokenIndex]!
    const right = parsed.tokens[gap.rightTokenIndex]!
    return {
      index: gap.index,
      class: gap.class,
      raw: gap.raw,
      span: gap.span,
      triviaTokenIndices: [...gap.triviaTokenIndices],
      lineBreaks: gap.lineBreaks,
      left: { tokenIndex: gap.leftTokenIndex, type: left.type, value: left.value },
      right: { tokenIndex: gap.rightTokenIndex, type: right.type, value: right.value },
    }
  })

  return {
    surface: SPACING_INSPECTION_SURFACE,
    status: 'observational',
    file,
    sourceLength: source.length,
    parse: {
      ok: parsed.success && parsed.errors.length === 0,
      errors: parsed.errors.length,
      dialect: parsed.dialect,
      lexProfile: parsed.lexProfile,
    },
    events: {
      policy: parsed.eventPolicy,
      generated: parsed.eventCounts.generated,
      retained: parsed.eventCounts.retained,
    },
    gapCounts,
    gaps,
    tightIdentifiers,
  }
}

function visibleGap(raw: string): string {
  if (raw.length === 0) return '∅'
  return raw
    .replace(/\r/g, '␍')
    .replace(/\n/g, '↵')
    .replace(/\t/g, '⇥')
    .replace(/ /g, '·')
}

function anchorLabel(anchor: { type: string; value: string }): string {
  return `${anchor.type.toLowerCase()}:${anchor.value || '∅'}`
}

export function formatSpacingInspectionSpw(
  inspection: SpacingInspection,
  options: FormatSpacingInspectionOptions = {},
): string {
  const limit = options.limit ?? 24
  const parts: SpwCardPart[] = [
    facet.atom('surface', inspection.surface),
    facet.atom('status', inspection.status),
    facet.path('file', inspection.file),
    facet.flag('parse_ok', inspection.parse.ok),
    facet.atom('parse_errors', inspection.parse.errors),
    facet.group('events', [
      facet.atom('policy', inspection.events.policy),
      facet.atom('generated', inspection.events.generated),
      facet.atom('retained', inspection.events.retained),
    ]),
    facet.group('gap-counts', GAP_CLASSES.map(kind => facet.atom(kind, inspection.gapCounts[kind]))),
  ]

  for (const gap of inspection.gaps.slice(0, limit)) {
    parts.push(facet.group(`gap-${gap.index}`, [
      facet.atom('class', gap.class),
      facet.str('left', anchorLabel(gap.left)),
      facet.str('right', anchorLabel(gap.right)),
      facet.str('raw_visible', visibleGap(gap.raw)),
      facet.atom('line_breaks', gap.lineBreaks),
      facet.atom('start', gap.span.start.offset),
      facet.atom('end', gap.span.end.offset),
    ]))
  }

  if (inspection.gaps.length > limit) {
    parts.push(facet.atom('omitted_gaps', inspection.gaps.length - limit))
  }

  if (inspection.tightIdentifiers.length > 0) {
    parts.push(facet.group('tight-identifiers', inspection.tightIdentifiers.slice(0, limit).map(identifier =>
      facet.list(identifier.value, identifier.segments),
    )))
  }

  return formatSpwCard('spacing', parts)
}

export async function runSpacingInspection(options: RunSpacingInspectionOptions): Promise<void> {
  const abs = path.resolve(options.file)
  const source = await fs.readFile(abs, 'utf8')
  const file = path.relative(process.cwd(), abs) || path.basename(abs)
  const inspection = buildSpacingInspection(source, {
    file,
    eventPolicy: options.eventPolicy,
  })
  const limit = options.limit ?? 24

  emitHeader('inspect', {
    plane: 'spacing',
    file,
    gaps: inspection.gaps.length,
    parse: inspection.parse.ok,
  })

  if (options.json) {
    console.log(formatJsonEnvelope('inspect.spacing', inspection, {
      gaps: inspection.gaps.length,
      qualifiedIdentifiers: inspection.tightIdentifiers.length,
    }))
    return
  }

  if (options.showSpw) {
    console.log(formatSpacingInspectionSpw(inspection, { limit }))
    return
  }

  emitDetail('observational: classifies source relationships without changing AST or runtime meaning')
  emitDetail(`classes  ${GAP_CLASSES.map(kind => `${kind}=${inspection.gapCounts[kind]}`).join('  ')}`)
  emitDetail(`events   policy=${inspection.events.policy} generated=${inspection.events.generated} retained=${inspection.events.retained}`)

  console.log(formatTable(
    ['gap', 'class', 'left', 'right', 'surface'],
    inspection.gaps.slice(0, limit).map(gap => [
      String(gap.index),
      gap.class,
      anchorLabel(gap.left),
      anchorLabel(gap.right),
      visibleGap(gap.raw),
    ]),
    { maxCol: 34 },
  ))

  for (const identifier of inspection.tightIdentifiers.slice(0, limit)) {
    emitDetail(`identifier ${identifier.value} → ${identifier.segments.join(' / ')}`)
  }
  if (inspection.gaps.length > limit) emitDetail(`… ${inspection.gaps.length - limit} more gaps (raise --limit)`)
  emitNext(`spw inspect spacing ${file} --spw`, `spw inspect spacing ${file} --json`)
}
