# Functional Dialects

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

The functional axis describes what Spw expressions **do**. Each function dialect optimizes syntax and semantics for a distinct operational posture. All function dialects assume `Spw.b` (block geometry) as the primary authoring surface — nesting and indentation carry structural meaning.

| Dialect | Token | Purpose | Parse strategy |
|---------|-------|---------|----------------|
| `Spw.q` | Query | Structural selection and data retrieval | 2-pass (schema → resolve) |
| `Spw.t` | Template | Parameterized reuse and slot binding | 2-pass (slots → bind) |

### Spw.q — Query

Selectors over AST structure using Spw's own sigils, braces, and connectors.

**v0.2.0 implementation**: `src/seed/query/` provides pattern-based selection.

```spw.q
# Structural selectors use sigil × brace patterns
$!_           # all ! operations
$![_]         # ! operations with frames
$~"_"         # all ~"..." path refs
$@_           # all @ references
$^[_]{_}      # domain roots with frame and body

# Composition via connectors
$~"_" | $@_   # union: path-refs or references (NAVIGABLE)
$(_) / $![_]  # descent: scopes containing operations
```

**v0.2.0 additions** over v0.1.0:
- Pattern-based selectors replace string-typed node queries
- Serializable selector descriptors for lore-remote `spw/select` dispatch
- Preset library: `NAVIGABLE`, `DOMAIN_ROOTS`, `HYDRATE_OPS`, `OPS_WITH_FRAMES`
- Position-aware queries for LSP integration: `spwq.at(ast, pos, pattern)`

**Deferred** (from v0.1.0 spec):
- Predicate evaluation (`?[status == "active"]`)
- Result shaping (`^["select": [...]]`)
- Aggregation (`@sum`, `@count`, `@avg`)
- Nested queries with correlated `@_.id`

### Spw.t — Template

Parameterized expressions with slot binding and defaults.

```spw.t
^template["greeting"]{
  #defaults{ greeting: "Hello" }
  !boon[_greeting? .. ", " .. _recipient .. "!"]
  @out
}

# Instantiate:
@template/greeting{ recipient: "Alice" }
```

| Slot syntax | Type | Description |
|-------------|------|-------------|
| `_name` | Required | Must be provided |
| `_name?` | Optional | Has default or omittable |
| `_items...` | Spread | Captures multiple values |
| `_name:type` | Typed | Validates against type |

**v0.2.0 status**: Parser handles `_` as wildcard node. Slot binding/validation not yet implemented.

---

## Invariants

1. **Orthogonality**: functional dialects compose independently with geometry dialects (`Spw.b.q`, `Spw.l.t`, etc.).
2. **Block-first**: `Spw.b` (block geometry with nesting) is the default authoring surface. Function dialects inherit its indentation and implicit-sequence rules.
3. **Shorthand stability**: `Spw.q` always means `Spw.*.*.*.query.*` — the function axis is orientation-scoped.
4. **Dialect gating**: a functional dialect does not implicitly activate normalization. SeNF selectors require explicit opt-in.
5. **Baseline safety**: absent a `#dialect:` annotation, expressions run in `Spw.b` (baseline) — no implicit rewrites.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Pattern types | `src/seed/query/types.ts` | ✅ Shipped |
| Pattern matcher | `src/seed/query/match.ts` | ✅ Shipped |
| Selector presets | `src/seed/query/presets.ts` | ✅ Shipped |
| Query entry points | `src/seed/query/spwq.ts` | ✅ Shipped |
| Template slots | Parser: `_name` wildcard | ⚠️ Parsed, not bound |
| Dialect annotation | `#dialect: Spw.b.q` | ❌ Not implemented |
| Predicate evaluation | `?[condition]` | ❌ Not implemented |

---

## Open Questions

- Should dialect detection use file extension (`.spw.q`) or annotation (`#dialect:`) or both?
- Are template slots reducible to ONF wildcard registers, or do they need a separate binding phase?
- How does `Spw.b` nesting depth interact with `Spw.q` depth selectors (`$_:0..2`)?

---

## See Also

- [GEOMETRY.md](./GEOMETRY.md) — Geometry dialects
- [PHASES.md](./PHASES.md) — Phase lifecycle model
- `src/seed/query/` — spw.q implementation
- `docs/theory/spw/onf.spw` — Operator Normal Form (register model)
