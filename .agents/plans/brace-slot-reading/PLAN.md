# Plan: brace-slot-reading

Seed reads each brace pair as the slot it names, wherever the pair sits after the word, and a tool that writes the line back keeps the author's order. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

The owner decided on 2026-11-05, answering a mounted consumer's question, that each brace pair names its slot wherever it sits. The consumer's slot reader (`public/js/semantic/expression-query.js`: `readContainers`, `readExpressionSlots`, `readSlotOrder`) and its quest host already read either order and write a line back in the order it was written. Seed reads `[]`, `{}` and `()` in any order already. It still reads a `<…>` that follows the word directly as a medial capsule (`left<channel>right`). As a result, `beans<food>(kitchen)[mode]{stew}` parses as two expressions, and `{chronicles} <of> (narnia)` parses as a relation.

A second gap showed up while checking the first; the consumer did not report it. In an operator-led expression the operation takes `[]` and `{}` as its own slots. A trailing `<…>` then wraps the whole operation as a medial capsule with no right arm, instead of filling the capsule slot:
- `$box[measure]{presence.flow}<measurement>` reads as `Capsule/medial(left: Operation $ with frame and body)`.
- `box[measure]{presence.flow}<measurement>` reads as one Expression with frame, body and capsule.

A third gap is a plain defect rather than a reading question. The medial loop guards the head's line for postfix slots but not for its right arm, so a `<…>` at the end of a line takes the next line's first term as its right arm, with no error:
- `one<tag>` followed by `two` on the next line parses as one relation.
- `x: $a[m]{b}<reg>` followed by `y: $c[m]{d}<reg>` swallows `y` into the line above.

This one needs no decision and lands first.

This plan makes seed's reading match the decision without losing the medial relation (`bagel<scent>coffee`). It also gives writers one rule about order. The consumer's reader can then retire into seed's export rather than stay a second grammar.

Taste note:
- correctness: one reading of a line in seed, the browser reader and every host
- containment: the medial relation keeps its meaning wherever a word, not a pair, follows the capsule
- expressiveness: serves the consumer's `slot_goal` ("a brace says which slot a word fills, wherever it sits; a line written back keeps its author's order")

## Scope

- In scope:
  - the capsule decision in `grammar/expressions.ts`
  - author order on the Expression node
  - `previewAST` and any writer that prints slots
  - fixtures from both corpora
  - one census probe
- Out of scope:
  - a second slot of one kind (the first repeat still ends the run)
  - new boundary kinds
  - `|` (the consumer holds it as a later mark)
  - the consumer's reader itself, which retires on its own side

## Files

[MOD] packages/spw-seed/src/grammar/expressions.ts (postfix loop and the medial-capsule branch, lines ~740–890)
[MOD] packages/spw-seed/src/types/ast/nodes.ts (slot order on Expression, if spans are not enough)
[MOD] packages/spw-seed/src/instrumentation/preview.ts (line ~161 prints head, frame, body, scope, capsule in a fixed order)
[NEW] fixtures under packages/spw-seed/src/grammar (or the seed test root) for both readings

## Commits

1. ~[medial_stays_on_line]: a capsule's right arm never starts on a later line
2. ~[slot_order_fixtures]: failing fixtures first
3. ~[capsule_slot_after_word]
4. ~[capsule_slot_after_operation]
5. ~[slot_order_kept]
6. ~[preview_keeps_order]
7. ~[consumer_reader_parity]

## Dependencies

- The owner answers `?[capsule_before_pair]` before commit 2. The census in the stream is its evidence.

## Failure Modes

- Hard: a medial relation with a word on its right (`bagel<scent>coffee`, `a<r>b<s>c`) changes reading.
- Hard: a file that parsed without error starts to error.
- Hard: fixing `medial_stays_on_line` changes what a multi-line value means where an author did mean to continue a relation onto the next line. The fixture set checks the corpora for such lines first.
- Soft: two readers drift again because the consumer keeps its scanner after seed exports one.

## Validation

- Hypothesis: when the capsule's right arm is a boundary pair rather than a word, reading the capsule as a slot moves only a handful of lines in either corpus. The workbench has 1 such line out of 79 medial capsules.
- Negative controls:
  - `bagel<scent>coffee` and `foo<5>bar` keep their medial reading.
  - `?<a, b>[reg=pipeline]` keeps its current reading until a fixture says otherwise.
- Demo sequence: `beans<food>(kitchen)[mode]{stew}` reads as one expression with four slots. The preview prints it back in that order, and `word[mode]{body}(scene)<concept>` prints back unchanged.
