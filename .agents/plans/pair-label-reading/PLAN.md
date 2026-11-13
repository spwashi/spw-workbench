# Plan: pair-label-reading

A label written on a brace pair, read from either end of a text, beside the parser. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Pair labels are an old form here that nothing reads. `desugar` has written `A{}` as `{_A }_A` since the first normalizer, form geometry moves labels on and off a pair, and `FrameNode`, `BodyNode` and `ScopeNode` reserve `openLabel` and `closeLabel`. No grammar rule sets them: the parser reads an open label as the body's first member and a label after the close as a loose term. A mounted consumer's notes add that labeled braces may overlap without nesting (`{_A {_B }_A }_B`), which a tree cannot hold.

On 2026-11-12 the owner asked to consider the form again, with a close that mirrors its open (`{_label … lebal_}`) and a reader that scans braces forward and backward.

This plan adds one opt-in pass over the tokens seed already makes. It pairs braces label by label, lets labeled pairs overlap and says where they cross, reads both close spellings, and runs from the start of a text or from its end. `parse()` reads every line as it did. A census says what the reading would cost each corpus before any grammar moves.

What a pair label means is not decided here. Four trial cards hold the readings: the label on a pair, `_` beside `#`, an operator's label as a mark and a name, and a mode that turns a reader on and off inside a file.

Taste note:
- layering: a reading beside the parser, so its cost is a list before it is grammar
- naming: pair label is the repo's noun (form geometry, operational-topography); accumulate and release are the registry's preferred words for what the owner called charge and discharge

## Scope

- In scope: `scanPairLabels` in `experimental/`, both close spellings, both directions, overlap and crossings, an advisory reading for a label on one end, a contract id (`spw.pair-labels/1`), laws over generated text, one catalog id, four trial cards, a census over this repo and two consumers read in place, a journal entry.
- Out of scope: any change to the lexer, to `matchIdentifier` or to matcher order; populating `openLabel` and `closeLabel` in the grammar (operational-topography's `~[populate_pair_labels]`, which this plan feeds); angle capsules, streams and n-ranges; a metasyntax flag or pragma that turns the reading on; a reading that changes how the inside of a brace is lexed; `desugar`'s regexes, which a consumer reports rewriting inside strings and comments; LSP and CLI surfaces; any write to a consumer tree.

## Files

[NEW] packages/spw-seed/src/experimental/pair-labels.ts, pair-labels.test.ts
[MOD] packages/spw-seed/src/experimental/index.ts, packages/spw-seed/src/index.ts (exports)
[MOD] packages/spw-seed/src/experimental/syntax-catalog.ts (one id)
[MOD] .agents/plans/interpretation-trials/interpretation-trials.spw (four cards)
[MOD] .agents/plans/operational-topography/wip.spw (one stream line: what the census says to ?[pair_labels_ast])
[NEW] .spw/caches/journal/2026-11-12-kept-lines.spw
[MOD] .spw/caches/journal/index.spw

Craft guard:
- `pair-labels.ts` holds one reason to change (how a label on a brace pair is read) and stays under 300 lines.

## Commits

1. ^seed[seed,trials,journal] — read the label a brace pair already carries, from either end of a text and beside the parser, and hold what it should mean as trials

## Agentic Hygiene

- Rebase target: `main`
- Hygiene split: none. The tree already holds an uncommitted journal entry and index row from an earlier session (`2026-11-11-site-clusters`); they are not this plan's.

## Dependencies

none

## Failure Modes

- Hard: the pass needs a lexer change to see a label. It did not.
- Soft: a word beside a brace that is not a pair label is counted as one. The story consumer writes `(_in "boon.land")` on five lines; the census lists them as labels on one end.
- Non-negotiable: `parse()` output is unchanged on every surface.

## Validation

- Hypotheses: both directions return the same pairs on any text; a text cut anywhere leaves the same classes waiting on each side; a mirrored close read leftward spells what its open spells rightward; a missing labeled close loses only its own pair.
- Negative controls: a text with no label mark pairs exactly as plain bracket matching does; two different labels never pair; two mutants of the pass fail the tests.
- Demo sequence: scan a nested labeled spell forward and backward; overlap two labels; delete a close and scan again; scan the last two lines alone.

## Spw Artifact

None beyond `wip.spw` and the trial cards.
