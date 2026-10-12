# Plan: noun-postfix-containers

Bind same-line postfix containers onto one identifier-led expression so `subject[mode]{parts}(hold)<scene>` is one noun, not juxtaposed steps.

## Goal

Completeness receipts already prove the specimen consumes every character. They do not prove it is one form. Today `surfaces[route]{path.role.archetype}<publish>` parses as a Sequence of three expressions (identifier, frame, capsule) because `[` and `{` attach to operations, not to a preceding identifier. Same-line postfix `[` `{` `<` should occupy slots on that expression: frame, body, and a shell capsule. Juxtaposition across a newline, operator-led `!go[x]{y}`, and two-arm medial `bagel<scent>coffee` stay as they are.

Taste note: improve **correctness** and **recognizability** of the taught noun contour without inventing a new node type.

## Scope

- **In scope**: same-line postfix `[frame]`, `{body}`, `(scope)`, and shell `<capsule>` on an identifier-led expression; tests for the identity-free specimen and negative controls; completeness test retarget; one changelog bullet.
- **Out of scope**: semantic spacing affinity, formatter migrations, remainder policy for extra identifiers (those are juxtaposition), lattice `~#name:`, `--stats`, new AST node families, ONF redesign, editor host contours.

## Files

```
[NEW] .agents/plans/noun-postfix-containers/PLAN.md
[NEW] .agents/plans/noun-postfix-containers/FIX.md
[NEW] .agents/plans/noun-postfix-containers/wip.spw
[MOD] packages/spw-seed/src/types/ast/nodes.ts
[MOD] packages/spw-seed/src/grammar/expressions.ts
[MOD] packages/spw-seed/src/instrumentation/preview.ts
[NEW] packages/spw-seed/src/grammar/noun-form.test.ts
[MOD] packages/spw-seed/src/parser/parse-completeness.test.ts
[MOD] CHANGELOG.md
```

### Craft guard

`expressions.ts` is already over 600 lines. Postfix attachment stays a small block in `expressionImpl` rather than a new grammar file, because a helper module would cycle `containers → expressions → helper → containers`. No new imports on that file.

## Commits

```
1. .[plans] — bound noun postfix containers
2. &[spw-seed] — bind same-line frame, body, and shell onto one expression
3. ![spw-seed] — prove the noun specimen is one expression
```

Fuzz strategy: `npm run test:seed` stabilize; `npm run lint:spw -- --strict` as ship gate for the seed package.

## Agentic Hygiene

- Rebase target: `upstream/main@aae308a9`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none. Follows the parse-completeness receipt episode; does not reopen doctor or inspect stdin.

## Failure Modes

- **Hard**: postfix `[` consumes a following sequence step that was a sibling frame on the next line.
- **Soft**: same-line `surfaces [route]` (open gap) binds as a noun; document that as same-line, not tight-only, matching operation frames.
- **Non-negotiable**: `a b` stays two steps; `a -> b` stays one chained expression; `!go[x]{y}` keeps frame/body on the operation; `bagel<scent>coffee` stays a medial capsule term.

## Validation

- **Hypotheses**: the specimen is one Expression with identifier head, frame, body, and shell capsule; `parseExpression` unwraps that single expression; completeness remains true with no remainder.
- **Negative controls**: newline-separated `[route]`; `alpha }`; `?match[42]{ => "x" }`; confluence ladder with `=>`.
- **Demo sequence**: `parseExpression('surfaces[route]{path.role.archetype}<publish>')` then `parse()` of the same source as a one-step seed sequence.

## Spw Artifact

None beyond `wip.spw`; the branch memory is the retained operational surface.
