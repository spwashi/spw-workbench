# Plan: marker-portability-contracts

Extend markers from a useful audit taxonomy into a portable implementation-contract surface for ambitious features and cross-language ports.

## Goal

The current marker audit now preserves structure, but its distribution still shows a mostly descriptive corpus: `todo`, `boundary`, and `term` remain the dominant families, while only a small slice carries implementation-grade qualifiers like `portable:seed` and `boundary:reset`. The desired end state is a marker contract that can express guarantees, blockers, targets, and evidence for real feature work and for ports to other languages without losing comment ergonomics. Keep the current `family:qualifier` chain as the coarse selector, then evaluate a lightweight attribute layer that survives TS, Rust, Python, and `.spw` comments.

**Taste note**: clarity, correctness, expressiveness.

## Scope

- **In scope**: next-phase marker syntax design, analyzer support for richer contracts, machine-readable JSON shape for implementation/port markers, contributor docs, and a small pilot on seed/runtime surfaces that already advertise portability.
- **Out of scope**: building an actual Rust/Python port, migrating the full corpus in one pass, external registries/services, or a UI for browsing markers.

## Decisions Locked

- Keep `family:qualifier[:detail]` as the primary grep-friendly selector surface.
- Evaluate an optional attribute bag after the chain for machine-actionable fields such as target language, layer, status, blocker, and evidence.
- Markers should describe guarantees and blockers, not only debt and docs taxonomy.
- Any richer syntax must round-trip cleanly to JSON and remain readable in TS, Rust, Python, Markdown, and `.spw`.

## Files

```text
[MOD] scripts/analyzers/marker-schema.ts
[MOD] scripts/analyzers/spw-marker-audit.ts
[MOD] docs/contributing/md/marker-conventions.md
[NEW] docs/audits/md/marker-portability-contracts.md
[MOD?] src/seed/parser/parse.ts
[MOD?] src/seed/query/selector-expr.ts
[MOD?] src/runtime/pipeline/substrate.ts
[MOD?] src/runtime/pipeline/stages.ts
[MOD?] src/runtime/pipeline/resonance.ts
[MOD?] docs/design/md/semantic-features-model.md
[MOD] .agents/plans/marker-portability-contracts/wip.spw
[MOD] .agents/plans/marker-portability-contracts/PLAN.md
[DEL] (none)
```

### Craft guard

- Keep the richer syntax optional; a plain chain must remain valid and common.
- Do not let marker parsing become a mini language runtime; prefer a tiny contract parser with graceful fallback.
- Pilot only on surfaces where the added metadata materially improves implementation or port decisions.

## Commits

1. `.[plans] — add marker-portability-contracts plan artifacts`
2. `#[marker] — define implementation/port contract fields and syntax candidates`
3. `&[marker] — extend marker parser and audit JSON for contract metadata`
4. `vocab[marker] — pilot implementation and port markers on seed/runtime surfaces`
5. `![marker] — verify contract parsing, filtering, and JSON round-trip`
6. `.[docs] — publish implementation and porting guidance for marker contracts`

## Agentic Hygiene

- Rebase target: `main@75febc36726f38e8132817ab14685c9ed5d1b421`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

A distilled artifact is warranted because these markers become part of the codebase's implementation and portability contract:

`.agents/plans/marker-portability-contracts/marker-portability-contracts.spw`

## Fuzz Strategy

- Explore: `npm run audit && node --import tsx scripts/analyzers/spw-marker-audit.ts --format=json --marker=portable:seed`
- Stabilize: `npm run audit:json`
- Ship gate: `npm run build && npm run audit && npm run audit:json && git diff --check`
