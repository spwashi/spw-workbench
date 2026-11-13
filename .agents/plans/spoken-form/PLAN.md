# Plan: spoken-form

A line said in the names of its parts, and a click for every brace, both from the browser reader. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A screen reader at its default punctuation says `~garden[care]{seed, water}` as "garden care seed water". The mark, the slots and the join are gone, and a close brace forty lines below its open says nothing about what it closes. A site consumer's caches already ask for a "spoken twin" made only of operator and slot names, and found that its canvas names a node by the raw line.

On 2026-11-12 the owner asked to consider Spw serialization into describable forms for blind people, and then, while the work ran: a click on an open and a close brace with a timbre that changes with the label; a start and stop phrase a listener grows familiar with; a container's permeability as a design dimension; a story consumer's sound library as a source; and game state written as Spw that a board summarizer could recognize.

This plan adds two readers to seed's experimental folder and to the browser reader bundle, and fixes two losses found on the way.

- `spokenLine` says one line as clauses, each with the span it says, and as one string: the mark by its reader name, each slot by its name, the join by its name, a nested body closed aloud, a pair label said as the body's name on both ends. The words come from tables a host may replace.
- `pairSound` turns a pair-label scan into a click per brace. The kind sets the pitch, depth lowers it, the label sets the timbre, a close is its open backward, an edge with no partner carries a rough tone, and a stretch is bounded by a phrase and the same phrase backward. `renderClick` and `renderPairSound` give samples; no audio interface is touched.

What a line should be said as, and whether a sound on a brace is a reading or a decoration, are not decided here. Trial cards hold the readings. Nothing in this plan was heard by anyone.

Taste note:
- layering: both readers stand on readers that exist (the slot reader, the pair-label scan) and add no grammar
- naming: spoken is the site consumer's word (spoken twin) and the emit codec's; no new noun for a shape already met, which the likeness rungs name

## Scope

- In scope: `spokenLine`, `unsaid`, the name tables; `pairSound`, `labelTimbre`, the renderers and `wavBytes`; both in the browser reader slice and the release contract test; a script that writes a WAV file to listen to; a census of how three corpora are said, how far closes sit from opens, and how often a shape was already met; five trial cards and a seen line on a sixth.
- Fixed on the way: the caret lookup never walked an expression's `scope` or `capsule`, so the editor's form context found nothing inside `@(topic)` (one LSP test had been red since same-line postfix containers landed); the slot reader took the dot of `.day[x] .chapter[y]` for a tight join and dropped the mark.
- Out of scope: a surface said as a tree (rows with level and position for a tree widget), which wants the parse columns; a shape said once and then only its words; sound samples shipped in this repo; any change to the parser; a CLI verb.

## Files

[NEW] packages/spw-seed/src/experimental/spoken.ts, spoken.test.ts
[NEW] packages/spw-seed/src/experimental/pair-sound.ts, pair-sound.test.ts
[NEW] packages/spw-seed/src/canonical/geometry-inspect-position.test.ts
[NEW] scripts/sound/pair-sound.ts
[MOD] packages/spw-seed/src/canonical/geometry-inspect-position.ts, geometry-resolver.ts
[MOD] packages/spw-seed/src/line/read.ts, fixtures.ts
[MOD] packages/spw-seed/src/experimental/index.ts, packages/spw-seed/src/index.ts, packages/spw-seed/src/reader.ts, packages/spw-lsp/src/reader.ts
[MOD] scripts/release/build-parser-release.test.ts, docs/runtime/md/parser-release.md, package.json
[MOD] .agents/plans/interpretation-trials/interpretation-trials.spw
[NEW] .spw/caches/journal/2026-11-13-said-and-sounded.spw
[MOD] .spw/caches/journal/index.spw

Craft guard:
- `spoken.ts` has one reason to change (how a line is said) and `pair-sound.ts` one (how a brace sounds); both stay under 600 lines.

## Commits

1. ^seed[seed,lsp,release,trials,journal] — say a line in the names of its parts, give every brace a click whose timbre follows its label, and let a caret find the word inside a scope
