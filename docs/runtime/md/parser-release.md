# Parser Releases

A parser release is a dated, immutable set of browser parser builds cut from one workbench revision. The workbench builds it; spw.quest serves it for other sites to import.

## Names

Every cut is a folder named for a release day, in one of three shapes:

| Name | Kind | Cut with |
|------|------|----------|
| `2026.10.13` | release | `--release 2026.10.13` |
| `2026.10.13-pre.N` | prerelease, tried before the day | `--pre --target 2026.10.13` |
| `2026.10.13-patch.N` | patch, a fix to a published day | `--patch --target 2026.10.13` |

Within a day the order is `pre.1 … pre.N`, then the release, then `patch.1 … patch.N`; across days, by day. This is not semver's order (semver would sort `-patch.N` before the day), so spw.quest orders names itself.

## Command

```bash
npm run bundle:parser -- --release YYYY.MM.DD [--allow-dirty] [--out DIR]
npm run bundle:parser -- --pre --target YYYY.MM.DD [--allow-dirty] [--out DIR]
npm run bundle:parser -- --patch --target YYYY.MM.DD [--allow-dirty] [--out DIR]
npm run test:parser-release     # node:test: builds into temp dirs and checks the contract
```

- `--release` is a calendar day written `YYYY.MM.DD`. A day is cut once.
- `--pre` and `--patch` take the day from `--target` and number the cut among that day's cuts of the same kind. The same revision cut again keeps its number; any other revision takes the next one.
- `--allow-dirty` builds from an uncommitted tree; the manifest and every stamp then say `"dirty": true`. Without it, a dirty tree is refused.
- `--out` replaces the default `release/parser` root (gitignored).

## Layout

```
release/parser/<name>/
  parser.js             the default: byte-identical to full.min.js
  full.min.js           parse, parseExpression, SPW_PARSER_BUILD (minified, no map)
  full.debug.js         same exports, unminified
  full.debug.js.map     external map, linked by a relative sourceMappingURL
  lite.min.js           the scanner (packages/spw-seed/src/lite.ts) + SPW_PARSER_BUILD
  lite.debug.js(.map)
  reader.min.js         roles, outline, anchors, highlightHtml, parse, parseExpression + SPW_PARSER_BUILD
  reader.debug.js(.map)
  workbench.min.js      seed's whole API, the runtime (runSpw, hot sessions), the reader, formAt and formHover + SPW_PARSER_BUILD
  workbench.debug.js(.map)
  manifest.json         schema spw.parser-release/2
```

`full` keeps the export surface of the site's old `spw-workbench-parser.js` bundle, so existing imports keep working. `lite.min.js` must fit 5 KiB: the 4 KiB scanner budget from `build-js-dist.ts` plus room for the banner and stamp.

`reader` is what the editor reads from one file, as functions a page can call (packages/spw-lsp/src/reader.ts):

- `roles(text, { path })`: the role stream the language server sends as semantic tokens, one `{ line, char, length, role, modifiers }` per token, 0-based. A `path` under `.agents/plans/` reads landed commit refs as `commitRef`; any other hash-shaped run is `hashlike`.
- `outline(text)`: the document symbols the editor shows.
- `anchors(text)`: each `#>name` and where the parser binds it.
- `highlightHtml(text, { classPrefix })`: the file as escaped HTML, each role a span with classes such as `spw-keyword spw-declaration`. A site styles the classes; no colours are baked in.

`workbench` is everything that runs without node: seed's whole package (parsing, formatting, fingerprints, geometry, measures, quests), the runtime's root (`runSpw`, `createHotSession`, the pipeline), the reader functions, and caret form context: `formAt(text, { line, character })` returns the node, label, coupling, and mobility rewrites the editor's form hover reads, and `formHover` returns that hover as Markdown. Seed hashes with a synchronous SHA-256 over UTF-8 bytes (`sha256Hex`, the same digest node:crypto gives), so no stored hash changed when seed left node:crypto. The runtime's filesystem surface, mount resolution and composition evaluation, lives at `@spwashi/spw-runtime/node` and stays out. About 411 KB minified, 125 KB gzipped; `reader` stays the small choice for a page that only highlights.

The reader build points `@spwashi/spw-seed` at `packages/spw-seed/src/reader.ts`, the slice of seed that never reaches a node built-in. Anything needing the workspace, git or the runtime (cross-file definitions, commit links, plan streams, probes) stays with the language server. `packages/spw-lsp/src/__tests__/reader.test.ts` holds the reader to the server, token for token, and fails if a node built-in reaches it.

Every script exports a frozen `SPW_PARSER_BUILD` stamp: `package`, `version`, `commit` (12 hex), `source`, `release` (the folder name), `variant`, `form`, and `prerelease: true`, `patch: true` or `dirty: true` when they apply. `parser.js` is the same bytes as `full.min.js`, so its stamp says `full`/`min`.

`manifest.json` names the cut (`name`, `kind`, `day`, and `pre` or `patch` as a number), the workbench package, version and 40-hex revision, the `spw-seed` version as `grammar`, the default file (`parser.js`), and one entry per file (maps and the alias included) with `bytes`, `sha256` and an SRI `integrity` (`sha384-…`).

## Immutability

- Published files never change. If a rebuild's bytes differ from what a name already holds, the build is refused. For a release day, the refusal says to cut a patch.
- Rebuilding the same name from the same clean revision produces identical bytes and does nothing.
- A prerelease is not promoted by renaming: on release day, `--release YYYY.MM.DD` from the same revision cuts files whose stamps name the release. The manifests' revisions match.

## On spw.quest

- `/parser/<name>/` serves any cut; dated paths cache for a year.
- `/parser/latest.js` is the newest release or patch; `/parser/next.js` is the newest prerelease. Both are short-cached and for trying, not for importing.
- Releases and patches are tracked in the site's git; prereleases deploy from gitignored assets and can be pruned.
- `?parser=next|latest|<name>` on the guide runs that parser for one visitor.
