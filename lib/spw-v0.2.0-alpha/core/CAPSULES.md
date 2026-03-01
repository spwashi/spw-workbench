# CAPSULES (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha capsule semantics — expanded with worked examples.

## What Is a Capsule?

A capsule is a **bounded semantic packet** that can be composed without leaking unrelated concerns. Capsules use `< >` delimiters and always imply a named, directed coupling.

## Capsule Structure

```
CapsuleNode = {
  type:     "Capsule"
  label:    string          # channel name
  content:  SpwNode         # the payload
  span:     Span
}
```

## Worked Examples

### 1. Typed detail channel

```spw
~<detail>"./OPERATORS.md"
```

**AST:** `CapsuleNode { label: "detail", content: LiteralNode("./OPERATORS.md") }`

**Meaning:** The capsule names a `detail` channel — tooling can resolve this as a link, and projections can extract all `<detail>` channels across a corpus.

### 2. Multi-channel composition

```spw
^["contracts"]{
  ^["operators"]{
    =file: "OPERATORS.md"
    ~<detail>"./OPERATORS.md"
    ~<atlas>"../../../docs/theory/spw/operator-atlas.spw"
    ~<canonical>"../../../docs/theory/spw/operators.spw"
  }
}
```

**Meaning:** Three channels (`detail`, `atlas`, `canonical`) compose without interference. Each capsule is independently extractable — tooling can query "all `<atlas>` links" without parsing the surrounding structure.

### 3. Capsule vs. stream — directionality

```spw
# Capsule: named, typed coupling (finite, static)
~<ref>"./file.spw"

# Stream: arrival-order flow (open-ended, dynamic)
<<event, data, context>> @sink
```

Capsules are for **static coupling** — naming a relationship. Streams are for **dynamic flow** — processing arrival-order data.

## Counter-Examples

### ❌ Capsule without channel name

```spw
# BAD: generic container, not a directed coupling
<stuff here>               # What channel is this?
~<detail>"./file.spw"      # Correct: named channel
```

### ❌ Cross-capsule leakage

```spw
# BAD: capsule references internal state of another capsule
~<detail>"./A.md"
~<atlas>"./B.md" =depends: detail  # Implicit coupling!
```

Cross-capsule links must be declared explicitly through shared references, not implicit dependencies.

## Invariants

- Capsules have explicit start/end boundaries.
- Cross-capsule links are declared, not implicit.
- Capsule extraction does not mutate source semantics.
- Each capsule has a named channel — anonymous `<>` is an error in strict mode.

## Implementation Hooks

- Capsule parser: `src/seed/grammar/containers.ts#capsuleNode`
- Container kind types: `src/seed/types/token.ts#ContainerKind`
- Instrumentation stream/audit surfaces: `src/seed/instrumentation/`
- Core boundary contracts: [BOUNDARIES.md](./BOUNDARIES.md)

## Open Questions

- Should capsule composition support profile-specific merge strategies?
- Which capsule metadata is required for downstream tooling interoperability?
- Are anonymous capsules `<>` ever valid, or always an error?
