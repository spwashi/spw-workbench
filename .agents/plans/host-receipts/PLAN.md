# Plan: host-receipts

A parser or tooling change is worth what it changes where Spw is read. Four hosts read it today: spw.quest, factshift.center, and two mounted consumers (a site and a story site). Each change lands with a receipt for each host. The receipt counts what reads, what now reads differently, and where the hosts' readers part, and it shows a before and after that a person can inspect in an editor or on a docs page. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

The owner, 2026-11-08: improvements to the parser and tooling should be measured by what they mean on the hosts that read Spw. Plugin and documentation changes are the most inspectable surface for those diffs, because their interaction semantics, how learnable they are, and how people want to extend them can all be researched directly.

Today a change is verified only inside this repo. The 2026-11-08 probe (main@3d3181b4, seed prose profile) shows how much that misses:

| corpus | surfaces | read as prose | lint says |
|---|---|---|---|
| story consumer `.spw` | 59 | 22 (37%) | 0 errors |
| site consumer `.spw` (gen excluded) | 447 | 18 (4%) | — |
| site consumer plans | 388 | 4 | — |
| factshift.center | 18 | 0 | — |
| workbench `.spw` | 762 | 5 | 0 findings |
| workbench plans | 286 | 14 (12 in archived seed excerpts) | 0 findings |

The story consumer's own diagnosis blamed each frame's opening line, because the warning points at the frame it fell back from. Tested in isolation, the causes are:
- typographic punctuation in bare prose (10 surfaces);
- valence words in key position (6);
- `?"name"[`, `#"name"[` or `?<name>[` followed by a line break (6).

The site consumer adds two more causes: a bare `+` in a value, and a backtick phrase cut short by an inner backtick. Its pin is one commit behind main; the story consumer's is 128 behind, on an archived branch.

The readers also disagree. The site's 2026-11-07 plane reports find three readers parting on the dot, on `< >`, on three operator names, and on which sigil marks each land. The story consumer counts six browser readers that share no syntax tree, plus a vendored seed bundle.

## Scope

- In scope:
  - a specimen set per host (minimal forms written fresh, no consumer prose);
  - a degradation census over any corpus named by path, with stop position and cause class;
  - one receipt per change, per host: surfaces degraded before and after, lines whose reading changed, and reader agreement on the specimens;
  - an editor diff: semantic tokens, diagnostics and hover for each changed specimen, before and after, on one page;
  - a docs diff: examples whose reading changed, with their prose checked against the new reading;
  - the receipt cited in the commit episode.
- Out of scope:
  - writing into a consumer tree;
  - ranking hosts against each other;
  - a hosted dashboard.

## Files

[NEW] .spw/exchange/specimens.spw (per-host specimen sets; beside ask-exchange's intake)
[NEW] a receipt verb or flag under packages/spw-cli/src (home per ?[receipt_home])
[MOD] packages/spw-cli/src lint (corpus census, with plan-stream-parse-health degradation_lint)
[MOD] packages/spw-lsp (an inspectable before/after render of specimens)
[MOD] docs example harvest (docs diff)

## Commits

1. ~[host_specimens]
2. ~[degradation_census]
3. ~[receipt_check]
4. ~[editor_diff]
5. ~[docs_diff]
6. ~[receipt_in_episode]

## Dependencies

- plan-stream-parse-health `degradation_stop_position` before commit 2, so causes are attributed to the token that stopped the parse rather than to the frame opener.
- reading-drift `line_reading_fingerprint` and `corpus_by_path` before commit 3; the receipt reuses them, not a second fingerprint.
- interpretation-trials `trial_bench` supplies reader agreement; the receipt reads its output.
- editor-reading-hierarchy `degradation_diagnostic` before commit 4.

## Failure Modes

- Hard: a receipt names a consumer, or copies consumer prose into this repo.
- Hard: a receipt that is green while a host's corpus degrades, the same failure lint has today.
- Soft: four receipts that no one reads; each receipt row must answer a question a host has asked.

## Validation

- Hypothesis: the three story-consumer fixes (valence keys, typography in bare prose, quoted-name bracket) take its count from 22 to 0 and change no reading on factshift.center or spw.quest specimens.
- Negative control: a commit that touches no grammar shows an empty receipt on every host.
- Demo sequence:
  1. Receipt on main: the baseline table above.
  2. Land one fix.
  3. Receipt: one row falls, the editor diff shows the shaded region gone, the docs diff is empty.
