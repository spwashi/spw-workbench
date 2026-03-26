# Plan: js-distribution

Begin bundling a versioned JavaScript distribution for the workbench without breaking the current source-TypeScript workspace contract. The desired end state is a reproducible `dist/` artifact and release bundle that mirrors the root package version, keeps `spw` as the canonical CLI identity, and preserves the existing TS-first dev loop. Taste note: this work prioritizes correctness, layering, and release clarity.

## Scope

- **In scope**: add a versioned JS dist builder, generate a dist package manifest from the root package version, bundle the canonical public runtime/CLI entrypoints, and wire a release artifact path for the JS distribution.
- **Out of scope**: flipping the live workspace to consume `dist/` by default, full declaration-bundling/publish hardening for every internal package, and cross-runtime targets like Bun/Deno/Elide.

## Files

[NEW] `.agents/plans/js-distribution/wip.spw`  
[NEW] `scripts/release/build-js-dist.ts` — bundle public JS entrypoints into `dist/` and stamp a package manifest with the root version  
[NEW] `scripts/release/bundle-jsdist.sh` — archive the JS distribution into the versioned release bundle directory  
[MOD] `package.json` — add JS dist build/bundle scripts and direct build-tool ownership if needed  
[MOD] `package-lock.json` — reflect any direct build dependency required for the JS dist lane  
[MOD] `scripts/release/bundle-release.sh` — include the JS dist bundle in the release flow  
[MOD?] `scripts/release/bundle-srcdist.sh` — clarify whether src bundles should still embed `dist/` once a dedicated JS artifact exists  
[MOD?] `README.md` — document the new JS dist and versioning contract if the implementation surface becomes user-facing

Craft guard

- `scripts/release/build-js-dist.ts` should stay focused on entrypoint mapping, version stamping, and bundler invocation; if it starts absorbing release-archive concerns, split that into a second helper.
- Avoid changing the runtime/seed/cli source modules to satisfy the dist lane; the build surface should adapt to the workspace, not vice versa.
- Keep version truth in one place: root `package.json`.

## Commits

1. `.[js-dist] — plan versioned JS distribution bundling`
2. `&[js-dist] — add versioned dist builder and manifest generation`
3. `&[js-release] — wire JS dist bundles into the release flow`
4. `.[js-dist-docs] — document the dist/versioning contract`

## Agentic Hygiene

- Rebase target: `main@80fb5bc445d17d5dfa1876311100e40a71dc86e6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Optional. If the dist/version contract grows beyond build-script mechanics, record it at `.agents/plans/js-distribution/js-distribution.spw`.
