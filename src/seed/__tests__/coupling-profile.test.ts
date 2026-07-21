import { describe, expect, it } from 'vitest'
import {
  couplingFrame,
  projectCouplingSemantics,
  validateCouplingSemanticsProfile,
  type CouplingSemanticsProfile,
} from '../types/coupling'

const operationalProfile: CouplingSemanticsProfile = {
  id: 'example-operational-boundaries',
  revision: '1',
  status: 'operational',
  // This named profile intentionally excludes angle, stream, and range forms.
  includedKinds: ['frame', 'body', 'scope'],
  semantics: {
    frame: {
      kind: 'frame',
      name: 'selection boundary',
      description: 'selects an addressable subset under this profile',
      portRoles: {
        open_boundary: {
          role: 'begin selection',
          direction: 'in',
          description: 'enters the selection context',
        },
      },
      dimensions: [{
        id: 'candidate_count',
        description: 'number of addressable candidates before selection',
        valueType: 'number',
        unit: 'items',
        method: 'count candidates in the declared query scope',
        falsifier: 'the count cannot be reproduced from the same revision and scope',
      }],
      dynamics: [{
        operation: 'select',
        input: 'candidate set and selector',
        output: 'selected subset',
        effectGrade: 'S0',
        evidence: 'profile-owned select contract and fixtures',
      }],
    },
    body: {
      kind: 'body',
      name: 'materialization boundary',
      description: 'assembles a scoped result under this profile',
      dynamics: [{
        operation: 'materialize',
        input: 'ordered interior values',
        output: 'scoped result',
        effectGrade: 'S0',
        evidence: 'profile-owned materialization contract and fixtures',
      }],
    },
  },
}

describe('coupling semantics profiles', () => {
  it('adds distinct dynamics without replacing structural coupling facts', () => {
    const structure = couplingFrame('frame', 'empty')
    const projection = projectCouplingSemantics(structure, operationalProfile)

    expect(projection.structure).toBe(structure)
    expect(projection.profile.boundarySet).toEqual(['frame', 'body', 'scope'])
    expect(projection.semantics?.dynamics?.[0].operation).toBe('select')
    expect(projection.issues).toEqual([])
  })

  it('discloses when an angle boundary is outside the named profile set', () => {
    const projection = projectCouplingSemantics(
      couplingFrame('capsule', 'inhabited'),
      operationalProfile,
    )
    expect(projection.semantics).toBeNull()
    expect(projection.profile.boundarySet).not.toContain('capsule')
  })

  it('rejects form-invalid ports and effects hidden in an interpretive profile', () => {
    const invalid = {
      id: 'invalid',
      revision: '1',
      status: 'interpretive',
      includedKinds: ['frame'],
      semantics: {
        frame: {
          kind: 'frame',
          name: 'invalid frame',
          description: 'deliberate negative control',
          portRoles: {
            operand: { role: 'wrong form', direction: 'in', description: 'operator port' },
          },
          dynamics: [{
            operation: 'write',
            input: 'value',
            output: 'changed state',
            effectGrade: 'S2',
            evidence: 'none',
          }],
        },
      },
    } as CouplingSemanticsProfile

    expect(validateCouplingSemanticsProfile(invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'semantics.frame.portRoles.operand' }),
      expect.objectContaining({ path: 'semantics.frame.dynamics[0].effectGrade' }),
    ]))
  })
})
