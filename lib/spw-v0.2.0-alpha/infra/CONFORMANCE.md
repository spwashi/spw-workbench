# Conformance

Version: 0.2.0-alpha
Status: Contract stub

---

## v0.2.0 Contract Stub

Conformance levels define what an implementation must support. All levels are additive — higher levels include everything from lower levels.

### Levels

| Level | Name | Requirements |
|-------|------|-------------|
| 0 | Lexer | Tokenize Spw source into valid token stream |
| 1 | Parser | Parse tokens into AST (SeedNode tree) |
| 2 | Canonical | Produce canonical Spw.l form (`canonicalize()`) |
| 3 | Query | Support `spwq` pattern selection over AST |
| 4 | Evaluate | Execute expressions with register semantics |
| 5 | Domain | Support domain projection (`Domain@`) |

### v0.2.0 Conformance Status

| Level | Implementation | Status |
|-------|---------------|--------|
| 0 | `src/seed/lexer/` | ✅ |
| 1 | `src/seed/grammar/` + `src/seed/parser/` | ✅ |
| 2 | `src/seed/canonical.ts` | ✅ |
| 3 | `src/seed/query/` | ✅ |
| 4 | `src/runtime/` | ⚠️ Foundation only |
| 5 | — | ❌ Not implemented |

### Verification

```bash
npm run build          # Type-checks all levels
npm run test:runtime   # Verifies level 4 foundation
npm run lsp:smoke      # Verifies level 3 LSP integration
```

### Optional Features

| Feature | Requires level | Status |
|---------|---------------|--------|
| Taste@ evaluation | 5 | ❌ |
| Posture profiles | 4 | ❌ |
| Dialect annotation (`#dialect:`) | 1 | ❌ |
| Geometry conversion (`Spw.l ↔ Spw.b`) | 2 | ⚠️ Partial |
| Template slot binding | 4 | ❌ |

---

## See Also

- [../core/CONFORMANCE.md](../core/CONFORMANCE.md) — Core conformance rules
- [../README.md](../README.md) — Library overview
