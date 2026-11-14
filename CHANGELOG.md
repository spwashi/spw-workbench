# Changelog

This is the consumer-facing record of material workbench changes. `Unreleased` entries describe repository behavior that has landed but do not promise a package release or a `v0.4` boundary.

Version-local release records remain under `lib/spw-v*/CHANGELOG.md`. Commit `#[episode]{ ... }` blocks are the detailed engineering history behind these summaries.

## 2026-11-13 — parser release 2026.11.13

What a host gets by moving its pin from `9ef3d223`, or by importing the dated release's `reader.min.js`. Everything marked experimental may change its contract id, and none of the sound or speech has been heard by a listener yet.

### Version control from inside Spw files

- **Landing a planned commit.** On a planned line in a plan's commits block, `~[label]: "…"`, editors offer *Land label as <id> (HEAD)* and *as* any recent commit whose message names the label; the line becomes `.[label](id): "subject as committed"`, quotes escaped, nothing else touched. `spw vcs land <plan> [<label>] [--rev <rev>] [--write]` does the same from a terminal and lists a plan's planned lines. Seed's `readCommitLines`, `landedLineText` and `landCommit` (`spw.commit-lines/1`) hold the text half, so neither caller asks a version-control system to write a line.
- **Revision ids by workspace.** `REVISION_ID_FORMS` in seed's lexer names the shapes an id is written in: git SHA-1 hex (the default, so every file lexes as before), SHA-256 hex, and jj change ids (letters k to z, taken from jj's documentation; no jj was run). `lex(text, { planStream: true, commitRefForms })` reads a landed ref in the forms given. `@spwashi/spw-runtime/node` gains `detectVcs`, which reads from the workspace's files which forms it uses (SHA-256 from git's config, jj from a `.jj` directory); the language server passes them to highlighting, hover, links and diagnostics. A jj change id is read only where a line claims a commit, never in prose, since words such as "tomorrows" are spelled in the same letters; it hovers as a change, takes no link, and is never reported missing, because nothing asks git about it.
- **Ranges.** Both ends of `16fd5f8..aae308a9` (or with three dots) are cited hashes now; the second end was dropped before.
- **Git reading Spw.** `.gitattributes` sends `.spw` files through a `spw` diff driver, and `spw vcs diff-driver` prints the two `git config` lines that define it (per clone; git never takes a driver from a repository). Hunk headers then name the frame or anchor a change sits in: over this repository's last 60 commits touching `.spw` files, git's default named nothing for 1,102 of 1,104 hunks, and the driver names a frame or anchor for 1,024. `--word-diff` keeps `#>`, `..`, `~>` and the other marks whole, isolates `392` inside `%body[392]`, and does not split an em dash, under a UTF-8 or the C locale. The word pattern is derived from the lexer's operator and connector tables (`spwWordPattern`, `SPW_FRAME_LINE`). `--check` says whether a clone has it.
- Gap: the IntelliJ plugin maps no colour to the `commitRef` and `hashlike` token types; VS Code reads them as numbers and Neovim links them to `@number`.

### Reading a line aloud and by ear (experimental)

- `spokenLine` (`spw.spoken/1`) says one line in the names of its parts: `~garden[care]{seed, water}` → `potential garden, mode care, definition, list of 2: seed, water`. Joins are named, so lines that differ only in their join are said differently. A nested body says where it ends, and a pair label is said on both ends. Every clause carries the span it says. Every word comes from a table a host may replace (`SPOKEN_NAMES`, `SPOKEN_NAMES_SITE`). Over three corpora, no written character goes unsaid.
- `pairSound` (`spw.pair-sound/1`) gives every brace a click. Kind sets the pitch, depth lowers it and a pair label sets the timbre. A close is its open backward, and an edge with no partner carries a rough tone. A stretch is bounded by a start phrase and the same phrase backward. `renderClick`, `renderPairSound` and `wavBytes` are arithmetic and touch no audio interface. `npm run sound:pairs` writes a WAV file to listen to.
- `readEarcons` / `writeEarcons` (`spw.earcons/1`) tune that sound in one line of Spw: `^ear{ %body[392] %frame[523] %scene[659] %step[2] %ms[45] =rough[off] }`, with a number led by `%` and a choice by `=` as a story consumer's board line writes them, so one `^ear` line can carry that host's textures beside these settings. Every number is held to a range, and every word the reader cannot use is reported. A line written and read again gives the same settings.
- `=voice[modal]` picks a second voice for those clicks, modelled on struck objects, with every number measured on rendered samples:
  - kind is a texture (a bar, a string, a drum skin), so no two kinds share a click; the first voice had a `[ ]` at one depth equal to a `( )` two deeper;
  - every bare click holds at least 0.85 of its energy between 300 and 3,000 Hz, where the first voice's lowest held 0.027;
  - every click is set to one level (`%level`, default −24 dB RMS), where the first voice's clicks spread 7 dB;
  - a close is struck and damped, holding over half its energy in its first 10 ms where the first voice's held none;
  - a pair label is a phrase of up to three notes, and a close plays its open's events backward.

  Without the word, every click renders exactly as before. Nobody has heard either voice.
- Each click now carries `span`, the lines from its pair's open to its close.
- `pairMoves(scan, from, to)` lists, for a caret that moves, the pairs it left (innermost first, with each close's click) and entered (outermost first, with each open's click), and the innermost pair it sits in. An editor or a page plays exits and enters from it, and holds an aura on the pair it sits in.

### Pair labels (experimental)

- `scanPairLabels` (`spw.pair-labels/1`) reads `{_label … }_label` and the mirrored close `{_label … lebal_}` beside the parser, without changing any parse. A label makes a class, so labeled pairs may overlap. Each crossing is listed, a forward and a backward scan return the same pairs on any text, and a missing labeled close loses only its own pair. `pairLabelsAround` says which labeled spans cover an offset.

### Fixes a host will notice

- The caret lookup behind the editor's form hover and `formAt` now walks a postfix `(scope)` and `<capsule>`. A caret inside `@(topic)` found nothing before.
- The slot reader (`readLine`) no longer cuts a body at a dot that leads a word after a gap, as in `^kept{ .day[x] .chapter[y] }`. Before, it read those as a tight join and dropped the mark. Lines read differently: 4 of 172,022 here, 198 of 17,267 and 13 of 225,487 in two mounted consumers, and none of one consumer's 1,012 page expressions.
- The lexer reads a double close `))` as an n-range close only while an n-range `((` is open; otherwise it is two parentheses, so `x(a(b))` and a bracket holding `(a/(b))` read whole again. Lines read differently: 0 of 141,723 here, 89 of 14,784 and 109 of 203,342 in two mounted consumers, every one a call closing two parentheses; no file changed completeness.

### The command line

- `spw vcs` shows what version control holds here: kind (git, jj colocated or not, none), head and branch, the default branch, and every changed or untracked path with its age; `--since 30m` (or a clock time) keeps only what changed since then, which is what a session stages when other sessions' files share the tree. `spw vcs at <rev> -- <command>` runs a command in a clean checkout of a revision, with `{origin}` and `{checkout}` filled in and the checkout's own workspace packages linked, and removes it afterwards. A jj workspace is detected and its gaps named; no jj command runs yet.
- Bare `spw` prints a start page read from the `.spw` tree it runs in, and `spw help` still prints all 44 commands.
  - Outside a workspace it offers `spw init`.
  - Inside, it suggests a walk through the workspace's declared roots and index, and lists the three surfaces changed most recently.
  - It ends with what reading the tree cost, in files and milliseconds.
  - A `^"start"` frame in `.spw/workspace.spw` gives the workspace its own lines, and `recent: 0` skips the walk.
- `spw help --json` gives each command's flags as data, and `spw <command> --help --json` gives one command's. The flags are read from each command's help page, so the two agree; 272 flags across 43 of 44 commands.
- New commands for readers that had none: `spw say` (a line said in the names of its parts), `spw pairs` (labeled pairs, crossings, braces with no partner, the pairs around a place) and `spw hear` (a click per brace written to a WAV file under an ear line). `npm run sound:pairs` now runs `spw hear`.
- Six alias routes that nothing wrote are gone: `inventory`, `formulas`, `thrift`, `q`, `spwq` and `snip`. `spw measure thrift` still reads. npm scripts named for an alias now run the command by its name.

### Finding a form by example (experimental)

- `spw form <paths> --match '<example>'` lists every place a form is written, given by example with holes: `_` for any one subtree, `...` for any further siblings, and `_` alone inside a word (`lens(_)`) for any text there. Each hit gives where it starts and what filled each hole, and a paradigm lists what each hole was filled with across all hits. An example of several lines matches a run of neighbours. Seed's `compileShape`, `findShape` and `matchShape` (`spw.shape-match/1`) do the matching on parse columns.
- Parse columns have a byte form (`spw.parse-columns-bytes/1`, `columnsToBytes` / `columnsFromBytes`): every column as its own bytes on a four-byte boundary. Over this repository, reading 1,312 surfaces' columns back took 57 ms where parsing them took 90.7 s.
- `--match` reads columns from this process's memory, then `.spw/gen/session/columns`, then the parser. The disk key includes a fingerprint of the parser's source, so a parser change is never served a stale tree. `--cache read` never writes, and `--cache off` parses everything. Every run ends with which tiers gave the columns and what they cost: 104.9 s cold and 3.1 s warm for one example over this repository.

### Settings lines (experimental)

- `readSettingsLine(text, vocabulary)` reads a line of a head and marked terms, such as `^board{ =cues[shaped] @hold[upright] }`, `?find[haggle]{ @carrier[genie] %count[3] }` or `^ear{ %body[392] }`, against a host's own vocabulary of numbers held to ranges, choices and text. Every term comes back with its mark, word, value and span, known or not. The problems name unknown words, values it could not use, clamps, repeats, and marks other than the vocabulary gives. `writeSettingsLine` writes values back as a line that reads to the same values. The ear line reads its terms this way. It is in the browser reader bundle.

### Numbers (experimental)

- `readNumberForm` reads one written value whole, beside the parser:
  - a number with its sign, exponent, percent and unit (`45ms`, `50%`, `1e3`);
  - a ratio (`4/3`);
  - a range (`20..80ms`);
  - a measured number with its standard uncertainty (`9.810(20)`, `6.67430(15)e-11`, `9.81 ± 0.02`), a unit after it covering both;
  - and it refuses, with a reason, hex, `1_000`, `1/0` and `3:4`.

  Settings lines and the ear line take every number through it, and a word may list the units it accepts with their scale, so `%ms[0.045s]` reads as 45. A quantity sheet's expressions read their numbers through the same scanner, so a number reads the same in both. The lexer is unchanged, so no line reads differently: a value with a minus sign or `±` reads whole inside a term's brackets, but the parser still reports that character as a recoverable error: `lint:spw` passes such a file, and the strict parse check agents run before committing (`poll-review`) fails it (the open question `minus_sign`).
- A settings word can be a quantity of a dimension: length, time, angle, frequency, interval or ratio.
  - An absolute unit converts to its base and a relative one is kept as written.
  - A unit of another dimension is refused, so a beat written in `rem` is caught.
- A quantity can be derived from other words: `@body*1.5`, `@body/2`, `@body*@scale^3`.
- `writeCssProperties` writes the line as CSS custom properties:
  - a derivation as `calc()` over the property it names;
  - a range as `clamp()`;
  - and so `^type{ %body[1rem] %scale[5/4] %h1[@body*@scale^3] }` is a modular type scale in one line of Spw.
- A declared mass with anything written against its number (`8kb`, `1e3`, `50%`, a sign) is now unmeasurable. Before, it was read short, so a correction rewrote only its digits.

### Dimensional analysis (experimental)

- A quantity sheet is a Spw line whose terms define quantities as expressions over SI units (with prefixes), numbers, `pi` and other terms, such as `^planck{ %l_P[(@hbar*@G/@c^3)^(1/2)] }`.
  - Exponents are exact rationals.
  - A sum of different dimensions is refused.
  - Terms read in any order, and a sheet extends the ones before it.
- The SI constants ship as such a sheet, with the Planck units derived inside it.
- `piGroups` gives the dimensionless groups of a set of quantities (Buckingham π).
- `inNaturalUnits` reads a quantity with chosen constants set to one.
- `spw sheet <file.spw> [--si] [--in GeV] [--natural c,hbar --unit GeV] [--pi]` shows values, dimensions, units, natural units and groups.
- Checked against known values: the Planck units, 1/α = 137.035999084, the Sun's Schwarzschild radius, the Bohr radius, and the pendulum's T²g/L = 4π².
- `docs/theory/spw/dimensional-analysis.spw` holds the model and worked sheets.
- Measured numbers carry uncertainty: write `6.67430(15)e-11`, or `9.81 ± 0.02` on the command line (inside a `.spw` file the concise form is the one the parser lexes), and every derived value shows its propagated standard uncertainty (forward-mode derivatives, so an input used twice is counted once). The SI sheet carries CODATA uncertainties; the Planck length comes out `1.616255(18)e-35`.

### Spw on the GPU (experimental)

- `columnsToGpu` widens parse columns into fixed rows of eight u32 that a WGSL storage buffer reads (`WGSL_ROW` declares them).
- `uniformLayout`, `wgslStruct` and `packUniforms` turn a settings line, such as `^shader{ %zoom[4] %pan[-0.6] =palette[dusk] }`, into a uniform buffer and its WGSL struct from one table. Negative values written inside a settings line's brackets are kept by the settings reader; in a `.spw` file the parser still reports the minus (see Numbers).
- `npm run gpu:page -- <file.spw>` writes one page that draws the file's parse tree with WebGPU and retunes it live from a `^shader` line. Seen in Chrome.

### Editing by structure

- The language server answers `textDocument/selectionRange`: expanding a selection walks out from the word under the caret through every node that holds it, each span larger than the last and never starting or ending on a gap.
- It answers `textDocument/linkedEditingRange` for pair labels: with the caret on the label of `{_name … }_name`, both labels change as one.
- New code actions on a labeled pair: mirror a repeated close (`}_name` → `eman_}`), repeat a mirrored one, and give a labeled open's bare close its label.
- `spw rewrite <paths> --match '<example>' --into '<template>'` replaces every match with a template, where `_1`, `_2` … are what filled each hole and `_0` is the whole match. It shows each change and writes only with `--write`. A file the rewrite would leave reading worse (no longer complete, or fallen back to prose) is refused unless `--force`.
- Seed's `selectionSpans`, `pairLabelEdits` and `applyTextEdits` (`spw.structural-edit/1`) hold the readers behind all of it.

### Browser bundles

- `reader.min.js` now also exports the slot reader's sayer, the pair-label scan, the brace sound, the earcons and modal voice, the settings-line reader and writer, the number and quantity readers and the CSS property writer, beside `roles`, `outline`, `anchors`, `highlightHtml` and `readLine`. A host whose own bundle names its exports (a story consumer exports only `parse` and `readBias`) adds the names it wants.
- The physics readers (quantity sheets, dimensional analysis, uncertainty) and the GPU packers are in `workbench.min.js` and the seed package, not in `reader.min.js`.
- Every `2026.11.13` prerelease up to `pre.5` carries seed twice in `workbench.min.js` (95 to 104 files, about 185 KB): each was cut in a worktree nested in the main checkout, where `@spwashi/spw-seed` resolved to the outer checkout's files. `full`, `lite` and `reader` are unaffected, and sampled runtime results match a clean build. The builder now resolves workspace packages inside the tree it builds from and refuses any source from outside it; `pre.6` is the first clean cut, and a host on an earlier prerelease should move to it or to the day.

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
