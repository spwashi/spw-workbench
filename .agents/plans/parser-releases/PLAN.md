# Plan: parser-releases

## Goal

A consumer imports a pinned browser build and can identify exactly what it contains. Taste: immutable bytes, explicit capabilities, and a verifiable manifest. Local build success and site publication have separate evidence.

## Scope

The builder at `scripts/release/build-parser-release.ts` currently emits `spw.parser-release/2` with full, lite, reader and workbench variants in min/debug forms. The workbench variant includes portable seed/runtime APIs, reader products and caret form context. Earlier layout notes in `wip.spw` describe the initial full/lite release and are incomplete as a current capability inventory.

In scope: verify the existing builder/test contract and prepare a reproducible handoff to the site repository. Out of scope: new variants without a consumer, storage migration without size evidence, and treating an elapsed target date as proof of publication.

## Evidence and next slice — 2026-10-19

At `0eb1d1c0`, `build-parser-release.test.ts` already tests stamps against the manifest and contains prerelease/patch checks. The planned `stamp_matches_manifest` work must first audit those assertions against all four variants and both forms. Run `npm run test:parser-release`; retain revision, command, outcome and any missing matrix cell. If coverage is complete, reconcile the named item with its actual implementation receipt instead of adding duplicate tests. This review inspected coverage but did not execute the release suite.

The old `2026.10.13` target has elapsed. `first_release` remains unverified here because the site repository and deployed assets were not inspected. Before selecting a new cut, check whether that name already exists. Never overwrite a dated path or imply a release was published from a workbench-only receipt.

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

Canonical named work is in `wip.spw`. Audit `stamp_matches_manifest` first; change tests only for demonstrated gaps. `first_release` belongs to the site repository and follows a clean release receipt. No publication is performed by this planning pass.

## Agentic Hygiene

Review basis: `0eb1d1c0`; historical base references remain unchanged. Use an isolated implementation branch and run `test:parser-release` before handoff. Explore by reading the variant matrix, stabilize through the release suite, and ship only with both local and site receipts.

## Dependencies

- `runtime-maintenance`: portable roots and unified hashes have landed; remaining module splits do not block a cut.
- `mounted-consumer-tooling`: consumer authority and pinned revisions remain explicit.
- `onboarding-quest`: consumes the published build; its delivery status must be verified in the site repository.

## Spw Artifact

`wip.spw` owns release naming, historical decisions, open questions and commit receipts. The builder's manifest schema is the executable contract.
