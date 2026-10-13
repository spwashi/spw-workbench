# Plan: plan-stream-parse-health

Make parse health on plan files measure structure instead of stream prose. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

`>>[YYYY-MM-DD HH:MM] type — prose` lines in `^["stream"]` should never count as syntax errors, and a plan file's parse health should not depend on whether the caller passed the file path.
The lexer already owns the rest of such a line (`readPlanStreamEntry`, landed in c855e832 behind the `planStream` metasyntax flag of dialect `Spw.p`), and `parse(source, { path })` on a `.agents/plans/*/wip.spw` file resolves to `Spw.p`.
The gap is upstream of the lexer: `snapshotTopography(source)` in `topography-probe.ts` calls `parse(source)` with no path, so a plan without an `@dialect:Spw.p` pragma is read as `Spw.b`, where hyphens, em dashes, apostrophes and unbalanced quotes tokenize as errors.

Re-evaluated 2026-10-12 at the creator's prompt: stream lines also appear in 13 `.spw` files outside plans (saga templates with ordinal stamps, prompt logs, a docs example), and there they misparse (`sense-loop.spw` 6 errors, `portrait.prompt.spw` 3). The boundary that protects other constructs is the line, not the file: a line-start `>>[` entry reads the same in every dialect, and every other token stays byte-identical. The earlier hard failure, "alters the tokens of a non-plan file", guarded the plan-only fix and is narrowed to that line.

Landed 866826ff (option g, with the reading in `docs/theory/spw/line-items.spw`): entries read in every dialect and their bodies are prose with figures. Over 1361 files every token outside entry lines is unchanged, errors fell from 2043 to 441, and every file counts the same errors with and without its path, so H5 holds and options (d), (e) and (f) are dropped. Next: figure nodes in the AST (`entry_figure_nodes`), then `..` items (`dotdot_prose_recovery`).

Taste note:
- correctness / naming: a health verdict is a measurement; it must not change with the caller's lens.

## Evidence (re-measured in this planning pass, working tree at main@551bb419 plus the session edits)

- Throwaway probe over the 78 pre-existing `wip.spw` files: `snapshotTopography` gives 6 complete_structured, 46 recovered, 26 invalid. (The user's earlier figure over the 70 edited files was 6 / 44 / 20; the 78-file universe differs, so compare like with like.)
- `parse(source)` reports dialect `Spw.b` for every file except the six with an `@dialect:Spw.p` pragma; `parse(source, { path })` reports `Spw.p` for all 78.
- With the path, 75 of 78 files have 0 errors. The residual three have 45, 51 and 29: audit-fuzz-truthfulness, register-phase-evolution, typescript-toolchain-observatory. Their first errors are on lines spelled `>> [2026-...]` with a space, which `readPlanStreamEntry` does not match (it requires `>>[`).
- Every `invalid` verdict in the pathless run carries the reason `unterminated_lexeme`; every `recovered` carries `recoverable_errors` (two also `prose_fallback`).
- Writer: `agent_plan_stream_build_line` in `.agents/scripts/agent-lib.sh` emits ` >>[stamp] type — msg` unquoted. Under `Spw.p` that is correct, so quoting in the writer is not needed.
- Call sites that parse without a path: `pulse.ts` (stdin plan around line 1245, file plan around lines 1523-1524), `form-geometry.ts` (around line 757), `topography-probe.ts` (around lines 403-410).

## Option space

- (a) Lexer rule for `>>[` as one entry token with prose payload: already exists. Remaining slice is only the `>> [` spelling.
- (b) Quote in the writer: unnecessary under `Spw.p`, and it would split the stream into two spellings. Rejected unless the lens cannot be fixed.
- (c) Both: dropped with (b).
- (d) Thread path and dialect into `snapshotTopography` and its callers: smallest change, fixes pulse on files, does not help stdin or LSP buffers.
- (e) Content detection in `detectDialect`: a plan-stream signature selects `Spw.p` with no path. Fixes stdin and LSP, but risks misfiring on docs that quote an entry.
- (f) Stamp `@dialect:Spw.p` in the wip template and scaffold: fixes new plans with no code, does not fix existing ones without a migration that touches 70+ files.
- (g) Lex line-start `>>[` entries in every dialect: fixes plans with no path and the 13 files outside plans; the guard moves from non-plan files to non-entry lines. Commit refs stay plan-only.

Recommended order (revised): (g) first, behind a census fixture; then (d) and (e) only if H5 leaves errors on commit refs; the `>> [` tolerance on evidence; (f) for new plans if still useful.

## Scope

- In scope: line-start `>>[` entries in every dialect with a census fixture, a theory note and an `=exp` registration; conditionally topography-probe options, pulse and form-geometry call sites, dialect detection, `>> [` lexing and the template pragma; the health tally.
- Out of scope: any change to how constructs outside a line-start `>>[` are lexed; rewriting existing stream lines; changing the health taxonomy (complete_structured / recovered / invalid).

## Files

[MOD] packages/spw-seed/src/lexer/tokenize.ts (the planStream gate around readPlanStreamEntry)
[MOD] packages/spw-seed/src/experimental/syntax-catalog.ts (stream.entry_line)
[NEW] docs/theory/spw/stream-lines.spw
[NEW] a census fixture over the stream lines outside plans
[MOD] packages/spw-seed/src/canonical/topography-probe.ts (conditional)
[MOD] packages/spw-cli/src/pulse.ts (call sites only; the file is already over the 600-line guard, so no new logic goes there)
[MOD] packages/spw-seed/src/canonical/form-geometry.ts (call sites only)
[MOD] packages/spw-seed/src/dialect/detect.ts (conditional, `detect_plan_stream`)
[MOD] packages/spw-seed/src/lexer/stream-entry.ts (was plan-stream.ts; conditional, `spaced_entry_tolerance`)
[MOD] .agents/plans/_schema/wip-template.spw, .agents/scripts/agent-lib.sh (conditional, `template_dialect_pragma`)
[NEW] a topography-probe test file for the fixture
[DEL] (none)

Craft guard:
- pulse.ts is 1800+ lines; the diff there must be two or three argument additions.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

Each commit has a failing-then-passing check: the fixture of `hostile_prose_fixture` fails on the unchanged lexer until `entry_line_all_dialects`; `stream_line_census` records today's tokens and errors and then holds every non-entry token fixed; `thread_path_callsites` fails the stability fixture until the call sites pass the path; `detect_plan_stream` fails a stdin-without-path fixture; `spaced_entry_tolerance` fails a spaced-entry fixture; `template_dialect_pragma` fails a template round-trip case.

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before `hostile_prose_fixture`, before merge
- Hygiene split: none

## Dependencies

none. Feeds plan-tooling-design (pulse report parity, plan:stream validator) and shares the dialect stack with syntax-profile-stack.

## Failure Modes

- Hard: a lexer change alters the tokens of any line that is not a line-start `>>[` entry, in any dialect; masked real brace errors.
- Soft: content detection misfires on a doc quoting an entry; three files stay recovered until `spaced_entry_tolerance`.
- Non-negotiable: existing plan-stream.test.ts cases unchanged; stream lines are append-only; health stays count-sensitive and is not read as a validity verdict.

## Validation

- Hypotheses: H1, H2, H3 in wip.spw.
- Negative controls: token equality on every line outside a line-start `>>[` entry, in every `.spw` file and dialect, before and after `entry_line_all_dialects`.
- Demo sequence: append a hostile stream line with plan:stream, tally health, see no change for that file.
- Metric: `npm run -s spw:pulse -- .agents/plans/*/wip.spw --json`, then count `reports[].beforeHealth` by value. Baseline (probe over 78 pre-existing files): 6 / 46 / 26 for complete_structured / recovered / invalid. Expected after `thread_path_callsites`: the 75 path-clean files stop depending on prose; after `spaced_entry_tolerance`: all 78 have 0 stream-line errors. Whether a file reaches complete_structured also depends on its non-stream content, which is not promised here.

## Spw Artifact

None beyond `wip.spw`.
