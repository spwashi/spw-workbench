# BOUNDARIES (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha boundary semantics — expanded with worked examples.

## v0.2.0 Contract Stub

Boundaries govern what may cross between layers and enforce directional dependency:
- Import and dependency direction flows inward: grammar <- semantics <- pragmatics.
- Grammar-layer token output must never be altered by semantic context or pragmatic conventions.
- Profile-specific extensions must declare boundary-safe integration explicitly at the crossing point.
- Boundary violations are detectable by lint and audit tooling at both CI and local scope.

## What Are Boundaries?

Boundaries specify what may cross between layers. They are the guardrails that prevent layer violations and keep the grammar portable.

## Boundary Rules

| From → To | Allowed | Prohibited |
|:--|:--|:--|
| Grammar → Semantics | Token types flow upward for interpretation | Semantic context must not alter tokenization |
| Semantics → Pragmatics | Meaning claims inform convention design | Conventions must not constrain meaning |
| Pragmatics → Grammar | ❌ Never | Editor heuristics must not alter parse output |
| Grammar → Pragmatics | ❌ Never (skip layer) | Token types must not depend on shelf category |

## Worked Examples

### 1. Legal boundary crossing — AST to semantic interpretation

```
Grammar Layer: parse "?~<#.>" → [OPERATOR(?), OPERATOR(~), CAPSULE_OPEN(<), ...]
                   ↓ (AST flows upward)
Semantics Layer: interpret as spirit-sequence phase 1-2
```

The parser produces AST nodes. The semantic layer *reads* them to assign meaning. No grammar mutation occurs.

### 2. Legal boundary crossing — semantics to pragmatic convention

```
Semantics Layer: "#" is extrinsic, "." is intrinsic
                   ↓ (polarity claim informs editing)
Pragmatics Layer: editing.spw highlights # and . differently based on polarity
```

The editing heuristic uses semantic knowledge to improve UX. But even without the heuristic, the semantics remain correct.

### 3. Controlled extension point — profile-specific behavior

```spw
# Profile: Spw.b (block mode)
^seed[example v:0.1 @profile:Spw.b]{
  # Newline = statement boundary (profile behavior)
  first_statement
  second_statement
}
```

Profile-specific behavior (newline significance) is declared at the boundary between grammar configuration and runtime behavior — not smuggled in implicitly.

## Counter-Examples

### ❌ Boundary violation — pragmatics alters grammar

```typescript
// BAD: shelf category changes how tokens are produced
if (currentShelf === 'prose') {
  lexer.enableNaturalMode()  // ❌ pragmatic layer changes grammar behavior!
}
```

## Invariants

- Import and dependency direction flows inward (grammar ← semantics ← pragmatics).
- Seed/kernel code remains portable and environment-agnostic.
- Boundary violations are detectable by lint/audit tooling.
- Profile-specific extensions declare boundary-safe integration explicitly.

## Implementation Hooks

- Layer audit guide: `src/seed/docs/audit-guide.spw`
- Hook checks and analyzers: `.git/hooks/`, `scripts/analyzers/`
- Layer contract companion: [LAYERS.md](./LAYERS.md)
- Kernel declaration: `.spw/workspace.spw#kernel`

## Open Questions

- Which boundary checks should be hard errors in alpha?
- How should profile-specific extensions declare boundary-safe integration?
