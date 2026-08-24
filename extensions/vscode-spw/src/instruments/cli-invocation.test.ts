import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  cacheInvocation,
  cliProcess,
  formInvocation,
  refactorPlanInvocation,
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
