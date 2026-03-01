# Spw v0.2.0-alpha Architecture

## Status

Active architecture surface for the v0.2.0-alpha specification library.

## Intent

This document defines the layout and semantics bridge for the library so architecture remains legible across:
- markdown contracts (`*.md`) for human-readable specification
- `.spw` supports for composable, queryable architectural navigation

## Layout Principles

1. Contract-first: each stratum publishes a contract surface before deep implementation.
2. Dual-surface docs: markdown expresses narrative; `.spw` expresses navigable structure.
3. Normalized naming: architecture support files use kebab-case and explicit scopes.
4. Layered migration: convert redirect stubs by stratum, not by ad hoc file churn.

## Library Strata

| Stratum | Purpose | Primary Surface | Current State |
|---|---|---|---|
| `core/` | language kernel contracts | markdown stubs | authored v0.2 stubs |
| `runtime/` | execution + state contracts | markdown stubs | authored v0.2 stubs |
| `dialects/` | syntax family guidance | markdown stubs + `.spw` | authored v0.2 stubs |
| `domains/` | posture/profile/taste | markdown stubs | authored v0.2 stubs |
| `applications/` | applied expression surfaces | markdown stubs | authored v0.2 stubs |
| `infra/` | conformance + infra posture | markdown stubs | authored v0.2 stubs |
| `architecture/` | structural + theory bridge | `.spw` supports | introduced in this pass |

## 3-Layer Kernel

The ontology is organized into three layers with inward dependency flow:

| Layer | Time | Owns | Invariant |
|:--|:--|:--|:--|
| **Grammar** | parse | operators, containers, seeds, tokens | Facts verified at parse time; no runtime dependency |
| **Semantics** | meaning | planes, axes, polarity, spirit sequence | Claims falsifiable via probes; never mutate grammar |
| **Pragmatics** | use | shelves, editing, biome, process, tooling | Conventions orient usage without constraining grammar or semantics |

Dependency direction: `pragmatics → semantics → grammar` (never reversed).

See [LAYERS.md](./core/LAYERS.md) for worked examples and [`.spw/workspace.spw#kernel`](../../.spw/workspace.spw) for the canonical declaration.

## Rendering Portability

Spw files are **plain-text-first**: they must be legible without a custom renderer. Target surfaces include:
- **Terminal** — TUI tools, `cat`, `grep`, `less`
- **Obsidian** — block-level markdown-adjacent rendering
- **Notion** — code block embedding
- **IDE** — semantic tokens, CodeLens, hover

## Brace-First Thesis

Spw treats braces as primordial semantic constructs rather than mere punctuation:
- `<>` concept
- `()` scene
- `[]` mode
- `{}` definition

Unified Augmentation Language (UAL) framing:
- these four brace constructs are useful as universal augmentation primitives across C-ish language families
- Spw asks: what if braces had opposite spin, and what if every operator were real and semantically actionable
- emerging operator polarity note: `#` trends extrinsic/projection, `.` trends intrinsic/reduction (especially in suffix position)
- ergonomic symmetry target: selection should feel natural from either left- or right-brace anchors across containers

## Plane-Axis Selection Model

Spw references can select concepts across these axes:
- liminality
- tangibility
- conception
- familiarity
- salience
- objectivity-subjectivity
- valence
- composition

The architecture claim is that path references alone are insufficient in liminal scopes; axis-aware selection is required for stable concept targeting.

Flow implication notes (active design):
- binding and indexing should preserve/access explicit projection-vs-reduction intent
- brace orientation can be modeled as charge to reason about L/R selector ergonomics
- high-context parse profiles may allow selector sugar; low-context profiles should remain explicit and deterministic

## Architecture Supports

- `architecture/index.spw`
- `architecture/layout.spw`
- `architecture/theory-bridge.spw`
- `LAYOUT.md`

## Theory Bridge

Canonical theory references:
- `docs/theory/spw/operators.spw`
- `docs/theory/spw/onf.spw`
- `docs/theory/spw/register-geometry.spw`

Architecture supports should remain aligned with those theory artifacts.

## How To Falsify

Evidence that would disprove this architecture claim:
- brace-first mapping is absent or inconsistent across architecture supports
- operator reality claim omits one or more canonical operators
- plane-axis model is missing from theory bridge surfaces

Verification commands:
- `npm run lint:v020:architecture`
- `npm run lint:v020`
- `npm run lint:v020:runtime`
- `npm run lint:spw`
