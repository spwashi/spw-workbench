# Plan: first-plugin

One concrete plugin runs on a mounted corpus and fails closed at both ends. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

`PLUGIN-PROTOCOL.md` has said since v0.2.0 that no concrete plugin exists, and `.spw/surfaces/plugins/` holds only a stub index. This plan builds the runner and one plugin: discovery over the scan path, selection, emit, and two health rules. A selector that matches nothing fails the run, as the protocol already says. A field the emit writes with no declared reader also fails the run (the consumer's rank 8 ask). A second plugin waits until the first one has run on the consumer's corpus.

The plan also holds the intake table for the fourteen asks a mounted consumer filed on 2026-10-25, so the consumer reads one place after each submodule update. See `^["intake"]` in wip.spw.

Taste note:
- containment: the workbench owns protocol, runner, and health rules; the consumer owns the plugin file
- correctness: fail closed at both ends of an emit, selector and reader

## Scope

- In scope: runner and discovery, selector health, reader health, one fixture plugin in this repo, protocol doc update.
- Out of scope: a plugin directory, a marketplace, compatibility scores, a second plugin, the consumer's plugin file (it lives in the consumer).

## Files

[MOD] lib/spw-v0.3.0/surfaces/PLUGIN-PROTOCOL.md
[MOD] .spw/surfaces/plugin-protocol.spw
[MOD] .spw/surfaces/plugins/index.spw
[NEW] runner under packages/spw-cli/src (verb home per ?[verb_home])

Craft guard:
- emit.ts already carries pack, fractal, expand, holes; the runner should not grow it past 600 lines.

## Commits

1. ~[runner_fixture] — failing fixture first
2. ~[selector_health]
3. ~[reader_health]
4. ~[protocol_doc]

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- Owner call on ?[first_plugin] before commit 2 settles what the fixture imitates.

## Failure Modes

- Hard: a workspace with zero plugins publishes differently than before.
- Soft: the runner and `spw emit` grow two vocabularies for the same collapse.
- Non-negotiable: the run fails closed; a silent zero-hit selector is a defect.

## Validation

- Hypotheses: the consumer's expression manifest, run as a plugin, flags SPW_PROJECTION_SEEDS (195 KB, no caller of getProjectionSeeds) on its first run.
- Negative controls: a workspace without `.spw/surfaces/plugins/*.spw` runs nothing and exits 0.
- Demo sequence: fixture fails on zero hits → fixture passes with one hit → fixture fails on an unread field.

## Spw Artifact

None beyond `wip.spw` yet.
