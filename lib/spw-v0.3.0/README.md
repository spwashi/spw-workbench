# Spw v0.3.0 (Specification Library)

This folder is the v0.3.0 specification library for Spw.

## Release identity

- **Version**: 0.3.0
- **Date**: 2026-03-26
- **Theme**: monorepo workspace and structural decoupling
- **Prior**: v0.2.0-alpha (see `../spw-v0.2.0-alpha/`)

## Design intent

- Spec surfaces are contract-first: every stratum publishes contracts before deep implementation.
- Dual-surface documentation: markdown for narrative, `.spw` for navigable structure.
- Source-linked: every contract stub names the implementation file(s) it governs.
- Forward-compatible: each version's docs set the stage for the next release.

## Strata

| Stratum | Purpose | New in v0.3.0 |
|---|---|---|
| `core/` | Language kernel contracts | Stable — carried from v0.2.0 |
| `runtime/` | Execution and state contracts | Stable — carried from v0.2.0 |
| `dialects/` | Syntax family guidance | Stable — carried from v0.2.0 |
| `domains/` | Posture, profile, taste | Stable — carried from v0.2.0 |
| `applications/` | Applied expression surfaces | Stable — carried from v0.2.0 |
| `infra/` | Conformance and infrastructure | Stable — carried from v0.2.0 |
| `architecture/` | Structural and theory bridge | Stable — carried from v0.2.0 |
| `packages/` | Monorepo package boundaries | **New** — workspace topology |
| `surfaces/` | Plugin and projection protocol | **New** — surface extensibility |

## Documentation scaffold (v0.3.0)

Every contract stub follows this heading sequence:

1. `## Status` — current state, one line
2. `## v0.3.0 Contract` — what this version guarantees
3. `## Source Links` — paths to implementation files (**new in v0.3.0**)
4. `## Invariants` — falsifiable claims
5. `## Migration Notes` — what changed from v0.2.0 (**new in v0.3.0**)
6. `## Open Questions` — unresolved design decisions
7. `## v0.4.0 Candidates` — forward-looking items for April (**new in v0.3.0**)

## See also

- `ARCHITECTURE.md` — library architecture and brace-first thesis
- `LAYOUT.md` — canonical directory layout and pairing rules
- `DELTAS.md` — version-to-version change map (v0.2.0 → v0.3.0)
- `ROADMAP.md` — forward plan for v0.4.0 and beyond
- `CHANGELOG.md` — release-facing changelog
