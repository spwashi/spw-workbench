# Plan: reading-drift

Before a grammar change lands, it lists every line whose reading changes in this repo and in any corpus named by path. Each parser release ships the readings of a fixed specimen set. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Four silent misreads surfaced on 2026-11-06, none of which raised an error:
- a line-final `<…>` takes the next line's head (10 lines in this repo, 347 in a mounted consumer);
- `key = value` with a plain value reads as three loose expressions (most of 2,174 lines here and 25,429 in the consumer);
- `key = @handle` reads as a bias edge anchored at the handle (27 lines here, 2,590 in the consumer);
- a `<…>` after an operation's slots wraps the operation instead of filling its slot (0 here, 28 in the consumer).

Each fix changes how existing lines read, and nothing here can say which lines or how many. The counts above came from one-off scripts.

The consumer already verifies its own reader this way. Before and after a change, it writes its expression manifest and compares it with a snapshot ("986 expressions identical to the snapshot taken before the change"). This plan gives seed the same check, over any corpus, by line.

Taste note:
- correctness: a grammar change states its blast radius before it lands, as a count and a list
- containment: a consumer corpus is read in place by an explicit path, and only fingerprints and counts are kept here
- philosophy: "no silent readings". A reading that changes is reported, whether the change is a fix or a regression.

## Scope

- In scope:
  - a per-line reading fingerprint (kind, slots in order, arms, line span)
  - a snapshot writer and a check
  - a corpus path argument
  - release specimen readings
  - a receipt line for grammar commits
- Out of scope:
  - comparing two parser revisions in one process (the snapshot is taken before the change instead)
  - judging whether a change is right (the reader decides)
  - copying consumer text into this repo

## Files

[NEW] reading fingerprint beside packages/spw-seed/src/instrumentation/preview.ts
[NEW] a readings verb under packages/spw-cli/src, or a flag on fingerprint.ts (per ?[verb_home])
[MOD] scripts/release/build-parser-release.ts (specimen readings in the manifest)

## Commits

1. ~[line_reading_fingerprint]
2. ~[readings_snapshot]
3. ~[readings_check]
4. ~[corpus_by_path]
5. ~[release_readings]
6. ~[grammar_receipt]

## Dependencies

- brace-slot-reading, plan-stream-parse-health `~[modifier_fragments]` and syntax-hardware-alignment p12 each wait on `~[readings_check]` before they change a reading.
- cli-sense-reorientation `~[query_where_fields]` shares the node-field vocabulary.

## Failure Modes

- Hard: a fingerprint changes when only whitespace or a comment changed, so the check cries wolf.
- Soft: a snapshot of a consumer corpus is taken at one consumer revision and checked at another, so drift mixes the consumer's edits with the grammar's.

## Validation

- Hypothesis: with a snapshot taken at dbd138dd, fixing `medial_stays_on_line` changes exactly the 10 workbench lines the 2026-11-06 census found, and 347 consumer lines.
- Negative control: reformatting a file with `spw format` changes no reading.
- Demo sequence:
  1. Snapshot.
  2. Apply the fix.
  3. Check: lists the lines.
  4. Commit with the receipt.
  5. Cut a release: two releases' specimen readings diff to the same lines.
