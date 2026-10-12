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
- **Rebase cadence**: rebase before name_preset_washes and again before merge
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

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Dependencies

- `audit-data-attributes` shares the same preset files; land one plan's CSS commits before the other's rebase.
- `ecosystem-surface-governance` consumes the settled token vocabulary.

## Spw Artifact

None planned. The test in token_guard_test is the checkable record.
