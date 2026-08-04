import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  bootstrapMeasureRegistry,
  loadMeasureContextFromSpw,
  resolveFamily,
  reconcileMetric,
  reconcileFamily,
  contextForFamily,
  MASS_FAMILY,
  defaultScheme,
} from './measure-protocol'

describe('measure protocol', () => {
  it('bootstraps mass as thrift specialization not sole kernel', () => {
    const reg = bootstrapMeasureRegistry()
    expect(reg.families.some(f => f.id === 'mass')).toBe(true)
    expect(reg.families.length).toBeGreaterThan(1)
    const mass = resolveFamily(reg, '%', 'mass')
    expect(mass?.algorithm).toBe('thrift.file_physics')
    expect(mass?.plane).toBe('thrift')
    expect(mass?.scopeKind).toBe('subject_file')
    expect(mass?.subjectBind).toBe('self')
  })

  it('assumes file-level context from family definition', () => {
    const ctx = contextForFamily(MASS_FAMILY, '../src/foo.ts')
    expect(ctx.scope.kind).toBe('subject_file')
    expect(ctx.scope.target).toBe('../src/foo.ts')
    expect(ctx.plane).toBe('thrift')
    expect(ctx.algorithm).toBe('thrift.file_physics')
    expect(ctx.form).toBe('vector')
  })

  it('reconciles exact and tol schemes', () => {
    const exact = reconcileMetric(
      { key: 'lines', value: 10 },
      { key: 'lines', value: 10 },
      defaultScheme('exact'),
    )
    expect(exact.verdict).toBe('match')

    const drift = reconcileMetric(
      { key: 'lines', value: 10 },
      { key: 'lines', value: 12 },
      defaultScheme('exact'),
    )
    expect(drift.verdict).toBe('drift')

    const tol = reconcileMetric(
      { key: 'lines', value: 10, scheme: { id: 'tol', abs: 3 } },
      { key: 'lines', value: 12 },
    )
    expect(tol.verdict).toBe('match')
  })

  it('loads measure-context.spw registry extensions', () => {
    const path = resolve(process.cwd(), '.spw/registries/measure-context.spw')
    const source = readFileSync(path, 'utf8')
    const reg = loadMeasureContextFromSpw(source)
    const mass = resolveFamily(reg, '%', 'mass')
    expect(mass?.id).toBe('mass')
    expect(mass?.keys).toEqual(expect.arrayContaining(['lines', 'bytes']))
    expect(reg.algorithms.some(a => a.id === 'attention.scope_walk')).toBe(true)
    expect(reg.algorithms.some(a => a.id === 'thrift.file_physics')).toBe(true)
    // density family from Spw registry
    const density = resolveFamily(reg, '%', 'density')
    expect(density?.plane).toBe('syntax')
  })

  it('reconcileFamily marks unknown keys unmeasurable when knownKeys set', () => {
    const rows = reconcileFamily(
      'mass',
      { lines: { key: 'lines', value: 1 }, mystery: { key: 'mystery', value: 9 } },
      { lines: { key: 'lines', value: 1 } },
      defaultScheme('exact'),
      ['lines', 'bytes'],
    )
    const mystery = rows.find(r => r.key === 'mystery')
    expect(mystery?.verdict).toBe('unmeasurable')
  })
})
