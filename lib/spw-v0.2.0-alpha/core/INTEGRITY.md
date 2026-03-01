# INTEGRITY (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha integrity and provenance guarantees — expanded with worked examples.

## What Is Integrity?

Integrity ensures outputs are **trustworthy, reproducible, and attributable** to source inputs and configuration. It is the bridge between the grammar layer (parsing) and the measurement harness (verification).

## Integrity Chain

```
source text → lex → parse → canonicalize → hash → compare
                                                    ↑
                                              golden snapshot
```

## Worked Examples

### 1. Semantic hashing — canonical form is hash-stable

```spw
# Two presentation-different forms:
^"config"{ mode: debug }
^"config"{mode:debug}
```

```
canonical("^\"config\"{ mode: debug }") → "^\"config\"{mode:debug}"
canonical("^\"config\"{mode:debug}")    → "^\"config\"{mode:debug}"

hash(canonical_1) == hash(canonical_2)  ✅
```

**Invariant:** Presentation differences (whitespace, indentation, trailing commas) never affect the semantic hash.

### 2. Golden snapshots — changes need approval

```
src/seed/__tests__/snapshots/phase-4-golden/
├── example-1-inject.spw       # 5 canonical parse outputs
├── example-2-reflect.spw      # any change to these
├── example-3-couple.spw       # requires explicit approval
├── example-4-capsule.spw      # via snapshot update
└── example-5-mixed.spw        # (git diff is the review)
```

Golden snapshots are the **integrity anchor** — they freeze known-good parse output so regressions are immediately visible.

### 3. Provenance — every transformation is attributable

```
Input:   "^seed[hello]"         (file: example.spw, line: 1)
Profile: Spw.b                  (source: workspace.spw#dialect)
Parser:  v0.2.0-alpha           (source: package.json#version)
Output:  FrameNode              (hash: a3b8d1...)
```

## Counter-Examples

### ❌ Canonicalization drops information

```spw
# Input has semantic content:
^seed[hello v:0.1 @profile:Spw.m]

# BAD canonical output drops @profile:
^seed[hello v:0.1]  # ❌ Semantic information lost!
```

### ❌ Hash depends on presentation

```
# BAD: different whitespace = different hash
hash("^config{ x: 1 }") ≠ hash("^config{x:1}")  # ❌ These should be equal!
```

## Invariants

- Equal input/profile pairs yield equal token + AST structures.
- Canonicalization does not drop semantic information.
- Integrity checks are automatable in CI/local lint loops.
- Presentation-only changes never affect semantic hash.

## Implementation Hooks

- Determinism coverage: `src/seed/__tests__/parser.determinism.test.ts`
- Canonical outputs: `src/seed/canonical/index.ts`
- Golden snapshots: `src/seed/__tests__/snapshots/`
- Normalization: `src/seed/normalize.ts`

## Open Questions

- What hash/provenance schema should be standard in v0.2 stable?
- Which drift classes are acceptable for alpha-only iteration?
