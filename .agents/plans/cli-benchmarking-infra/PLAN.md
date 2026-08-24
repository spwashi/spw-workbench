# Plan: cli-benchmarking-infra

Implement a **multi-dimensional benchmarking and efficiency observatory** around Spw CLI features, TypeScript compilation, and runtime refactors to detect regressions, quantify phase attribution, and communicate structural leverage.

## Goal

Today, performance across the CLI's command and toolchain surfaces is measured ad hoc or through simple wall-clock gates without retained distributions, reproducible baselines, or a stable account of when useful output first appears. As compiler candidates, runtime optimizations, and structural refactors evolve, engineers need reliable regression detection (`bench:check`), profiling hooks (`--prof`), and phase attribution only where real instrumentation spans exist. Reports should make engineering leverage legible through latency, memory, throughput, output cadence, and failure behavior without implying measurements the harness did not take.

**Taste note**: improve **performance**, **clarity**, and **measurement discipline** — isolate physical and operational efficiency dimensions with reproducible, statistically sound telemetry rather than arbitrary single-run timings or speculative financial jargon.

## Scope

- **In scope**:
  - Statistical core: retained raw samples, warmup labels, p50/p90, dispersion, sample count, and confidence intervals where sample size and distribution assumptions make them meaningful. IQR fences annotate instability; they do not silently remove observations from the reported corpus.
  - Workload matrix: synthetic scales (micro, standard, stress, dense mesh), workbench-owned corpora, and generated identity-free consumer shapes such as small-clean, error-heavy, deep-nesting, broad-graph, and mounted-mixed roots.
  - Dual execution harness: in-process direct module runner for pure AST/IR operations + subprocess CLI runner for cold start, flag parsing, progressive stdout, disk I/O, and Node.js V8 profiling hooks.
  - Comprehensive CLI benchmarks across all 5 groups: `collate` (census, graph, atlas, formula, density, form, lattice, delta, measure, authority, taste, stack, inspect), `select` (query, select, outline, ls), `shape` (format, expand, snippet, refactor, emit), `effect` (pulse, beat, mem), `workspace` (roots, mount, tree, doctor).
  - TypeScript compiler profiler: flat typecheck (`tsc -p`), solution build (`tsc -b`), `--extendedDiagnostics` parser, and TS 7 native parallelism matrix (`--checkers`).
  - First-class timing products: process start, time to first useful event, per-event cadence, final completion, peak RSS, and total bytes/products disclosed. Phase attribution is present only for phases carrying actual spans.
  - Differential comparison engine: latency and throughput deltas, memory delta, capability/revision compatibility checks, and outcome-aware regression gating (`bench:check`).
  - Multi-format efficiency reporting: concise Markdown brief (`.benchmarks/efficiency-report.md`), terminal summary, structured JSON (`.benchmarks/latest.json`), NDJSON progress events, and Spw projection (`.benchmarks/efficiency.spw`) over the same benchmark product.
  - Explicit outcomes: `PASS`, `REGRESSION`, `UNSTABLE`, `ENVFAULT`, and `SKIPPED`; a noisy or incompatible environment never becomes an ordinary pass/fail result.
  - Package scripts: `bench`, `bench:cli`, `bench:ts`, `bench:quick`, `bench:check`, `bench:compare`, `bench:report`, `bench:json`, `bench:save`, `test:bench`.
  - Comprehensive unit test suite covering stats math, harness execution, attribution, and reporters.

- **Out of scope**:
  - Forcing immediate adoption of TypeScript 7 as the default compiler (owned by `typescript-upgrade-ladder`).
  - Network-bound telemetry or external benchmark cloud SaaS.
  - Mutating production source files during benchmark runs.

## Files

```text
[NEW] .agents/plans/cli-benchmarking-infra/PLAN.md
[NEW] .agents/plans/cli-benchmarking-infra/wip.spw
[NEW] .agents/plans/cli-benchmarking-infra/cli-benchmarking-infra.spw
[NEW] scripts/bench/types.ts
[NEW] scripts/bench/stats.ts
[NEW] scripts/bench/workloads.ts
[NEW] scripts/bench/harness.ts
[NEW] scripts/bench/cli-benchmarks.ts
[NEW] scripts/bench/toolchain-benchmarks.ts
[NEW] scripts/bench/phase-attribution.ts
[NEW] scripts/bench/compare.ts
[NEW] scripts/bench/efficiency-report.ts
[NEW] scripts/bench/runner.ts
[NEW] scripts/bench/__tests__/stats.test.ts
[NEW] scripts/bench/__tests__/bench-harness.test.ts
[NEW] scripts/bench/__tests__/efficiency-report.test.ts
[MOD] package.json
[MOD] .gitignore
```

### Craft guard

- Keep each module in `scripts/bench/` focused and under 400 lines.
- Zero external runtime dependencies added to production packages (uses existing `tsx`, `typescript`, `vitest`).
- In-process harness must reset global state and mocks between benchmark runs.
- Benchmark outputs in `.benchmarks/history/` must be gitignored to keep the repository clean.
- Workloads and reports must carry workbench revision, workload revision/schema, runtime/compiler versions, platform facts, cold/warm class, and exact command/profile.
- Never infer lexer/parser/runtime phase time by subtracting unrelated wall clocks; use real spans or report phase attribution as unavailable.
- Generated consumer fixtures describe capability and corpus shape only; no downstream repository name, private corpus, or local absolute path enters snapshots.

## Commits

1. `.[plans] — stage cli-benchmarking-infra planning artifacts`
2. `#[bench] — add retained-sample statistics, outcome classes, and data models`
3. `#[bench] — add synthetic, workbench, and identity-free consumer-shape workloads`
4. `#[bench] — implement in-process and subprocess harness with first-event and profiling hooks`
5. `#[bench] — add comprehensive benchmark suite across all 5 CLI command groups`
6. `#[bench] — add TypeScript toolchain profiler and TS7 readiness matrix`
7. `#[bench] — implement differential comparison, instrumented phase spans, and outcome-aware regression gate`
8. `#[bench] — add multi-dimensional efficiency report generator (Markdown, Terminal, JSON, Spw)`
9. `#[bench] — create unified runner CLI and wire package scripts`
10. `![bench] — add test suite for stats math, harness, attribution, and reporters`
11. `.[bench] — document benchmarking protocol, efficiency lattice, and runbook`

Fuzz strategy:
- Explore: `npm run bench:quick`
- Stabilize: `npm run test:bench && npm run bench:check`
- Ship: `npm run build && npm run test:run && npm run lint && npm run bench:report`

## Agentic Hygiene

- Rebase target: `main@66ed9a2ea2c490522eed38004f6848c7966efc26`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; clean branch with no uncommitted drift

## Dependencies

- `typescript-perf-audit-infra`: complementary focus on low-level `tsc` telemetry; this plan implements the comprehensive CLI and toolchain efficiency observatory.
- `typescript-toolchain-observatory`: research and release projection companion.
- `typescript-upgrade-ladder`: will consume baseline snapshots from this infrastructure.
- `cli-sense-reorientation`: defines shared intermediate products and progressive output forms the harness must observe without inventing benchmark-only schemas.
- `cli-mode-overhaul`: defines measure/stream/precipitate/write distinctions so benchmark runs can state their effect ceiling and avoid mutating authoring roots.

## Failure Modes

- **Hard**: Subprocess spawning overhead masks micro-level parsing performance improvements — mitigated by dual-path execution (in-process micro runner for pure algorithmic phases, subprocess runner for end-to-end CLI cold starts).
- **Soft**: TypeScript 7 binary not present in development environment — handled gracefully with `status: 'skipped'` or fallback to TS 5.9 baseline.
- **Soft**: High variance on busy systems — preserved in raw samples and surfaced as `UNSTABLE`; reruns may narrow the environment, but the report does not discard inconvenient measurements.
- **Soft**: A CLI command emits no progressive event — time to first output is marked unavailable rather than approximated from final completion.
- **Non-negotiable**: Zero mutation of working tree files during benchmark execution; zero network calls; strict adherence to typed schemas.

## Validation

- **Hypotheses**:
  - In-process harness resolves differences in pure AST/IR operations without importing CLI process overhead into that claim.
  - Instrumented phase spans explain material regressions while unavailable phases remain explicitly unknown.
  - Regression gate distinguishes performance degradation from variance and environment faults before selecting an exit status.
  - Multi-dimensional efficiency report presents clear, evidence-backed leverage across operational, computational, cognitive, and toolchain dimensions.
- **Negative controls**:
  - `npm run test:run`, `npm run build`, and `npm run lint` remain completely green.
  - Production distribution package builds remain unaffected.
- **Demo sequence**:
  1. `npm run test:bench` → verifies stats, harness, and reporter math.
  2. `npm run bench:cli` → runs complete CLI benchmark suite with phase attribution.
  3. `npm run bench:ts` → profiles TypeScript compiler.
  4. `npm run bench:save` followed by `npm run bench:compare` → produces differential speedup matrix.
  5. `npm run bench:check` → verifies regression gating.
  6. `npm run bench:report` → emits `.benchmarks/efficiency-report.md` and `.benchmarks/efficiency.spw`.

## Spw Artifact

`.agents/plans/cli-benchmarking-infra/cli-benchmarking-infra.spw`
