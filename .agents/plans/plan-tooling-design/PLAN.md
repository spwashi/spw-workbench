# Plan: plan-tooling-design

Turn the derivable plan-upkeep moves into verbs, and make the pulse and mem probes report enough to trust. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A landing should cost one command, not a hand edit across four frames.
After a bulk pass over plan files the maintainer should be able to see why a verdict is invalid, compare a baseline, and restore what the pass edited.
Slices that belong to an existing plan are routed to it by edge rather than restated here.

Taste note:
- clarity / containment: a probe names its cause; a mutation shows its delta before it writes.

## Findings from dogfooding (checked against code or by running the tool in this pass)

- pulse refuses a path outside the consumer root: `spw:pulse -- <path outside repo>` returns `Path is outside the consumer root`. A HEAD baseline therefore needs a copy inside the repo. (verified)
- pulse parity gap: a file report carries `beforeHealth`, `afterHealth` and `plannedDelta.parseHealthBefore/After`; the `--stdin` report carries `delta` with only `healthRegressed`, `structureMoved`, `layoutOnlyCandidate`. (verified by running both)
- An invalid verdict comes from `snapshotTopography` as a list of reason strings (`parser_failure`, `non_recoverable_error`, `unterminated_lexeme`, ...); no span is reported. The parser already returns events with a position, so the data exists. (code read; the span claim for the CLI output is a question for runtime-dx-foundation)
- `spw mem dump` snapshots the runtime memory dir, and `--include-extra` adds a fixed list of three ledger files (`EXTRA_MEMORY_FILES` in mem.ts). It cannot take caller-chosen surfaces. There is no `mem.test.ts` beside `mem.ts`. (code read)
- Pulse profile outcomes on plan files (layout_canonical 0 of 70 change, equiv_scripts 42 change with no regressions, layout_full all 70 with 3 health regressions) are the user's session measurements; not re-run in this pass.
- Derived plan fields are maintained by hand: `plan:stream` updates `last_stream` only when it appends; `open_count`, the done moves and `base_ref` have no verb. `plan:check` reports `open_count_drift`, `last_stream_drift` and `stale_base_ref` without a fix line (`agent_plan_collect_issues`, `agent_plan_check_base_ref` in agent-lib.sh). (code read)
- `detectReviewProfile` already assigns `plan_surface` to `.agents/plans/` paths, so a profile guard has an existing hook. (code read)

## Changes ordered by value

1. `plan:settle` (owned here, `settle_fixture` and `settle_verb`). First slice: `--resolve <label> --answer <text> --evidence <ref>` moves a question line into done as `~#resolved(label)` and recomputes `open_count`; `--ship N --hash <sha>` moves a commit and leaves the pointer comment. Plan-only delta by default.
2. `plan:check` fix lines (`check_fix_hints`). First slice: each drift issue prints the command that clears it; stale_base_ref prints the merge-base candidate.
3. Invalid cause and span in pulse (routed to runtime-dx-foundation).
4. Pulse report parity between stdin and file (routed to curiosity-mutation-ergonomics).
5. `mem dump` caller-chosen roots (`mem_dump_roots`). First slice: repeatable root paths under the dump extra folder.
6. `plan:stream` dry-run reports parse-health effect (`stream_dry_run_health`). Its needs were dropped in 866826ff, when plan-stream-parse-health made stream entries read the same in every dialect, so an unquoted line needs no validator.
7. Profile guard and baseline ref (routed; decisions are open questions here).

## Scope

- In scope: the owned commits above, edges to the routed plans.
- Out of scope: editing the routed plans, changing pulse profiles, rewriting stream lines.

## Files

[MOD] .agents/scripts/agent-lib.sh, .agents/scripts/test-agent-tools.sh
[MOD] packages/spw-cli/src/mem.ts
[NEW] scripts/plans/plan-settle.ts (or a mutate profile, per ?[settle_home]) and its fixtures
[DEL] (none)

Craft guard:
- agent-lib.sh is large bash; settle belongs in TypeScript beside plan-index.ts so the done-move logic is testable.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before `settle_fixture`, before merge
- Hygiene split: none

## Dependencies

`stream_writer` followed plan-stream-parse-health `entry_line_all_dialects`, which landed in 866826ff; `stream_dry_run_health` no longer waits on it. Routed slices depend on curiosity-mutation-ergonomics and runtime-dx-foundation, both currently dormant; this plan does not reheat them.

## Failure Modes

- Hard: settle drops a question or edits the stream; mem load overwrites a live surface unasked.
- Soft: a commit cannot be matched to a hash; check hints go stale.
- Non-negotiable: stream append-only; `open_count` equals live question lines after any write.

## Validation

- Hypotheses and controls: see wip.spw.
- Demo sequence: settle plan-only on a copy, read the delta, write, run `plan:check` and `plan:index -- --check`.

## Spw Artifact

None beyond `wip.spw`.
