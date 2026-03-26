# CONFORMANCE (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha conformance checks — expanded with worked examples.

## v0.2.0 Contract Stub

Conformance defines the verifiable surface that gates releases across five levels:
- L0 (Lex): All 12 operator sigils tokenize correctly and produce stable token types.
- L1-L2 (Parse/Normalize): Container nesting and canonical form are golden-snapshot stable.
- L3-L4 (Query/Integrity): Selector algebra resolves across roots and snapshot diffs are CI-gated.
- Core conformance tests use only grammar-layer concepts; profile-specific tests are separated.

## What Is Conformance?

Conformance defines **what it means for an implementation to satisfy core Spw behavior**. It is the verifiable surface that gates releases.

## Conformance Levels

| Level | Scope | Gate |
|:--|:--|:--|
| **L0 — Lex** | All 12 operators tokenize correctly | `npm run lint:spw` |
| **L1 — Parse** | All 6 container types parse and nest | Golden snapshot match |
| **L2 — Normalize** | Canonical form is stable and hash-equal | Normalization tests |
| **L3 — Query** | Selector algebra resolves across roots | `spw:ls` probe pass |
| **L4 — Integrity** | Golden snapshots unchanged or explicitly approved | CI snapshot diff |

## Worked Examples

### 1. L0 — operator tokenization conformance

Test: lex every operator sigil and verify token type:

```typescript
const sigils = ['!', '^', '~', '?', '*', '=', '@', '#', '.', '&', '$', '%']
for (const sigil of sigils) {
  const tokens = lex(sigil)
  assert(tokens[0].type === 'OPERATOR')
  assert(tokens[0].value === sigil)
}
```

**Pass criterion:** All 12 sigils produce `OPERATOR` tokens with correct values.

### 2. L1 — container parse conformance

Test: parse every container form and verify AST type:

```typescript
const cases = [
  { input: '[a, b]',     expected: 'Frame' },
  { input: '{a: 1}',     expected: 'Body' },
  { input: '(a, b)',     expected: 'Scope' },
  { input: '<<a, b>>',  expected: 'Stream' },
  { input: '((a))',      expected: 'NRange' },
]
for (const { input, expected } of cases) {
  const ast = parse(input)
  assert(ast.type === expected)
}
```

### 3. L4 — golden snapshot conformance

```bash
# Run golden snapshot comparison
npm run test -- --grep "golden"

# If snapshots changed:
# 1. Review the diff carefully
# 2. If change is intentional: npm run test -- -u
# 3. If change is regression: fix the parser
```

## Counter-Examples

### ❌ Conformance without reproduction

```
PASS: "parser works"  # ❌ Not reproducible — no input, no expected output
```

### ❌ Profile-specific conformance mixed with core

```typescript
// BAD: testing domain-specific behavior in core conformance
assert(parse(input, { domain: 'Theatre@' }).emotion === 'joy')  // ❌ Not core!
```

## Invariants

- Conformance checks are reproducible locally and in CI.
- Failing core contracts block release candidates.
- Conformance suite tracks expected warnings separately from errors.
- Core conformance tests use only grammar-layer concepts.

## Implementation Hooks

- Local parser checks: `npm run lint:spw`
- Writerside/path checks: `npm run lint:docs:strict`
- Core stub check: `npm run lint:v020`
- Golden snapshots: `src/seed/__tests__/snapshots/`

## Open Questions

- Which conformance gates are mandatory before tagging v0.2.0 stable?
- Should profile-specific conformance be split by target environment?
