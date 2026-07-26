/**
 * Standardized Spw CLI response envelope and helpers.
 * Provides one versioned wire contract as commands migrate to structured output.
 */

export interface SpwEnvelopeError {
  code: string
  message: string
}

export interface SpwEnvelopeProducer {
  name: string
  version: string
}

interface SpwEnvelopeBase {
  $schema: typeof SPW_SCHEMA_URI
  surface: typeof SPW_ENVELOPE_SURFACE
  schemaVersion: typeof SPW_ENVELOPE_SCHEMA_VERSION
  producer: SpwEnvelopeProducer
  command: string
  timestamp: string
}

export interface SpwSuccessEnvelope<T> extends SpwEnvelopeBase {
  ok: true
  summary?: Record<string, unknown>
  data: T
  error?: never
}

export interface SpwErrorEnvelope extends SpwEnvelopeBase {
  ok: false
  error: SpwEnvelopeError
  data: null
  summary?: never
}

export type SpwCliEnvelope<T = unknown> = SpwSuccessEnvelope<T> | SpwErrorEnvelope

export type EnvelopeClock = () => Date

export interface EnvelopeBuildOptions {
  clock?: EnvelopeClock
}

export const SPW_SCHEMA_URI =
  'https://raw.githubusercontent.com/spwashi/spw-workbench/main/schemas/spw-cli-envelope.v1.schema.json'
export const SPW_ENVELOPE_SURFACE = 'spw.cli.envelope'
export const SPW_ENVELOPE_SCHEMA_VERSION = 1
export const SPW_CLI_PRODUCER = {
  name: '@spwashi/spw-cli',
  version: '0.3.0',
} as const

const systemClock: EnvelopeClock = () => new Date()

export function buildEnvelope<T>(
  command: string,
  data: T,
  summary?: Record<string, unknown>,
  options: EnvelopeBuildOptions = {},
): SpwSuccessEnvelope<T> {
  return {
    ...buildEnvelopeBase(command, options),
    ok: true,
    ...(summary ? { summary } : {}),
    data,
  }
}

export function buildErrorEnvelope(
  command: string,
  message: string,
  code = 'SPW_CLI_ERROR',
  options: EnvelopeBuildOptions = {},
): SpwErrorEnvelope {
  return {
    ...buildEnvelopeBase(command, options),
    ok: false,
    error: {
      code,
      message,
    },
    data: null,
  }
}

export function formatJsonEnvelope<T>(
  command: string,
  data: T,
  summary?: Record<string, unknown>,
  options: EnvelopeBuildOptions = {},
): string {
  return JSON.stringify(buildEnvelope(command, data, summary, options), null, 2)
}

function buildEnvelopeBase(
  command: string,
  options: EnvelopeBuildOptions,
): SpwEnvelopeBase {
  const clock = options.clock ?? systemClock
  return {
    $schema: SPW_SCHEMA_URI,
    surface: SPW_ENVELOPE_SURFACE,
    schemaVersion: SPW_ENVELOPE_SCHEMA_VERSION,
    producer: { ...SPW_CLI_PRODUCER },
    command,
    timestamp: clock().toISOString(),
  }
}
