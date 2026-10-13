import { describe, expect, it } from 'vitest'
import { REFACTOR_PLAN_OMISSIONS, REFACTOR_PLAN_SURFACE, buildRefactorPlanCard } from './refactor-plan'

describe('spw.refactor.plan/1', () => {
  it('names plan-only effect and lifecycle omissions', () => {
    const card = buildRefactorPlanCard({
      write: false,
      rules: [{
        id: 'rename_mark:status→phase',
        description: 'Rename annotation mark status to phase',
        effectGrade: 'effect.l2.workspace',
      }],
      totalEdits: 2,
      totalConflicts: 0,
      renameSpecs: ['mark:status=phase'],
      report: [{
        file: '.spw/example.spw',
        edits: [],
        conflicts: 0,
        withheld: 0,
        wrote: false,
      }],
    })

    expect(card.surface).toBe(REFACTOR_PLAN_SURFACE)
    expect(card.mode).toBe('plan')
    expect(card.effect).toBe('effect.l0.measure')
    expect(card.write).toBe(false)
    expect(card.omitted).toEqual([...REFACTOR_PLAN_OMISSIONS])
    expect(card.next[0]).toContain('--write')
    expect(card.next[0]).not.toContain('--json')
  })

  it('offers a pending move as a command and carries unowned links unedited', () => {
    const card = buildRefactorPlanCard({
      write: false,
      rules: [],
      totalEdits: 1,
      totalConflicts: 0,
      renameSpecs: ['path:docs/old.spw=docs/new.spw'],
      report: [],
      moves: [
        { from: 'docs/old.spw', to: 'docs/new.spw', kind: 'file', state: 'pending', command: 'mv docs/old.spw docs/new.spw' },
        { from: 'notes', to: 'archive/notes', kind: 'directory', state: 'moved', command: 'mv notes archive/notes' },
      ],
      unowned: [{ file: 'README.md', line: 3, text: '[old](docs/old.spw)' }],
    })

    expect(card.next).toEqual([
      'spw refactor . --rename path:docs/old.spw=docs/new.spw --write',
      'mv docs/old.spw docs/new.spw',
    ])
    expect(card.moves).toHaveLength(2)
    expect(card.unowned).toEqual([{ file: 'README.md', line: 3, text: '[old](docs/old.spw)' }])
  })

  it('raises effect only when the plan actually wrote', () => {
    const card = buildRefactorPlanCard({
      write: true,
      rules: [],
      totalEdits: 1,
      totalConflicts: 0,
      report: [],
    })

    expect(card.mode).toBe('write')
    expect(card.effect).toBe('effect.l2.workspace')
    expect(card.next).toEqual([])
  })
})
