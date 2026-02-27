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
| `dialects/` | syntax family guidance | markdown stubs | mixed redirects |
| `domains/` | posture/profile/taste | markdown stubs | mixed redirects |
| `applications/` | applied expression surfaces | markdown stubs | mixed redirects |
| `infra/` | conformance + infra posture | markdown stubs | mixed redirects |
| `architecture/` | structural + theory bridge | `.spw` supports | introduced in this pass |

## Brace-First Thesis

Spw treats braces as primordial semantic constructs rather than mere punctuation:
- `<>` concept
- `()` scene
- `[]` mode
- `{}` definition

Unified Augmentation Language (UAL) framing:
- these four brace constructs are useful as universal augmentation primitives across C-ish language families
- Spw asks: what if braces had opposite spin, and what if every operator were real and semantically actionable

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
