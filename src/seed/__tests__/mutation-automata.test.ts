/**
 * Mutation automata + topographical probes + operational transform algebra.
 */
import { describe, it, expect } from 'vitest'
import {
  applyEdits,
  collectPlannedEdits,
  differentialFromSources,
  foldTransforms,
  formatMatrix,
  hashString,
  matrixFromVectors,
  matrixTranspose,
  mutationRulesAsSequenceContext,
  boundaryLadder,
  operatorLadder,
  planMutation,
  probeMutationTopography,
  probeBoundaryLadder,
  probeFormLadder,
  probeOperatorLadder,
  runMutationAutomata,
  runOperationalSequence,
  snapshotTopography,
  topographyDelta,
  transformEdit,
  vectorMagnitude,
  listOperatorLadders,
  listBoundaryLadders,
  implicationsForBoundary,
  BOUNDARY_AXIS_IMPLICATIONS,
  applyMobilityRule,
  runHigherOrderForm,
  walkReferenceProgression,
  computationalRuleIds,
  labelSiteGraph,
} from '@spwashi/spw-seed'

describe('source differential', () => {
  it('identity when sources equal', () => {
    const d = differentialFromSources('a\n', 'a\n', 'noop', 'layout', hashString)
    expect(d.identity).toBe(true)
    expect(d.edits).toHaveLength(0)
  })

  it('applyEdits round-trips line rewrite', () => {
    const before = 'a  \nb\n'
    const after = 'a\nb\n'
    const d = differentialFromSources(before, after, 'trim', 'layout', hashString)
    expect(d.identity).toBe(false)
    expect(applyEdits(before, d.edits)).toBe(after)
  })
})

describe('mutation automata', () => {
  it('layout_canonical trims and ensures final newline', () => {
    const result = runMutationAutomata('line  \r\n', {
      profile: 'layout_canonical',
      dryRun: false,
      effectCeiling: 'effect.l1.memory',
    })
    expect(result.source).toBe('line\n')
    expect(result.changed).toBe(true)
    expect(result.stopReason).toBe('fixed_point')
    expect(result.vector.edit_count).toBeGreaterThan(0)
  })

  it('dry-run / measure does not rewrite returned source', () => {
    const input = 'line  \n'
    const result = runMutationAutomata(input, {
      profile: 'layout_canonical',
      dryRun: true,
    })
    expect(result.source).toBe(input)
    expect(result.dryRun).toBe(true)
  })

  it('planMutation is plan-only', () => {
    const input = 'x  \n'
    const plan = planMutation(input, { profile: 'layout_canonical' })
    expect(plan.source).toBe(input)
    expect(plan.plannedSource).toBe('x\n')
    expect(plan.changed).toBe(false)
    expect(plan.wouldChange).toBe(true)
    expect(plan.requiresWriteAuthority).toBe(true)
    expect(plan.steps.every(step => !step.applied)).toBe(true)
    expect(plan.steps.some(s => !s.differential.identity)).toBe(true)
    expect(applyEdits(input, collectPlannedEdits(plan))).toBe(plan.plannedSource)
  })

  it('converges a dry plan to the same virtual fixed point as an in-memory run', () => {
    const input = '...@rest\n'
    const plan = runMutationAutomata(input, {
      profile: 'equiv_scripts',
      dryRun: true,
      effectCeiling: 'effect.l1.memory',
    })
    const applied = runMutationAutomata(input, {
      profile: 'equiv_scripts',
      dryRun: false,
      effectCeiling: 'effect.l1.memory',
    })

    expect(plan.source).toBe(input)
    expect(plan.plannedSource).toBe(applied.source)
    expect(plan.plannedOutputHash).toBe(applied.outputHash)
    expect(plan.vector).toEqual(applied.vector)
    expect(plan.stopReason).toBe('fixed_point')
    expect(plan.steps.every(step => !step.applied)).toBe(true)
  })

  it('exports one original-coordinate edit plan for multi-rule layout', () => {
    const input = 'a  \r\n\r\n\r\nb'
    const plan = planMutation(input, { profile: 'layout_full' })

    expect(applyEdits(input, collectPlannedEdits(plan))).toBe(plan.plannedSource)
    expect(plan.plannedDifferential.beforeHash).toBe(plan.inputHash)
    expect(plan.plannedDifferential.afterHash).toBe(plan.plannedOutputHash)
  })

  it('blocks mixed-authority profiles atomically while preserving their plan', () => {
    const input = 'x  '
    const result = runMutationAutomata(input, {
      enabledRules: ['trim_custom', 'write_custom'],
      effectCeiling: 'effect.l1.memory',
      dryRun: false,
      customRules: [
        {
          id: 'trim_custom',
          description: 'trim in memory',
          stratum: 'layout',
          effectGrade: 'effect.l1.memory',
          transform: source => source.trimEnd(),
        },
        {
          id: 'write_custom',
          description: 'represent a workspace-authorized transform',
          stratum: 'operation',
          effectGrade: 'effect.l2.workspace',
          transform: source => `${source}!`,
        },
      ],
    })

    expect(result.stopReason).toBe('authority_failure')
    expect(result.source).toBe(input)
    expect(result.plannedSource).toBe('x!')
    expect(result.rulesResolved).toEqual(['trim_custom', 'write_custom'])
    expect(result.rulesApplied).toEqual([])
    expect(result.rulesBlocked).toEqual([{ ruleId: 'write_custom', effectGrade: 'effect.l2.workspace' }])
    expect(result.steps.every(step => !step.applied)).toBe(true)
  })

  it('equiv_scripts rewrites spw:seq alias', () => {
    const result = runMutationAutomata('run npm run spw:seq -- foo\n', {
      profile: 'equiv_scripts',
      dryRun: false,
      effectCeiling: 'effect.l1.memory',
    })
    expect(result.source).toContain('spw:ls')
    expect(result.source).not.toContain('spw:seq')
  })

  it('fixed point on already canonical source', () => {
    const result = runMutationAutomata('ok\n', {
      profile: 'layout_canonical',
      dryRun: false,
    })
    expect(result.changed).toBe(false)
    expect(result.stopReason).toBe('fixed_point')
  })
})

describe('topographical mutation probes', () => {
  it('snapshot reports paired containers and couple ops', () => {
    const snap = snapshotTopography('({[x]}) <>')
    expect(snap.parseHealth).toBe('complete_structured')
    expect(snap.recognizedPairedContainers).toMatchObject({
      scope: 1,
      body: 1,
      frame: 1,
    })
    expect(snap.explicitCoupleOperations).toBe(1)
  })

  it('layout trim is layout-only candidate when structure stable', () => {
    const before = '{\n  x  \n}\n'
    const probe = probeMutationTopography(before, {
      profile: 'layout_canonical',
      dryRun: true,
    })
    expect(probe.plannedDelta.healthRegressed).toBe(false)
    // Structure should not move for trailing-space layout cleanup
    expect(probe.plannedDelta.structureMoved).toBe(false)
    expect(probe.findings.length).toBeGreaterThan(0)
  })

  it('topographyDelta detects health regression', () => {
    const good = snapshotTopography('{x}')
    const bad = snapshotTopography('{')
    const d = topographyDelta(good, bad)
    expect(d.healthRegressed).toBe(true)
    expect(d.parseHealthChanged).toBe(true)
  })

  it('probe exposes planned virtual after under dry-run', () => {
    const input = 'a  \n'
    const probe = probeMutationTopography(input, {
      profile: 'layout_canonical',
      dryRun: true,
    })
    expect(probe.mutation.source).toBe(input)
    expect(probe.plannedAfter.sourceLength).not.toBe(probe.before.sourceLength)
    expect(probe.plannedDelta.sourceLengthDelta).not.toBe(0)
  })
})

describe('operational transform algebra', () => {
  it('transformEdit shifts op when against is entirely before', () => {
    const against = {
      start: 0,
      end: 1,
      newText: 'xx',
      ruleId: 'a',
      stratum: 'layout' as const,
    }
    // against replaces 1 char with 2 → delta +1
    const op = {
      start: 5,
      end: 6,
      newText: 'y',
      ruleId: 'b',
      stratum: 'script' as const,
    }
    const r = transformEdit(op, against)
    expect(r.edit?.start).toBe(6)
    expect(r.edit?.end).toBe(7)
  })

  it('transformEdit leaves op unchanged when against is after', () => {
    const against = {
      start: 10,
      end: 12,
      newText: '',
      ruleId: 'a',
      stratum: 'layout' as const,
    }
    const op = {
      start: 0,
      end: 2,
      newText: 'ab',
      ruleId: 'b',
      stratum: 'layout' as const,
    }
    const r = transformEdit(op, against)
    expect(r.edit).toEqual(op)
  })

  it('transformEdit reports overlap conflict', () => {
    const a = {
      start: 0,
      end: 4,
      newText: 'abcd',
      ruleId: 'a',
      stratum: 'structure' as const,
    }
    const b = {
      start: 2,
      end: 6,
      newText: 'xy',
      ruleId: 'b',
      stratum: 'structure' as const,
    }
    const r = transformEdit(b, a)
    expect(r.edit).toBeNull()
    expect(r.conflict).toBe('overlap')
  })

  it('foldTransforms composes pure steps and folds differential', () => {
    const { source, steps, folded, vector } = foldTransforms('a  \n', [
      {
        id: 'trim',
        stratum: 'layout',
        apply: s => s.replace(/ +$/gm, ''),
      },
      {
        id: 'nl',
        stratum: 'layout',
        apply: s => (s.endsWith('\n') ? s : s + '\n'),
      },
    ])
    expect(source).toBe('a\n')
    expect(steps.length).toBe(2)
    expect(folded.identity).toBe(false)
    expect(vectorMagnitude(vector)).toBeGreaterThan(0)
  })

  it('serial sequence layout_granular reaches fixed layout', () => {
    const ctx = mutationRulesAsSequenceContext()
    const result = runOperationalSequence('line  \r\n', 'layout_granular', ctx)
    expect(result.mode).toBe('serial')
    expect(result.source).toBe('line\n')
    expect(result.changed).toBe(true)
    expect(result.matrix.rows.length).toBe(result.steps.length)
    expect(formatMatrix(result.matrix).split('\n').length).toBeGreaterThan(1)
  })

  it('layout_then_script vs script_then_layout are both defined sequences', () => {
    const ctx = mutationRulesAsSequenceContext()
    const src = 'npm run spw:seq -- x  \n'
    const a = runOperationalSequence(src, 'layout_then_script', ctx)
    const b = runOperationalSequence(src, 'script_then_layout', ctx)
    expect(a.source).toContain('spw:ls')
    expect(b.source).toContain('spw:ls')
    // Both should rewrite alias; order may only affect intermediate vectors
    expect(a.changed).toBe(true)
    expect(b.changed).toBe(true)
  })

  it('matrixFromVectors builds step rows', () => {
    const m = matrixFromVectors([
      {
        id: 'a',
        vector: {
          layout_delta: 1,
          token_delta: 0,
          structure_delta: 0,
          label_delta: 0,
          reference_delta: 0,
          script_delta: 0,
          edit_count: 1,
          bytes_delta: -2,
        },
      },
    ])
    expect(m.rows).toEqual(['a'])
    expect(m.data[0][0]).toBe(1)
    expect(m.data[0][7]).toBe(-2)

    const transposed = matrixTranspose(m)
    expect(transposed.rows[0]).toBe('layout_delta')
    expect(transposed.cols).toEqual(['a'])
    expect(transposed.data[0]).toEqual([1])
  })

  it('parallel planning composes three independent length-changing edits', () => {
    const source = 'a\nb\nc\n'
    const result = runOperationalSequence(source, {
      id: 'three-independent-edits',
      description: 'negative control for cumulative edit duplication',
      mode: 'parallel_plan',
      steps: [
        { id: 'widen-a', kind: 'custom', apply: value => value.replace('a', 'aa') },
        { id: 'widen-b', kind: 'custom', apply: value => value.replace('b', 'bb') },
        { id: 'widen-c', kind: 'custom', apply: value => value.replace('c', 'cc') },
      ],
    }, mutationRulesAsSequenceContext())

    expect(result.source).toBe('aa\nbb\ncc\n')
    expect(result.conflicts).toEqual([])
    expect(applyEdits(source, result.folded.edits)).toBe(result.source)
  })
})

describe('form ladders (paired-boundary profile)', () => {
  it('defines and discloses six paired-boundary ladders', () => {
    const boundaries = listBoundaryLadders()
    expect(boundaries).toHaveLength(6)
    for (const l of boundaries) {
      expect(l.notation).toContain('=>')
      expect(l.steps[0].role).toBe('empty')
      expect(l.emptySurface.length).toBeGreaterThan(0)
      expect(l.emptyState).toEqual({ occupancy: 'empty', payload: 'void' })
      expect(l.axes.length).toBeGreaterThan(0)
    }
    expect(boundaryLadder('[]')?.boundary).toBe('frame')
    expect(boundaryLadder('{}')?.boundary).toBe('body')
    expect(boundaryLadder('()')?.boundary).toBe('scope')
    expect(boundaryLadder('< >')?.boundary).toBe('capsule')
    expect(boundaryLadder('<>')).toBeUndefined()
    expect(boundaryLadder('toString')).toBeUndefined()
    expect(operatorLadder('toString')).toBeUndefined()
  })

  it('frame ladder is selection-primary with path and fold', () => {
    const frame = boundaryLadder('frame')
    expect(frame?.axes).toEqual(expect.arrayContaining(['selection', 'path', 'fold']))
    expect(frame?.notation).toContain('[]')
    expect(frame?.notation).toContain('#[a, b]')
    expect(frame?.steps.some(s => s.role === 'path')).toBe(true)
    expect(frame?.steps.some(s => s.role === 'fold')).toBe(true)
  })

  it('body ladder grounds via .{} and folds properties', () => {
    const body = boundaryLadder('body')
    expect(body?.axes).toEqual(expect.arrayContaining(['ground', 'material', 'fold']))
    expect(body?.notation).toContain('.{}')
    expect(body?.steps.some(s => s.role === 'ground')).toBe(true)
  })

  it('scope ladder centers reference and path, not capacitance', () => {
    const scope = boundaryLadder('scope')
    expect(scope?.axes).toEqual(expect.arrayContaining(['reference', 'flow', 'path']))
    expect(scope?.notation).toContain('@(')
    expect(scope?.notation).not.toMatch(/cap|capacit/i)
    expect(JSON.stringify(implicationsForBoundary('scope'))).not.toMatch(/capacit/i)
  })

  it('boundary axis table covers selection path ref label ground fold', () => {
    const axes = new Set(BOUNDARY_AXIS_IMPLICATIONS.map(i => i.axis))
    for (const a of ['selection', 'path', 'reference', 'label', 'ground', 'fold']) {
      expect(axes.has(a as any)).toBe(true)
    }
  })

  it('probeBoundaryLadder observes the portable empty Frame structure', () => {
    const probe = probeBoundaryLadder('frame')
    expect(probe!.steps[0].expectationMet).toBe(true)
    expect(probe!.steps[0].onf?.occupancy).toBe('empty')
    expect(probe!.steps[0].onf?.couplingKind).toBe('frame')
  })

  it('operator ladders plug into boundaries without _cap exemplar', () => {
    const ladders = listOperatorLadders()
    expect(ladders).toHaveLength(13)
    for (const l of ladders) {
      expect(l.notation).toContain('=>')
      expect(l.notation).not.toMatch(/_cap/)
      expect(l.steps[0].role).toBe('seed')
    }
    const and = operatorLadder('&')
    expect(and?.preferredBoundary).toBe('body')
    expect(and?.axes).toEqual(expect.arrayContaining(['fold', 'material']))
    expect(and?.notation).toContain('{&}')
    expect(and?.notation).toContain('.{&: _}')
  })

  it('probeOperatorLadder seed steps remain structured', () => {
    const andProbe = probeOperatorLadder('&')
    expect(andProbe!.steps[0].onf?.sigil).toBe('&')
    expect(andProbe!.steps[1].onf?.couplingKind).toBe('body')
    const ground = probeOperatorLadder('.')
    expect(ground!.ladder.name).toMatch(/Ground/i)
  })

  it('couple ladder probe exposes the operand arity it claims', () => {
    const ladder = operatorLadder('<>')!
    const probe = probeFormLadder(ladder)
    const operandStep = probe.steps.find(step => step.step.id === 'couple')

    expect(operandStep?.expectationMet).toBe(true)
    expect(operandStep?.onf?.couplingKind).toBe('couple')
    expect(operandStep?.onf?.arity).toBe(2)
  })
})

describe('form geometry — label mobility', () => {
  it('implements computational ingress/egress round-trip for operator labels', () => {
    const inR = applyMobilityRule('ingress.operator_label', 'topic', 'topic')
    expect(inR.ok && inR.source).toBe('!topic')
    if (!inR.ok) return
    const outR = applyMobilityRule('egress.operator_label', inR.source, 'topic')
    expect(outR.ok && outR.source).toBe('topic')
  })

  it('select then path HOF completes', () => {
    const run = runHigherOrderForm('hof.select_then_path', 'topic')
    expect(run?.completed).toBe(true)
    expect(run?.source).toBe('topic / _')
    expect(run?.form.liminalPath).toEqual(['exterior', 'chamber', 'exterior'])
  })

  it('membrane to observer progression walks', () => {
    const w = walkReferenceProgression('ref.membrane_observe', 'gate')
    expect(w?.completed).toBe(true)
    expect(w?.source).toBe('@(gate)')
  })

  it('label orbit frame→capsule→scope', () => {
    const run = runHigherOrderForm('hof.label_orbit_frame_capsule_scope', 'n')
    expect(run?.completed).toBe(true)
    expect(run?.source).toBe('@(n)')
    expect(run?.steps.map(s => s.after)).toEqual(['[n]', '<n>', '@(n)'])
  })

  it('interior ground fold rehosts body term', () => {
    const run = runHigherOrderForm('hof.interior_ground_fold', 'x', '{x}')
    expect(run?.completed).toBe(true)
    expect(run?.source).toBe('.{x: x}')
  })

  it('site graph has edges and computational rules are non-empty', () => {
    expect(labelSiteGraph().length).toBeGreaterThan(5)
    expect(computationalRuleIds().length).toBeGreaterThan(8)
  })

  it('action aperture cycle returns to free label', () => {
    const run = runHigherOrderForm('hof.action_aperture_cycle', 'go')
    expect(run?.completed).toBe(true)
    expect(run?.source).toBe('go')
  })

  it('keeps mobility catalogs aligned with their executable domains', () => {
    expect(applyMobilityRule('ingress.header', 'topic', 'topic').ok).toBe(true)
    expect(applyMobilityRule('ingress.header', '.{topic: _}', 'topic').ok).toBe(false)

    const bridge = applyMobilityRule('promote.register_bridge', '@(topic)', 'topic')
    expect(bridge.ok && bridge.source).toBe('$(topic)')
    expect(bridge.ok && bridge.receipt.inverse.status).toBe('exact')
    expect(applyMobilityRule('promote.register_bridge', '$(topic)', 'topic').ok).toBe(false)
    expect(applyMobilityRule(
      'promote.register_bridge',
      '^["topic"]{payload}',
      'topic',
    ).ok).toBe(false)

    expect(applyMobilityRule('egress.pair_labels', '{_topic }_topic', 'topic')).toMatchObject({
      ok: true,
      source: 'topic',
    })
    expect(applyMobilityRule('egress.pair_labels', '{_topic value }_topic', 'topic').ok).toBe(false)
    expect(applyMobilityRule(
      'egress.pair_labels_to_body',
      '{_topic value }_topic',
      'topic',
    )).toMatchObject({ ok: true, source: '{value}' })
  })

  it('rejects labels outside the declared mobility grammar', () => {
    const result = applyMobilityRule('ingress.header', '', 'bad"]{payload}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/identifier grammar/)
  })
})
