# Plan: absorb-spwq-cli

Normalize the selector CLI surface for the packages-era, submodule-era workbench by moving `spwq` behind `@spwashi/spw-cli`, repairing selector traversal so the command is behaviorally truthful on real corpus files, and trimming alias drift where names no longer reflect distinct behaviors.

## Goal

The desired end state is a single package-owned CLI surface where selector behavior is real rather than nostalgic and mounted consumers can inspect how tooling resolved their repository. The canonical query verbs remain `spw query`, `spw select`, and `spw ls`; observability verbs add `spw roots`, `spw doctor`, `spw capabilities`, and `spw review`. Compatibility aliases survive only as migration faces over package-owned behavior. Taste note: improve correctness, layering, naming, and inspectability.

## Scope

- **In scope**: retain selector normalization work; plan relative root discovery, machine-readable doctor output, capability snapshots, review-profile orchestration, normalized evidence paths, distinct unsupported/degraded/failure states, and identity-free fixture coverage.
- **Out of scope**: implementing the new observability commands in this planning pass, editor UI, or retaining compatibility aliases as independent implementations.

## Files

```text
[MOD?] package.json
[MOD] .spw/conventions/cli.spw
[MOD] packages/spw-cli/src/main.ts
[MOD] packages/spw-cli/src/run.ts
[MOD] packages/spw-cli/src/query.ts
[NEW] packages/spw-cli/src/spwq.ts      (never created; spwq is an alias of select in commands.ts)
[MOD] packages/spw-seed/src/instrumentation/audit.ts
[MOD] packages/spw-seed/src/query/spwq.ts
[MOD?] packages/spw-seed/src/query/presets.ts
[MOD] src/seed/query/__tests__/spwq-corpus.test.ts
[MOD] scripts/spwq.ts                    (deleted in b7c5c7df by spw-cli-overhaul remove_legacy_scripts)
[MOD] docs/runtime/md/lsp-editor-integration.md
[MOD] lib/spw-v0.2.0-alpha/applications/QUERY.md
```

### Craft guard
- Keep CLI entrypoints thin; avoid adding another large argument parser if `spwq` can reuse package-owned selector formatting.
- `packages/spw-seed/src/instrumentation/audit.ts` already carries multiple responsibilities; prefer a focused child-discovery repair rather than piling on more selector policy.
- Keep docs aligned with the actual public command names so the user-facing surface does not exceed what the implementation can sustain.
- This branch owns verb truth, not install plumbing; do not smuggle `.spw/_workbench` bootstrap logic into selector work.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

repair_selector_traversal and absorb_spwq establish selector truth and package ownership. normalize_cli_canon hardens the public vocabulary so site-install, DX, and release docs can speak about one CLI surface.

Fuzz strategy:
- Explore loop: `npm run test:seed -- spwq-corpus`
- Stabilize loop: `npm run test:seed && npm run lsp:smoke`
- Ship gate: `npm run build && npm run test:run && npm run test:seed`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before plan_selector_slice, before merge
- Hygiene split: none

## Dependencies

- `register-phase-evolution` — selector/phase terminology should stay aligned with the canonical runtime-query vocabulary when help text and docs harden.
- `mounted-consumer-tooling` — owns path normalization, audit evidence states, and identity-free fixtures.

## Spw Artifact

If the command taxonomy solidifies into a stable durable model, record it as:

`.agents/plans/absorb-spwq-cli/absorb-spwq-cli.spw`
