# Plan: inquiry-loop

A wonder can close. Its probe runs read-only, the run is kept as a receipt in the claim protocol's `result_ref` shape, and a reader writes the answer. Every wonder reader reports the same lifecycle. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A mounted consumer restated its v0.4 on 2026-10-27 as capability asks. Its first rank is `inquiry.loop/1`: a question carries a probe, the probe runs, and the answer lands on a claim with a receipt.

The consumer already does most of this itself. `scripts/wonder.mjs` harvests the contour, runs the probes its allowlist marks read-only (`--run`), and keeps `result_ref`-shaped receipts in `.spw/gen/wonder-runs.spw`. It also reads nested wonders and dated answers.

The workbench has the parts but no loop:
- `.spw/harness/claim-protocol.spw` already defines `result_ref`.
- The wip schema now carries `~#expect` and `~#unblocks` (dbd138dd).
- The editor's `parseWonderBlock` reads a wonder for a hover.
- Nothing runs a probe, and nothing records a run.

This plan also holds the intake for the consumer's capability asks (`capabilities.spw`), as first-plugin holds the fourteen plugin asks. The consumer can then read one place after each submodule update.

Taste note:
- correctness: a run proposes and a reader decides; the harness never writes a verdict
- containment: a probe runs at effect.l0 or is held, and says which
- expressiveness: serves the consumer's `ask_goal` ("a question carries its own probe, and its answer can land back on a claim with a receipt"; keep: probes that read without writing)

## Scope

- In scope:
  - a lifecycle reading (open, probed, answered, retired) shared by the harvest and the editor
  - a read-only probe runner with an effect boundary
  - receipts in `result_ref` shape
  - `probe` as a stream type
  - the capability intake table
- Out of scope:
  - writing `~#answer` or a verdict automatically
  - running probes that write or drive a browser
  - the consumer's wonder script, which retires on its own side once the harness answers

## Files

[MOD] .spw/harness/claim-protocol.spw
[MOD] .agents/plans/_schema/wip-template.spw (stream types)
[MOD] packages/spw-lsp/src/handlers/wonder.ts (lifecycle and nesting, with vscode-authoring-probe-loop)
[NEW] a wonder verb under packages/spw-cli/src (home per ?[verb_home])

## Commits

1. ~[lifecycle_fixture]
2. ~[lifecycle_reading]
3. ~[probe_stream_type]
4. ~[probe_runner_l0]
5. ~[run_receipts]
6. ~[answer_is_result_ref]

## Dependencies

- The owner answers `?[wonder_is_claim]` before commit 6.
- cli-mode-overhaul's effect ceilings settle how the runner declares l0.

## Failure Modes

- Hard: a probe with a write effect runs.
- Hard: a run moves a claim's status without a reader's verdict.
- Soft: the harvest and the editor count different lifecycles for one wonder.

## Validation

- Hypothesis: on the consumer's corpus, the lifecycle reading matches its `wonder --contour` counts. The consumer's last count was 267 wonders with 5 answered.
- Negative control: a probe outside the allowlist is held and named, never run.
- Demo sequence:
  1. Harvest.
  2. Run the read-only probes.
  3. A receipt per run.
  4. A reader writes `~#answer`, and the wonder reads as answered everywhere.
