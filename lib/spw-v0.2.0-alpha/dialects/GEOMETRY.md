# Geometry Dialects

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

The geometry axis describes how Spw expressions are **laid out** dimensionally. The same semantic content can be expressed in different geometric forms depending on context. Geometry and function are orthogonal.

| Dialect | Dimension | Primary use |
|---------|-----------|-------------|
| `Spw.l` | 1D (linear) | Storage, transmission, hashing |
| `Spw.b` | 2D (block) | Authoring, reading, version control |
| `Spw.x` | 0D (index) | Linking, composition, lazy loading |

### Spw.l — Linear

All content on one line. Whitespace insignificant. All connectors explicit. Canonical form.

```spw.l
^["greeting"]{!boon["Hello"]..?[@name]{!["Welcome, "..@name]|!["Welcome, stranger"]}..@out}
```

**Conversion rule**: `Spw.b → Spw.l` is **lossless** — insert `..` between implicit sequences and collapse to one line. `Spw.l → Spw.b` restores line breaks at sequence boundaries and indents by nesting depth.

**v0.2.0 implementation**: `canonicalize()` in `src/seed/canonical.ts` produces a canonical string. Not yet explicitly surfaced as `toLinear()` / `toBlock()` formatters.

### Spw.b — Block

Line breaks and indentation convey structure. Whitespace significant. Line breaks create implicit sequences.

```spw.b
^["greeting"]{
  !boon["Hello"]

  ?[@name]{
    !["Welcome, " .. @name]
  | !["Welcome, stranger"]
  }

  @out
}
```

**Grammar note**: same-level lines are implicit sequence (no `..` needed). This is the primary authoring format and the default geometry for `.spw` files.

### Spw.x — Index

References content by address without including it. Zero-dimensional — pointer only.

```spw.x
@templates/greeting                       # local reference
@canon:Spw.Patterns.Greeting@1.0          # registry reference
@hash:sha256:7f83b165...                  # content-addressed
@greeting@1.0.0                           # versioned
@document#section_3                       # fragment
```

**v0.2.0 implementation**: the LSP server resolves `@root/path` and `~"./path"` references via `spw-selector.ts`. The `spwq` CLI can list all navigable references. Full `Spw.x` resolution (registry, hash, versioned, fragment) is not yet implemented.

---

## Invariants

1. **Lossless round-trip**: `Spw.b ↔ Spw.l` conversion preserves semantic content. Only presentation differs.
2. **Canonical uniqueness**: every seed has exactly one canonical `Spw.l` representation. Two seeds are equivalent iff their canonical forms are identical.
3. **Index lossy**: `Any → Spw.x` discards content. Resolution from `Spw.x → Any` requires fetching from source.
4. **Geometry independence**: geometry never affects `canonical_text` or hashing. Presentation phase is separate.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Canonicalization | `src/seed/canonical.ts` | ✅ Shipped |
| Block parsing | `src/seed/grammar/` | ✅ Shipped |
| Linear serialization | — | ⚠️ `canonicalize()` exists but no explicit `toLinear()` |
| Block formatting | — | ❌ No `toBlock()` pretty-printer |
| Reference resolution | `scripts/lsp/spw-selector.ts` | ✅ `@root/path`, `~"path"` |
| Registry resolution | — | ❌ Not implemented |
| Content-addressed ref | — | ❌ Not implemented |

---

## Open Questions

- Should `toLinear()` and `toBlock()` be methods on parsed AST, or standalone transform functions?
- Is `Spw.x` resolution the same as the lore-remote bridge, or a separate concern?
- How does geometry interact with LSP formatting? Should `textDocument/formatting` be geometry-aware?

---

## See Also

- [FUNCTIONS.md](./FUNCTIONS.md) — Functional dialects
- [PHASES.md](./PHASES.md) — Phase lifecycle model
- `src/seed/canonical.ts` — Canonicalization implementation
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Brace-first thesis
