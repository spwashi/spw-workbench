# SEEDS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha seed lifecycle — expanded with worked examples.

## What Is a Seed?

A seed is the **minimal reproducible Spw unit** carrying intent, structure, and provenance. It is what the parser produces from source text and what canonicalization normalizes.

## Seed Shape

```
Seed = {
  source:       string          # original text
  canonical:    string          # Spw.m normalized form
  ast:          SpwNode         # parsed tree
  hash:         string          # semantic hash of canonical form
  provenance:   Provenance      # origin metadata
}

Provenance = {
  file:         string          # source file path
  span:         Span            # line/col range
  profile:      string          # dialect profile (e.g. "Spw.b")
  version:      string          # spec version (e.g. "v0.2.0-alpha")
}
```

## Worked Examples

### 1. Minimal seed — a single frame

Source:
```spw
^seed[hello v:0.1]
```

Canonical (Spw.m): `^seed[hello v:0.1]`

Hash: `sha256(canonical) → a3b8d1...`

Provenance: `{ file: "example.spw", span: {1:1-1:18}, profile: "Spw.b", version: "v0.2.0-alpha" }`

### 2. Normalization — equivalent forms collapse

These three forms are semantically equivalent:

```spw
# Form A: compact
^"config"{ mode: debug }

# Form B: multiline
^"config"{
  mode: debug
}

# Form C: extra whitespace
^"config"  {    mode:   debug    }
```

All normalize to the same canonical Spw.m form: `^"config"{mode:debug}`

**Hash equivalence:** `hash(A) == hash(B) == hash(C)`

### 3. Non-equivalent forms — semantic difference preserved

```spw
# These are NOT equivalent — order matters in frames
^seed[a, b, c]
^seed[c, b, a]
```

Frames are ordered selections. Different order = different seed = different hash.

## Counter-Examples

### ❌ Seed without provenance

```spw
# BAD: generated seed with no traceability
^seed[result]  # Where did this come from?
```

Every seed must carry provenance metadata — at minimum the source file and spec version.

## Invariants

- Seed identity is stable after normalization.
- Equivalent source forms collapse to equivalent seed structure.
- Seed metadata fields are explicit rather than inferred by side effects.
- Presentation-only differences (whitespace, indentation) never affect hash.

## Implementation Hooks

- Canonicalization pipeline: `src/seed/canonical/`
- Normalization logic: `src/seed/normalize.ts`
- Seed-facing docs: `src/seed/docs/index.spw`
- Golden snapshots: `src/seed/__tests__/snapshots/`

## Open Questions

- Which provenance fields are mandatory in alpha versus optional in stable?
- How strict should seed normalization be for style-only differences?
- Should seeds carry a profile field to declare their dialect?
