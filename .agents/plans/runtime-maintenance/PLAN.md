# Plan: runtime-maintenance

The runtime and seed give each behavior one home: legacy shims retired, the largest modules split along their reasons to change, one hash function, and package roots that run in a browser. (Card and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A read-only survey on 2026-10-13 found the runtime structurally sound. Runtime and seed import no outer package and have no relative import cycles, and `test:runtime` (190) and `test:seed` (853) pass. The debt is concentrated:

- **Size.** `state/register-bank.ts` is 899 lines and mixes value algebra, a memory budget, coupling, marks and provenance. `session/hot-session.ts` has 17 imports and holds a pointer store beside evaluate and inspect.
- **Legacy.** 88 of the 89 non-test files under `src/seed` and `src/runtime` are one-line re-exports. Only legacy tests use them, and `tsconfig.typecheck.json` never checks those tests. Four files in the runtime suite actually test the CLI.
- **Hashes.** A sha256-to-16-hex helper is copied four times. The FNV hashes read UTF-16 units, not bytes. `range-transform` `contentHash` slices an 8-character hash to 16, which does nothing. The owner chose one hash over raw UTF-8 bytes (fragment-pointers `hash_unity`).
- **Portability.** The seed index reaches `node:crypto` and `Buffer`; the parser and reader entries do not. The runtime root re-exports two node-only modules.

Taste: one home per behavior. Splits follow reasons to change, never line counts alone.

## Scope

- **In scope:** the commits in [wip.spw](./wip.spw), lowest risk first:
  1. test homes
  2. retire shims
  3. a shared runtime-value module
  4. split register-bank
  5. split hot-session
  6. one hash module
  7. a node-free seed root
  8. a `./node` runtime subpath
  9. an interpreter handler table
  10. prune dead exports
- **Routed elsewhere:**
  - the `stages.ts` split and its parse-failure test: precipitate-model-alignment
  - the package DAG check and the CLAUDE.md layer text: refactor-import-sprawl
  - sigil-table convergence, including runtime `OPERATOR_AFFINITIES`: audit-ui-data-models
  - axis coverage: runtime-axis-traceability
- **Out of scope:** behavior changes to evaluation, and the LSP's own caches (apposition-cache-granules).

## Files

```
[MOV] src/runtime/__tests__/* → packages/spw-runtime/src/**/__tests__, packages/spw-cli/src (four CLI tests)
[DEL] src/seed/*.ts, src/runtime/**/*.ts — one-line shims
[NEW] packages/spw-runtime/src/state/runtime-value.ts
[MOD] packages/spw-runtime/src/state/register-bank.ts → bank, memory-budget, coupling, marks
[MOD] packages/spw-runtime/src/session/hot-session.ts → hot-session, pointer-store
[NEW] packages/spw-seed/src/canonical/content-hash.ts — one hash over utf8 bytes
[MOD] packages/spw-seed/src/canonical/{nest-path,stencil,patch,self-mass,range-transform}.ts
[MOD] packages/spw-runtime/package.json — ./node export
[MOD] packages/spw-runtime/src/interpreter/interpreter.ts — handler table
```

## Agentic Hygiene

- Rebase target: `main@76e17bd4`.
- Each commit keeps `test:runtime`, `test:seed` and `tsc` green. The persisted-hash decision is recorded as resolved in `wip.spw`.
- `typescript-perf-audit-infra` records a typecheck baseline before the splits, so their cost is measured.

## Current boundary — 2026-10-19

The survey above records the October 13 baseline, not current unresolved work. `node_free_seed_root` (`0bf89a77`), `runtime_node_subpath` (`900e2b9c`) and `one_hash_module` (`eb34e6c3`, with runtime callers in `7509cbb8`) have landed. The persisted-hash question is resolved in the stream. Remaining work starts at `legacy_tests_home`; do not repeat the portability or hash migrations.

## Execution and acceptance

1. **Test ownership.** Inventory collected test names and fixture paths before moving files. Move runtime tests to runtime and the four CLI suites to CLI. Verify collection parity, package typecheck inclusion, and unchanged assertions. A green run with fewer collected cases is a failure, not completion.
2. **Shim retirement.** Search imports across source, tests, scripts and package entrypoints after the move. Delete shims only when no live reference remains; run seed, runtime, CLI and typecheck gates. If an external consumer still requires the legacy path, retain the compatibility boundary and record it.
3. **Value algebra and module splits.** First characterize clone/merge, both magnitude meanings, eviction, marks and pointer invalidation with existing behavioral cases. Split one responsibility at a time, preserving the public surface and recording typecheck cost against the same revision/environment baseline. Different magnitude formulas must stay distinct unless equivalence is demonstrated.
4. **Optional cleanup.** The interpreter handler table needs an observable maintenance benefit and dispatch parity. Export pruning remains held on `public_surface`; absence of an internal importer does not prove absence of a consumer.

Stop after each independently reviewable slice. If collection, behavior, or public surface changes unexpectedly, restore that slice and revise its assumption before proceeding.

## Commits

The named sequence and landed receipts in `wip.spw` are authoritative. Execute `legacy_tests_home`, then `retire_src_shims`; subsequent structural work follows the acceptance gates above. The earlier scope list is an inventory, not a claim that all ten moves remain outstanding.

## Dependencies

- `parser-releases` consumes the landed portable roots; release verification can proceed without the remaining structural splits.
- `typescript-perf-audit-infra` supplies a comparable baseline before structural changes.
- `fragment-pointers` shares pointer-store behavior; preserve its contracts during `split_hot_session`.

## Spw Artifact

`wip.spw` retains the survey, risk model, commit sequence and unresolved public-surface question; no additional abstraction artifact is needed for this maintenance pass.
