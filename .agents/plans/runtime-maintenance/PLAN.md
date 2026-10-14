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
- Each commit keeps `test:runtime`, `test:seed` and `tsc` green. The hash commit waits for `?[persisted_hashes]`.
- `typescript-perf-audit-infra` records a typecheck baseline before the splits, so their cost is measured.
