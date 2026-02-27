# Plan: d26_02_26-release-readiness

Evaluate and execute the minimum viable updates needed to ship a Spw v0.2.0-alpha release track today across spec lib and editor extensions.

## Goal

Decide, on February 27, 2026, whether this rewrite branch can ship a credible `v0.2.0-alpha` release surface in one day, then perform only the highest-leverage updates needed for that release. The current rewrite keeps `lib/spw-v0.2.0-alpha` but omits the `extensions/` tree entirely, so release readiness requires both artifact presence and version alignment. This plan prioritizes bounded scope over completeness: restore extension surfaces, align release metadata, and publish explicit constraints.
Taste note: improve correctness and clarity by making release state explicit and testable rather than implied by planning artifacts.

## Scope

- **In scope**: release readiness audit; restoration of `extensions/` surfaces from canon history; `v0.2.0-alpha` metadata alignment for extension manifests/build files; `lib/spw-v0.2.0-alpha` delta/changelog updates; release notes/checklist for known gaps.
- **Out of scope**: full LSP feature parity, new grammar/runtime semantics, and broad DX refactors from `runtime-dx-foundation`.

## Files

[MOD] `.agents/plans/d26_02_26-release-readiness/PLAN.md`
[NEW] `.agents/plans/d26_02_26-release-readiness/wip.spw`
[NEW?] `extensions/vscode-spw/**` (restore from canon branch)
[NEW?] `extensions/intellij-spw/**` (restore from canon branch)
[NEW?] `extensions/neovim-spw/**` (restore from canon branch)
[MOD?] `extensions/vscode-spw/package.json` (version + release metadata)
[MOD?] `extensions/intellij-spw/build.gradle.kts` (version + compatibility metadata)
[MOD?] `extensions/intellij-spw/src/main/resources/META-INF/plugin.xml` (release notes / compatibility clarifications)
[MOD] `lib/spw-v0.2.0-alpha/CHANGELOG.md`
[MOD] `lib/spw-v0.2.0-alpha/DELTAS.md`
[NEW?] `docs/release/md/v0.2.0-alpha-2026-02-27.md`

### Craft guard

Keep release docs concise and decision-oriented. Do not expand extension source complexity during this pass; limit edits to metadata, wiring, and documentation. If extension manifests exceed one responsibility, split human-facing release notes into docs rather than embedding dense prose in manifest files.

## Commits

1. `&[hygiene]` — isolate unrelated local DOM test harness drift from release branch
2. `&[extensions]` — restore `extensions/` surfaces from canon history (`lore/main`)
3. `.[release]` — align VS Code and IntelliJ extension versions to `0.2.0-alpha`
4. `.[lib]` — update `lib/spw-v0.2.0-alpha` deltas/changelog with explicit ship criteria and known gaps
5. `![release]` — run release smoke checks for seed tests and extension package/build sanity
6. `.[release]` — publish dated release note for `v0.2.0-alpha` scope and constraints

## Agentic Hygiene

- Rebase target: `main@135364a`
- Rebase cadence: before commit 1, before merge
- Hygiene split: uncommitted DOM harness drift is present (`package.json`, `src/testing/**`, `vitest.dom.config.ts`, `.agents/plans/dom-css-test-harness/**`); release work should proceed on a dedicated branch and exclude these files

## Dependencies

none

## Spw Artifact

.agents/plans/d26_02_26-release-readiness/d26_02_26-release-readiness.spw
