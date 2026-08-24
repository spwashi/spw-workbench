import {
  PARSE_EVENT_POLICIES,
  SOURCE_PRODUCT_DEPTHS,
  type ParseEventPolicy,
  type SourceProductDepth,
} from '@spwashi/spw-seed'

export type InspectMode =
  | 'cache'
  | 'bank'
  | 'medium'
  | 'session'
  | 'memory'
  | 'static'
  | 'corpus'
  | 'compose'
  | 'source'
  | 'spacing'
  | 'help'

export interface InspectArgs {
  mode: InspectMode
  targets: string[]
  json: boolean
  ndjson: boolean
  quiet: boolean
  help: boolean
  channel: string
  dialect?: string
  beats: number
  recompute: boolean
  showSpw: boolean
  limit: number
  events: ParseEventPolicy
  through: SourceProductDepth
}

const INSPECT_MODES = new Set<InspectMode>([
  'cache',
  'bank',
  'medium',
  'session',
  'memory',
  'static',
  'corpus',
  'compose',
  'source',
  'spacing',
  'help',
])

interface ExplicitHandles {
  through: boolean
  events: boolean
  sample: boolean
}

export function parseInspectArgs(argv: readonly string[]): InspectArgs {
  const raw = argv[0] === 'inspect' ? argv.slice(1) : argv
  const parsed: InspectArgs = {
    mode: 'help',
    targets: [],
    json: false,
    ndjson: false,
    quiet: false,
    help: false,
    channel: 'trial',
    beats: 0,
    recompute: false,
    showSpw: false,
    limit: 24,
    events: 'diagnostics',
    through: 'structure',
  }
  const explicit: ExplicitHandles = { through: false, events: false, sample: false }

  for (let i = 0; i < raw.length; i++) {
    const argument = raw[i]!
    if (argument === '--help' || argument === '-h') {
      parsed.help = true
      continue
    }
    if (argument === '--json') {
      parsed.json = true
      continue
    }
    if (argument === '--ndjson') {
      parsed.ndjson = true
      continue
    }
    if (argument === '--quiet' || argument === '-q') {
      parsed.quiet = true
      continue
    }
    if (argument === '--spw') {
      parsed.showSpw = true
      continue
    }
    if (argument === '--recompute') {
      parsed.recompute = true
      continue
    }
    if (argument === '--channel') {
      parsed.channel = raw[++i] ?? 'trial'
      continue
    }
    if (argument.startsWith('--channel=')) {
      parsed.channel = argument.slice('--channel='.length) || 'trial'
      continue
    }
    if (argument === '--dialect') {
      parsed.dialect = raw[++i]
      continue
    }
    if (argument.startsWith('--dialect=')) {
      parsed.dialect = argument.slice('--dialect='.length)
      continue
    }
    if (argument === '--beats') {
      parsed.beats = readNonNegativeInteger(raw[++i], '--beats', 0)
      continue
    }
    if (argument.startsWith('--beats=')) {
      parsed.beats = readNonNegativeInteger(argument.slice('--beats='.length), '--beats', 0)
      continue
    }
    if (argument === '--sample') {
      parsed.limit = readPositiveInteger(raw[++i], '--sample')
      explicit.sample = true
      continue
    }
    if (argument.startsWith('--sample=')) {
      parsed.limit = readPositiveInteger(argument.slice('--sample='.length), '--sample')
      explicit.sample = true
      continue
    }
    if (argument === '--limit' || argument === '-n') {
      parsed.limit = readPositiveInteger(raw[++i], argument)
      continue
    }
    if (argument.startsWith('--limit=')) {
      parsed.limit = readPositiveInteger(argument.slice('--limit='.length), '--limit')
      continue
    }
    if (argument === '--events' || argument === '--event-policy') {
      parsed.events = readEventPolicy(raw[++i])
      explicit.events = true
      continue
    }
    if (argument.startsWith('--events=')) {
      parsed.events = readEventPolicy(argument.slice('--events='.length))
      explicit.events = true
      continue
    }
    if (argument.startsWith('--event-policy=')) {
      parsed.events = readEventPolicy(argument.slice('--event-policy='.length))
      explicit.events = true
      continue
    }
    if (argument === '--through' || argument === '--product') {
      parsed.through = readSourceDepth(raw[++i])
      explicit.through = true
      continue
    }
    if (argument.startsWith('--through=')) {
      parsed.through = readSourceDepth(argument.slice('--through='.length))
      explicit.through = true
      continue
    }
    if (argument.startsWith('--product=')) {
      parsed.through = readSourceDepth(argument.slice('--product='.length))
      explicit.through = true
      continue
    }
    if (!argument.startsWith('-') && INSPECT_MODES.has(argument as InspectMode) && parsed.mode === 'help' && parsed.targets.length === 0) {
      parsed.mode = argument as InspectMode
      continue
    }
    if (!argument.startsWith('-')) {
      parsed.targets.push(argument)
      continue
    }
    throw new Error(`spw inspect: unknown flag ${argument}`)
  }

  if (parsed.mode === 'help' && parsed.targets.length > 0 && !parsed.help) {
    parsed.mode = 'static'
  }
  validateProjection(parsed)
  validateHandleModes(parsed.mode, explicit)
  return parsed
}

function readEventPolicy(raw: string | undefined): ParseEventPolicy {
  if (!raw || !PARSE_EVENT_POLICIES.includes(raw as ParseEventPolicy)) {
    throw new Error('spw inspect: --events must be none|diagnostics|trace (--event-policy is an alias)')
  }
  return raw as ParseEventPolicy
}

function readSourceDepth(raw: string | undefined): SourceProductDepth {
  if (!raw || !SOURCE_PRODUCT_DEPTHS.includes(raw as SourceProductDepth)) {
    throw new Error('spw inspect: --through must be tokens|structure|trace (--product is an alias)')
  }
  return raw as SourceProductDepth
}

function readPositiveInteger(raw: string | undefined, flag: string): number {
  const value = Number(raw)
  if (!raw || !Number.isInteger(value) || value < 1) {
    throw new Error(`spw inspect: ${flag} must be a positive integer`)
  }
  return value
}

function readNonNegativeInteger(raw: string | undefined, flag: string, fallback: number): number {
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`spw inspect: ${flag} must be a non-negative integer`)
  }
  return value
}

function validateProjection(parsed: InspectArgs): void {
  if (parsed.ndjson && (parsed.json || parsed.showSpw)) {
    throw new Error('spw inspect: --ndjson cannot be combined with --json or --spw')
  }
  if (parsed.ndjson && parsed.mode !== 'source') {
    throw new Error('spw inspect: --ndjson is currently available for inspect source')
  }
}

function validateHandleModes(mode: InspectMode, explicit: ExplicitHandles): void {
  if (explicit.through && mode !== 'source') {
    throw new Error('spw inspect: --through is available for inspect source')
  }
  if (explicit.events && mode !== 'source' && mode !== 'spacing') {
    throw new Error('spw inspect: --events is available for inspect source or inspect spacing')
  }
  if (explicit.sample && mode !== 'source' && mode !== 'spacing') {
    throw new Error('spw inspect: --sample is available for inspect source or inspect spacing')
  }
}
