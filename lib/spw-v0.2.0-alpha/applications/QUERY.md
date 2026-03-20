# Query@ Application

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

`Query@` is the application-level surface for the `Spw.q` functional dialect. Where the dialect spec defines the algebra, this doc describes practical query patterns and integration with the selector toolchain.

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
npm run spw -- select docs/index.spw --selector=navigable
npm run spw -- select docs/index.spw --selector=domains --format=json
npm run spw -- select docs/index.spw --selector=hydrate
npm run spwq -- docs/index.spw --selector=navigable   # compatibility alias
```

### LSP Integration

The LSP server uses `spwq.at(ast, pos, NAVIGABLE)` for definition-go-to and document links. Presets wire directly into LSP handlers.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Pattern types | `packages/spw-seed/src/query/types.ts` | ✅ Shipped |
| Pattern matcher | `packages/spw-seed/src/query/match.ts` | ✅ Shipped |
| Presets | `packages/spw-seed/src/query/presets.ts` | ✅ Shipped |
| Entry points | `packages/spw-seed/src/query/spwq.ts` | ✅ Shipped |
| CLI | `packages/spw-cli/src/select.ts` | ✅ Shipped |
| Compatibility CLI | `scripts/spwq.ts` | ✅ Shipped |
| LSP integration | `packages/spw-lsp/src/spw-selector.ts` | ✅ Shipped |

---

## See Also

- [../dialects/FUNCTIONS.md](../dialects/FUNCTIONS.md) — `Spw.q` dialect spec
- `packages/spw-seed/src/query/` — Implementation
- `packages/spw-cli/src/select.ts` — Canonical selector CLI
- `scripts/spwq.ts` — Compatibility CLI wrapper
