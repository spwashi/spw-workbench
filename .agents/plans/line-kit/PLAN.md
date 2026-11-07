# Plan: line-kit

Seed gives every interactive host one kit for a line: read it, query it, edit it, wrap it and describe it. Each edit changes only the bytes it names. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Seed's slot reader (`packages/spw-seed/src/line`, 3f53adf2) reads a line's slots in any order and writes it back byte for byte. One canvas host already reads and rewrites lines through it.

The two hosts' next work asks for more than reading:
- **factshift.center's tools plan** (consumer `.agents/plans/factshift-center/TOOLS.md`):
  - map and filter as a slot query plus a `writeAt` rewrite;
  - a region drag that moves its slot in the line;
  - a drop that adds a part with the body's separator;
  - a selection that rewrites the join between two parts.
- **spw.quest's pivot page** (consumer `workers/spw-quest/src/pivot.js`, 584ac7eb):
  - adds a body part by a chosen link and puts an operator in front of the word;
  - does both by rebuilding the line from the site's older slot reader (`withBodyPart`, `withFrontMark` over `lineFrom` and `layoutOf`). That reader drops `home` from `<person>home`, ignores nesting in a body, and joins only spaced marks.
- **spw.quest's shelf:**
  - wraps a painted line with a regex (`breakable()` in `src/specimens.js`) and hangs plan lines from their `#>` frame;
  - proposes a level slider (novice, learning, fluent, expert) with nothing yet to compute a level from.

This plan puts each of these in seed once, with laws, so every host does it the same way.

## Design: one reading, many uses

The owner's guidance (2026-11-06): aim for cohesive design and resilient architecture.

- **One reader.** `readLine` is the only reader. A query, an edit, a wrap point, a feature and a renamed view are each a function of a `SlotReading` and the source it holds. Nothing re-reads text its own way.
- **A query is a line.** `readLine` reads a query like any line, and `matchReading(query, reading)` compares them slot by slot:
  - `{seed}`, `<receipt>`, `(atlas)` and `[pi*]` are lead slots of a line with no word;
  - `medium[*]` is a word and a mode.

  So a query and a line can never be read two ways. This is the owner's leaning ("probably"), reversible until `slot_query` lands.
- **Any pair may lead.** The reader takes `[mode]home` and `{body}home` as it takes `(atlas)home` and `<person>home` (owner, 2026-11-06). A slot moved before the word is a lead slot, and its written order is kept.
- **Versioned contracts.** Each product names its contract: `line.reading/1`, `line.query/1`, `line.features/1`, `line.breaks/1`. A host can check what it holds, and a change of shape is a new version.
- **Total and lawful.**
  - Every function takes any string and returns; what it cannot read goes to `rest`.
  - The laws run over the fixture table and over generated lines: any slot order, nesting, separators, joins, quotes, and unclosed pairs.
  - The laws are write-back identity, one-span edits, rest kept, and a query matching the line it was read from.
- **No host names in seed.** A host passes its own slot names to `viewReading`. The consumer's column leaves `SLOT_NAMES`.
- **Digestible features.** `line.features/1` is plain data, made to be read without knowing seed:
  - stable keys and plain-word names;
  - a few words from `describeFeatures`;
  - the features as a Spw line of their own.

  Seed names no level; a host weighs its own.
- **Types from the build.** Hosts type the kit from types cut with the build (parser-releases `typed_variants`), never from a hand-copied file.

Taste note:
- correctness: every edit is a splice at the spans the reading already holds, and the laws run over the same fixture table as the reader
- containment: the kit is a text kit; the parser's agreement stays in brace-slot-reading, and `<&>` and other readings still on trial stay out
- expressiveness: serves the consumer's slot_goal, join_goal and compare_goal, and the interactive direction the owner set on 2026-11-06

## Scope

- In scope:
  - slot edits;
  - a slot query;
  - wrap points and a frame hang;
  - line features;
  - a view of a reading under a consumer's slot names;
  - exporting all of it in the reader build.
- Out of scope:
  - the hosts' own UI;
  - deciding join spacing, typed holes, or what `|` means (interpretation-trials);
  - a level formula (hosts weigh the features).

## Files

[MOD] packages/spw-seed/src/line/read.ts, fixtures.ts (any pair leads)
[NEW] packages/spw-seed/src/line/laws.test.ts (generated lines)
[NEW] packages/spw-seed/src/line/edit.ts (+ edit.test.ts)
[NEW] packages/spw-seed/src/line/query.ts (+ query.test.ts)
[NEW] packages/spw-seed/src/line/breaks.ts (+ breaks.test.ts)
[NEW] packages/spw-seed/src/line/features.ts (+ features.test.ts)
[NEW] packages/spw-seed/src/line/view.ts (+ view.test.ts)
[NEW] the line.* contracts, beside lib/spw-v0.3.0/surfaces/PLUGIN-PROTOCOL.md
[MOD] packages/spw-seed/src/line/index.ts, packages/spw-seed/src/index.ts, packages/spw-seed/src/reader.ts, packages/spw-lsp/src/reader.ts
[MOD] packages/spw-lsp/src/reader.ts highlightHtml (a breaks option), with editor-reading-hierarchy

## Commits

1. ~[any_pair_leads]
2. ~[kit_laws]
3. ~[slot_edits]
4. ~[slot_query]
5. ~[wrap_points]
6. ~[line_features]
7. ~[slot_record_view]
8. ~[kit_contracts]
9. ~[kit_in_reader]

## Dependencies

- `?[query_match]` before `slot_query`.
- `?[features_shape]` before `line_features`.
- parser-releases `~[typed_variants]` lets hosts type the kit from the build instead of by hand.

## Failure Modes

- Hard: an edit changes a byte outside the span it names.
- Hard: a query matches differently in two hosts because one host kept its own parser.
- Hard: a generated line makes a function throw, or loses a byte through write-back.
- Soft: hosts each weigh line features into a different level and call it the same; the plain-word description is the shared reading.

## Validation

- Hypothesis: spw.quest's `withBodyPart` and `withFrontMark`, and factshift.center's G2–G4 slices, each become one kit call. No host keeps a slot writer of its own.
- Negative control: every reader fixture comes back byte for byte through every edit applied with no change.
