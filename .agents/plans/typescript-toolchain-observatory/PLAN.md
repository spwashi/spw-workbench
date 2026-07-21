# Plan: typescript-toolchain-observatory

Build a local-first observatory for TypeScript indexing, configuration, version, output-form, and release-surface experiments so toolchain changes can be measured, compared, and communicated rather than argued abstractly.

## Goal

The repo now has a more explicit TypeScript project graph, but there is still no durable way to answer questions like "did indexing actually improve?", "what changes when we try a different tsconfig split?", "what does TypeScript 7 buy us over the current compiler surface?", or "do those shifts change the jsdist/release story?" This lane creates a repeatable measurement and reporting surface around TypeScript and adjacent bundle/release implications: stable-vs-experimental version comparisons, configuration matrix runs, multiple output forms (JSON, Markdown, `.spw`), and explicit release QA. The result should be curiosity-friendly for local experimentation, rigorous enough to communicate value to other engineers, and connected enough to `.spw` projections and release documentation that improvements can compound rather than disappear into one-off terminal output.

Taste note: improve **clarity**, **measurement**, **release truth**, and **communicability** by turning toolchain curiosity into reusable evidence.

## Scope

- **In scope**:
  - local TypeScript profiling helpers around the current compiler (`extendedDiagnostics`, trace generation, build/reference timings)
  - configuration-matrix testing for indexing-adjacent settings (project references, include/exclude shape, cache/output structure, declaration forms)
  - version-matrix testing for current TypeScript vs optional native-preview / TypeScript 7 surfaces
  - output-form generation that can emit JSON, Markdown, and `.spw` summaries from the same measurement runs
  - bundle and release implication checks tied to `build:jsdist`, declaration outputs, package export shape, and dry-run pack results
  - documentation that explains what each measurement means and how to interpret the trade-offs
  - explicit connection to adjacent plans in DX, release, audit/fuzz truthfulness, and plan clustering

- **Out of scope**:
  - adopting TypeScript 7 by default in the same branch (see `typescript-upgrade-ladder`)
  - implementing the first profiler/matrix scripts if `typescript-perf-audit-infra` owns them — this plan keeps research projections, release QA narrative, and broader config-matrix curiosity
  - changing runtime/editor product behavior beyond what is required to measure or validate toolchain implications
  - adding network-bound telemetry or external SaaS benchmarking
  - replacing existing custom docs/`.spw` validators with ESLint

## Files

```text
[NEW] .agents/plans/typescript-toolchain-observatory/PLAN.md
[NEW] .agents/plans/typescript-toolchain-observatory/wip.spw
[NEW] .agents/plans/typescript-toolchain-observatory/typescript-toolchain-observatory.spw
[MOD] package.json
[MOD?] package-lock.json
[NEW] scripts/analyzers/typescript-profile.ts
[NEW] scripts/analyzers/typescript-version-matrix.ts
[NEW] scripts/analyzers/typescript-bundle-inspect.ts
[MOD?] scripts/release/build-js-dist.ts
[NEW] docs/research/md/typescript-toolchain-observatory.md
[NEW] docs/research/spw/typescript-toolchain-observatory.spw
[MOD] docs/research/index.spw
[MOD?] docs/runtime/md/quick-start.md
[MOD?] lib/spw-v0.3.0/CHANGELOG.md
```

Craft guard:
- Keep the default measurement loop local-first and offline after dependencies are installed.
- Separate measurement capture from interpretation; raw outputs should remain diffable.
- Do not let optional TS7/native-preview support become an implicit default.
- Keep bundle/release QA explicit about what changed: size, declaration shape, export surface, CLI behavior, pack output.
- Favor small scripts with stable output schemas over one large "benchmark brain."

## Commits

1. `.[plans] — stage typescript-toolchain-observatory planning artifacts`
2. `#[toolchain] — add local TypeScript profile and configuration-matrix runners`
3. `#[versions] — add stable vs preview/native TypeScript version-matrix support and result capture`
4. `#[projection] — emit JSON, Markdown, and .spw projections from toolchain experiments`
5. `&[release] — inspect jsdist, declaration outputs, and pack surfaces across toolchain variants`
6. `.[docs] — publish observatory protocol, interpretation guide, and release-implication notes`
7. `![toolchain] — verify profile loops, version matrix, projection outputs, and bundle QA stay truthful`

Fuzz strategy:
- Explore: `npm run build && npx tsc -b tsconfig.json --extendedDiagnostics`
- Stabilize: `npm run build:jsdist && npm run pack:jsdist:dry && npm run lint:docs`
- Ship: `npm run build && npm run test:run && npm run build:jsdist && npm run pack:jsdist:dry && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@e19267b9`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- **`typescript-perf-audit-infra`** — first executable slice: single-run profiler, version matrix, `audit:ts:perf*` scripts (implements observatory core before projection polish)
- **`typescript-upgrade-ladder`** — staged 5.9 → 6 → 7 migration; consumes observatory/perf baselines for speed claims; does not own measurement scripts
- `audit-fuzz-truthfulness` — the measurement surface should inherit its "truthful command contract" discipline and avoid vague script names
- `skills-instrumentation-utility` — shared instrumentation conventions can keep toolchain output structured and consistent with other skill/report surfaces
- `runtime-dx-foundation` — operational language for timings, failures, and next actions should stay compatible with the broader DX story
- `v030-release-prep` — release notes and public readiness claims should be able to quote this observatory when discussing compiler/runtime packaging surfaces
- `plan-ecology-clustering` — this branch should live as a public-interest research lane that feeds execution truth and release confidence without pretending to be a hidden blocker

## Principal Engineering Orientation

- Ladder position: `service`
- Judgment target: turn toolchain configuration work from folklore into evidence-backed engineering judgment that can guide editor performance, build boundaries, and release confidence
- Commit bar: every slice should leave behind one reusable protocol, one comparably structured output, and one clearer statement about what changed or stayed invariant

## Review Surfaces

- Type graph/config: `tsconfig.base.json`, `tsconfig.json`, `tsconfig.typecheck.json`, `packages/*/tsconfig.json`, `src/tsconfig.json`, `scripts/tsconfig.json`
- Tooling/release code: `package.json`, `scripts/release/build-js-dist.ts`, bundle/pack scripts, analyzer helpers
- Research/runtime docs: `docs/research/index.spw`, `docs/runtime/index.spw`, release notes and quick-start docs that may need updated toolchain language
- External references: official TypeScript diagnostics/trace docs and TypeScript 7/native-preview status updates

## Capability Transfer

- Research capability: repeatable profiling protocols, version matrices, and interpretation notes
- Service capability: better editor/indexing decisions, clearer release QA, and more truthful package/bundle expectations
- Documentation capability: projection-friendly outputs that can be published as `.spw` and Markdown rather than terminal residue

## Syntax and Snippet Discipline

- Stable snippets: keep canonical examples for `extendedDiagnostics`, trace commands, `tsc -b`, native-preview runs, and jsdist inspection output
- Experimental snippets: TS7/native-preview commands stay explicitly labeled as optional or preview-only
- Projection discipline: every emitted form should preserve the same measurement identity so JSON/Markdown/`.spw` rows can be compared across versions and settings

## Recursive Improvement

- Re-read current tsconfig graph, package scripts, and release surfaces before widening the experiment matrix.
- Land one measurable protocol or output form at a time.
- Record what became easier to compare, explain, or trust after each slice.
- Fold surviving measures into docs, release QA, and future toolchain decisions; drop vanity metrics quickly.

## Spw Artifact

`.agents/plans/typescript-toolchain-observatory/typescript-toolchain-observatory.spw`

The artifact should formalize the observatory: axes of comparison, measurement protocol, output projections, release-implication surfaces, and the connection between local curiosity and public engineering communication.
