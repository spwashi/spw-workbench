# Plan: typescript-perf-audit-infra

Implement **performance audit infrastructure** for TypeScript and adjacent typecheck surfaces: local, repeatable, JSON-first measurements that make upgrade-ladder claims and config experiments falsifiable.

## Goal

Today `fuzz:types` / `build` are truth-or-fail gates with no duration identity, no version stamp, and no structured history. The existing `typescript-toolchain-observatory` plan describes the research surface but **no analyzer scripts have landed** (`scripts/analyzers/typescript-*.ts` absent). This plan implements the **execution-truth layer**: small scripts, package scripts with honest names, baseline snapshots, and optional CI-friendly summaries.

It is the measurement companion to `typescript-upgrade-ladder` and the concrete first slice of the observatory.

**Taste note**: improve **measurement**, **clarity**, and **claim discipline** — timings without identity are noise.

## Scope

- **In scope**:
  - Profile runner: wall-time + exit code + compiler version + config path for typecheck / `tsc -b`
  - Optional `--extendedDiagnostics` capture and parse of key counters (files, lines, time categories when available)
  - Optional `generateTrace` / diagnostics directory hooks (opt-in; large artifacts stay gitignored)
  - Version matrix harness: run same command under pinned 5.9 / 6 / 7 when packages are present (skip missing rungs cleanly)
  - Parallelism matrix hooks for TS 7 (`--checkers`, `--builders`, `--singleThreaded`) without changing defaults
  - Baseline store: `.agents/state/typescript-perf/` or `node_modules/.cache/spw-ts-perf/` (local; not source of truth in git except golden *summaries* if desired)
  - Structured outputs: JSON (required), Markdown table (optional), minimal `.spw` projection (optional)
  - Package scripts: `audit:ts:perf`, `audit:ts:perf:json`, `audit:ts:matrix` (names must match behavior)
  - Wire into upgrade-ladder rung 0 / post-C compare docs
  - Skill note update: how to run, how to interpret, what not to claim

- **Out of scope**:
  - Adopting TypeScript 7 as default (owned by upgrade ladder)
  - Networked telemetry / external benchmark SaaS
  - Editor-internal LSP latency instrumentation (note as future; may use separate vscode-plugin-performance plan)
  - Full config-matrix sprawl (every flag combination) — start with: typecheck flat, solution build, with/without extendedDiagnostics
  - Replacing vitest or runtime perf suites

## Design principles

1. **Identity first**: every row records `{ command, tsVersion, config, cwd, startedAt, durationMs, exitCode, host note }`.
2. **Local-first**: no network; skip variants whose package is not installed.
3. **Raw then interpret**: write raw JSON before Markdown/`.spw`.
4. **Diffable**: stable key order; avoid host-noise fields in “compare” mode when possible.
5. **Truthful names**: `audit:ts:perf` measures; it does not optimize or upgrade.
6. **Composable**: one script for single run; thin wrappers for matrix / compare.

## Measurement matrix (v1)

| ID | Command shape | Why |
|----|---------------|-----|
| `typecheck.flat` | `tsc -p tsconfig.typecheck.json --noEmit` | Matches `npm run build` / `fuzz:types` today |
| `solution.build` | `tsc -b tsconfig.json --force` (or dry equivalent) | Project-reference graph cost |
| `typecheck.extended` | flat + `--extendedDiagnostics` | Counters for interpretation |
| `typecheck.native.checkers{1,4}` | TS7 only | Parallelism sensitivity |

Host note fields (optional, best-effort): node version, CPU count, platform. Never required for pass/fail of the audit script itself.

## Files

```text
[NEW] .agents/plans/typescript-perf-audit-infra/PLAN.md
[NEW] .agents/plans/typescript-perf-audit-infra/wip.spw
[NEW] .agents/plans/typescript-perf-audit-infra/typescript-perf-audit-infra.spw
[NEW] scripts/analyzers/typescript-perf.ts
[NEW] scripts/analyzers/typescript-perf-matrix.ts
[NEW?] scripts/analyzers/typescript-perf-lib.ts
[MOD] package.json
[MOD?] .gitignore
[MOD] .agents/skills/spw-typescript-affordances/SKILL.md
[MOD] .agents/skills/spw-typescript-affordances/references/tsconfig-notes.md
[MOD?] docs/research/md/typescript-toolchain-observatory.md
[MOD?] docs/research/spw/typescript-toolchain-observatory.spw
[MOD] .agents/plans/typescript-toolchain-observatory/wip.spw  (link stream only if needed)
```

### Craft guard

- Keep `typescript-perf.ts` under ~400 lines; factor matrix into a thin second file.
- No hidden dependency on TS 7 — matrix rows that need 7 skip with `status: skipped`.
- Do not commit multi-MB traces; gitignore cache dirs.
- Do not rename `fuzz:types` to imply benchmarking; keep audit scripts separate.

## Commits

1. `.[plans] — stage typescript-perf-audit-infra planning artifacts`
2. `#[audit] — add typescript-perf single-run profiler with JSON identity schema`
3. `#[audit] — add version/config matrix runner and compare mode`
4. `#[audit] — wire package scripts audit:ts:perf(+json/matrix)`
5. `.[docs] — document perf audit protocol in skill + research note`
6. `![audit] — smoke matrix on current 5.9; golden schema shape tests if cheap`

Fuzz strategy:

- Explore: `npm run audit:ts:perf:json` (once script exists)
- Stabilize: `npm run audit:ts:matrix` with only installed compilers
- Ship: `npm run fuzz:ship` unchanged; perf audit is non-gating unless explicitly opted into CI later

## Agentic Hygiene

- Rebase target: `main@bca875c7f059edc8b9df4696cce9ed92a52acc1b`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; do not mix upgrade-ladder pin changes into this branch

## Dependencies

- **Soft dual with `typescript-upgrade-ladder`**: this plan should land **first or in parallel** so rung 0 baselines exist before C/D claims
- **`typescript-toolchain-observatory`**: this is the first executable slice of that research plan
- **`audit-fuzz-truthfulness`**: script naming and structured output discipline

## Failure Modes

- **Hard**: parser for extendedDiagnostics breaks across versions — treat diagnostics text as optional; wall-time always primary
- **Soft**: noisy timings on shared CI — document variance; prefer local baselines; multi-run median optional later
- **Soft**: `tsc -b` forces emit/cache writes — use designated cache dirs under `node_modules/.cache/`
- **Non-negotiable**: never rewrite source timestamps or change compiler defaults from audit scripts; measure only

## Validation

- **Hypotheses**:
  - Single-run JSON is stable enough to diff across two local runs (duration variance expected; schema not)
  - Matrix correctly skips missing TS 7 without failing the process (exit 0 with skipped rows, or exit policy documented)
  - Profile identity is sufficient to attribute upgrade-ladder claims
- **Negative controls**:
  - `npm run fuzz:types` behavior unchanged by presence of audit scripts
  - No new network calls
- **Demo sequence**:
  1. `npm run audit:ts:perf:json` on current 5.9 → row with version + duration
  2. After dual-install: matrix 6 vs 7 → Markdown table
  3. Paste table into upgrade-ladder stream / research note

## Output schema (v1 sketch)

```ts
type TsPerfRow = {
  id: string
  command: string[]
  config: string
  typescriptVersion: string | null
  durationMs: number
  exitCode: number
  status: 'ok' | 'failed' | 'skipped'
  skipReason?: string
  diagnostics?: Record<string, number | string>
  host?: { node?: string; platform?: string; cpus?: number }
  startedAt: string
}
```

## Relationship to existing plans

| Plan | Relationship |
|------|----------------|
| `typescript-toolchain-observatory` | Research/projection design; this plan implements the profiler + matrix core |
| `typescript-upgrade-ladder` | Consumes baselines; does not embed measurement logic |
| `vscode-plugin-performance` | Adjacent editor product perf — do not conflate with `tsc` wall-time |
| `audit-fuzz-truthfulness` | Naming and truthfulness constraints |

## Spw Artifact

`.agents/plans/typescript-perf-audit-infra/typescript-perf-audit-infra.spw`
