# Plan: audit-data-attributes

## Goal

Make the installable-book preset's DOM hooks a checked contract. Each `data-*` name under `public/` is either read by `enhancements.js` or the CSS, or is declared inert in a test; the update notice is announced to assistive tech; and the install button's `hidden` state is honest.

The original plan (a 26-commit state-machine curriculum over `src/ui/elements`, `src/platform`, and `src/app/dom-sync`) was stranded when that layout vanished; on 2026-10-12 the user chose to rescope rather than archive.

Measured 2026-10-12 in `packages/spw-cli/templates/init/presets/installable-book/public`: `enhancements.js` writes `body[data-js]` and `body[data-online]` and nothing reads them; `data-edit-surface` appears 17 times in the HTML and nothing reads it; the data-spw-region value `nav` has no CSS rule; the notice built by `showUpdateNotice` has no `role` or `aria-live`; and `html.js-enhanced .js-only { display: initial }` may override the `hidden` attribute on the install button (a wonder in `wip.spw` carries the probe).

**Taste Note:** correctness and clarity. State that is reflected to the DOM has a reader, and accessibility semantics are stated, not assumed.

## Scope

- **In scope**: `enhancements.js`, `style.css`, `substrate.css`, the preset HTML pages, and one contract test in `packages/spw-cli/src`.
- **Out of scope**: component-level state machines (the preset has no components), visual restyling (that belongs to `audit-css-tokens`).

## Agentic Hygiene

- **Rebase target**: `main@551bb419` (2026-10-12)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated drift into `feature/audit-data-attributes-agentic-hygiene` before implementation commits

## Files

```
[NEW] packages/spw-cli/src/installable-book-hooks.test.ts
[MOD] packages/spw-cli/templates/init/presets/installable-book/public/assets/enhancements.js
[MOD] packages/spw-cli/templates/init/presets/installable-book/public/assets/style.css
[MOD] packages/spw-cli/templates/init/presets/installable-book/public/**/*.html   (only if data-edit-surface is stripped)
```

### Craft guard

- The contract test needs no browser; it reads files.
- Every inert entry carries a one-line reason.

## Commits

1. `![cli] — add installable-book-hooks.test.ts: every data-* name under public/ is read by enhancements.js or the CSS, or listed in an explicit inert set; every name enhancements.js queries appears in some page`
2. `&[cli] — mark the update notice built in showUpdateNotice with role=status so assistive tech announces it`
3. `&[cli] — resolve data-js and data-online per ?[online_marker]: add the CSS reader or delete the two dataset writes, and update the inert set`
4. `&[cli] — resolve data-edit-surface per ?[edit_surface_owner]: keep it in the declared inert set with a one-line owner note, or strip it from the nine HTML pages`
5. `&[cli] — keep the install button hidden until beforeinstallprompt, only if the install-button wonder confirms html.js-enhanced .js-only overrides [hidden]`

## Dependencies

- `audit-css-tokens` shares the preset CSS files; commit 5 touches `style.css`, so coordinate rebases.
- The old dependency on `refactor-import-sprawl` is dropped; no moved files remain to wait for.

## Spw Artifact

None planned. The contract test is the checkable record.
