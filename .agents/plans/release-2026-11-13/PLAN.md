# Plan: release-2026-11-13

The evening's dated parser release, `2026.11.13`, built around what a story consumer asked of the workbench today: braces a listener can hear and tune. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Why this release

Both mounted consumers pin the workbench at `9ef3d223`, six commits behind. Since then the workbench has gained pair labels, the spoken form, brace clicks, and two reader fixes (`@(topic)` hover, the `.day[x]` dot). Two prereleases exist (`2026.11.13-pre.1`, `pre.2`); no day has been cut.

At 11:17 today a story consumer committed a direction cache for workbench agents (`.spw/caches/workbench-direction.spw`). Its `audio_and_accessibility` frame asks for:
- distinct, configurable earcons for container open and close across `[] {} () <>`;
- a body aura while focus dwells inside a container;
- pitch, stereo, timbre and verbosity as user profiles rather than constants.

Its first open question is: "Which minimal audio-map schema lets a blind programmer retune bracket open, body aura, and exit cues in under three lines of Spw?" Its next slices name its own hard-coded tables (`SIGIL_BEATS`, `CONTAINER_BEATS`, `TIMBRES` in spw-cadence) and editor brace-entry feedback.

`pairSound` already answers half of that, but its settings are a TypeScript object, which is not three lines of Spw. That gap is tonight's release.

## Slices, in order

1. **Earcons written in Spw** (`readEarcons`, seed experimental, `spw.earcons/1`). One line of Spw tunes the brace sound, for example `^earcons{ .body[392] .frame[523] .scene[659] .step[2] .decay[5] .rough[off] }`.
   - Read with the slot reader. Every number is held to a range.
   - A word it does not know is reported, never silently dropped.
   - `PAIR_SOUND` becomes the earcon a line with no words reads as.
   - Tests: every default round-trips, out-of-range values are clamped and reported, and unknown words are listed.
2. **Enter, dwell, exit** (`pairMoves(scan, from, to)`). Given a caret moving from one offset to another, it lists the pairs left (inner first) and entered (outer first), each with its click.
   - It is what an editor or a spell's focus handler calls to play an exit and an enter.
   - Dwell is the innermost pair around the caret, which `pairLabelsAround` already gives.
   - Tests: a move within a pair is silent, a move across crossed labeled pairs lists each once, and the move back reverses the lists.
3. **Browser bundle and contract.** Export both from the reader slice and from `packages/spw-lsp/src/reader.ts`, with one case in `build-parser-release.test.ts`. Add one line each to `parser-release.md`.
4. **Changelog.** Add a dated `2026-11-13` section to `CHANGELOG.md` for consumers:
   - pair labels;
   - the spoken form and brace sound, with earcons and moves;
   - the caret fix inside a scope;
   - the dot fix, with how many lines it moves per corpus;
   - what the reader bundle now exports;
   - what is experimental and that none of it has been heard.
5. **Steady the suite.** `spw quest`'s whole-walk test missed its 5 s limit once under a full run. Give it the limit its siblings use, so a release run is not decided by load.
6. **Cut.** Commit through the gate, then cut `--release 2026.11.13` from a clean detached worktree at that commit. A release day is cut once, so this is the owner's go.
7. **Handoff.** A journal entry and a consumer note (by role) on what to change to pick it up:
   - bump the submodule pin;
   - add `spokenLine`, `pairSound`, `readEarcons` and `pairMoves` to the story consumer's bundle `EXPORTS`, which today holds only `parse` and `readBias`;
   - or import `reader.min.js` from the release.

   The workbench writes nothing into either consumer.

## Added after measuring (2026-11-13 12:56)

Slices 1 to 5 landed in `96ff771c` and `61ac9bb6`. The clicks were then measured as samples (figures in [spoken-form's stream](../spoken-form/wip.spw), 12:54). Three more slices sit before the cut. Each keeps `^ear{}` and `PAIR_SOUND` rendering the same samples and moves no contract id.

8. **Sound measures** (tests only). A test file beside `pair-sound.ts` measures rendered clicks: the share of energy between two frequencies, RMS in dB, and the distance between two power spectra. It holds three laws that are true today and prints the figures the changelog quotes.
9. **Limits said** (words only). The changelog's `2026-11-13` section and `parser-release.md` state where the samples fall short:
   - a frame at depth d and a scene at depth d + 2 are one click;
   - 6 of 21 bare clicks hold under half their energy above 300 Hz;
   - a labeled click sits up to 7.8 dB below a bare one;
   - a close has no onset;
   - samples are the same within one engine and untested across two.
10. **Host words kept.** `readEarcons` returns each word it does not know with its mark and value, so a host reads its own textures (`=wap[pillow]`, `%width[0.3]`) from the same line in one pass. Each is still reported as unknown.

Whether the day is cut with those limits said, or held until two of them are fixed, is the owner's (`?[day_with_limits]`).

## Out of scope tonight

- Any change to the samples `PAIR_SOUND` renders: kinds kept apart, level by RMS, overtones on a bare pair, a struck close, a label as a phrase, an echo for span, a listener's own band. Each is a slice of spoken-form.

- Earcons in the VS Code, IntelliJ or Neovim extensions. The consumer's `workbench-sync` slice comes after a schema exists.
- A dwell aura as sound: only the event is provided, and how it sounds is the host's.
- Stereo and head-shadow shaping, which is the consumer's pie-sound work.
- `< >` clicks, since the pair scan still skips capsules.
- Any grammar change, and the open trial cards.

## Checks before the cut

Seed, LSP, CLI, runtime, DOM, parser release, `tsc`, plan check, plan index check and poll-review, all clean. Import the cut `reader.min.js` and call each new function once.

## Commits

1. `^seed[seed,release,docs]` — tune the brace sound in one line of Spw, and say which pairs a caret leaves and enters
2. `.[changelog,plans,journal]` — say what 2026.11.13 holds for a host that picks it up

Landed as `96ff771c` (both, in one commit) and `61ac9bb6` (the ear line's marks). Planned next:

3. `![seed]` — measure rendered clicks and hold the laws that are true today
4. `.[changelog,docs]` — say what the samples measure and where they fall short
5. `^seed[seed,release]` — give a host the ear words this reader does not know, with their marks and values
