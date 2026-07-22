# Polyglot LSP Search

Design note for **searching other language LSPs from Spw** — TypeScript, Python, rust-analyzer, and peers — without teaching authors a second query language.

**Status:** research (not implemented; **not** registered in canon roots).  
**Surface:** [`.spw/tooling/polyglot-lsp-search.spw`](../../../.spw/tooling/polyglot-lsp-search.spw)  
**Related:** [LSP editor integration](./lsp-editor-integration.md), [query composition](../../../.spw/patterns/query-composition.spw), [literate UI](../../../.spw/patterns/literate-ui.spw)

**Registration gate:** do not put `@ts: =lsp[...]` in workspace path roots. Wait for a versioned `perspectives` / `services` declaration (or a typed root union) so path authority stays strict.

---

## Intent

Treat foreign language servers as **perspectives**, not as a second index Spw must own.

| Layer | Owns |
|-------|------|
| Foreign LSP (tsserver, pylsp, rust-analyzer, …) | Symbol truth for that language |
| Spw | Address, probe, collapse, and land on ordinary navigable locations |
| Editor clients | Quickfix, jump list, underline — same path-landing stack |

Spw must **not** re-parse or re-index TypeScript or Python. It **forwards**.

---

## Existing spine

Polyglot search should reuse the operator sentence already claimed by literate UI and path navigation:

```text
?probe  →  @perspective  →  ~name/pattern  →  *locations
```

| Piece | Role |
|-------|------|
| `?` | Open a search / wonder |
| `~` | Name or path without forcing resolve |
| `@` | Perspective / root bank |
| `*` | Collapse to concrete location(s) |
| `$` | Introspect capability / method |
| Path units | `~"…"`, `~<path>`, `~<label>"…"`, `@root/path` — **landing strip** after resolve |

File world and symbol world stay dual, not competing:

```text
file world:    ~"…" | ~<…> | @root/path          → open file
symbol world:  ?[@lang]{ name } | *[@lang]{ … }  → ask server → land on file+range
```

Ideal collapse after a foreign hit:

```spw
?[@ts]{ "selectPathRefs" }
  → *{ ~"packages/spw-lsp/src/spw-selector.ts" /* @ line range */ }
```

---

## Option 1 — Roots as servers (preferred default)

**Claim:** A language server is a root-bank perspective. `@ts` means the TypeScript server the way `@docs` means a path root.

### Declaration

```spw
^"roots"{
  @ts:   =lsp[typescript]
  @py:   =lsp[python]
  @rust: =lsp[rust-analyzer]
  @spw:  ~"."                 // native path root unchanged
}
```

Shelves / workspace manifests can host the same declarations so editor and CLI share one bank.

### Buffer forms

```spw
?[@ts]{ "SpwSelectorHit" }              // workspace/symbol on TS server
?[@ts/packages/spw-lsp]{ "HandlerDeps" } // scoped probe (subtree, not a path dialect)
*[@ts]{ "resolveReferencePath" }         // collapse toward definition-ish locations
$[@ts]{ caps }                           // capability / server introspect
```

### Why preferred for v0

- One declaration site with path roots
- `@` already means “rotate perspective”
- Scoped form `@lang/subtree` reuses root muscle memory without inventing URIs
- Editor commands can say “search in `@ts`” without new surface syntax on day one

### Cost

Root resolution must branch: **path roots** vs **server roots**. Absence of a server is a soft failure (see constraints).

---

## Option 2 — Probe envelope (explicit alias family)

**Claim:** Keep path roots pure. Foreign search is always marked with an envelope so ownership is unmistakable.

### Forms

```spw
?lsp[typescript]{ "selectPathRefs" }
?lang[ts]{ kind: #symbol, query: "HandlerDeps" }
$[@ts]{ workspace/symbol: "mergeRoots" }   // advanced; method name is bridge-owned
```

### Why keep it

- Maximum clarity: “this is not Spw’s index”
- Good CLI / agent spelling when roots are not in scope
- Useful as an **alias** of option 1 rather than a rival dialect

### Risk

Two parallel address systems (`@spw/…` vs `?lsp[…]`) unless the envelope is defined as sugar over declared server roots.

### Relationship to option 1

| | Option 1 | Option 2 |
|--|----------|----------|
| Declaration | `@ts: =lsp[typescript]` | optional registry |
| Everyday search | `?[@ts]{ "q" }` | `?lsp[typescript]{ "q" }` |
| v0 default | **yes** | alias / CLI |
| Clarity of ownership | good | strongest |
| Unification path | natural | needs root bridge |

**Canon posture:** option 1 is the preferred surface; option 2 remains a valid explicit envelope alias family.

---

## Combinatorics (reasonable surface set)

Keep the living set small. Everything below is intentional; avoid growing it ad hoc.

| Form | Intent |
|------|--------|
| `@lang: =lsp[server_id]` | Declare a server perspective |
| `?[@lang]{ query }` | Probe that server (default: symbol search) |
| `?[@lang/subtree]{ query }` | Same probe, limited scope |
| `*[@lang]{ query }` | Collapse to best location(s) |
| `$[@lang]{ … }` | Capability or method introspect |
| `?lsp[server_id]{ query }` | Envelope alias (option 2) |
| Batch pipeline | `from: [@ts, @py]` → select → where → `via: #workspace_symbol` |

### Query pipeline (batch / agent face)

For plans, CLI, and replay — not for every buffer jump:

```spw
^["query"]{
  from: [@ts, @py]
  select: [name, kind, file, range]
  where: { query: "pathRef", kind: #function }
  via: #workspace_symbol
}
```

Same root model as option 1; different projection (rows vs cursor jump). Aligns with [query composition](../../../.spw/patterns/query-composition.spw).

### Forms deferred (easy to overfit)

| Form | Why wait |
|------|----------|
| `~ts:"path/to/file.ts"` | Collides with tilde-path muscle memory |
| `@ts~symbolName` | Dense; needs proven demand |
| `ts://symbol/Foo` | Opaque non-Spw URI scheme |
| Mega-`?{ lang, method, params }` | Protocol leakage; abandons operator physics |

---

## Capability map

Syntax names **intent**. The bridge owns protocol verbs.

| Spw gesture | Typical LSP mapping |
|-------------|---------------------|
| `?[@lang]{ "name" }` | `workspace/symbol` |
| Probe with open-file context | `textDocument/documentSymbol` or filtered workspace search |
| `*[@lang]{ … }` / `gd` on a foreign hit | `textDocument/definition` |
| `gr` | `textDocument/references` |
| `$[@lang]{ caps }` | `initialize` capabilities / server info |

---

## Constraints

1. **Graceful absence** — If no TS server is available, `?[@ts]{…}` is a soft failure (diagnostic or empty), not a parse error. Same family as unresolved `~"…"`.
2. **No second truth** — Spw does not re-index foreign languages; it forwards.
3. **Reify results** — Hits become path + range so `gf`, document links, and underline stay one system.
4. **Scope is not language** — `@ts/packages/…` means “TS server, limited to subtree”, not a new path dialect.
5. **Latency is UX** — Foreign probes are async; they should feel like `?` (wonder), not like a local field read.

Evidence and audit posture follow [editor surface audit](../../../.spw/tooling/editor-surface-audit.spw): advertised → configured → invoked → observed → tested.

---

## Anti-patterns

- `ts://symbol/Foo` (or similar) in Spw source
- Embedding JSON-RPC / full LSP params in `.spw` surfaces
- One mega-probe blob that drops operator physics
- Auto-searching every registered LSP on bare `?`
- Treating `@ts/foo.ts` as *only* a filesystem path when the author needed symbols

---

## Rollout

| Phase | Deliverable |
|-------|-------------|
| 1 — Declare | `@ts: =lsp[typescript]` in roots/shelves; editor command “search in `@ts`” |
| 2 — Probe | `?[@ts]{ query }` → multiplex bridge → locations / quickfix |
| 3 — Landing | Results reify as path+range; reuse definition + document-link stacks |
| 4 — Compose | Query pipeline `from: [@ts, @spw]` for agents; still no protocol in surface language |

No phase claims “supported” until it is configured, invoked, and observed in an identity-free mounted fixture.

---

## Relationship to path navigation

Path units (`~"…"`, `~<path>`, `@root/path`) are the **landing strip**.  
Polyglot search is the **symbol runway** that should end on that strip.

Investment in path navigation ergonomics (full-span tokens, links, `gf`, angle paths) stays load-bearing: foreign resolve is only half-done until the author can open the landing with the same affordances as a native Spw path ref.

---

## Open questions

- Client-side multiplex (editor talks to many LSPs) vs server-side bridge (Spw LSP forwards)?
- How do server ids map to real process launch in mounted consumers?
- Should `*[@lang]{…}` ever bypass path reification for pure symbol UI?
- When does option 2 envelope appear in buffer syntax vs only in CLI?

---

## Invariants

1. Foreign LSPs are perspectives (`@`); searches are probes (`?`); landings are paths (`~` / `@root`).
2. Option 1 (roots-as-servers) is the preferred surface; option 2 (probe envelope) is an explicit alias family.
3. Path navigation remains the universal landing strip after any foreign resolve.
4. Spw addresses and forwards; it does not become a polyglot indexer.
