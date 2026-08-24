# Fix: expression parse completeness

## Failure

| Priority | Classification | Evidence | Root cause |
| --- | --- | --- | --- |
| P1 | missing implementation | A structured noun form spans the full source through `parse()` but `parseExpression()` reports success after only its leading identifier. | The standalone entry point invokes `expressionNode` once and never checks for a non-trivia remainder; source products describe requested fields but not source consumption or prose fallback. |

## Repair boundary

- Parse standalone expressions with the same `sequenceNode` grammar used for a seed expression.
- Preserve the existing prose fallback and the established rejection of malformed match arms; neither becomes a new operator meaning.
- Publish one portable consumption/root/fallback receipt on parse output and on the existing structure-product completeness field.
- Cover full consumption, structured remainder, malformed sigil-led degradation, and prose fallback in package-canon tests.

## Ripple prediction

- **Radius:** medium — the public parser result gains a required receipt and the standalone AST type broadens to the seed-expression union.
- **Confidence:** high — parsing semantics remain inside `spw-seed`; the existing source pipeline and progressive-product envelope provide the integration points.
- **Deferred:** doctor path/revision disclosure and Spw-card round-trip proof remain later episodes.

## Verification

- Identity-free before/after probe for the structured noun specimen.
- `npm run test:seed`
- `npm run lint:spw -- --strict`
