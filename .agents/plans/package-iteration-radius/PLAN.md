# Plan: package-iteration-radius

Make package boundaries, build prerequisites, environment differences, and the cost radius of a change legible enough that contributors and consumers can reach a trustworthy first result without reconstructing the monorepo.

## Goal

Define **iteration radius** as the dependency, build, test, cache, and conceptual surface a change forces a developer to traverse. Reduce accidental radius through truthful package manifests, leaf-package task entry points, deterministic install/build receipts, and diagnostics that distinguish source failures from dependency, native-addon, ABI, platform, and cache failures.

Taste note: improve **onboarding**, **failure locality**, **package hygiene**, **performance legibility**, **documentation**, and **consumer portability**. Convenience should shorten a common path while keeping its inherited decisions inspectable and escapable.

## Current observations (2026-08-24)

- The root is a private npm workspace over `packages/*` and `extensions/vscode-spw`, with a committed `package-lock.json` and a declared Node engine range.
- Seed, Runtime, LSP, and CLI manifests are private and share `0.3.0`, but do not yet declare their internal dependency edges, package exports, engines, or package-local verification scripts.
- The root export map points directly to source modules and currently represents Runtime plus selected parser/substrate surfaces, not a complete package publication contract.
- Most toolchain dependencies and scripts live at the root. The VS Code workspace declares its own TypeScript and esbuild ranges, which are materially different from the root ranges and need an intentional compatibility explanation or convergence rule.
- `spw doctor`, JS distribution assembly, and `npm pack --dry-run` exist as useful foundations; they do not yet produce one cross-machine environment or iteration-radius receipt.
- Current package `exports` route directly to TypeScript source and are import boundaries, not measured distribution bundles. Exploratory minified esbuild probes measured approximately 2.5 KB for Seed lite, 68.6 KB for Seed parser, 64.2 KB for progressive products, 313.6 KB for the full Seed barrel, 305.7 KB for the LSP stdio entry, and 4.1 MB for the eager CLI entry. These are structural observations under one tool invocation, not release budgets.
- The CLI registry eagerly imports every command. Its bundle includes about 3.57 MB from `typescript` solely through authority extraction, so ordinary help and inspection routes inherit a compiler module they do not use.

These are implementation facts, not a claim that the current layout is broken. The first slice is an audit and contract pass before dependency or version changes.

## Scope

- **In scope**:
  - Inventory each workspace's public/private status, dependency edges, exports, engine/toolchain assumptions, scripts, build artifacts, and release role; compare declared edges with imported edges.
  - Classify each entry point as source route, runtime-load boundary, tree-shakable module, split chunk, or published artifact. Measure cold import and built bytes separately; neither substitutes for semantic execution cost.
  - Define an environment receipt carrying repository and lockfile revisions, package-manager version, Node runtime/ABI, platform/architecture/libc where available, toolchain versions, cache class, optional/native dependency state, and invoked task.
  - Extend doctor/build failures with stable categories and next actions: `source`, `manifest`, `lockfile`, `runtime`, `native-addon`, `abi`, `platform`, `cache`, and `external-tool`.
  - Define iteration-radius metrics: changed packages, dependency cone, invalidated tasks, files/types loaded, cold and warm time to first actionable result, final completion, cache hit class, and required external tools.
  - Add leaf-package build/typecheck/test entry points where the package boundary is real; keep a root verification path for integration truth.
  - Add clean-install, pack, import/export, CLI startup, LSP bundle, and extension bundle smoke tests against the supported runtime matrix. Use generated consumers and temporary directories; never depend on a developer's ambient global packages.
  - Establish a native-dependency policy: prefer no native dependency in portable kernel packages; when unavoidable, declare supported targets, optional/fallback behavior, prebuild expectations, and a diagnostic probe before a long build.
  - Give onboarding one progressive journey: environment check → dependency explanation → smallest package task → integration verification → consumer-shaped pack smoke. Each step emits a reusable receipt.
  - Document package decisions and migrations with task guides, manifest/reference tables, compatibility windows, and versioned upgrade notes. Package, language, runtime, CLI, and consumer-profile versions remain independent dimensions.
  - Derive human, machine-facing, and command-help prerequisites from one checked environment contract. A documentation build fails when two active guides disagree about a mandatory sibling checkout, patch source, runtime, or external tool.
  - Feed anonymized environment and iteration-radius shapes into the benchmarking observatory without recording machine identity or absolute local paths.

- **Out of scope**:
  - Changing package manager, adopting a remote build service, or adding a task-graph framework before the audit proves a need.
  - Publishing every internal package, synchronizing every version because `0.4` exists, or promising semantic version compatibility before public surfaces are defined.
  - Adding a native dependency merely to exercise diagnostics.
  - Treating faster clean builds as permission to widen ordinary edit/test radius.
  - Encoding a named consumer, employer, framework migration, or personal history into fixtures or public direction.

## Files

```text
[NEW] .agents/plans/package-iteration-radius/PLAN.md
[NEW] .agents/plans/package-iteration-radius/wip.spw
[NEW] .agents/plans/package-iteration-radius/package-iteration-radius.spw
[NEW] scripts/analyzers/package-contract-audit.ts
[NEW] scripts/analyzers/package-contract-audit.test.ts
[NEW] scripts/diagnostics/environment-receipt.ts
[NEW] scripts/diagnostics/environment-receipt.test.ts
[NEW] scripts/bench/iteration-radius.ts
[NEW] scripts/bench/iteration-radius.test.ts
[MOD] packages/spw-cli/src/doctor.ts
[NEW] packages/spw-cli/src/doctor.test.ts
[MOD] packages/spw-seed/package.json
[MOD] packages/spw-runtime/package.json
[MOD] packages/spw-lsp/package.json
[MOD] packages/spw-cli/package.json
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/authority.ts
[MOD] extensions/vscode-spw/package.json
[MOD] package.json
[MOD?] package-lock.json
[MOD] tsconfig.typecheck.json
[NEW] docs/guides/first-trustworthy-build.md
[NEW] docs/reference/package-contracts.md
[NEW] docs/reference/environment-receipts.md
[NEW?] .github/workflows/package-contract.yml
```

### Craft guard

- Audit first. Do not mechanically copy root dependencies or scripts into every package manifest.
- Package manifests describe actual ownership and public contracts. TypeScript path aliases, workspace hoisting, and source-relative imports may not substitute for declared edges in a consumer smoke test.
- Keep environment collection pure, redacted, and serializable. Never emit usernames, absolute paths, hostnames, or unrelated environment variables.
- Stable failure codes wrap underlying tool output; they do not erase the original causal chain.
- A leaf command must exercise the same code path as integration verification for the requested product. Fast aliases may narrow scope, not meaning.
- Use const tables and discriminated unions for failure classes, receipt states, and task outcomes. Keep platform-specific probes behind small adapters.
- Avoid adding build orchestration until measured invalidation and task graphs show root scripts cannot meet the radius target.

## Commits

1. `.[plans] — define package contracts, environment receipts, and iteration-radius measures`
2. `#[packages] — audit declared and imported workspace boundaries`
3. `vocab[tooling] — add redacted environment and failure-locality receipts`
4. `&[doctor] — explain runtime, lockfile, ABI, native, platform, and cache mismatches`
5. `&[packages] — add truthful leaf verification and package export smoke paths`
6. `#[bench] — measure dependency cones, invalidation, and first actionable feedback`
7. `![packages] — verify clean install, pack, import, CLI, LSP, and extension matrices`
8. `.[docs] — publish onboarding, package reference, and migration decisions`

Fuzz strategy:

- Explore: package audit plus current root/leaf build timing; no manifest edits.
- Stabilize: package-contract tests, doctor tests, pack/import smokes, and supported Node matrix.
- Ship: clean temporary install, `npm run build`, package tests, LSP/extension bundles, and redaction checks.

## Agentic Hygiene

- Rebase target: `main@6b49b60c9c06162402408f5a85339d68831534dd`
- Intended implementation branch: `codex/package-iteration-radius`
- Hygiene split: this pass adds planning artifacts only. Manifest, lockfile, and CI changes begin in a dedicated worktree after the audit report is reviewed.

## Dependencies

- `canon-rewrite-v2` owns curated package/product surfaces and release assembly.
- `runtime-dx-foundation` owns supportable diagnostics, stable health codes, and calm next actions.
- `cli-benchmarking-infra` owns retained measurements and comparison outcomes; this plan supplies environment and iteration-radius products.
- `spw-site-install` and `mounted-workbench-organelle` supply consumer install/mount journeys and authority-safe smoke shapes.
- `typescript-upgrade-ladder` owns compiler-version adoption; this plan records toolchain compatibility and radius effects.
- `gap-affinity-tooling` supplies one concrete feature migration whose leaf and consumer paths can validate the package contract.

## Failure Modes

- **Hard**: a clean generated consumer succeeds only because the monorepo root or a global package is visible.
- **Hard**: two supported machines resolve different dependency/native binaries from the same lock and receipt without a diagnosed compatibility difference.
- **Hard**: a leaf verification reports success while the public export or bundled consumer path cannot load the same product.
- **Hard**: diagnostics expose an absolute path, host identity, token, or unrelated environment variable.
- **Hard**: two active onboarding surfaces describe incompatible prerequisite graphs while both claim the supported clean-build path.
- **Soft**: the root integration task remains expensive. Preserve it, then add truthful leaf tasks and measure the invalidation cone before introducing caching machinery.
- **Soft**: an optional native capability is unavailable. Report the exact capability loss and fallback; do not turn an optional surface into an opaque install failure.
- **Soft**: tool versions differ but remain compatible. Record the range and observed version without manufacturing a failure.
- **Non-negotiable**: environment faults never become parser/runtime regressions, and performance results with incompatible receipts are not compared.
- **Non-negotiable**: a scalar repository version never claims synchronized language, package, runtime, editor, and consumer compatibility.

## Validation

- **Hypotheses**:
  - Most Seed and CLI questions can reach a trustworthy result without rebuilding or understanding the LSP, editor, runtime, and docs surfaces.
  - Lazy command loading and explicit Seed subpaths keep unused compiler, canonical, query, and instrumentation modules outside ordinary consumer startup without forking parser semantics.
  - Declared import/export edges plus generated-consumer smokes catch hoisting and source-path assumptions before release.
  - Environment receipts turn inconsistent cross-machine failures into a small comparison of causal dimensions.
  - Explicit package and migration decisions reduce onboarding explanation load without hiding the workbench's flexibility.
- **Negative controls**:
  - A clean temp consumer has no access to the monorepo root and still imports only declared public surfaces.
  - Warm cache, cold cache, and clean install are separate classes and are never averaged together.
  - Changing hostname or checkout path does not change the redacted environment identity.
  - Touching a docs-only file does not invalidate a Seed leaf task; changing a Seed public type does invalidate declared dependents.
  - A tokens-only browser consumer does not ship the full canonical/query barrel, while its token product matches the progressive Node facade on the same fixture.
  - The same source failure produces the same stable category across supported machines even when underlying tool wording differs.
  - Human and machine-facing setup guides resolve to the same checked prerequisite graph and generated command smoke.
- **Demo sequence**:
  1. Run package contract audit and inspect undeclared, unused, private, and public edges.
  2. Run doctor on two environment receipts and explain every compatibility delta.
  3. Change one Seed fixture; compare leaf first-feedback time with root integration completion and show the dependency cone.
  4. Pack/install into a clean generated consumer and exercise parser, CLI, LSP, and extension products independently.
  5. Simulate a native-addon or ABI incompatibility fixture and receive an actionable environment fault before semantic tests start.
- **Falsify**: reject the contract if receipts cannot reproduce task selection, leaf paths diverge from public products, machine differences remain opaque, or radius metrics reward skipped correctness work.

## Spw Artifact

`.agents/plans/package-iteration-radius/package-iteration-radius.spw`

The artifact defines package truth, environment receipts, iteration radius, failure locality, onboarding stages, independent compatibility dimensions, and falsification probes.
