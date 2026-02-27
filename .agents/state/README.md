# Agent Runtime State

This folder hosts versioned `.spw` conventions plus local runtime snapshots.

- `register-conventions.spw`: tracked schema and operating conventions.
- `runtime/`: local cache surface written by skill scripts (ignored by git).

Current runtime writers:

- `poll-review.sh` writes `.agents/state/runtime/poll-review.state.spw`
- `poll-review.sh` updates `.agents/state/runtime/register-bus.state.spw`
- Skill scripts using `scripts/spw-lib.sh` write `<skill-id>.state.spw` and refresh the shared bus.
- Bounded history cache: `.agents/state/runtime/poll-review.history.tsv`
- Bus entries include normalized summaries for single-file consumers, including `nearby_refs`.
- File refs use local Spw path refs: `~"relative/path/from/state-file"`.
- `nearby_spw` is populated dynamically from scanned scope roots, with changed-file adjacency prioritized.
- Resilient write flow defaults to `fast` validation for performance; `--state-validate strict` is available for parser-level guarantees.

Design goals:

- Serialization: stable schema tag + atomic writes.
- Interpretability: human-readable top blocks and explicit status values.
- Portability: UTC timestamps and relative paths only.
- Hot reloading: `hot_reload_token` updates every write.
