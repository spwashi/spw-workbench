# Grok replay handoff

Date: 2026-07-21 (revised)

## Stable state

`main` contains the reviewed reconciliation history and Grok-derived slices:

- `ba436e40` — merge the 13 reviewed safety-reconciliation commits
- `7471a4fd` — immutable, loss-disclosing form contours
- `1128e3f0` — explicit `effect.l1.memory` register-liminality bridge
- handoff commit (this file) — continuation evidence; revised as dirty slices land

Backup stash (pre-merge Grok tree): `c85227abb9631f360a895fe1979da1c6baeb870b`  
(applied, not popped — keep until remaining dirty files land or are rejected)

## Resolved since handoff (landed or ready to land)

### Path navigation contract

- **Half-open spans:** `SpwSelectorSpan` endOffset / endCharacter are exclusive (LSP Range).
  Consumers updated: navigation links, editing quickfix, display inlay path hints.
- **`~<path>`:** named as **LSP compatibility projection** (corpus nearest-neighbor edges);
  not claimed as Seed PathRef yet. Seed versioned syntax still open.
- **Neovim:** repo-shaped paths (`.spw/…`, `docs/…`, …) prefer workspace root over bufdir.
- **Semantic tokens:** full path units as `variable+definition`; `number` type added (same slice).
- **Highlighters:** TextMate (VS Code + IntelliJ), Neovim syntax + `gf` for angle paths.
- **Polyglot:** research only — not registered in `.spw/index` / workspace roots.

Verify: `npm run test:lsp` focused suites (path-refs, semantic-tokens, navigation, editing, analysis).

### Polyglot research quarantine

- Files may exist under `.spw/tooling/polyglot-lsp-search.spw` and
  `docs/runtime/md/polyglot-lsp-search.md`.
- Do **not** put `@lang: =lsp[…]` inside path roots; wait for perspectives/services.

## Remaining after theory/plan landing (expected)

### LSP notes (no longer blocking dirty tree)

- Regex allowlists still duplicated across selector, tokens, TextMate ×2, Neovim
  (align deliberately when Seed owns angle paths)
- Couple vs Capsule (`<>`) rendering still separate from path work
- Prefer Seed-owned `~<path>` before treating projection as permanent grammar
- Polyglot: research only until perspectives/services manifest

### Next product work

1. `form-geometry-editor` P0 (coupling hover + mobility actions)
2. Optional Seed versioned `~<path>` or shared path classifier
3. Plan ecology refresh after editor slices
4. Review poll on staged product commits

Do not drop the backup stash until confirmed empty of unrecovered value.
