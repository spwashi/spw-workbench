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

## Still dirty / do not merge wholesale

### Theory and plans

- Theory form-geometry / form-ladders / ladders / topography edits
- Untracked: `range-transform.spw`, `swap-grace.spw`, `form-geometry-editor/` plan
- Plan stream updates under `.agents/plans/*` (vscode-*, operational-topography, garden)
- Fix `swap-grace` Frame/`boundary_kind`/liminality before registration
- Plans must not call uncommitted work “landed”; use `effect.l0…l3` slugs

### Remaining LSP notes

- Regex allowlists still duplicated across selector, tokens, TextMate ×2, Neovim
  (align deliberately when Seed owns angle paths)
- Couple vs Capsule (`<>`) rendering still separate from path work
- Prefer Seed-owned `~<path>` before treating projection as permanent grammar

## Suggested continuation order

1. Land path-nav product slice(s) if not already committed (selector + tokens + editors).
2. Land polyglot **research docs only** (no index registration).
3. Correct theory surfaces (`swap-grace`, effect slugs), then theory/plan commits.
4. Refresh plan ecology last after product commits.
5. Review poll: `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged --no-state`

Do not drop the backup stash until remaining dirty files have landed or been rejected.
