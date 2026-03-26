# Plan: marker-portability-contracts

Historical slug retained; the shipped work reframed markers from audit taxonomy into extraction, seed, and semantic contracts for later system decomposition.

## Goal

The marker audit now preserves structure and the shipped corpus carries extraction-oriented contracts such as `portable:seed[...]`, `seed:starter[...]`, `seed:kernel[...]`, `surface:query[...]`, and `extract:blocked[...]`. The durable outcome of this plan is not speculative language ports; it is a marker surface that can express extraction readiness, sparse-file starting points, semantic affinities, blockers, and evidence without losing comment ergonomics.

**Taste note**: clarity, correctness, expressiveness.

## Scope

- **In scope**: marker contract syntax, analyzer support for attribute bags, machine-readable JSON shape for extraction/seed markers, contributor docs, and a pilot on seed/runtime surfaces that advertise extraction potential.
- **Out of scope**: building any actual language port, migrating the full corpus in one pass, external registries/services, or a UI for browsing markers.

## Decisions Locked

- Keep `family:qualifier[:detail]` as the primary grep-friendly selector surface.
- Use an optional attribute bag after the chain for machine-actionable fields such as `system`, `extract`, `semantic`, `layer`, `status`, `blocker`, `basis`, and `next`.
- Markers should describe extraction readiness, starter surfaces, guarantees, and blockers, not only debt and docs taxonomy.
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
- Pilot only on surfaces where the added metadata materially improves extraction or system-seeding decisions.

## Commits

1. `.[plans] — add marker-portability-contracts plan artifacts`
2. `#[marker] — define implementation/port contract fields and syntax candidates`
3. `&[marker] — extend marker parser and audit JSON for contract metadata`
4. `vocab[marker] — pilot implementation and port markers on seed/runtime surfaces`
5. `![marker] — verify contract parsing, filtering, and JSON round-trip`
6. `.[docs] — publish implementation and porting guidance for marker contracts`

## Agentic Hygiene

- Rebase target: historical baseline `07ffc5a17a55340c3f7000313df68cf0453a7b10` (not on rewritten main)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

A distilled artifact is warranted because these markers now form part of the codebase's extraction and semantic contract:

`.agents/plans/marker-portability-contracts/marker-portability-contracts.spw`

## Fuzz Strategy

- Explore: `npm run audit && node --import tsx scripts/analyzers/spw-marker-audit.ts --tag=seed`
- Stabilize: `npm run audit:markers:json && node --import tsx scripts/analyzers/spw-marker-audit.ts --attribute=extract=candidate`
- Ship gate: `npm run build && npm run audit && npm run audit:markers:json && git diff --check`
