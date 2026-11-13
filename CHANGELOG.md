# Changelog

This is the consumer-facing record of material workbench changes. `Unreleased` entries describe repository behavior that has landed but do not promise a package release or a `v0.4` boundary.

Version-local release records remain under `lib/spw-v*/CHANGELOG.md`. Commit `#[episode]{ ... }` blocks are the detailed engineering history behind these summaries.

## 2026-11-13 — parser release 2026.11.13 (prepared, not yet cut)

What a host gets by moving its pin from `9ef3d223`, or by importing the dated release's `reader.min.js`. Everything marked experimental may change its contract id, and none of the sound or speech has been heard by a listener yet.

### Reading a line aloud and by ear (experimental)

- `spokenLine` (`spw.spoken/1`) says one line in the names of its parts: `~garden[care]{seed, water}` → `potential garden, mode care, definition, list of 2: seed, water`. Joins are named, so lines that differ only in their join are said differently. A nested body says where it ends, and a pair label is said on both ends. Every clause carries the span it says. Every word comes from a table a host may replace (`SPOKEN_NAMES`, `SPOKEN_NAMES_SITE`). Over three corpora, no written character goes unsaid.
- `pairSound` (`spw.pair-sound/1`) gives every brace a click. Kind sets the pitch, depth lowers it and a pair label sets the timbre. A close is its open backward, and an edge with no partner carries a rough tone. A stretch is bounded by a start phrase and the same phrase backward. `renderClick`, `renderPairSound` and `wavBytes` are arithmetic and touch no audio interface. `npm run sound:pairs` writes a WAV file to listen to.
- `readEarcons` / `writeEarcons` (`spw.earcons/1`) tune that sound in one line of Spw: `^earcons{ .body[392] .frame[523] .scene[659] .step[2] .ms[45] .rough[off] }`. Every number is held to a range, and every word the reader cannot use is reported. A line written and read again gives the same settings.
- `pairMoves(scan, from, to)` lists, for a caret that moves, the pairs it left (innermost first, with each close's click) and entered (outermost first, with each open's click), and the innermost pair it sits in. An editor or a page plays exits and enters from it, and holds an aura on the pair it sits in.

### Pair labels (experimental)

- `scanPairLabels` (`spw.pair-labels/1`) reads `{_label … }_label` and the mirrored close `{_label … lebal_}` beside the parser, without changing any parse. A label makes a class, so labeled pairs may overlap. Each crossing is listed, a forward and a backward scan return the same pairs on any text, and a missing labeled close loses only its own pair. `pairLabelsAround` says which labeled spans cover an offset.

### Fixes a host will notice

- The caret lookup behind the editor's form hover and `formAt` now walks a postfix `(scope)` and `<capsule>`. A caret inside `@(topic)` found nothing before.
- The slot reader (`readLine`) no longer cuts a body at a dot that leads a word after a gap, as in `^kept{ .day[x] .chapter[y] }`. Before, it read those as a tight join and dropped the mark. Lines read differently: 4 of 172,022 here, 198 of 17,267 and 13 of 225,487 in two mounted consumers, and none of one consumer's 1,012 page expressions.

### Browser bundles

- `reader.min.js` now also exports the slot reader's sayer, the pair-label scan, the brace sound and the earcons, beside `roles`, `outline`, `anchors`, `highlightHtml` and `readLine`. A host whose own bundle names its exports (a story consumer exports only `parse` and `readBias`) adds the names it wants.

## Unreleased — development snapshot, 2026-08-24

### Source fidelity and intermediate products

- Preserve exact inter-token gaps, comments, and spans while classifying visible relationships as `tight`, `open`, `cadence`, or `episode`.
- Retain dotted identifiers such as `a.b.c` with explicit segment metadata; leave trailing and repeated dots available to operator and connector tokenization.
- Add the portable `spw.progressive-product/1` protocol and source products for `tokens`, `structure`, and `trace` over one parser kernel.
- Make parse completeness explicit: standalone expressions consume the seed expression grammar, reject non-trivia remainders, and expose consumed/remaining spans, expected root, and prose fallback on parser and structure-product receipts.
- Bind same-line postfix `[frame]`, `{body}`, `(scope)`, and shell `<capsule>` onto one identifier-led expression so a taught noun contour is one form, not juxtaposed sequence steps.
- Add `spw inspect spacing` and `spw inspect source` projections as bounded tables, source-shaped Spw cards, complete JSON, or progressive NDJSON where supported.

### Parser ownership and authored-source validation

- Parse established `key: |` forms as indentation-bounded prose leaves that stop before sibling bindings and enclosing braces.
- Limit file dialect authority to a column-zero pragma or the declared seed profile, so an indented syntax example cannot retune its containing document.
- Keep operator suffixes and fallback modifiers on the operator's own line rather than allowing them to consume the next line's binding key.
- Distinguish operational expressions from notation exhibits and explanatory prose; proposed programs remain inspectable without acquiring runtime authority.
- Rank the `;` sequential and `||` parallel schedule marks as sequence separators beside `,` and `=>`: `<< a ; b ; c >>`, `{ a ; b ; c }`, and `#[a ; b ; c]` now read as sibling steps rather than one term chain, and `Sequence.separators` records which mark was written. Plain chain connectors (`..`, `->`, `~>`, `|`, `/`) are unchanged.
- Lex `~>` as one project-join connector so a body such as `{sow ~> tend ~> harvest}` stays structured instead of degrading to prose.
- Validate the authored corpus with the canonical `packages/spw-seed` parser while excluding registered derived surfaces and `.spw/gen/` products. The current strict source census passes 374 of 374 surfaces without warnings.

Compatibility note: a surface that depended on an indented example selecting the file dialect, on a trailing operator claiming a next-line identifier, or on `;` / `||` chaining terms inside one expression, now parses differently. Use `spw inspect source` or `spw inspect spacing` to review the affected boundary before formatting or migration.

### Work, evidence, and performance controls

- Teach `--through` for the last source stage executed, `--events` for retained parser instrumentation, and `--sample` for visible example bounds.
- Teach `--spread near|standard|far` for the current `minimal|standard|full` corpus-work profiles across census, graph, density, formula, taste, and lattice.
- Report generated and retained parser/runtime events separately while preserving token, AST, runtime-value, and register invariants across retention policies.
- Defer loading the TypeScript compiler until authority analysis needs it, reducing ordinary CLI startup work without presenting a local timing probe as a release guarantee.

### CLI legibility and recoverability

- Make `spw doctor` products consumer-relative by default, add explicit `--paths absolute` disclosure, and report workbench HEAD/checkout/pin drift plus default corpus exclusions in human, Spw, and JSON forms.
- Accept mutually exclusive file, `--stdin`, or `--text` input for source/spacing inspection, and prove that a source-inspection Spw card round-trips as complete structure with its plane, file, and through bindings intact.
- Make root help state observable outcomes before internal effect addresses, IR names, options, or aliases.
- Put canonical examples before compatibility routes and keep aliases routed to one implementation.
- Replace the public term `dual-read` with **Spw card**: source-shaped output readable as text and parseable as Spw.
- Keep recommendation commands copyable and pair each with the question answered and the additional work, retention, disclosure, or output cost.
- Preserve exact JSON/NDJSON products when human or Spw views sample rows or normalize visible control characters.
- Add `spw fingerprint` (AST Type=count contour), `spw resolve` (classified pathRefs), and `spw lint` (axis annotations and unique `#>` anchors).
- Count `~#name:` lattice cells as a distinct colon species so annotation-heavy corpora are not an empty field.
- Skip `_workbench` and `build` in default corpus walks; `--include-infrastructure` / `--all` opts back in. `.git` stays skipped.
- Add compact `spw query --stats` receipts: files walked/parsed, bytes, parse_ms, total_ms.

### Documentation and governance

- Treat editor hosts as peer feedback surfaces: they owe depth and respect parity of questions and receipts, while remaining optional projections rather than a completeness program or release gate.
- Add `cache.layer/1` so CLI, LSP, VS Code, and Neovim name the same four cache planes, including omissions.
- Emit `spw.refactor.plan/1` from `spw refactor --json`: effect grade, rules as data, and named omissions for hashes, parent plan, worktree apply, and rebase.
- Synchronize the CLI convention with all 37 canonical commands and their route-only aliases.
- Separate implemented behavior, proposed migration work, and interpretive metaphor so aspiration does not masquerade as runtime fact.
- Record inspection as local and read-only by default; exploratory syntax, editor activity, and cache warmth do not become person-level authority evidence.

### Editor instruments

- Give VS Code, IntelliJ/WebStorm, and Neovim a recognizable Form → Stack → Cache → Rename → Refactor Plan sequence without moving semantic ownership out of the shared LSP and CLI.
- Preserve host contour: guided side-by-side live views in VS Code, structure/action/typed-preview integration in IntelliJ/WebStorm, and terse composable scratch-buffer commands in Neovim.
- Keep file probes live in VS Code and Neovim; make IntelliJ saved-file probes refuse dirty-buffer ambiguity and open reusable read-only Spw/JSON results.
- Add plan-only corpus refactor actions that preserve the consumer repository as process authority, discover a project or mounted-workbench CLI, and never add `--write`.
- Make the VS Code TTL probe cache inspectable while naming it separately from LSP session reflection and runtime/CLI caches.

### Editor compatibility and mounted launch

- Build the IntelliJ/WebStorm plugin with Java 21 and declare compatibility with IntelliJ Platform builds 242 through 262.x.
- Verify the plugin against WebStorm 2026.2.0.1 and 2026.2.1 while retaining WebStorm 2024.2.1 as the build floor.
- Resolve an explicit command, a project-local workbench, or a mounted `.spw/_workbench` launcher in that order without transferring workspace authority to the tool checkout.
- Keep platform branch 263 as an explicit native-LSP substrate decision rather than widening compatibility beyond verified APIs.

### Compatibility and open boundaries

- Compatibility spellings remain available: `--product`, `--event-policy`, source/spacing `--limit`, and corpus `--depth` route to their canonical controls.
- Gap classes remain observational. This snapshot does not activate semantic spacing affinity or formatter migrations.
- Sparse indexes, generator-event suppression, parser bundle entry points, alias removal, and a shared meaning for `v0.4` remain open work rather than release claims.

### Episode map

The detailed engineering history remains linear and queryable through these inclusive episode spans:

- `cdd0b40a–0fb37533` — spacing evidence, progressive products, and recoverable CLI controls
- `cb84c040–ba40cea9` — CLI language, metaphor boundaries, and the first consumer changelog
- `1864c0d9–0db31751` — WebStorm compatibility, mounted launch, and verification
- `a3e54329–f01a1d4c` — cross-editor Form, Stack, Cache, Rename, and Refactor Plan instruments
- `bbf75ecd–459ce61e` — parser ownership, corpus conventions, notation exhibits, and strict validation

Continue with [Spacing and Progressive Inspection](docs/runtime/md/spacing-and-progressive-inspection.md), the [CLI convention](.spw/conventions/cli.spw), the [editor and LSP contract](docs/runtime/md/lsp-editor-integration.md), or the [IntelliJ/WebStorm compatibility surface](extensions/intellij-spw/README.md).

## Version-local histories

- [Spw v0.3.0](lib/spw-v0.3.0/CHANGELOG.md)
- [Spw v0.2.0-alpha](lib/spw-v0.2.0-alpha/CHANGELOG.md)
- [Spw v0.1.0-alpha](lib/spw-v0.1.0-alpha/CHANGELOG.md)
