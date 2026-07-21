# Plan: typescript-upgrade-ladder

Execute a staged TypeScript version migration: **5.9 → 6.0 (bridge) → 7.0 (native)**, with dual-install safety for tools that still need the JS compiler API.

## Goal

Move the monorepo off TypeScript 5.9 without surprise breaks. TypeScript 6.0 is the last JavaScript-based compiler and the intentional bridge: it deprecates legacy options and sets new defaults. TypeScript 7.0 is the native (Go) port — same language surface as a clean 6.0 build, primarily a **performance and editor/agent loop** upgrade (typically ~8–12× full typecheck), not a new dialect.

This plan lands configuration compatibility first, then dual-install, then optional native-default `tsc`, while keeping `fuzz:ship` green at every rung.

**Taste note**: improve **correctness**, **performance**, and **communicability** — version claims must match install reality; no silent default flips.

## Scope

- **In scope**:
  - Rung A (5.9 prep): remove / rewrite deprecated-bound config (`baseUrl`, explicit `types`, pin hygiene)
  - Rung B (6.0): adopt TypeScript 6, clear deprecations without `ignoreDeprecations`, green build + tests
  - Rung C (7 dual-install): ship `tsc` as native 7 for typecheck; keep TS 6 API available for typescript-eslint / tooling
  - Rung D (optional default): make 7 the workspace default only after dual-install and observatory baselines agree
  - Extension pin alignment (`extensions/vscode-spw` typescript dep)
  - Skill/docs notes for version policy and dual-install
  - Baselines captured via `typescript-perf-audit-infra` / observatory before claiming speedups

- **Out of scope**:
  - Deep type-system refactors (`any` purge, ONF typing) — separate lanes
  - Enabling `noUncheckedIndexedAccess` as part of the version bump (optional follow-on)
  - Changing product runtime behavior, parser semantics, or release package shapes except as forced by compiler defaults
  - Depending on TypeScript 7.1 programmatic API before it exists
  - Replacing typescript-eslint or rewriting the full lint stack in this branch

## Ladder (rungs)

| Rung | Compiler | Success criteria |
|------|----------|------------------|
| **0 — baseline** | 5.9.3 | Capture wall-time + diagnostics baseline on current graph |
| **A — prep** | 5.9.3 | `baseUrl` removed; explicit `types`; extension pin aligned; still green |
| **B — bridge** | 6.x | No deprecation suppressions; `stableTypeOrdering` optional compare; green |
| **C — dual** | 7 + 6 API | `npm run build` / `fuzz:types` via 7; eslint still resolves 6 API |
| **D — default** | 7 primary | Docs + pins declare 7; 6 only as compatibility package |

Each rung is a mergeable commit series. Do not skip A→C.

## Files

```text
[NEW] .agents/plans/typescript-upgrade-ladder/PLAN.md
[NEW] .agents/plans/typescript-upgrade-ladder/wip.spw
[NEW] .agents/plans/typescript-upgrade-ladder/typescript-upgrade-ladder.spw
[MOD] package.json
[MOD] package-lock.json
[MOD] tsconfig.base.json
[MOD?] tsconfig.json
[MOD?] tsconfig.typecheck.json
[MOD?] packages/*/tsconfig.json
[MOD?] src/tsconfig.json
[MOD?] scripts/tsconfig.json
[MOD] extensions/vscode-spw/package.json
[MOD] .agents/skills/spw-typescript-affordances/SKILL.md
[MOD] .agents/skills/spw-typescript-affordances/references/tsconfig-notes.md
[MOD?] docs/contributing/md/common-tasks.md
[MOD?] docs/research/md/typescript-toolchain-observatory.md
```

### Craft guard

- Prefer config and pin changes over code churn; if 6/7 surface type errors, fix at the **boundary** (options, types array, path maps) before rewriting application logic.
- Keep dual-install naming explicit: never leave two ambiguous `tsc` binaries undocumented.
- Do not land `"ignoreDeprecations": "6.0"` in mainline — treat deprecations as work items on rung A/B.
- One pin owner: root workspace; extension must not float on `^5.2.0`.

## Commits

1. `.[plans] — stage typescript-upgrade-ladder planning artifacts`
2. `#[tsconfig] — remove baseUrl; explicit types; align extension TS pin (rung A)`
3. `![types] — verify 5.9 prep: build, fuzz:types, test:run`
4. `#[toolchain] — adopt TypeScript 6.0 and clear bridge deprecations (rung B)`
5. `![types] — verify TypeScript 6 green across packages and scripts`
6. `#[toolchain] — dual-install TypeScript 7 native + typescript6 API (rung C)`
7. `![types] — verify native tsc typecheck and eslint still resolve`
8. `.[docs] — document version ladder, dual-install, and default policy`
9. `#[toolchain]? — promote TypeScript 7 as primary default (rung D, optional)`

Fuzz strategy:

- Explore (each rung): `npm run fuzz:types`
- Stabilize: `npm run fuzz:stabilize`
- Ship: `npm run fuzz:ship` (and `npm run lint` if eslint-bound)
- Perf compare (after C): observatory / `typescript-perf-audit-infra` matrix 5.9|6|7

## Agentic Hygiene

- Rebase target: `main@bca875c7f059edc8b9df4696cce9ed92a52acc1b`
- Rebase cadence: before commit 1, before each rung merge, before final default flip
- Hygiene split: none expected; if dual-install and config prep diverge in review, split rung A into its own PR

## Dependencies

- **`typescript-perf-audit-infra`** (soft, preferred): capture baseline on rung 0 and compare after C before claiming speedups in docs
- **`typescript-toolchain-observatory`**: longer-horizon measurement/projection design this ladder feeds
- **`audit-fuzz-truthfulness`**: keep script names honest (`fuzz:types` must mean real typecheck under the active `tsc`)

## Failure Modes

- **Hard**: typescript-eslint cannot load `typescript` API after dual-install aliases — fix package aliases / peer resolution before merging C
- **Hard**: path maps break without `baseUrl` — rewrite paths root-relative (already mostly are)
- **Hard**: missing Node/test globals after `types: []` default — set explicit `"types": ["node"]` (and test types if needed)
- **Soft**: declaration emit order / display differences between 6 and 7 — use `stableTypeOrdering` on 6 only for diagnosis
- **Soft**: CI memory pressure with high `--checkers` / `--builders` — default conservative parallelism in scripts
- **Non-negotiable**: no `ignoreDeprecations` on main; no absolute user paths in commits; every rung green on `fuzz:ship`

## Validation

- **Hypotheses**:
  - Rung A alone is green on 5.9 with no behavioral change
  - Clean 6.0 check equals 7.0 type-error surface for this repo
  - Dual-install keeps eslint working while `npx tsc` is 7
  - Wall-time of `fuzz:types` drops materially under 7 (measure; do not assume)
- **Negative controls**:
  - Runtime tests still pass without TS version in test env changing semantics
  - Package exports and source-first layout unchanged unless forced
- **Demo sequence**:
  1. Rung 0 baseline JSON from perf audit
  2. Rung A config diff + green build
  3. Rung B `tsc --version` → 6.x + green
  4. Rung C `tsc --version` → 7.x, eslint smoke, green
  5. Side-by-side timing table 6 vs 7

## Dual-install sketch (rung C)

Preferred shape (adjust versions to latest stable at implement time):

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.0",
    "typescript": "npm:@typescript/typescript6@^6.0.0"
  },
  "scripts": {
    "build": "npx --package=@typescript/native tsc -p tsconfig.typecheck.json --noEmit",
    "fuzz:types": "npx --package=@typescript/native tsc -p tsconfig.typecheck.json --noEmit"
  }
}
```

Document which binary is which. Prefer explicit script wrappers over ambient PATH ambiguity.

## Spw Artifact

`.agents/plans/typescript-upgrade-ladder/typescript-upgrade-ladder.spw`

Formalizes rungs, gates, dual-install policy, and links to observatory/perf audit.
