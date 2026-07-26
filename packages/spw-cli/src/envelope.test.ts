import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import {
  buildEnvelope,
  buildErrorEnvelope,
  formatJsonEnvelope,
  SPW_CLI_PRODUCER,
  SPW_ENVELOPE_SCHEMA_VERSION,
  SPW_ENVELOPE_SURFACE,
  SPW_SCHEMA_URI,
} from './envelope'

const envelopeSchema = JSON.parse(
  readFileSync(
    new URL('../../../schemas/spw-cli-envelope.v1.schema.json', import.meta.url),
    'utf8',
  ),
)
const cliPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
const validateEnvelope = new Ajv({ allErrors: true }).compile(envelopeSchema)

describe('envelope', () => {
  it('builds a successful response envelope', () => {
    const res = buildEnvelope(
      'invent',
      { rows: [1, 2] },
      { total: 2 },
      { clock: fixedClock },
    )
    expect(res.$schema).toBe(SPW_SCHEMA_URI)
    expect(res.surface).toBe(SPW_ENVELOPE_SURFACE)
    expect(res.schemaVersion).toBe(SPW_ENVELOPE_SCHEMA_VERSION)
    expect(res.producer).toEqual(SPW_CLI_PRODUCER)
    expect(res.command).toBe('invent')
    expect(res.timestamp).toBe('2026-07-25T12:34:56.000Z')
    expect(res.ok).toBe(true)
    expect(res.summary).toEqual({ total: 2 })
    expect(res.data).toEqual({ rows: [1, 2] })
    expect('error' in res).toBe(false)
    expectValidEnvelope(res)
  })

  it('builds an error envelope', () => {
    const err = buildErrorEnvelope(
      'map',
      'File not found',
      'ENOENT',
      { clock: fixedClock },
    )
    expect(err.ok).toBe(false)
    expect(err.error).toEqual({ code: 'ENOENT', message: 'File not found' })
    expect(err.data).toBeNull()
    expect('summary' in err).toBe(false)
    expect(err.timestamp).toBe('2026-07-25T12:34:56.000Z')
    expectValidEnvelope(err)
  })

  it('formats envelope as pretty JSON', () => {
    const json = formatJsonEnvelope(
      'query',
      { items: [] },
      undefined,
      { clock: fixedClock },
    )
    const parsed = JSON.parse(json)
    expect(parsed.ok).toBe(true)
    expect(parsed.command).toBe('query')
    expect(parsed.timestamp).toBe('2026-07-25T12:34:56.000Z')
  })

  it('keeps the wire constants aligned with the published schema', () => {
    expect(envelopeSchema.$id).toBe(SPW_SCHEMA_URI)
    expect(envelopeSchema.properties.surface.const).toBe(SPW_ENVELOPE_SURFACE)
    expect(envelopeSchema.properties.schemaVersion.const).toBe(
      SPW_ENVELOPE_SCHEMA_VERSION,
    )
    expect(envelopeSchema.definitions.producer.properties.name.const).toBe(
      SPW_CLI_PRODUCER.name,
    )
    expect(SPW_CLI_PRODUCER.version).toBe(cliPackage.version)
  })

  it('rejects envelopes that cross the success and error variants', () => {
    const success = buildEnvelope('query', [], undefined, { clock: fixedClock })
    const error = buildErrorEnvelope('query', 'bad query', undefined, {
      clock: fixedClock,
    })

    expect(validateEnvelope({ ...success, ok: false })).toBe(false)
    expect(validateEnvelope({ ...error, ok: true })).toBe(false)
  })
})

function fixedClock(): Date {
  return new Date('2026-07-25T12:34:56.000Z')
}

function expectValidEnvelope(value: unknown): void {
  const valid = validateEnvelope(value)
  expect(valid, JSON.stringify(validateEnvelope.errors)).toBe(true)
}
