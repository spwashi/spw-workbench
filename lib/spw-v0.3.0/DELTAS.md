# Spw v0.3.0 Deltas (v0.2.0-alpha → v0.3.0)

## Release summary

v0.3.0 is the monorepo workspace and structural decoupling milestone. It transitions the project from a single-package alpha to a workspace with named package boundaries, complete contract stubs, and a forward-staged documentation architecture.

## Structural changes

### New strata
- `packages/` — documents the monorepo topology: seed, runtime, LSP, CLI as named packages with explicit dependency direction.
- `surfaces/` — documents the plugin and projection protocol, bridging `.spw/surfaces/plugin-protocol.spw` into the spec library.

### Documentation scaffold evolution
- v0.2.0 scaffold: `Status / v0.2.0 Contract Stub / Invariants / Implementation Hooks / Open Questions`
- v0.3.0 scaffold: `Status / v0.3.0 Contract / Source Links / Invariants / Migration Notes / Open Questions / v0.4.0 Candidates`
- **Source Links** replaces Implementation Hooks — now names actual file paths, not abstract hook descriptions.
- **Migration Notes** added — each contract stub documents what changed from the prior version.
- **v0.4.0 Candidates** added — forward-staging so the next release has a running backlog per contract.

### Version naming
- Dropped `-alpha` suffix. v0.3.0 is a named release, not a pre-release.

## Contract stub status

| Stratum | v0.2.0-alpha State | v0.3.0 State |
|---|---|---|
| `core/` | 10 authored stubs | 10 stubs, all passing `lint:v020` |
| `runtime/` | 5 authored stubs | 5 stubs, passing `lint:v020:runtime` |
| `dialects/` | 3 authored stubs + index.spw | carried forward |
| `domains/` | 3 authored stubs | carried forward |
| `applications/` | 4 authored stubs | carried forward |
| `infra/` | 1 authored stub | carried forward |
| `architecture/` | 3 `.spw` supports | carried forward |
| `packages/` | — | **5 new docs** (topology + 4 packages) |
| `surfaces/` | — | **2 new docs** (plugin protocol + projections) |

## Plan hygiene

- 9 superseded/completed plans archived to `.agents/plans/_archive/`.
- Active plan count reduced from 47 to ~38.
- v0.2.0 release plans (`d26_02_26-release-readiness`, `runtime-v020-release`, `v020-core-stubs-prep`) archived.

## Verification

```
npm run build          # TypeScript type check
npm run test:run       # 47/47 tests passing
npm run lint:v020      # 10 core stubs passing
npm run lint:v020:runtime    # 5 runtime stubs passing
npm run lint:v020:architecture  # architecture check passing
npm run audit:full     # 4/4 audits passing
```
