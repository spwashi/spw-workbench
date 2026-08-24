# Changelog

This is the consumer-facing record of material workbench changes. `Unreleased` entries describe repository behavior that has landed but do not promise a package release or a `v0.4` boundary.

Version-local release records remain under `lib/spw-v*/CHANGELOG.md`. Commit `#[episode]{ ... }` blocks are the detailed engineering history behind these summaries.

## Unreleased — development snapshot, 2026-08-24

### Source fidelity and intermediate products

- Preserve exact inter-token gaps, comments, and spans while classifying visible relationships as `tight`, `open`, `cadence`, or `episode`.
- Retain dotted identifiers such as `a.b.c` with explicit segment metadata; leave trailing and repeated dots available to operator and connector tokenization.
- Add the portable `spw.progressive-product/1` protocol and source products for `tokens`, `structure`, and `trace` over one parser kernel.
- Make parse completeness explicit: standalone expressions consume the seed expression grammar, reject non-trivia remainders, and expose consumed/remaining spans, expected root, and prose fallback on parser and structure-product receipts.
- Add `spw inspect spacing` and `spw inspect source` projections as bounded tables, source-shaped Spw cards, complete JSON, or progressive NDJSON where supported.

### Parser ownership and authored-source validation

- Parse established `key: |` forms as indentation-bounded prose leaves that stop before sibling bindings and enclosing braces.
- Limit file dialect authority to a column-zero pragma or the declared seed profile, so an indented syntax example cannot retune its containing document.
- Keep operator suffixes and fallback modifiers on the operator's own line rather than allowing them to consume the next line's binding key.
- Distinguish operational expressions from notation exhibits and explanatory prose; proposed programs remain inspectable without acquiring runtime authority.
- Validate the authored corpus with the canonical `packages/spw-seed` parser while excluding registered derived surfaces and `.spw/gen/` products. The current strict source census passes 374 of 374 surfaces without warnings.

Compatibility note: a surface that depended on an indented example selecting the file dialect, or on a trailing operator claiming a next-line identifier, now parses differently. Use `spw inspect source` or `spw inspect spacing` to review the affected boundary before formatting or migration.

### Work, evidence, and performance controls

- Teach `--through` for the last source stage executed, `--events` for retained parser instrumentation, and `--sample` for visible example bounds.
- Teach `--spread near|standard|far` for the current `minimal|standard|full` corpus-work profiles across census, graph, density, formula, taste, and lattice.
- Report generated and retained parser/runtime events separately while preserving token, AST, runtime-value, and register invariants across retention policies.
- Defer loading the TypeScript compiler until authority analysis needs it, reducing ordinary CLI startup work without presenting a local timing probe as a release guarantee.

### CLI legibility and recoverability

- Make `spw doctor` products consumer-relative by default, add explicit `--paths absolute` disclosure, and report workbench HEAD/checkout/pin drift plus default corpus exclusions in human, Spw, and JSON forms.
- Make root help state observable outcomes before internal effect addresses, IR names, options, or aliases.
- Put canonical examples before compatibility routes and keep aliases routed to one implementation.
- Replace the public term `dual-read` with **Spw card**: source-shaped output readable as text and parseable as Spw.
- Keep recommendation commands copyable and pair each with the question answered and the additional work, retention, disclosure, or output cost.
- Preserve exact JSON/NDJSON products when human or Spw views sample rows or normalize visible control characters.

### Documentation and governance

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
