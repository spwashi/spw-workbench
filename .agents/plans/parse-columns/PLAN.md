# Plan: parse-columns

The parse tree as columns of plain data, what each subtree is alike in, and the shapes a corpus repeats. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A second renderer (a canvas, a worker, a shader) can read a Spw surface without the parser. The parse columns are the same tree the parser returns, laid out as one row per node in typed columns: kind, glyph, parent, depth, subtree size, source span, word and word span. They also carry the kind table, the parse receipt and a band schedule (rows deepest first, one band per depth), so a bottom-up pass runs one band at a time and every row in a band is independent.

Likeness says what a subtree is the same as, at a rung of a ladder (rung, since a grain is what a step moves by in wonder_trial_grain). Content keeps everything, shape erases words, the skeleton (nest-path) keeps only containers, and the census (the fingerprint) keeps only counts. The two finest rungs are computed per subtree as passes over the columns. Rhymes are subtrees alike in shape and not in content: a template with holes and the words that filled them, or a refrain when the content repeats too. `spw form --columns` and `spw form --rhymes` read them.

Reading the plans as rhymes showed the parser dropping what separates a `[ ]` frame's items and any trailing separator. The parser now keeps both, additively.

No new noun: the probe was first a frame, then a plate, and the owner chose to name it by what it is in the IR spine. Frame stays the `[ ]` container's name and mark the `#` mark's. The written-structure column is a glyph, as in nest-path.

Taste note:
- layering / derivation: one dense reader that existing counts can derive from; one hash home; hashes nominate, equality decides

## Scope

- In scope: `parseColumns`, `columnsOfAst`, `reduceUp`, `childRows`, JSON round trip, `likeness` (content, shape), `findRhymes`, `spw form --columns` and `--rhymes` (`--min`, `--limit`, `--sigil`), and frame and sequence separators kept by the parser.
- Out of scope: a WGSL kernel, a renderer, a parse cache, deriving the fingerprint and geometry bytecode from the columns (next), reporting rhymes inside holes (templates of templates), where a scope written after an operation's frame attaches (wonder_trial_attachment), how a digit-led hash lexes (wonder_trial_hash_format), and moving the columns out of `experimental/`.

## Files

[NEW] packages/spw-seed/src/experimental/parse-columns.ts, parse-columns.test.ts
[NEW] packages/spw-seed/src/experimental/likeness.ts
[NEW] packages/spw-seed/src/experimental/rhymes.ts, rhymes.test.ts
[NEW] packages/spw-cli/src/form-columns.ts, form-columns.test.ts
[NEW] .spw/caches/journal/2026-11-11-columns-likeness-rhymes.spw
[MOD] packages/spw-seed/src/combinators/transform.ts, combinators/index.ts (`sepByOptionalKept`)
[MOD] packages/spw-seed/src/grammar/containers.ts, grammar/expressions.ts, types/ast/nodes.ts (frame separators, trailing)
[MOD] packages/spw-seed/src/grammar/separators.test.ts
[MOD] packages/spw-seed/src/experimental/index.ts, packages/spw-seed/src/index.ts (exports)
[MOD] packages/spw-cli/src/geometry.ts (`--columns`, `--rhymes`), packages/spw-cli/src/commands.ts (form summary)
[MOD] docs/runtime/spw/cli-command-surface.spw (form primary)
[MOD] .agents/plans/interpretation-trials/interpretation-trials.spw (wonder_trial_columns, wonder_trial_rhyme; sightings on attachment and hash format)
[MOD] .spw/caches/journal/index.spw

## Commits

1. ^seed[seed,cli] — lay the parse tree out as columns a second renderer can read, say what each subtree is alike in, keep the separators a [ ] frame writes, and hear the shapes a corpus repeats

## Agentic Hygiene

- Rebase target: `main`
- Hygiene split: none

## Dependencies

none

## Validation

- Hypotheses: every parse-whole surface lays out with rows equal to its fingerprint total and a kind census equal to its fingerprint, child spans inside their parents, siblings in source order, and the same bytes twice.
- Negative controls: renaming words keeps a shape, respacing keeps a content, and a changed connector or separator changes a shape.
- Demo sequence: `spw form <file> --columns`, then `spw form .agents/plans --rhymes --min 12 --max-files 400`, then `spw form .agents/plans/interpretation-trials --rhymes --sigil ?`.
