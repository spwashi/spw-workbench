import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  INLINE_SOURCE_LIMIT,
  cacheInvocation,
  cliProcess,
  fingerprintInvocation,
  formInvocation,
  memoryInvocations,
  performanceInvocation,
  projectionInvocation,
  refactorPlanInvocation,
  sourceInvocation,
  stackInvocation,
} from './cli-invocation'

describe('VS Code Spw CLI invocations', () => {
  const consumer = path.resolve('/workspace/consumer')
  const mountedWorkbench = path.join(consumer, '.spw', '_workbench')
  const surface = path.join(consumer, 'docs', 'example.spw')

  it('separates tool-root prefix from consumer-root cwd', () => {
    const process = cliProcess(
      { consumerRoot: consumer, toolRoot: mountedWorkbench },
      formInvocation(consumer, surface),
    )

    expect(process).toEqual({
      command: 'npm',
      arguments: [
        '--prefix', mountedWorkbench,
        'run', '--silent', 'spw', '--',
        'form', 'docs/example.spw', '--resonance', '--spw',
      ],
      cwd: consumer,
    })
  })

  it('uses canonical stack and cache forms', () => {
    expect(stackInvocation(consumer, surface).arguments)
      .toEqual(['stack', 'docs/example.spw', '--json'])
    expect(cacheInvocation(consumer, surface).arguments)
      .toEqual(['inspect', 'cache', 'docs/example.spw', '--json'])
  })

  it('builds plan-only corpus refactors and rejects malformed specs', () => {
    const plan = refactorPlanInvocation('mark:status=phase')
    expect(plan.arguments).toEqual(['refactor', '.', '--rename', 'mark:status=phase', '--json'])
    expect(plan.arguments).not.toContain('--write')
    expect(() => refactorPlanInvocation('status=phase')).toThrow('Expected kind:from=to')
  })

  it('rejects surfaces outside the consumer root', () => {
    expect(() => formInvocation(consumer, path.resolve('/another/example.spw')))
      .toThrow('inside the consumer workspace')
  })
})

describe('read-only CLI instruments', () => {
  const consumer = path.resolve('/workspace/consumer')
  const surface = path.join(consumer, 'docs', 'example.spw')

  it('inspects a file through trace, or a selection inline with a short display', () => {
    expect(sourceInvocation(consumer, surface).arguments)
      .toEqual(['inspect', 'source', 'docs/example.spw', '--through', 'trace'])

    const inline = sourceInvocation(consumer, surface, '--not-a-flag\n^"x"{ y }')
    expect(inline.arguments)
      .toEqual(['inspect', 'source', '--text=--not-a-flag\n^"x"{ y }', '--through', 'trace'])
    expect(inline.display).toBe('spw inspect source --text <2 lines, 22 chars> --through trace')
  })

  it('refuses empty or oversized inline source before spawning anything', () => {
    expect(() => sourceInvocation(consumer, surface, '  \n ')).toThrow('Select some source')
    expect(() => sourceInvocation(consumer, surface, 'a'.repeat(INLINE_SOURCE_LIMIT + 1)))
      .toThrow('Inspect the whole file instead')
  })

  it('fingerprints the trimmed expression and refuses a blank line', () => {
    expect(fingerprintInvocation('  noun[mode]{parts}  ').arguments)
      .toEqual(['fingerprint', '--expr=noun[mode]{parts}'])
    expect(() => fingerprintInvocation('   ')).toThrow('put the cursor on a line')
  })

  it('reads memory through inspect memory and lists dumps', () => {
    expect(memoryInvocations().map(invocation => invocation.arguments))
      .toEqual([['inspect', 'memory'], ['mem', 'list']])
  })

  it('times the folder that holds the file, as . at the consumer root', () => {
    expect(performanceInvocation(consumer, surface).arguments)
      .toEqual(['query', '--from', 'docs', '--selector', 'pathRefs', '--count', '--stats'])
    expect(performanceInvocation(consumer, path.join(consumer, 'top.spw')).arguments[2]).toBe('.')
    expect(() => performanceInvocation(consumer, path.join(consumer, 'a,b', 'x.spw')))
      .toThrow('comma')
  })

  it('projects the emit IR without --out, so nothing is written', () => {
    const projection = projectionInvocation(consumer, surface)
    expect(projection.arguments).toEqual(['emit', 'ir', 'docs/example.spw'])
    expect(projection.arguments).not.toContain('--out')
    expect(projection.output).toBe('json')
  })

  it('never passes a write flag', () => {
    const all = [
      sourceInvocation(consumer, surface),
      sourceInvocation(consumer, surface, 'x'),
      fingerprintInvocation('x'),
      ...memoryInvocations(),
      performanceInvocation(consumer, surface),
      projectionInvocation(consumer, surface),
    ].flatMap(invocation => invocation.arguments)
    for (const flag of ['--write', '--out', '--wipe']) expect(all).not.toContain(flag)
  })
})
