# LAYERS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha layer model — expanded with 3-layer kernel alignment.

## v0.2.0 Contract Stub

The 3-layer kernel organizes Spw into grammar, semantics, and pragmatics:
- Dependency direction is strictly grammar <- semantics <- pragmatics; reversals are violations.
- Each layer has a clear, independent reason to change and owns distinct surfaces.
- Grammar-layer code (operators, containers, seeds) must never import semantic or pragmatic concepts.
- Shared contracts between layers move inward rather than being duplicated outward.

## The 3-Layer Kernel

Spw's ontology is organized into three layers that flow inward:

```
┌─────────────────────────────────────────┐
│  Grammar        parse-time facts         │
│                 operators + containers   │
├─────────────────────────────────────────┤
│  Semantics      meaning-time claims      │
│                 planes, axes, polarity   │
├─────────────────────────────────────────┤
│  Pragmatics     use-time conventions     │
│                 shelves, editing, biome  │
└─────────────────────────────────────────┘
```

## Layer Ownership

| Layer | Owns | Surfaces | May Not |
|:--|:--|:--|:--|
| **Grammar** | operators, containers, seeds, token stability | `src/seed/`, `core/*.md` | depend on runtime or domain concepts |
| **Semantics** | planes, axes, polarity, spirit sequence | `registries/`, `applications/`, `literate/` | mutate grammar-layer token types |
| **Pragmatics** | shelves, editing, topology, biome, process | `conventions/`, `patterns/`, `biome/`, `tooling/` | constrain grammar or semantics |

## Dependency Direction

```
pragmatics → semantics → grammar
             (never reversed)
```

## Worked Examples

### 1. Grammar layer — token type is a grammar fact

```typescript
// src/seed/types/token.ts
export type OperatorKind = '!' | '^' | '~' | '?' | '*' | '=' | '@' | '#' | '.' | '&' | '$' | '%' | '<>'
```

This is grammar. It does not depend on what the operators *mean* (semantics) or how editors *display* them (pragmatics).

### 2. Semantics layer — spirit sequence interprets grammar

```spw
# .spw/workspace.spw
^"spirit_sequence"{
  =raw: "?~<#.>@(#.)&[#.]*{#.}^"
}
```

The spirit sequence assigns *meaning* to grammar-layer operators — mapping them to a 6-phase cycle. It uses grammar facts but doesn't mutate them.

### 3. Pragmatics layer — shelves orient editing

```spw
# .spw/shelves.spw
^"orientation"{
  macro: [@biome/spells, @biome/expr, @biome/query]
  prose: [@spw/literate, @docs]
}
```

Shelves orient how developers *work with* the codebase. Removing a shelf category doesn't change what operators mean or how they parse.

## Counter-Examples

### ❌ Grammar depending on semantics

```typescript
// BAD: parser checks semantic meaning to decide how to tokenize
if (semanticContext.isProbe) { token.type = 'PROBE' }  // ❌ Grammar leak!
```

The parser tokenizes `?` as `OPERATOR('?')` regardless of what it means. Semantic interpretation happens after parsing.

### ❌ Semantics depending on pragmatics

```spw
# BAD: polarity depends on which shelf category the file is in
# The #/. accessor polarity should be consistent everywhere
```

## Invariants

- Each layer has a clear reason to change.
- Upstream layers (grammar) do not import downstream layer details (semantics, pragmatics).
- Shared contracts move inward rather than duplicated outward.
- Dependency direction is grammar ← semantics ← pragmatics (never reversed).

## Implementation Hooks

- Layer notes in seed docs: `src/seed/docs/audit-guide.spw`
- Boundary counterpart: [BOUNDARIES.md](./BOUNDARIES.md)
- Kernel declaration: `.spw/workspace.spw#kernel`
- Canon architecture map: `docs/plans/md/architecture-map.md`

## Open Questions

- Which layer boundaries should be enforced by static tooling now?
- Do docs need a machine-readable layer map for analyzer reuse?
- Should the kernel declaration in `.spw/workspace.spw` be normative or advisory?
