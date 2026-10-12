# Fix: noun postfix containers

## Failure

| Priority | Classification | Evidence | Root cause |
| --- | --- | --- | --- |
| P1 | missing-impl | `surfaces[route]{path.role.archetype}<publish>` consumes 45/45 and still splits into Sequence(Identifier, Frame, Capsule). | `termNode` commits the identifier first. `expressionImpl` only wraps a following `<…>` as a medial capsule, so `[` and `{` start new sequence steps. Operations already own optional frame/body; identifier-led nouns do not. |

## Diagnosis

The completeness episode made `parseExpression` use `sequenceNode` and reject non-trivia remainder. That aligned coverage with `parse()`, including the split. Grammar files did not change in `16fd5f8..aae308a9`. The taught noun contour is still unowned.

## Planned Fixes

### Commit 1: `.[plans] — bound noun postfix containers`

- Plan, fix note, and wip only.

### Commit 2: `&[spw-seed] — bind same-line frame, body, and shell onto one expression`

- After the first term, if the next opener is on the term's ending line, parse `[` as `Expression.frame`, `{` as `Expression.body`, `(` as `Expression.scope`, and a shell `<…>` as `Expression.capsule`.
- Do not run this path when the first term already consumed those bounds (operations, existing capsules).
- Leave the two-arm medial loop in place when no postfix frame/body/shell was taken.

### Commit 3: `![spw-seed] — prove the noun specimen is one expression`

- Retarget the completeness specimen to `Expression`.
- Add noun-form tests for the full contour, frame-only, newline sibling, and operator-led negative control.

## Deferred

- Extra identifiers remain juxtaposition (`surfaces leftover` is two steps).
- Gap-class affinity and formatter migrations.
- ONF product shape for postfix nouns beyond walking the new fields.

## Verification

- `npm run test:seed`
- `npm run lint:spw -- --strict`
