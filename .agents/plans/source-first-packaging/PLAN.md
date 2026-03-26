# Plan: source-first-packaging

Codify the packaging contract so the repo stays source-first while `dist/` remains a derived release artifact.

## Goal

The goal is to make that decision obvious in both the canon and the README, especially for future installer and publishing work. Taste note: this slice prioritizes clarity, naming, and release correctness.

## Scope

- **In scope**: add a packaging convention under `.spw/conventions`, wire it into the conventions index, and update the README to state the source-first versus dist-artifact split.
- **Out of scope**: changing the build scripts, changing package resolution, or redesigning the publish contract again.

## Files

[NEW] `.agents/plans/source-first-packaging/wip.spw`  
[NEW] `.spw/conventions/packaging.spw` — canonical packaging/release contract  
[MOD] `.spw/conventions/index.spw` — register the new packaging convention  
[MOD] `README.md` — document source-first repo semantics and dist as release artifact  
[MOD?] `.spw/conventions/cli.spw` — only if a cross-reference improves clarity without duplication

Craft guard

- Keep the new convention file about packaging, not general release process sprawl.
- Avoid duplicating the same statement in both `cli.spw` and `packaging.spw`; one should be canonical and the other can point to it.
- README changes should stay high-signal and operational.

## Commits

1. `.[source-first-packaging] — plan the packaging canon update`
2. `.[source-first-packaging] — codify source-first packaging and dist release artifacts`

## Agentic Hygiene

- Rebase target: `main@3bf0b202d7157bf1bb8231cc05666d86e4ddbea6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

The new convention file itself is the durable artifact: `.spw/conventions/packaging.spw`.
