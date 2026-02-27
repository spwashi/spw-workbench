# Dialect Phase Model

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

Dialects operate at different **phases** of the expression lifecycle. Conflating phases creates false tensions. Each phase varies independently.

| Phase | Question | Concern |
|-------|----------|---------|
| **Surface** | How are characters grouped into tokens? | Lexing |
| **Structure** | How do tokens compose into trees? | Parsing |
| **Projection** | What does this structure mean? | Semantics |
| **Orientation** | What is the execution goal? | Runtime |
| **Presentation** | How is the result displayed? | Output |

### Surface phase

Controls tokenization: whitespace significance, delimiter rules, sigil recognition.

| Dialect | Whitespace | Sequence | Boundaries |
|---------|------------|----------|------------|
| linear | insignificant | explicit (`..`) | sigils + containers |
| block | indentation significant | implicit (newline) | dedent closes scope |
| natural | prose-like | inferred from punctuation | sigils mark force |
| streaming | chunked | arrival order | `<<` and `>>` |

**v0.2.0 implementation**: `src/seed/lexer/` supports `DEFAULT_LEX_PROFILE` (block) and `PROSE_LEX_PROFILE` (natural). Streaming is parsed as `StreamNode`. No explicit linear-mode lexer yet.

### Structure phase

Controls tree composition: precedence, associativity, container nesting, reference resolution.

| Dialect | Containers | Connectors | Ambiguity |
|---------|------------|------------|-----------|
| explicit | all required | all required | none |
| inferred | from indentation | from newline | resolved by precedence |

**v0.2.0 implementation**: `src/seed/grammar/` uses the inferred dialect by default.

### Projection phase

Controls semantic interpretation. Domain bindings determine what operators mean.

| Domain | Interpretation |
|--------|---------------|
| Cognitive@ | mental operations |
| Hardware@ | circuit semantics |
| Theatre@ | dramatic interpretation |
| Broadcast@ | signal flow |

See `applications/` for domain-specific doc.

### Orientation phase

Controls the execution goal — what the expression is *for*.

| Dialect | Goal | Flow | Reduction |
|---------|------|------|-----------|
| query | retrieve | filter → shape → emit | high |
| template | instantiate | bind slots → render | low |
| topology | connect | nodes → edges | structural |
| reduction | condense | analyze → compress → emit | maximum |
| linkage | relate | enumerate → couple → graph | referential |

**v0.2.0 mapping**: `Spw.q` = query (implemented as `src/seed/query/`). Others deferred.

### Presentation phase

Controls output rendering. Taste profiles gate display without affecting semantics.

| Profile | Rhythm | Emphasis |
|---------|--------|----------|
| poetic | preserve | n-range depth |
| terse | collapse | minimal |
| literate | balanced | moderate |
| annotated | preserve | margin notes |

**Critical invariant**: presentation NEVER affects `canonical_text` or hashing.

---

## Phase Composition

Each phase varies independently. A seed can combine any valid phase settings.

```
Spw.<surface>.<structure>.<domain>.<orientation>.<presentation>
```

**Shorthands**:

| Shorthand | Expansion |
|-----------|-----------|
| `Spw.b` | `Spw.block.inferred` |
| `Spw.l` | `Spw.linear.explicit` |
| `Spw.n` | `Spw.natural.inferred` |
| `Spw.q` | `Spw.*.*.*.query.*` |
| `Spw.t` | `Spw.*.*.*.template.*` |
| `Spw.r` | `Spw.*.*.*.reduction.*` |
| `Spw.x` | `Spw.*.*.*.linkage.*` |

**Default**: `Spw.block.inferred.(none).(none).literate`

---

## Invariants

1. **Phase independence**: each phase varies without forcing changes in other phases.
2. **AST dialect-independence**: the AST representation is the same regardless of surface or structure dialect. Conversion happens before and after the tree.
3. **Presentation neutrality**: presentation never affects canonical form, hashing, or evaluation.
4. **Dialect gating**: no implicit phase activation. Phases require explicit annotation or configuration.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Surface: block lexing | `src/seed/lexer/` | ✅ Shipped |
| Surface: prose lexing | `PROSE_LEX_PROFILE` | ✅ Shipped |
| Surface: linear lexing | — | ❌ Not implemented |
| Structure: inferred parse | `src/seed/grammar/` | ✅ Shipped |
| Projection: domain binding | — | ❌ Not implemented |
| Orientation: query | `src/seed/query/` | ✅ Shipped |
| Orientation: template/reduction/linkage | — | ❌ Not implemented |
| Presentation: taste profiles | `lib/.../domains/TASTE.md` | ⚠️ Specified, not code |
| Dialect annotation | `#dialect: Spw.b.q` | ❌ Not implemented |

---

## Open Questions

- Should phase composition be declared per-file, per-seed, or per-scope?
- Can a single file contain multiple orientation phases (e.g. a query block inside a template)?
- How does the presentation phase interact with the runtime's register bank? Is taste a register?

---

## See Also

- [FUNCTIONS.md](./FUNCTIONS.md) — Functional (orientation) dialects
- [GEOMETRY.md](./GEOMETRY.md) — Geometry (surface + structure) dialects
- [index.spw](./index.spw) — Navigable dialect map
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Library architecture
