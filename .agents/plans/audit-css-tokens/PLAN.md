# Plan: audit-css-tokens

## Goal

Make the installable-book preset's token layer complete, so a `season.css` override re-themes every color on the page.

The preset lives in `packages/spw-cli/templates/init/presets/installable-book/public/assets`. `substrate.css` defines the `--spw-*` scale (ground, figure, accent, ink, muted, line, unit, beat, measure, leading, shadow, radius). `style.css` consumes it (28 uses of `--spw-beat`, 7 of `--spw-line`) but still carries five `oklch(...)` literals, which hardcode hue 45 or 80 and therefore ignore both a season override and `data-spw-affect`. `season.css` is today only comments, so the swappable-season promise is unproven.

The original plan (a 26-commit token curriculum over `src/ui/tokens`) was stranded when that layout vanished; on 2026-10-12 the user chose to rescope rather than archive.

**Taste Note:** correctness (one source of truth per color role) and clarity (a promise a test can falsify).

## Scope

- **In scope**: `substrate.css`, `style.css`, `season.css` of the installable-book preset; one guard test in `packages/spw-cli/src`.
- **Out of scope**: component behavior, other presets, the `docs/design` surfaces (no hex values remain there; measured 2026-10-12).

## Agentic Hygiene

- **Rebase target**: `main@551bb419` (2026-10-12)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated drift into `feature/audit-css-tokens-agentic-hygiene` before implementation commits

## Files

```
[MOD] packages/spw-cli/templates/init/presets/installable-book/public/assets/substrate.css
[MOD] packages/spw-cli/templates/init/presets/installable-book/public/assets/style.css
[NEW] packages/spw-cli/src/installable-book-tokens.test.ts
```

### Craft guard

- A token needs at least two uses or a season-override reason; no speculative scale.
- The default look of a fresh `spw init` site must not change.

## Commits

1. `#[cli] — name the preset washes in substrate.css: an accent wash, an ink wash, a figure veil, and the ground lift as tokens derived from the base tokens`
2. `&[cli] — replace the five oklch literals in style.css (lines 20, 21, 47, 204, 218) with those tokens`
3. `![cli] — add installable-book-tokens.test.ts: style.css names no color literal, and every --spw-* in the season.css example block exists in substrate.css`
4. `#[cli] — add a font-size scale to substrate.css and retire the rem literals in style.css, only if ?[type_scale] is answered yes`

Original commits 1, 2 and 26 and 3 to 25 are recorded under `^["done"]` in `wip.spw`.

## Dependencies

- `audit-data-attributes` shares the same preset files; land one plan's CSS commits before the other's rebase.
- `ecosystem-surface-governance` consumes the settled token vocabulary.

## Spw Artifact

None planned. The test in commit 3 is the checkable record.
