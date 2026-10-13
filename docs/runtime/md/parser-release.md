# Parser Releases

A parser release is a dated, immutable set of browser parser builds cut from one workbench revision. The workbench builds it; spw.quest serves it for other sites to import.

## Command

```bash
npm run bundle:parser -- --release 2026.10.13 [--offset 00] [--allow-dirty] [--out DIR]
npm run test:parser-release     # node:test: builds into a temp dir and checks the contract
```

- `--release` is a calendar day written `YYYY.MM.DD`.
- `--offset` is a two-digit cut within that release (default `00`).
- `--allow-dirty` builds from an uncommitted tree; the manifest and every stamp then say `"dirty": true`. Without it, a dirty tree is refused.
- `--out` replaces the default `release/parser` root (gitignored).

## Layout

```
release/parser/<release>/
  full/<offset>.min.js          parse, parseExpression, SPW_PARSER_BUILD (minified, no map)
  full/<offset>.debug.js        same exports, unminified
  full/<offset>.debug.js.map    external map, linked by a relative sourceMappingURL
  lite/<offset>.min.js          the scanner (packages/spw-seed/src/lite.ts) + SPW_PARSER_BUILD
  lite/<offset>.debug.js(.map)
  <offset>.js                   alias: byte-identical to full/<offset>.min.js
  manifest.json                 schema spw.parser-release/1
```

`full` keeps the export surface of the site's old `spw-workbench-parser.js` bundle, so existing imports keep working. `lite` must fit a budget of 5 KiB minified: the 4 KiB scanner budget from `build-js-dist.ts` plus room for the banner and stamp.

Every script exports a frozen `SPW_PARSER_BUILD` stamp: `package`, `version`, `commit` (12 hex), `source`, `release`, `offset`, `variant`, `form`, and `dirty` when it applies. The alias is the same bytes as `full/<offset>.min.js`, so its stamp says `full`/`min`.

`manifest.json` names the release, its current offset, the workbench package, version and 40-hex revision, the `spw-seed` version as `grammar`, the default file, and one entry per file (maps and the alias included) with `bytes`, `sha256` and an SRI `integrity` (`sha384-…`).

## Immutability

- Published files never change. If a rebuild's bytes differ from what an offset already holds, the build is refused and suggests the next free offset. A re-cut takes a new offset.
- Rebuilding the same offset from the same clean revision produces identical bytes and does nothing.
- `manifest.json` points at the release's newest offset and never moves back to an older one.
