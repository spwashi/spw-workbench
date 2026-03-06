# Marker Schema Rewrite

## Problem

The old marker audit treated every marker as `@spw:<single-tag>`. That dropped structure from markers such as `@spw:lens:syntactic`, which meant the audit output did not match the authored corpus.

## Rewrite

The marker surface is now modeled as:

- **family** — top-level bucket, for example `todo`, `portable`, `lens`
- **qualifiers** — ordered refinements, for example `syntactic`
- **normalized marker** — the full chain, for example `lens:syntactic`

## Why This Shape

- It preserves the authored syntax without forcing a repo-wide syntax migration.
- It keeps existing `audit:types` / `audit:async` style filters intact.
- It makes structured markers queryable in JSON and markdown reports.

## Immediate Consequences

- `scripts/analyzers/spw-marker-audit.ts` now reports families and full markers.
- JSON output includes per-hit marker structure.
- Structured markers such as `@spw:lens:syntactic` are no longer collapsed to `lens`.
