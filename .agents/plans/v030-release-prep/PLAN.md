# Plan: v030-release-prep

Turn the missed March cadence into a repo-native `v0.3.0` release track by documenting the `2026-03-13` alpha miss, the `2026-03-26` beta gate, and the `2026-03-31` release gate around the monorepo and structural decoupling milestone.

## Goal

The repo has a release instinct, bundle scripts, and waypoint surfaces, but it does not yet carry a concrete `v0.3.0` track that reflects the current March 2026 reality. This pass creates planning artifacts, a public waypoint, and changelog notes that make the end-of-month push legible inside the canon surfaces. The intended end state is a release story that names the recovery from the missed `2026-03-13` alpha checkpoint and frames `v0.3.0` as the monorepo, package-boundary, and decoupling milestone rather than a vague version bump.
Taste note: improve **clarity**, **layering**, and **naming** by giving the release a stable narrative and a bounded set of gates.

## Scope

- **In scope**: create planning artifacts under `.agents/plans/v030-release-prep/`, add a `v0.3.0` release-track waypoint under `docs/waypoints/spw/`, update the waypoint index, and record the March 2026 cadence plus monorepo theme in the active changelog.
- **Out of scope**: performing the monorepo migration itself, bumping `package.json` to `0.3.0`, tagging a release, or changing build/package topology in this pass.

## Files

[NEW] .agents/plans/v030-release-prep/PLAN.md  
[NEW] .agents/plans/v030-release-prep/wip.spw  
[NEW] .agents/plans/v030-release-prep/v030-release-prep.spw  
[NEW] docs/waypoints/spw/v030-release-track.spw  
[MOD] docs/waypoints/index.spw  
[MOD] lib/spw-v0.2.0-alpha/CHANGELOG.md  

Craft guard:
- Keep planning artifacts and waypoint surfaces under 220 lines each.
- Keep the release track focused on dates, gates, and scope; do not duplicate the full implementation plan.
- Avoid changing source/package structure in this planning pass so the release narrative stays separable from implementation churn.

## Commits

1. `.[plans] — scaffold v030-release-prep planning artifacts`
2. `.[waypoints] — add March 2026 v0.3.0 release-track waypoint and index link`
3. `.[release-notes] — align v0.2.0-alpha changelog with the v0.3.0 end-of-March track`

Fuzz strategy:
- Explore: `npm run audit:spw:syntax -- .agents/plans/v030-release-prep/wip.spw .agents/plans/v030-release-prep/v030-release-prep.spw docs/waypoints/spw/v030-release-track.spw docs/waypoints/index.spw`
- Stabilize: `npm run audit:spw:syntax -- .agents/plans/v030-release-prep/wip.spw .agents/plans/v030-release-prep/v030-release-prep.spw docs/waypoints/spw/v030-release-track.spw docs/waypoints/index.spw`
- Ship: `npm run audit:spw:syntax -- .agents/plans/v030-release-prep/wip.spw .agents/plans/v030-release-prep/v030-release-prep.spw docs/waypoints/spw/v030-release-track.spw docs/waypoints/index.spw && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@0de218fa7eaae69357af109fa23ebfd1d76d47ce`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Add a distilled release-track artifact at:
- `.agents/plans/v030-release-prep/v030-release-prep.spw`

It will summarize the March 2026 cadence, the monorepo/decoupling release theme, and the gates that separate beta from a real `v0.3.0` tag.
