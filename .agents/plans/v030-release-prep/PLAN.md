# Plan: v030-release-prep

Formalize the v0.3.0 release track around the rewrite's real public shape: the monorepo and structural decoupling milestone is structurally shipped, and the remaining work is to tell the truth about how external site codebases engage the workbench.

## Goal

The monorepo restructure has landed — packages are namespaced under `@spwashi/*`, LSP is integrated, and the extension uses `vscode-languageclient`. What is still missing is a truthful release story: how v0.3.x should be understood, how a site codebase engages the workbench through `.spw/_workbench`, and which ecosystem surfaces are genuinely ready for others to depend on. This plan is the coordination braid across the already-running install, governance, CLI, DX, and editor lanes. It should now read the clustered ecology explicitly: release gates belong to execution truth and public-interest lanes, while curricula and research experiments contribute heuristics, probes, and discussion subjects without silently becoming tag blockers.

Taste note: improve **clarity**, **layering**, and **naming** by giving the release a stable narrative and bounded gates. Honesty over ceremony — acknowledge that v0.3.0 shipped structurally before the formal waypoint was written, and do not let npm-publish language outrun the install ecology that actually exists.

## Scope

- **In scope**: write the v0.3.0 changelog and waypoint, document the submodule/site-install quick-start for external codebases, write migration notes (v0.2.x → v0.3.x / lore-era → packages-era), update ecosystem surface readiness metadata, verify VS Code extension discoverability metadata where it affects adoption, and make explicit which plan clusters actually gate a truthful release.
- **Out of scope**: new language features, parser changes, or treating npm publish as the release gate for this slice.

## Files

```text
[MOD?] extensions/vscode-spw/package.json
[NEW] docs/waypoints/spw/v030-release-track.spw
[MOD] docs/waypoints/index.spw
[NEW] lib/spw-v0.3.0/CHANGELOG.md
[NEW] docs/runtime/md/quick-start.md
[NEW] docs/runtime/md/migration-v02-v03.md
[NEW] docs/runtime/md/site-install-release-story.md
[MOD] .spw/surfaces/domains.spw
[NEW] .agents/plans/v030-release-prep/v030-release-prep.spw
```

### Craft guard
- Any package.json change is metadata only — no source modifications.
- Quick-start guide should be runnable by an external developer in under 5 minutes.
- Changelog should be honest about what shipped versus what's planned.
- Do not imply a domain launch merely because a name exists in the portfolio.

## Commits

### Narrative & Planning
1. `.[plans] — scaffold v030-release-prep planning artifacts`
2. `.[waypoints] — add v0.3.0 release-track waypoint and index link`
3. `.[release-notes] — write v0.3.0 changelog: monorepo, package boundary, namespace, LSP integration, and submodule-era install truth`

### Ecology & Adoption
4. `.[docs] — write quick-start guide: install the workbench into a site codebase via .spw/_workbench`
5. `.[docs] — write migration notes: v0.2.x / lore-era → v0.3.x packages-era`
6. `.[docs] — write site-install release story: why submodule engagement is the current public shape`
7. `#[surfaces] — update .spw/surfaces/domains.spw with installable/readiness metadata for active surfaces`

### Discoverability
8. `#[vscode] — verify VS Code extension marketplace metadata where it affects external discovery`
9. `![release] — verify the release story matches site-install reality, CLI taxonomy, and extension startup truth`

### Release Tag
10. `^[v0.3.0] — tag release after the ecology, governance, and discoverability gates agree`

Fuzz strategy:
- Explore: `npm run lint:spw && npm run lint:docs`
- Stabilize: `npm run fuzz:types && npm run test:run`
- Ship: `npm run fuzz:ship && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- `spw-site-install` — defines the primary external engagement model for this release story
- `ecosystem-surface-governance` — surface-admission ladder and dormant/sensitive exclusions
- `absorb-spwq-cli` — CLI command taxonomy must be settled before quick-start and migration notes harden
- `runtime-dx-foundation` — diagnostic station language should match the release troubleshooting story
- `vscode-lsp-integration` — extension capability/discoverability claims must stay truthful
- `plan-ecology-clustering` — release gates should depend on execution truth and public-interest lanes, while curriculum and research lanes remain valued inputs rather than hidden blockers

## Spw Artifact

`.agents/plans/v030-release-prep/v030-release-prep.spw`

It will summarize the March 2026 cadence, the monorepo/decoupling release theme, the submodule-era install story, and the gates that separate structural shipment from a truthful public `v0.3.0` tag.
