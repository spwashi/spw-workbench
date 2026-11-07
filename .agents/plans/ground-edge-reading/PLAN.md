# Plan: ground-edge-reading

Two forms that are not revisions of each other are read in three parts: the ground they share, the first slot where they part, and what each holds alone. A template with a slot can be filled back. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A mounted consumer calls this reading the language's core question: "where do two understandings stop sharing ground, and what would help them share more?" The consumer already runs the reading on its route trees (`npm run spw:routes -- --diff`), and its quest host compares two specimens slot by slot.

The workbench has `spw delta`, but that is a revision reading. On two sibling surfaces, delta counts the name each one carries as edits. For example, `spw delta bane.land.spw boon.land.spw` reports 52 lexical ops, while the consumer's reading finds one edge, at the name. Nothing in the CLI reads two surfaces by slot.

The consumer filed this as three asks on 2026-10-25:
- `ground_then_edge`
- `template_with_a_slot`
- `reduction_names_its_residue`

It also filed `sibling_shapes` (corpus). On 2026-10-27 it routed all of them to spw-beat-diff-precipitation, which had been rescoped to LSP cache TTLs before that, with its diff engine superseded by `ChangeReport`. No plan read them. vscode-authoring-probe-loop's `~[compare_lens]` waits on this reading.

Taste note:
- containment: delta stays the revision reading; this is the sibling reading
- correctness: ground arrives short (a shape handle, a count), the edge arrives whole and is read by slot
- expressiveness: serves the consumer's `compare_goal` ("two readings can be held side by side: the ground they share first, then the slot where they part")

## Scope

- In scope:
  - one CLI reading of two forms or two files
  - its slot reader, shared with brace-slot-reading
  - Spw output that parses again
  - `expand` taking a slot value
  - a reduction that prints its residue
- Out of scope:
  - anti-unification beyond one slot level (held as a wonder)
  - the editor lens (vscode-authoring-probe-loop owns `~[compare_lens]`)
  - the consumer's route-tree builder

## Files

[MOD] packages/spw-cli/src/delta.ts (or a sibling verb, per ?[verb_or_flag])
[MOD] packages/spw-cli/src/expand.ts
[MOD] packages/spw-cli/src/skim.ts (residue line)
[MOD] packages/spw-seed/src/canonical/change-report.ts (only if the slot reading belongs in seed)

## Commits

1. ~[sibling_fixture]
2. ~[ground_edge_reading]
3. ~[reading_parses_back]
4. ~[template_slot_value]
5. ~[reduction_residue]

## Dependencies

- brace-slot-reading `~[capsule_slot_after_word]`: a slot reading that misreads `<…>` would put the edge in the wrong slot.
- The owner answers `?[verb_or_flag]` before commit 2.

## Failure Modes

- Hard: delta's revision output changes.
- Soft: the CLI and the consumer name different slots for the same edge.

## Validation

- Hypothesis: on the consumer's bane.land and boon.land route trees, the reading finds one edge, at the name, where delta reports 52 ops.
- Negative control: two revisions of one file read the same through delta as before.
- Demo sequence:
  1. Read two siblings: ground handle, `first = name`, no own parts.
  2. Read two unlike pages: four slots moved.
  3. Expand a template with a value.
  4. Reduce it back and print the residue.
