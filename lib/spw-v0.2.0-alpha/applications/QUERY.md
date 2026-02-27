# Query@ Application

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

`Query@` is the application-level surface for the `Spw.q` functional dialect. Where the dialect spec defines the algebra, this doc describes practical query patterns and integration with the `spwq` toolchain.

### Pattern-Based Selection

```spw.b
# Select by sigil
$!_              # all ! operations
$@_              # all @ references
$~"_"            # all ~"..." path references

# Select by shape
$![_]            # operations with frames
$^[_]{_}         # domain roots with frame and body

# Compose
$~"_" | $@_      # union: navigable references
$(_) / $![_]     # descent: scopes containing operations
```

### Presets

| Preset | Pattern | What it matches |
|--------|---------|----------------|
| `NAVIGABLE` | `$~"_" \| $@_` | Path refs or @ references |
| `DOMAIN_ROOTS` | `$^[_]` | Domain roots with frames |
| `HYDRATE_OPS` | `$!_` | All ! operations |
| `OPS_WITH_FRAMES` | `$![_]` | Operations with frames |
| `OPS_WITH_BODIES` | `$!{_}` | Operations with bodies |

### CLI Usage

```bash
npm run spwq -- docs/index.spw --selector=navigable
npm run spwq -- docs/index.spw --selector=domains --format=json
npm run spwq -- docs/index.spw --selector=hydrate
```

### LSP Integration

The LSP server uses `spwq.at(ast, pos, NAVIGABLE)` for definition-go-to and document links. Presets wire directly into LSP handlers.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Pattern types | `src/seed/query/types.ts` | ✅ Shipped |
| Pattern matcher | `src/seed/query/match.ts` | ✅ Shipped |
| Presets | `src/seed/query/presets.ts` | ✅ Shipped |
| Entry points | `src/seed/query/spwq.ts` | ✅ Shipped |
| CLI | `scripts/spwq.ts` | ✅ Shipped |
| LSP integration | `scripts/lsp/spw-selector.ts` | ✅ Shipped |

---

## See Also

- [../dialects/FUNCTIONS.md](../dialects/FUNCTIONS.md) — `Spw.q` dialect spec
- `src/seed/query/` — Implementation
- `scripts/spwq.ts` — CLI tool
