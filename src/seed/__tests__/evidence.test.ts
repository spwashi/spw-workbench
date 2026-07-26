import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_BASES,
  EVIDENCE_DOMAINS,
  EVIDENCE_ROLES,
  type EvidenceContribution,
} from '@spwashi/spw-seed'
import { EFFECT_GRADE_ORDER, effectGradeAtMost } from '../canonical'

const observedTopology = {
  basis: 'observed',
  domain: 'topology',
  role: 'match',
  provenance: {
    producer: { id: 'spw.topology-probe', version: '0.3.0' },
    artifact: { id: 'fixture.spw', revision: 'sha256:source' },
  },
} satisfies EvidenceContribution

const derivedSyntax = {
  basis: 'derived',
  domain: 'syntax',
  role: 'projection',
  provenance: {
    producer: { id: 'spw.seed', version: '0.3.0' },
    method: {
      id: 'ast-product',
      version: '1',
      deterministic: true,
      profileHash: 'sha256:profile',
    },
    inputs: [{ id: 'fixture.spw', revision: 'sha256:source' }],
  },
} satisfies EvidenceContribution

const reportedPreference = {
  basis: 'reported',
  domain: 'preference',
  role: 'annotation',
  provenance: {
    producer: { id: 'spw.review', version: '0.3.0' },
    reporter: { id: 'reviewer', kind: 'human' },
    context: { id: 'candidate-spec', revision: 'sha256:spec' },
  },
} satisfies EvidenceContribution

function provenanceIdentity(evidence: EvidenceContribution): string {
  switch (evidence.basis) {
    case 'observed':
      return evidence.provenance.artifact.revision
    case 'derived':
      return evidence.provenance.method.version
    case 'reported':
      return evidence.provenance.reporter.id
  }
}

describe('evidence contributions', () => {
  it('publishes runtime vocabularies for boundary validation', () => {
    expect(EVIDENCE_BASES).toEqual(['observed', 'derived', 'reported'])
    expect(EVIDENCE_DOMAINS).toContain('topology')
    expect(EVIDENCE_ROLES).toEqual(['match', 'filter', 'projection', 'annotation'])
  })

  it('represents basis independently from domain and role', () => {
    expect(observedTopology).toMatchObject({
      basis: 'observed',
      domain: 'topology',
      role: 'match',
    })
    expect(derivedSyntax).toMatchObject({
      basis: 'derived',
      domain: 'syntax',
      role: 'projection',
    })
    expect(reportedPreference).toMatchObject({
      basis: 'reported',
      domain: 'preference',
      role: 'annotation',
    })
  })

  it('narrows to provenance required by each basis', () => {
    expect(provenanceIdentity(observedTopology)).toBe('sha256:source')
    expect(provenanceIdentity(derivedSyntax)).toBe('1')
    expect(provenanceIdentity(reportedPreference)).toBe('reviewer')
  })
})

describe('effect grades', () => {
  it('retain their ordered authority ceiling independently of evidence', () => {
    expect(EFFECT_GRADE_ORDER).toEqual({
      'effect.l0.measure': 0,
      'effect.l1.memory': 1,
      'effect.l2.workspace': 2,
      'effect.l3.external': 3,
    })
    expect(effectGradeAtMost('effect.l1.memory', 'effect.l2.workspace')).toBe(true)
    expect(effectGradeAtMost('effect.l3.external', 'effect.l2.workspace')).toBe(false)
  })
})
