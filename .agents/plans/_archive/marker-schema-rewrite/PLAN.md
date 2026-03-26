# Plan: marker-schema-rewrite

Recast the marker surface from a flat tag counter into a typed annotation system whose syntax and reports preserve author intent.

## Goal

Markers are already carrying more structure than the current audits preserve: the corpus mixes flat tags like `@spw:todo` with structured forms like `@spw:lens:syntactic`, but the analyzer currently truncates everything after the first segment. The desired end state is a marker system whose syntax is treated as a durable author-facing artifact, whose schema is explicit and queryable, and whose reports preserve enough structure to support truthful audits and future migrations. A controlled schema rewrite is acceptable if it improves precision without making annotations cumbersome to write.

**Taste note**: expressiveness, clarity, correctness.

## Scope

- **In scope**: marker taxonomy, syntax evaluation/selection, legacy-read compatibility, richer audit JSON/MD outputs, contributor guidance, and a small pilot migration on representative files.
- **Out of scope**: a full repo-wide marker migration in one shot, unrelated runtime semantics work, networked indexing/search infrastructure, and speculative UI for marker browsing.

## Decisions Locked

- The current flat regex is insufficient because it collapses multi-segment markers such as `@spw:lens:syntactic`.
- Marker syntax is a useful artifact in its own right, not just an implementation detail of `spw-marker-audit.ts`.
- Backward compatibility may be transitional rather than permanent; a schema rewrite is allowed if migration is explicit.
- Author ergonomics in comments and `.spw` docs matter as much as machine readability.

## Files

```text
[MOD] scripts/analyzers/spw-marker-audit.ts
[NEW] scripts/analyzers/marker-schema.ts
[MOD] package.json
[NEW] docs/contributing/md/marker-conventions.md
[NEW] docs/audits/md/marker-schema-rewrite.md
[MOD?] .agents/skills/spw-craft-quality/SKILL.md
[MOD?] .agents/skills/spw-semantics-rigor/SKILL.md
[MOD?] src/seed/parser/parse.ts
[MOD?] src/seed/lexer/lex.ts
[MOD?] docs/design/md/phase-3-flow-inspector-plan.md
[MOD] .agents/plans/marker-schema-rewrite/wip.spw
[MOD] .agents/plans/marker-schema-rewrite/PLAN.md
[DEL] (none)
```

### Craft guard

- Keep marker parsing portable and small; do not fold parsing, policy, and presentation into one opaque analyzer.
- Pilot migration should stay representative but small, so author ergonomics can be judged before broad rollout.
- Preserve a readable fallback path for legacy `@spw:*` markers until the rewritten schema proves itself.

## Commits

1. `.[plans] — add marker-schema-rewrite plan artifacts`
2. `#[marker] — define marker taxonomy, syntax candidates, and JSON report contract`
3. `&[marker] — upgrade marker analysis to preserve structured markers and emit richer reports`
4. `vocab[marker] — align pilot marker sites and add compatibility rules`
5. `![marker] — verify legacy and rewritten marker parsing across the pilot corpus`
6. `.[docs] — publish conventions and migration guidance`

## Agentic Hygiene

- Rebase target: `main@181071ef85bc2e505dfc99925fe55ebc5adcf3c9`
- Rebase cadence: before commit 1, before merge
- Hygiene split: keep unrelated untracked drift in `src/runtime/state/register-helpers.ts` out of this branch.

## Dependencies

`audit-fuzz-truthfulness` — preferred to land first so the package script contract and aggregated audit shell stabilize before the marker parser changes the payload shape. Shared-file risk: `package.json`, `scripts/analyzers/spw-marker-audit.ts`.

## Spw Artifact

A distilled artifact is warranted because the marker syntax itself may become a durable language surface:

`.agents/plans/marker-schema-rewrite/marker-schema-rewrite.spw`

## Fuzz Strategy

- Explore: `npm run audit:json`
- Stabilize: `npm run audit:md`
- Ship gate: `npm run audit && npm run audit:json`
