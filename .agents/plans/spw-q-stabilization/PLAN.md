# Plan: spw-q-stabilization

Stabilize the experimental Spw.q dialect contract before any v1 promise: make semantic versions explicit, replace ordinal evidence grades with provenance dimensions, and define promotion gates that can be falsified by fixtures.

## Goal

Turn the current v1-shaped proposal into a testable pre-v1 candidate whose syntax, selector IR, match records, and producer package have independent identities. The immediate quality target is **semantic clarity**: validation policy must not change meaning, and evidence names must describe provenance rather than imply a false strength ladder.

## Scope

- **In scope**:
  - Reframe the draft as `spw.q@0.2.0-experimental.1`.
  - Define compatibility rules and promotion gates for later preview, RC, and v1 releases.
  - Replace E0/E1/E2 usage in the candidate protocol with evidence `basis`, `domain`, `role`, and versioned provenance.
  - Introduce the new evidence vocabulary in the seed package without inventing an ordering relation.
  - Correct comments that prematurely describe the experimental parser as v1 canon.
- **Out of scope**:
  - Implementing new Spw.q grammar, child matching, product predicates, captures, or sequence spelling.
  - Rewrite planning/application, REPL, LSP methods, and multi-file transactions.
  - Retrospectively rewriting historical `.agents/plans/` episode artifacts.
  - Declaring any current syntax stable or shipping `1.0.0`.

## Files

```text
[NEW] docs/design/spw-q-candidate-spec.md
[MOD] packages/spw-seed/src/query/selector-expr.ts
[MOD] packages/spw-seed/src/canonical/differential.ts
[MOD] packages/spw-seed/src/canonical/index.ts
[MOD] packages/spw-seed/src/canonical/topography-probe.ts
[MOD] packages/spw-seed/src/index.ts
[NEW] src/seed/__tests__/evidence.test.ts
[MOD] docs/design/index.spw
[MOD] docs/toc.spw
[MOD] docs/theory/spw/operational-topography.spw
[MOD] docs/theory/spw/operational-devices.spw
[MOD] docs/theory/spw/dimensional-axes.spw
[MOD] docs/theory/spw/operator-brace-composition.spw
[MOD] .agents/skills/spw-semantics-rigor/SKILL.md
[MOD] .agents/skills/spw-operator-lattice/SKILL.md
[MOD] .spw/registries/brace-physics.spw
```

### Craft Guard

- Keep evidence as plain, portable data in `spw-seed`; no filesystem or transport imports.
- Prefer a discriminated union so each evidence basis requires the provenance it needs.
- Keep schema versions distinct from package and dialect versions.
- The candidate document may remain broad, but every unimplemented statement must be labeled `proposed`.

## Commits

1. `.[spw-q] — reframe v1 proposal as a versioned experimental candidate`
2. `vocab[seed] — replace ordinal epistemic grades with evidence provenance`
3. `![spw-q] — verify evidence invariants and candidate cross-references`

## Agentic Hygiene

- Rebase target: `main@949e7ed3e5e1`
- Rebase cadence: before commit 1 and before merge
- Hygiene split: required; the current dirty `main` also contains `spw-cli-overhaul` changes and temporary artifacts, so this plan must be isolated before commit.

## Dependencies

none for the dialect and evidence contract. A future query transport depends on the revised `spw-cli-overhaul` envelope.

## Failure Modes

- **Hard**: one dialect version compiles the same accepted query to different IR under strict and compatibility validation.
- **Hard**: a persisted match record omits its dialect, schema, producer, source revision, or query identity.
- **Soft**: a deprecated pre-1.0 spelling remains accepted in compatibility mode with a migration diagnostic.
- **Non-negotiable**: evidence basis is never used as an effect/authority ceiling and is never ordered by “at most”.

## Validation

- **Hypothesis**: `observed`, `derived`, and `reported` cover current claims without treating syntax, topology, or preference as strength levels.
- **Counterexamples**: an observed topology edge, a derived syntax product, and a reported user preference must all be representable.
- **Negative control**: `effectGradeAtMost` remains ordered and behaviorally unchanged.
- Run `npm run test:seed`, `npm run lint:docs`, and targeted evidence tests.
- Fuzz explore: `npm run fuzz:explore -- --target=spw-q`
- Fuzz stabilize: `npm run fuzz:stabilize -- --target=spw-q`
- Fuzz ship: `npm run fuzz:ship -- --target=spw-q`

## Spw Artifact

`docs/design/spw-q-candidate-spec.md` is the distilled design artifact; `wip.spw` remains operational memory.
