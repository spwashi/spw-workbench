# Plan: spw-cli-overhaul

Consolidate the Spw CLI entrypoint while establishing strict option parsing and a genuinely versioned JSON envelope foundation.

## Goal

Achieve a reviewable CLI foundation across `@spwashi/spw-cli`: routed package scripts, fail-closed parsing for the query/view family, and a transport envelope whose schema identity is independent of package or dialect versions. This slice deliberately migrates only `invent` and `map`; remaining JSON commands require a later atomic protocol migration rather than an unsupported claim of universal conformance.

**Taste Note**: Improving **clarity**, **correctness**, **naming**, and **workspace packaging discipline**.

## Scope

- **In scope**:
  - `packages/spw-cli/src/types.ts`
  - `packages/spw-cli/src/envelope.ts` (NEW)
  - `packages/spw-cli/src/args.ts`
  - Query/select/skim option parsing and adjacent tests
  - `packages/spw-cli/src/inventory.ts`, `map.ts`, and `mount.ts`
  - `package.json`
  - Removal of legacy `scripts/spw-*.ts` wrappers and `scripts/spw-cli/` shims.
  - Creation of `docs/design/spw-cli-cache-plan.md` for persistent caching architecture.
- **Out of scope**:
  - Changes to `@spwashi/spw-seed` parser kernel or `@spwashi/spw-runtime` execution core.
  - Claiming that every existing `--json` command already conforms to the new envelope.
  - Implementing the persistent cache described by the design note.

## Files

```
[NEW] packages/spw-cli/src/envelope.ts
[NEW] packages/spw-cli/src/envelope.test.ts
[NEW] schemas/spw-cli-envelope.v1.schema.json
[NEW] docs/design/spw-cli-cache-plan.md
[MOD] packages/spw-cli/src/args.ts
[MOD] packages/spw-cli/src/args.test.ts
[MOD] packages/spw-cli/src/inventory.ts
[MOD] packages/spw-cli/src/map.ts
[MOD] packages/spw-cli/src/mount.ts
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/main.ts
[MOD] packages/spw-cli/src/emit.ts
[MOD] packages/spw-cli/src/pulse.ts
[MOD] packages/spw-lsp/src/types.ts
[MOD] packages/spw-seed/src/canonical/geometry-resolver.ts
[MOD] src/seed/__tests__/canonical.test.ts
[MOD] .spw/biome/ocean/atlas.spw
[MOD] .spw/harness/evals/baseline-evals.spw
[MOD] .spw/canon-mount.spw
[NEW] .agents/plans/spw-cli-overhaul/FIX.md
[MOD] package.json
[MOD] package-lock.json
[DEL] scripts/spw-analyze.ts
[DEL] scripts/spw-beat.ts
[DEL] scripts/spw-dev.ts
[DEL] scripts/spw-emit.ts
[DEL] scripts/spw-expand.ts
[DEL] scripts/spw-format.ts
[DEL] scripts/spw-formula.ts
[DEL] scripts/spw-geometry.ts
[DEL] scripts/spw-install.ts
[DEL] scripts/spw-invent.ts
[DEL] scripts/spw-ls.ts
[DEL] scripts/spw-ls-core.ts
[DEL] scripts/spw-map.ts
[DEL] scripts/spw-mem.ts
[DEL] scripts/spw-mount.ts
[DEL] scripts/spw-mutate.ts
[DEL] scripts/spw-pulse.ts
[DEL] scripts/spw-query.ts
[DEL] scripts/spw-roots.ts
[DEL] scripts/spw-select.ts
[DEL] scripts/spw-skim.ts
[DEL] scripts/spw-tree.ts
[DEL] scripts/spwq.ts
[DEL] scripts/spw-cli/args.ts
[DEL] scripts/spw-cli/query.ts
[DEL] scripts/spw-cli/run.ts
[DEL] scripts/spw-cli/types.ts
```

### Craft Guard

`envelope.ts` stays transport-only and uses a discriminated union. Option parsing consumes values with declared arity instead of rescanning raw argv. No path list is split on whitespace.

## Commits

1. `#[cli] — add versioned JSON response envelope schema and builders`
2. `vocab[cli] — make query/view option parsing fail closed`
3. `&[cli] — migrate invent and map to the versioned envelope`
4. `&[cli] — remove legacy scripts and shims, clean package.json scripts`
5. `.[cli] — add caching architecture plan for corpus scanning and queries`
6. `![cli] — verify full test suite across CLI package and workspace`

## Agentic Hygiene

- Rebase target: `main@949e7ed3e5e1`
- Rebase cadence: before commit 1, before merge
- Hygiene split: required; Spw.q stabilization and temporary artifacts share the current dirty `main`.

## Dependencies

none

## Validation

- `npm run test:cli` passes all vitest tests.
- `spw invent --json` and `spw map --json` validate against `spw-cli-envelope.v1`.
- Query/select/skim reject unrecognized flags, missing values, and unknown formats.
- Repeated roots accumulate; comma-separated paths are preserved without whitespace splitting.
- `package.json` scripts execute cleanly without missing script wrapper errors.
- Every help page names a live routed command.
- Fuzz explore/stabilize/ship target: `cli`.
