# Plan: parser-releases

## Goal

A consumer imports a pinned browser build and can identify exactly what it contains. Taste: immutable bytes, explicit capabilities, and a verifiable manifest. Local build success and site publication have separate evidence.

## Scope

The builder at `scripts/release/build-parser-release.ts` currently emits `spw.parser-release/2` with full, lite, reader and workbench variants in min/debug forms. The workbench variant includes portable seed/runtime APIs, reader products and caret form context. Earlier layout notes in `wip.spw` describe the initial full/lite release and are incomplete as a current capability inventory.

In scope: verify the existing builder/test contract and prepare a reproducible handoff to the site repository. Out of scope: new variants without a consumer, storage migration without size evidence, and treating an elapsed target date as proof of publication.

## Evidence and next slice — 2026-10-19

At `0eb1d1c0`, `build-parser-release.test.ts` already tests stamps against the manifest and contains prerelease/patch checks. The planned `stamp_matches_manifest` work must first audit those assertions against all four variants and both forms. Run `npm run test:parser-release`; retain revision, command, outcome and any missing matrix cell. If coverage is complete, reconcile the named item with its actual implementation receipt instead of adding duplicate tests. This review inspected coverage but did not execute the release suite.

The old `2026.10.13` target has elapsed. `first_release` remains unverified here because the site repository and deployed assets were not inspected. Before selecting a new cut, check whether that name already exists. Never overwrite a dated path or imply a release was published from a workbench-only receipt.

## Stamp audit — 2026-10-27

At `850077ab`, `npm run test:parser-release` passes 21 of 21. The stamp test covers all nine scripts of a release (four variants in two forms, plus the `parser.js` alias) for revision, release name, variant, form and dirt; prerelease and patch kinds are asserted on `full.min.js` only, which samples the one stamp function every file goes through rather than leaving a matrix cell untested. `stamp_matches_manifest` is reconciled to `17b0d6d7`, where the stamp test first shipped; no test was added. A mounted consumer's 2026-10-25 note cites `2026.10.13` sizes that no workbench cut matches (only `2026.10.13-pre.1` is cut here), so whether that day was published is checked in the site repository before any new cut.

## Acceptance and failure modes

- Every manifest file has matching bytes, size and digest; its stamp names the correct revision, release, kind, variant and form. Debug maps and the default alias are accounted for.
- A clean pinned revision builds reproducibly. A dirty local experiment is labeled and cannot serve as the release receipt.
- A consumer smoke example imports the pinned full/reader/workbench APIs it actually needs; browser execution does not reach Node built-ins. Keep variant cost visible rather than assuming one variant fits all consumers.
- The site handoff records immutable asset paths, manifest digest and source revision. A separate publication receipt verifies served bytes, headers, aliases and the selected-build banner.
- A manifest mismatch or existing immutable path with different bytes stops the cut. A site failure leaves local build evidence intact and publication explicitly incomplete.

## Files

```text
[MOD?] scripts/release/build-parser-release.test.ts — only missing contract assertions
[MOD?] docs/runtime/md/parser-release.md — any verified capability or handoff gap
[MOD] .agents/plans/parser-releases/wip.spw — reconcile evidence and next move
```

## Commits

Canonical named work is in `wip.spw`. `stamp_matches_manifest` is reconciled (see the stamp audit). `first_release` belongs to the site repository and follows a clean release receipt. `reader_is_browser_build`, asked by a mounted consumer on 2026-10-25, waits on `?[lite_carries_roles]`. No publication is performed by this planning pass.

## Agentic Hygiene

Review basis: `0eb1d1c0`; historical base references remain unchanged. Use an isolated implementation branch and run `test:parser-release` before handoff. Explore by reading the variant matrix, stabilize through the release suite, and ship only with both local and site receipts.

## Dependencies

- `runtime-maintenance`: portable roots and unified hashes have landed; remaining module splits do not block a cut.
- `mounted-consumer-tooling`: consumer authority and pinned revisions remain explicit.
- `onboarding-quest`: consumes the published build; its delivery status must be verified in the site repository.

## Spw Artifact

`wip.spw` owns release naming, historical decisions, open questions and commit receipts. The builder's manifest schema is the executable contract.
