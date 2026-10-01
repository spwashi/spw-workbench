## highlighting

# Spw rendering with and without color: what each layer paints, what plain text carries, and how to use highlighting as a practice scaffold

**Evidence labels.** (a) canon (repo `.spw`/docs), (b) code, (c) aspirational or proposed. "Verified" means I ran it on the exemplar or on a probe file.

**Path abbreviations.**
- `sem` = `packages/spw-lsp/src/handlers/semantic-tokens.ts`
- `deco` = `extensions/vscode-spw/src/surface-decorations.ts`
- `tm` = `extensions/vscode-spw/syntaxes/spw.tmLanguage.json`
- `ijtm` = `extensions/intellij-spw/src/main/resources/textmate/spw.tmLanguage.json`
- `disp` = `packages/spw-lsp/src/handlers/display.ts`
- `water` = `cut-staging/2026-09-30/matter/water.spw`, current 148-line version. The contract and water changed during this run; line numbers are for the current files.

## 0. Findings in brief

1. **None of the four color layers reads the parser.**
   - (b) The TextMate grammar, the LSP "semantic" tokens (`sem:105-412`, a character scanner) and the decorations (`deco:264-445`) are all regex.
   - The only rendering that shows what the parser actually sees is `spw inspect source --through tokens`, verified.
   - (a) `.spw/tooling/vscode-spw.spw:108` forbids "a second editor-only semantics stack". In practice there are three, and they disagree with the parser and with each other.
2. **Claim status is invisible in every rendering.**
   - `#!settled`, `#!contested` and `#!speculative` get the same color in each layer (verified, water:45/89/143).
   - The decoration "status tiers" key on `status: implemented|partial|proposed|deprecated` (`deco:147-154,391-403`). That is a different vocabulary from the cut's claim statuses.
3. **With the grammar alone and a stock theme, Spw roles collapse.**
   - VS Code 1.139's default theme is "Dark 2026" (verified in the installed build).
   - `#>`, `#:`, `#!`, `~#` and `#topic` all resolve to one color (`entity.name.tag`, #7ee787).
   - All operator sigils resolve to #d4d4d4, which is almost the default foreground.
   - Only these stand out: comments, strings, numbers, path refs, and `^["x"]` frames (bold heading).
4. **Apostrophes blank or swallow text.**
   - The decoration mask starts a "string" at any `'` outside `"…"` and `//`, and the mask crosses newlines (`deco:89-109`). That includes apostrophes in `#` lines and in apposition bodies.
     - Heuristic scan: 78 of 786 tracked `.spw` files have lines whose decorations are blanked, 3,562 lines in all.
     - Verified example: `docs/theory/spw/materials-ontology.spw:3` ("Spw's") blanks decorations from line 3 to about line 103.
   - The IntelliJ grammar copy opens a `'` string with no lookbehind (`ijtm:172`). Verified: `~#lens(it's …)` turned lines 18–26 of a probe file into one string.
5. **Apposition bodies, handles and `#` prose are painted as code.**
   - `~#(… 1900 to 1936 …)` (water:125): the digits are painted as numbers, and `#` as a schema operator in TextMate.
   - `water.rho_ice_g_cm3`: the final `3` is painted as a number by both TextMate and the semantic tokens. The parser sees one IDENTIFIER (verified).
   - The semantic layer paints `.` in `#` title prose as an operator and the digits in `# Cut Contract 2026-09-30` as numbers (verified).
6. **The palette connotes merit, against canon.**
   - (b) `package.json:249-253`: boon is "growth, implemented state" (teal-green); bane is "hazard, error state" (#F44747 red).
   - (a) `docs/theory/spw/valence-architecture.spw:39-40` says valences are "charge-neutral … not moral judgment"; the cut's `vocabulary.spw:53` says "material quality, not merit".
7. **The palette is small, collides with itself, and has color-vision problems.**
   - 23 color ids map to 13 distinct hexes in dark mode and 14 in light.
   - Under a deuteranopia simulation, the dark anchor (#D16969) and intent (#CE9178) differ by ΔE76 ≈ 8, and `?` vs `%` by ≈ 4.
   - In light mode, valenceBone and tierWarm (#BF8803) have 3.1:1 contrast on white, below WCAG's 4.5:1.
8. **The cut is very legible as plain text, but two tools misread it.**
   - The cut's own conventions hold everywhere:
     - Every code line in water, contract and vocabulary is indented exactly one space per nesting level (1.00).
     - 12 of 12 anchors sit at a boundary and are followed by the frame they name.
     - Every top-level frame has a blank line before it.
     - 67% of water's structural lines begin with a sigil or a closer.
   - `spw skim` computes depth as `floor(indent/2)` (`packages/spw-cli/src/view.ts:233`), so it flattens the cut's nesting.
   - `spw format --profile layout` treats `#[` sets and `#topic` tags as trailing comments and pads them to a column (`packages/spw-seed/src/canonical/canonicalize.ts:257-265`; verified on water:27-38).
9. **The CLI is already the monochrome environment.**
   - It emits no ANSI color except in `init.ts:12-14`, where it is unconditional (no NO_COLOR or isTTY guard).
   - It carries structure with glyphs (◆ · ~ @ ?), box-drawing rules, visible whitespace (· ↵) and Spw cards.
   - It already has most of the metacognitive verbs: check (`measure` verdicts match/drift/undeclared/unmeasurable; `taste --fidelity`; `lint`), compare (`delta`, `cycle`, `format --profiles`/`--pulse`, `expand`) and plan (`^["next"]` command/purpose/cost cards).
   - What it lacks is a **predict** slot.
10. **Research.** Syntax highlighting has small or null objective effects on comprehension and a consistent subjective preference (Sarkar 2015; Hannebauer et al. 2018; Beelders & du Plessis 2016). The fluency literature (Rhodes & Castel 2008) suggests that color can raise felt understanding without raising understanding. So:
    - Monochrome practice should be justified by generation and pretesting (the reader supplies the roles), not by "difficulty". Perceptual-disfluency benefits have not replicated.
    - Color is best used as a feedback or reveal channel, as Hannebauer et al. conclude.

---

## 1. What each rendering colors

### 1.1 Layers and precedence (b)

| Layer | Where it runs | Source | Toggle |
|---|---|---|---|
| Plain text | terminal `cat`/`less`, the `spw` CLI, print, Obsidian/Notion pasted as a code block (the Obsidian and Notion part is unverified) | — | — |
| TextMate grammar | VS Code (`tm`); JetBrains uses a drifted copy (`ijtm`) | 15 top-level rule groups | VS Code: switch language mode to Plain Text, or use `editor.tokenColorCustomizations` |
| LSP semantic tokens | VS Code (theme "Dark 2026" has `semanticHighlighting: true`, verified); JetBrains unverified | `sem`: 9 types, 6 modifiers (`sem:75-78`); `semanticTokenScopes` in `package.json:281-307` | `editor.semanticHighlighting.enabled` |
| Decorations | VS Code only | `deco:191-445`; foreground plus font weight (600 by default, 700 bold, 400 italic, `deco:175-188`); overview-ruler lanes | `spw.surface.*` ×5 (`package.json:181-205`) |
| Inlay hints and hover | VS Code (JetBrains through the platform LSP client, unverified) | `disp:1203-1350` | `spw.inlayHints.*` ×3, read only at initialize; `editor.inlayHints.enabled` |
| JetBrains extras | gutter icons for `#>` and `^` frames (`SpwAnnotationLineMarkerProvider.kt:28-54`), folding, structure view | — | IDE gutter settings |

Precedence in VS Code, as I understand it:
- Where a semantic token exists, it replaces the TextMate foreground.
- A decoration's `color` is drawn on top of both.
- The order among overlapping decorations (for example `#>` as anchor and `>` as brace) is **unverified**.
- Whether TextMate's bold on `markup.heading` survives a semantic override is **unverified**.
- The theme colors below come from a scope resolver I wrote to approximate VS Code's matching; treat them as close, not exact.

### 1.2 Construct matrix (water and contract, plus probe `reading/probe/constructs.spw`)

**Colors used below**, Dark 2026 unless marked:
- TextMate: annotation tag #7ee787; heading #79c0ff bold; operators #d4d4d4; string #a5d6ff; number #b5cea8; path-ref #4EC9B0; comment #8b949e.
- Semantic tokens: keyword #C586C0; type #4EC9B0; function #d2a8ff; property.declaration #7ee787; property.readonly #79c0ff; variable #c9d1d9.
- Decorations use the dark `spw.*` defaults from `package.json:230-253`.

| Construct (line) | Plain-text cue | TextMate (`tm`) | Semantic (`sem`) | Decoration, drawn on top (`deco`) | Parser (verified) | Misleads |
|---|---|---|---|---|---|---|
| `# Water` title (1-3) | `# ` + space | `comment.line.hash` (`tm:85`), gray | `.` → operator; digits → number (contract:1 `2026 09 30`); `?`/`!` → function (`sem:122-125` is a no-op for `# ` lines) | `?` `!` `(` `)` colored; `#` lines are not masked | COMMENT (hash prose) | prose punctuation looks like code |
| `#>matter_water` (5) | `#>` at the left edge | anchor tag #7ee787 | keyword+declaration #C586C0 (`sem:233-238`) | `#>` spw.anchor #D16969 + left ruler; `>` also brace-gold bold | PARTICLE (deixis) | same color as `^`, `%` and `$%[` in the semantic layer |
| `#:layer`, `#:claim` (6, 45) | `#:` | `annotation.lens` → #7ee787 | type+definition #4EC9B0; code comment calls it "#:lens" (`sem:216`) | `#:` spw.lens #4EC9B0; hover "lens annotation (#:)" (`deco:305`) | PARTICLE (case) | named "lens"; canon calls it case |
| `#!settled` / `#!contested` / `#!speculative` (45, 89, 143) | `#!` + word | `annotation.intent` #7ee787 | function+modification #d2a8ff | `#!` #CE9178, plus `!` again as action | PARTICLE (mood) | **all statuses look the same** |
| `#:valence #!bone` (11) | `#!` + pentad word | intent tag; the valence rule matches later on the line and loses (`tm:245`) | function+modification | `!bone` valenceBone #CCA700 bold, by accident of `/!(boon…)\b/` (`deco:359`) | PARTICLE | valence gets color only through that accident; bare `valence: boon` and `=bane~` get none (probe:7,9) |
| `^"emit"{` (14) | `^"` | `^` integration #d4d4d4 + string | `^` keyword+declaration + string | `^` #B07EE0; `{` gold bold | Operation(^ subj) | renders differently from `^["x"]` |
| `^["edges"]{` (31) | `^["` | whole token `markup.heading.section` #79c0ff **bold** (`tm:399`) | `^` keyword, `[` op, string, `]` op, which overrides the heading color | `^` purple; brackets gold | Operation(^ frame) | the "heading" affordance disappears when semantic tokens are on |
| keys `statement:` `source:` (46, 48) | word + colon | no scope | none | none | Binding | none; keys stay default foreground in every layer |
| `"…"` strings | quotes | #a5d6ff | string | masked (not decorated) | Literal | — |
| `~#title:` (15) | `~#` | annotation tag #7ee787 | property+declaration #7ee787 | `~#title:` #57D6A3 italic, not gated by any setting (`deco:272,424`) | ANNOTATION | `package.json:204` says highlightSemantics controls it; it does not |
| `~"../registries/…#src_crc_handbook"` (48) | `~"` … `#anchor` | path-ref #4EC9B0 (`tm:140`) | variable+definition #4EC9B0 | #9CDCFE italic + right ruler | PathRef | the fragment is not distinguished; skim truncates it (§2.3) |
| `#hydrogen_bond` (36) | `#word` | topic tag | type #4EC9B0, same as `#:case` and paths | topic #9CDCFE | Op(# label) | — |
| `#[ "new" ]` (27) | `#[` | `#` schema operator, gray | nothing (bare `#` falls through) | nothing | set Operation | a set reads as punctuation |
| `%[water.rho_ice_g_cm3]` (70) | `%[` | `%` gray; `…cm` + `3` numeric (`tm:221`) | `%` keyword; `.` op; `3` number | `%` #7FBFB8 | one IDENTIFIER `water.rho_ice_g_cm3` | the handle is split |
| `$%[…]` (146) | `$%[` | measure-bundle, gray | `$%[` keyword+definition (`sem:144`) | `$` #9CDCFE + `%` #7FBFB8 | `$` op + `%` op | three layers, three answers |
| `<< "a" ; "b" >>` (133) | `<<`, `;`, `>>` | stream, gray | operator+async | each `<` and `>` gold bold; `;` plain | Stream | in `<< ~ ; ? ; % ; ! ; * ; ^ >>` the decorations paint each sigil in its phase hue, a legible rainbow; TextMate leaves a bare `^` unscoped (probe:8) |
| `.{ n: 15 … }` (134) | `.{` | dot punctuation | `.` operator | braces gold | facet Operation | — |
| `1712..1781` (118) | `..` | numeric + connector | number, `.`, `.`, number | none | Expression(..) | — |
| `?["If ice sank…"]{` (141) | `?["` | whole token `variable.other.open-question` #c9d1d9 (`tm:440`) | `?` function+async + string | `?` #4EC9B0 | Op(?) | the question's voice (one near-foreground unit) is split into sigil + string |
| `~#lens(material grain)` (142) | `~#name(…)` | `~#lens` tag; body plain | `~#lens` property; body unpainted, but digits and `%` in a body are painted (probe:18) | mint italic + gold parens | one APPOSITION token | in IntelliJ an apostrophe in the body swallows the rest of the file |
| `~#(Cutler and Miller … 1900 to 1936 …)` (125) | `~#(` | `~` unscoped, `#` schema operator, digits numeric | `~` variable, `1900`/`1936` number | `~` #57D6A3, gold parens | one APPOSITION token | the prose reading looks like code |
| `!probe{ "…" =id[…] =kind[sim] }` (145) | `!label{`, `=k[v]` | `!` action; `probe` plain; `=` set | `!` function; `=` property+readonly #79c0ff | `!` #CE9178; `=` #CCA700 | Op(!) ⊃ Op(=) | TextMate `!(?=[^bh\[])` (`tm:463`) leaves `!build`, `!hold` and `!bias` unscoped (probe:16-17) |
| `=~"./a.spw#x"[needs]{ ~"b" ; ~"c" }` (probe:6) | `=~"…"[rel]{` | `=` + path-refs; relation plain | `=` property+readonly + paths | `=` amber + paths | bias edge (readBias) | the relation name, which is the meaning, is never colored |
| `48<hours>,` (probe:20) | `<…>` | numeric + angle punctuation | number + `<` `>` operator+definition | gold `<` `>` | medial Capsule | — |

### 1.3 Inlay hints and hover on water (b, verified via `reading/inlay.mts`)

With the defaults there are 7 hints:
- ` [? 2 metrics]` on the wonder line (141). The lens is always dropped (`disp:236-259`; see `lens_lsp.md` F5).
- ` │bent_polar`, ` │└bent_polar`, ` │network`, ` │limits`, ` │└limits` and ` │└network` at brace depth ≥ 3 (`disp:1287-1325`).

With all three `spw.inlayHints.*` set to false, 6 hints remain. The depth hints (`disp:1285`) and incoming-reference hints (`disp:1327+`) are not gated by any setting. The hint on `^["bent_polar"]{` also repeats the name already on the line, which breaks the code's own rule: "A hint earns its space by showing what the line does not already say" (`disp:188-191`) and "no hint beats a hint that restates" (`disp:236-239`).

The inlay settings reach the server only through `initializationOptions` (`extensions/vscode-spw/src/extension.ts:101-105`; `packages/spw-lsp/src/stdio-server.ts:198`), and there is no `didChangeConfiguration` handler, so a change needs "Spw: Restart Language Server". The `spw.surface.*` settings, by contrast, apply live (`deco:257,463-465`).

### 1.4 JetBrains (b)

- **Drifted TextMate copy.** Compared with `tm`, it has no `(?<!\w)'` guard, no `dialect-exp` group, a different topic regex and no `=key:` rule, and it appends a generic `keyword.operator` / `punctuation.*` scope to every operator scope, so all sigils collapse to one keyword-operator attribute. JetBrains' mapping from TextMate scopes to its own color attributes is **unverified**.
- **Shape cues that do not depend on color.** Gutter icons mark `#>` lines (ImplementedMethod) and `^` frames (Tag). Clicking them does nothing (the navigation handler is null).
- There is no Spw color settings page.

### 1.5 Palette and color vision (b; computed in `reading/theme/cvd.py`)

The palette is small:
- 23 contributed ids map to 13 dark and 14 light distinct hexes. `lens` = `phaseWonder` = `valenceBoon` (#4EC9B0); `intent` = `phaseAction` = `valenceBonk` (#CE9178); `topic` = `phaseMeta` = `pathRef` (#9CDCFE); in light mode `anchor` = `brace` (#795E26).
- The semantic layer under Dark 2026 groups colors across roles, so the color classes are not Spw's role classes:
  - `^`, `#>name`, `%` and `$%[` share #C586C0.
  - `#:case`, `#topic` and path refs share #4EC9B0.
  - `#!mood`, `!` and `?` share #d2a8ff.

I simulated color-vision deficiency with Machado et al. (2009) at severity 1.0 and measured CIELAB ΔE76. The threshold of about 15 for "confusable" is my own heuristic.

| Pair | Mode | ΔE normal | Protan | Deutan |
|---|---|---|---|---|
| anchor #D16969 / intent #CE9178 (`#>` vs `#!`) | dark | 23 | 14 | **8** |
| phaseWonder #4EC9B0 / operator #7FBFB8 (`?` vs `%`) | dark | 19 | 8 | **4** |
| phaseObserver / phaseMeta (`@` vs `$`) | dark | 15 | 13 | 14 |
| valenceBane #CD3131 / valenceBonk #A31515 | light | **13** | 11 | 12 |
| phaseWonder / operator | light | **6** | 5 | 6 |

Contrast on the light background (#FFFFFF): valenceBone and tierWarm (#BF8803) are 3.1:1, below WCAG 1.4.3's 4.5:1.

What survives without hue:
- font weight (every decoration is 600 or 700)
- italics (path refs, `~#k`)
- overview-ruler lanes (left for particles, right for paths)
- IntelliJ gutter icons

---

## 2. Plain-text legibility

### 2.1 Measured properties (b; `reading/legibility.py`, heuristic and string-aware)

| File | Lines | Indent = depth, 1 space | Anchors at a boundary, then their frame | Top frames with a blank line before | Max line / max outside strings | Words per string, median / max | Lines starting with a sigil or closer | `'` or non-ASCII outside strings |
|---|---|---|---|---|---|---|---|---|
| water | 148 | **1.00** | 12/12, 12/12 | 10/10 | 290 (l.28) / 88 (l.125) | 13 / 30 (l.123) | 0.67 | 0 |
| contract | 153 | 1.00 | 1/1 | 17/17 | 170 / 60 (l.43) | 14 / 24 | 0.35 (key-heavy by design) | 0 |
| vocabulary | 58 | 1.00 | 1/1 | 6/6 | 307 / 207 (l.32, closed set) | 16 / 35 (l.55) | — | 0 |
| `.spw/shelves.spw` | 52 | 0.78 (wonder bodies use 2 spaces) | 3/3 | 5/5 | 137 / 84 | 8 / 19 | — | 0 |
| `docs/theory/spw/valence-architecture.spw` | 167 | 0.65 | 2/2 | 12/12 | 213 / 79 | 13.5 / 31 | 0.64 | 7 non-ASCII lines |
| `docs/theory/spw/representational-disclosure.spw` | 333 | 0.96 | 3/3 | 14/14 | 111 | 8 / 14 | — | 27 non-ASCII lines (`// ═══` banners) |

**What carries structure with no color.**
- **The left edge is a score.** Water's line starts, counted:

  | Line start | Count |
  |---|---|
  | `key:` | 44 |
  | `}` | 25 |
  | `^` | 24 |
  | `#:` pair | 18 |
  | `#>` | 12 |
  | `~#` | 7 |
  | `?[` | 1 |

  Scanning column 0–4 reads as an outline.
- **Anchors act as caesuras.** Sibling keystones are separated by `#>` lines, not blank lines (for example water:72-74), so the anchor does double duty as a rhythm marker and an address.
- **Fixed particle order.** Case comes first and mood second (`#:claim #!settled`). Only the second character distinguishes them (`:` vs `!`), so their fixed position is what makes the pair scannable.
- **One claim per line** gives a clean read-aloud unit.
  - At Brysbaert's (2019) 183 words per minute read aloud, water's median statement of 13 words takes about 4.3 s and its longest (30 words) about 9.8 s.
  - The shelves probe's 30-second window (`.spw/shelves.spw:41`) is about 90 words, roughly 7 keystone statements.
- **Snake_case frame names** read aloud naturally ("density maximum").

**Hazards that no layout fixes.**
- `#` has five roles, distinguished by the next character: `# ` comment, `#>`/`#:`/`#!` particle, `#word` topic, `#[` set, `~#` trait or apposition.
- `$%` looks like one token but is two.
- Long single-line prose arrays pack three claims into one line (water:28, 290 characters).

### 2.2 Tension with canon (a)

- `representational-disclosure.spw:49` refuses "padding/alignment as semantic law", and `:144` says "groups are nested frames, not comment banners with pad spaces". The same file uses `// ═══` banners (`:38-40`), and `apposition.spw:23-25` pads a table. A key-alignment gate would contradict canon; alignment should stay optional layout.
- `apposition.spw:45-47` says an apposition body "carries an apostrophe, a comma, a percent" (example: `"it's the root map, 50% done"`). The cut bans that (`contract.spw:44,145`) because of tool defects: the decoration mask, the IntelliJ string rule, and semantic digit/`%` painting. The cut's rule is a workaround; the fix belongs in the tools.
- The read-aloud probe appears 48 times across the corpus as one identical templated line. That is the opposite of personalized subvocalization (§4.3, exercise E7).

### 2.3 CLI and editor renderings as plain text (b, verified)

- **`spw skim`**
  - Glyph outline (◆ frame, · trait, ~ path, @ root, ? goal) with a 28-column label and a 56-character snippet (`view.ts:292-309`).
  - It skips every line starting with `#` (`view.ts:230`), so anchors, particle pairs and **claim status are invisible**.
  - `?[` wonders are not treated as frames (`view.ts:221` only matches `^`).
  - Depth is `floor(indent/2)` (`view.ts:233`), so with the cut's 1-space indent, `geometry` (depth 2) shows flush and `limits` (depth 4) shows at depth 1.
  - End truncation cuts off the anchor, the most informative part of a path (`src_eisenber…`).
- **`spw census`**
  - Prints a Spw card (2-space indent, `~#k: v`), then a non-Spw summary block, then more cards.
  - On the scratch cut: `broken=10` with fragment nodes counted as hubs, consistent with the fragment-split graph bug (B13, `corpus-scan.ts:196-205`).
- **`spw lattice`**
  - Aligned tables with `─` rules and a "species spectrum" of named appositions, plus paren/colon counts. It is the only tool that counts readings.
- **`spw emit pack --host brief`**
  - Markdown sections: Title, Audience, Claim, Proof, Door.
  - It drops claim status, provenance and as_of, so a reader of the brief cannot calibrate.
- **`spw expand`**
  - Frames each transcluded digest as `<<  # ⟵ ~"…" … >>` (`expand.ts:79`).
  - It slices from the bound node's span (`expand.ts:93`) without re-indenting: the frame opener lands at column 0 while its body keeps its original indent.
  - It does not rebase relative refs. The digest in `cut/index.spw` keeps `~"../registries/…"`, which from the index points outside the cut (verified).
- **`spw inspect source --through tokens`**
  - A table with visible whitespace (`·`, `↵`) and parser types (PARTICLE, APPOSITION, IDENTIFIER), followed by a `^["next"]` card with command, purpose and cost.
  - This is the ground-truth "coloring".
- **`spw format`**
  - `--check --diff` uses `shortDiff`, which pairs lines by index (`format.ts:394-410`). After the `pretty` profile wraps water's title, every later line shows as changed.
  - `--pulse` ("which rule did this?", `format.ts:426-429`) and `--profiles a,b,c --diff` use a real diff.
  - `pretty` wraps water:3 at 88 columns, against the title rule (`contract.spw:44`) and against no-hard-wrap.
  - `layout` pads `#[`/`#topic` as comments (`canonicalize.ts:257-265`; the lexer's rule is that `#` is a comment only before whitespace, `lexer/matchers/comments.ts:55-67`), and at the default indent size re-indents to 2 spaces.
  - `canonical` leaves water unchanged.
- **Stack profile.** `spw stack` prints `reading author`. The `reading` axis (`author | prompt | research | creative`, `packages/spw-seed/src/dialect/types.ts:54`) is resolved and displayed (`packages/spw-cli/src/profile.ts:99`, `disp:430`), and no renderer changes behavior on it. (a) `vscode-spw.spw:111`: "Reading profiles change disclosure, not parse or reconcile truth." This is the natural hook for practice modes (c).

---

## 3. Research (hedged)

**Syntax highlighting and comprehension**
- Sarkar (2015, *PPIG 26th Annual Workshop*): 10 participants, within-subjects, eye tracking.
  - Highlighting cut task time by about 8.4 s on average.
  - The benefit shrank with programming experience.
  - Highlighted code showed fewer context switches, with no effect on fixation count or duration.
  - The sample is very small.
- Hannebauer, Hesenius & Gruhn (2018, *Empirical Software Engineering* 23:2795–2828): 390 Java novices; "no evidence" that highlighting improves comprehension. They conclude highlighting "squanders a feedback channel from the IDE to the programmer".
- Beelders & du Plessis (2016, *Journal of Eye Movement Research* 9(1)): fixations, durations and regressions were not significantly different between color and black-and-white. Students still *rated* color easier to read.
- Overall: the evidence is mixed and effects are small or null. The studies use general-purpose languages. None tests a sigil-first language where role is already written in glyphs; applying them to Spw is extrapolation.

**Fluency and calibration**
- Metacognition as monitoring plus control: Flavell (1979, *American Psychologist* 34:906–911); Nelson & Narens (1990, *Psychology of Learning and Motivation* 26).
- Perceptual fluency inflates judgments of learning without changing recall: larger fonts gave higher predicted memory and the same actual recall (Rhodes & Castel 2008, *JEP: General* 137:615–625). Koriat (1997, *JEP: General* 126:349–370) explains judgments as inferences from available cues.
- **Hypothesis, not tested for code:** color may likewise raise felt comprehension. Beelders' finding (preference without a performance difference) fits that.
- Judgments made after a delay are far more accurate than immediate ones (Nelson & Dunlosky 1991, *Psychological Science* 2:267–270).
- Calibration methods: Lichtenstein, Fischhoff & Phillips (1982, in *Judgment under Uncertainty*); Brier (1950, *Monthly Weather Review* 78:1–3).
- The illusion of explanatory depth: people overrate their mechanistic understanding until asked to explain (Rozenblit & Keil 2002, *Cognitive Science* 26:521–562).

**Desirable difficulties versus disfluency**
- Desirable difficulties: Bjork (1994, in *Metacognition: Knowing about Knowing*); Bjork & Bjork (2011, in *Psychology and the Real World*).
- Perceptual disfluency specifically:
  - Diemand-Yauman et al. (2011, *Cognition* 118:111–115) reported benefits.
  - Meyer et al. (2015, *JEP: General* 144:e16–e30) pooled 17 experiments on Alter et al.'s (2007) effect and found none.
  - The meta-analysis by Xie, Zhou & Liu (2018, *Educational Psychology Review*) found null effects on recall, while disfluency did lower judgments of learning and increase study time. That meta-analysis was itself later criticized for errors (a 2021 comment in *Educational Psychology Review*).
- Implication: "monochrome is good because it is harder" is not supported. Removing color may lower confidence without lowering learning, which could help calibration. That is a hypothesis.

**Generation, pretesting and fading**
- Generation effect: Slamecka & Graf (1978, *JEP: Human Learning and Memory* 4:592–604). Bertsch et al. (2007, *Memory & Cognition* 35:201–210) report a moderate average effect (about 0.4 SD, from memory; hedged).
- Failed retrieval attempts still help later learning: Kornell, Hays & Bjork (2009, *JEP: LMC* 35:989–998); Richland, Kornell & Kao (2009, *JEP: Applied* 15:243–257).
- Scaffolding: Wood, Bruner & Ross (1976, *Journal of Child Psychology and Psychiatry* 17:89–100). Fading worked examples: Renkl et al. (2002, *Journal of Experimental Education* 70:293–315).
- Expertise reversal: support that helps novices can hurt experts (Kalyuga, Ayres, Chandler & Sweller 2003, *Educational Psychologist* 38:23–31). This argues for per-reader, fadable highlighting rather than one default.

**Plain-text conventions**
- Beacons: Brooks (1983, *International Journal of Man-Machine Studies* 18:543–554); Wiedenbeck (1986, *IJMMS* 25:697–709).
- Soloway & Ehrlich (1984, *IEEE Transactions on Software Engineering* 10:595–609): experts' advantage largely disappears when code violates discourse rules.
- Implication: gateable layout conventions carry expert reading, and sigils work as beacons.

**Think-aloud and subvocalization**
- Protocol analysis: Ericsson & Simon (1993, *Protocol Analysis*, rev. ed.).
- Fox, Ericsson & Best (2011, *Psychological Bulletin* 137:316–344): 94 studies, about 3,500 participants. Pure think-aloud is non-reactive (r ≈ −0.03) but slower. Explaining is reactive and *improved* performance.
- The self-explanation effect: Chi et al. (1989, *Cognitive Science* 13:145–182; 1994, *Cognitive Science* 18:439–477).
- Inner speech review: Alderson-Day & Fernyhough (2015, *Psychological Bulletin* 141:931–965).
- Implication: *saying* a surface and *explaining* it are different interventions, and both are worth designing for.

**Accessibility and reading rate**
- Red-green color deficiency affects about 8% of men and 0.5% of women of Northern European ancestry (Birch 2012, *JOSA A* 29:313–320). WCAG 2.x SC 1.4.1 (Use of Color) and 1.4.3 (4.5:1 contrast) apply.
- Reading rate: 183 words per minute aloud, 238 silent for non-fiction (Brysbaert 2019, *Journal of Memory and Language* 109).
- Limits on categorical color codes: the visualization literature is often cited at roughly 6–10 distinguishable colors (Healey 1996, IEEE Visualization; Ware, *Information Visualization*). The exact number is uncertain.

---

## 4. Practice modes: highlighting as a scaffold you can fade

### 4.1 Controls that exist today (b)

| Control | What it removes | Caveat (verified) |
|---|---|---|
| `spw.surface.highlightPathRefs`, `…Annotations`, `…Braces`, `…Operators`, `…Semantics` (`package.json:181-205`) | one decoration family each | live; `~#k:` and `=exp` compounds are never gated (`deco:272,424-425`); `!` inside `#!` still colors with operators |
| `spw.inlayHints.paths`, `…annotations`, `…frames` (`package.json:154-168`) | path, boundary and wonder hints | only read at initialize, so a restart is needed; depth and incoming hints are always on |
| `editor.semanticHighlighting.enabled` (language-scoped under `[spw]`, per VS Code docs; not tested here) | the whole semantic layer | TextMate colors return |
| `editor.inlayHints.enabled: "offUnlessPressed"` | hints until Ctrl+Alt (Ctrl+Option on macOS) is held | a native "peek to reveal" |
| `workbench.colorCustomizations` on `spw.*` ids | hue (set them to the foreground color) | keeps weight, italics and rulers: a shape-only mode |
| `editor.tokenColorCustomizations` / `editor.semanticTokenColorCustomizations` | chosen scopes or types | cannot isolate claim status (§4.4) |
| Change Language Mode → Plain Text; VS Code Profiles to bundle a mode | everything | — |
| JetBrains: Spw LSP enabled toggle; TextMate bundle settings; gutter icon settings | LSP-driven or TextMate coloring | no Spw color page |

### 4.2 Additions (c)

1. **`spw.reading.mode`**, wired to the existing `reading` axis (`types.ts:54`). Suggested values:
   - `full`
   - `axis:<sigil|particle|claim|valence|links|depth>`: color only one axis
   - `shape`: weight, italics and rulers only
   - `monochrome`
   - `reveal`: color only the cursor line, or only mismatches
2. **Parser-driven semantic tokens.** Compute them from `parse().tokens`, which the CLI already uses. That fixes apposition bodies, the `cm3` split, `#` prose punctuation, `~#(` and `$%`. The legend should add modifiers for particle aim and claim status so a theme or mode can target them. The role taxonomy for that legend is the parallel study's work.
3. Gate the depth and incoming hints; add `spw.surface.highlightCompounds`; handle `didChangeConfiguration` on the server.
4. Fix the decoration mask: stop `'` at a newline, and mask `# ` prose lines and apposition bodies.
5. Sync the IntelliJ grammar from `tm` with a build step.
6. **CLI prediction and cloze tools:**
   - `spw census --predict card.spw`, or a `measure` scheme that reads a declared `%census{ files, links, frames, broken }` and returns match/drift/undeclared/unmeasurable verdicts. This reuses `measure`'s verdict vocabulary.
   - `spw read --cloze particles|status|links`: prints the surface with those values blanked (`#:claim #!____`) for generation practice.
   - `spw inspect source --line N`: a one-line reveal.
7. **`spw expand` fixes:** re-indent to the host depth and rebase relative refs. `format --check --diff` should use `diffLines`.
8. **`init`:** respect `NO_COLOR` and `isTTY`.

### 4.3 Exercises

| # | Exercise | Instrument | Research basis | Status |
|---|---|---|---|---|
| E1 | Read 10 lines uncolored (`spw read f --lines a-b`), write the role of each token, then reveal with `spw inspect source --stdin --through tokens` | CLI | generation effect; pretesting | runnable today |
| E2 | One-axis day, particle aims: semantic highlighting off; surface Operators, Braces, PathRefs and Semantics off; Annotations on | VS Code settings | fading; expertise reversal | runnable today (compounds stay colored) |
| E3 | One-axis day, claim status | needs addition 2 | calibration | (c) |
| E4 | Shape-only week: all `spw.*` colors set to the foreground, weight and rulers kept; then full monochrome | settings or Profiles | fading; fluency | runnable today |
| E5 | Predict the census (files, lines, links, frames, hubs, broken) before running `spw census`; record the result in a `^["calibration"]` card; predict again the next day, not right after editing | CLI plus a card | delayed judgments of learning; calibration | today by hand; (c) automated |
| E6 | From an index's `^["bundle"]` refs, write one line per expected digest, then run `spw expand`; note the misindent and unrebased-path defects while comparing | CLI | illusion of explanatory depth | runnable today |
| E7 | Read aloud for 30 s (about 90 words), mark pauses, write your own pause as an anonymous `~#(…)`, and promote it to a named `~#name(…)` when it recurs (`apposition.spw:92`); `spw lattice` then counts your recurring readings | CLI | think-aloud (say) versus self-explanation (explain) | runnable today |
| E8 | Before opening each keystone's source, rate 50–100% that the source supports the statement *as worded*; then open the registry source and compute a Brier score per surface | CLI and registries | calibration | by hand; (c) `expand --claims` |
| E9 | `spw format f --profiles canonical,layout,pretty`, then `--pulse`: predict which rule changes what | CLI | attribution | runnable today |

**Metacognitive verb map (b).**

| Verb | Tools today |
|---|---|
| Plan | `pulse`/`refactor` (plan-only), `^["next"]` cards (`cli.spw:105-109`) |
| Check | `lint`, `resolve`, the cut gate, `measure` verdicts, `taste --fidelity` (declared vs parser-visible marks), `authority` |
| Compare | `delta`, `cycle`, `atlas`, `format --profiles`, `expand`, `emit` |
| Reflect | `stack`, `inspect source`, `lattice` |
| Predict | nothing |

**Grain ladder for "arcs across frames"** (grains after `representational-disclosure.spw:112`):

| Grain | Tool | What it hides |
|---|---|---|
| point | `inspect --through tokens` | — |
| line window | `read --around N -C 2` | — |
| card | `emit brief` | status |
| outline | `skim` | particles |
| surface | `cat` | — |
| digest | `expand` | — |
| corpus | `census`, `lattice`, `graph` | — |

These grains are also what "tunable complexity" can mean. A prediction card is machine-readable reader state that tools could adapt to, a concrete form of "machine empathy" (c).

### 4.4 What color should carry, and what must not depend on it

- **Default: hue for sigil family only.** Five or six muted families: frame `^`; probe/act `?` `!`; reference `~` `@` paths; measure `%` `$`; bias `=`; particles `#`.
- **Particle aim by typography, not hue.** For example: `#>` bold with a ruler, `#:` regular, `#!` italic.
- **Strings, including `?["…"]` questions, stay at the default foreground.** Prose is the voice channel.
- **Claim status only in an opt-in axis mode**, as a lightness ramp or as glyph inlays (for example ● settled, ◐ contested, ○ speculative, × refuted), never red/green.
- **Valence only in valence mode**, with a qualitative palette that carries no good/bad connotation (canon: not merit).
- **Links:** keep italics, and show the `#anchor` part at a different weight.
- **Mismatches:** color is best spent as feedback — for example, highlighting where your predicted role differs from the parser's (Hannebauer's "feedback channel").
- **Never color-only:** claim status, anchor and frame boundaries, nesting, comment vs code, path extent, handles, valence, warnings. Each must be recoverable from glyph and position in print, a terminal, or Obsidian/Notion (`.spw/shelves.spw:33`; WCAG 1.4.1).
- **Canon already agrees:** `.spw/biome/ocean/ux.spw:13` "distinct hue + shape memory by phase"; `:27` "familiar layout reduces cognitive load over repeated loops".

---

## 5. Contract rules and gate checks

### 5.1 Proposed contract frame

Verified: parses with 0 errors and 0 prose chunks. A multi-line `#[…]` set and a multi-line `<< … ; … >>` schedule of strings both bind, and the key that follows still binds (`reading/legib/proposal.spw`).

```
^["legibility"]{
 indent: "one space per nesting level; every code line sits at its brace depth"
 left_edge: "a structural line starts with its sigil, its key, or a closer; the left edge reads as the outline"
 particles: "#:case then #!mood, one pair per line; a wonder first line may add one ~#lens(phrase)"
 anchors: "an anchor line follows a blank line, an opener, or a closer, and the next line is the frame or binding it names"
 cadence: "one blank line before every top-level frame or its anchor; no blank lines inside a keystone frame"
 claims: "one prose string per line; a statement, claim, or hypothesis stays under 36 words, about 12 seconds aloud"
 arrays: "a set, list, or schedule of prose items puts one item per line; closed sets of bare words stay on one line"
 width: "the part of a line outside strings stays within 88 columns; strings are never wrapped"
 ascii: "no apostrophe, dash, or non-ASCII character outside double-quoted strings, including apposition bodies"
 color: "no meaning depends on color; status, valence, anchors, and links stay legible in print from glyphs and position"
}
```

### 5.2 Gate checks

Prototype: `reading/legib/gate_probe.py`. Current `scripts/analyzers/spw-cut-gate.ts` (working tree, being edited by others) already checks size, depth > 7, banned forms, the header anchor and axes, and apostrophes on `#` lines only (`:262`).

| Id | Check | water | contract | vocabulary |
|---|---|---|---|---|
| L1 | indent equals string-aware depth (`{ [ ( <<`) | pass | pass | pass |
| L2 | `#>` preceded by blank/opener/closer and followed by a frame or binding | pass | pass | pass |
| L3 | blank line (or anchor/particle) before each top-level frame | pass | pass | pass |
| L4 | `^\s*#:[a-z_]+ #!\S+( ~#[a-z_]+\([^)]*\))?$` | pass | pass | pass |
| L5 | statement / `~#claim` / `~#hypothesis` ≤ 35 words | pass (max 30) | pass | 35 in a gloss, which is not checked |
| L6 | at most one prose string of ≥ 6 words per line, closed bare-word sets exempt | **fail l.28** (3 corrections), **l.133** (steps) | pass | pass |
| L7 | text outside strings ≤ 88 columns | pass (max 88) | pass | pass (l.32 set exempt) |
| L8 | no `'` or non-ASCII outside `"…"`, including apposition bodies (extends gate `:262`) | pass | pass | pass |
| L9 | existing `$%[…]` ≤ 3 handles | — | — | — |

Canon comparison: shelves fails L1 (2-space wonder bodies) and L4 (`// lens:`). Apposition's single-quoted keys trip L8, correctly for the cut, which uses only double quotes.

**Decision for the owner:** keep the 1-space indent (the cut is 100% consistent, and so is most canon) and fix `skim` (`view.ts:233`) and the formatter's default (`--indent-size 2`), or switch the cut to 2 spaces. Either way, declare the unit in the contract.

### 5.3 Fix the tools rather than add rules

The following are tool defects better fixed at the source than legislated around:
- the apostrophe spill in decorations and in the IntelliJ grammar
- digits and `%` painted inside apposition bodies
- the handle-digit split (`cm3`)
- `$%` treated as one unit by the editor layers but two by the parser
- `layout` treating `#[`/`#topic` as comments
- `expand`'s indent and path rebasing
- `skim` hiding `#` lines and truncating the end of paths
- `emit brief` dropping status and provenance

Until those are fixed, keep `contract.spw:44,145` as they are.

---

**Files** (all under `<scratchpad>/reading/`):
- Tokenizers and renderers: `tm/tok.cjs`, `tm/water.vscode.tm.txt`, `tm/water.ij.tm.txt`, `sem.mts`, `water.sem.txt`, `deco-port.mjs`, `inlay.mts`
- Theme and color-vision: `theme/resolve.py`, `theme/cvd.py`
- Plain-text measures and gate: `legibility.py`, `legib/proposal.spw`, `legib/gate_probe.py`
- Probes: `probe/constructs.spw`, `probe/constructs-noapos.spw`, `probe/hashline.spw`
- Scratch consumer root: `ws/`

Sources:
- [Sarkar 2015, PPIG](https://ppig.org/papers/2015-ppig-26th-sarkar1/index.html)
- [Hannebauer et al. 2018, EMSE](https://link.springer.com/article/10.1007/s10664-017-9579-0)
- [Beelders & du Plessis 2016, JEMR](https://doi.org/10.16910/jemr.9.1.1)
- [Rhodes & Castel 2008](https://castel.psych.ucla.edu/wp-content/uploads/sites/111/2016/11/RhodesCastelJEPG2008.pdf)
- [Brysbaert 2019](https://gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf)
- [Fox, Ericsson & Best 2011](https://pubmed.ncbi.nlm.nih.gov/21090887/)
- [Meyer et al. 2015](https://www.researchgate.net/publication/274570805_Disfluent_Fonts_Don't_Help_People_Solve_Math_Problems)
- [Xie, Zhou & Liu 2018](https://link.springer.com/article/10.1007/s10648-018-9442-x)
- ["Null and Void?" 2021 critique](https://link.springer.com/article/10.1007/s10648-020-09579-1)
- [Kalyuga et al. 2003](https://mrbartonmaths.com/resourcesnew/8.%20Research/Explicit%20Instruction/The%20Expertise%20Reversal%20Effect.pdf)
- [Nelson & Dunlosky 1991](https://www.jstor.org/stable/40062685)

### verification

# Verification of the highlighting report

I re-ran most claims on copies under `<scratchpad>/reading/verify-hl/ws/`. That scratch root holds:
- `cut/matter/water.spw`, the 148-line snapshot the report used
- `water153.spw`, the current staged version
- `contract.spw`, `vocabulary.spw`, `proposal.spw`, `constructs.spw`, `tok.spw`

Most claims hold. The corrections are listed first, then the confirmations.

## A. Staleness: the cut changed after the report

- **water.spw** is now 153 lines, not 148. A `^["receipts"]` block was added at lines 28–32, so every water citation at line 28 or later is now off by +5. Examples: 28→33, 45→50, 89→94, 125→130, 133→138, 141→146, 143→148, 146→151. The 148-line snapshot reproduces every metric in the report. The current file gives the same legibility metrics, except that multi-binding lines rose from 1 to 4 because of the receipts.
- **contract.spw** is now 161 lines, not 153, with 18 top-level frames (not 17). The title rule is still at `:44`. The apostrophe / non-ASCII hazard is now at `:153`; `:145` is the `^["hazards"]{` opener. Change "contract.spw:44,145" to `:44,153`.
- **vocabulary.spw** is now 62 lines, not 58. The "material quality, not merit" gloss is at `:56`, not `:53`.
- **Census on the scratch cut** (`reading/ws`): it now reports `broken=12`, not `broken=10`; that copy of water was updated at 18:34. The claim that fragment nodes are counted as hubs is still confirmed, for example `"cut/registries/sources/matter.spw#src_crc_handbook"` is listed as a hub. The cause is that `corpus-scan.ts:198-201` never strips `#fragment`.

## B. Tooling claims that need correction

1. **"`disp:236-259`" (lens always dropped).** The code is `buildWonderHint` at `display.ts:249-262`. The lens is dropped at `:256` when `bodyText` already contains it. Lines 236–239 are part of `countBracesOutsideStrings`.
2. **The "no hint beats a hint that restates" quote** is at `display.ts:260-261`, not `236-239`. The `:188-191` quote is correct.
3. **`view.ts` line numbers are off by one.**
   - The `#` skip is at `:231`.
   - `floor(indent/2)` is at `:234` and is capped at 6.
   - `frameRe` is at `:222`.
   - The `skim` behavior itself is confirmed by running it: `geometry` is flush, `limits` shows at depth 1, and `?[` is absent.
4. **`expand.ts:93`** should be `:94`, where the slice happens. Behavior confirmed: the `<<` and the frame opener land at column 0 while the body keeps its 2-space indent. `../registries/…` is not rebased.
5. **The `#[ "new" ]` decoration is not "nothing".** `[` and `]` get brace-gold bold (`deco:316`). Only the `#` is undecorated.
6. **The `~"../registries/…#src_crc_handbook"` example at water:48** is wrong. Line 48 is `#src_eisenberg_kauzmann`; `crc_handbook` first appears at water148:71.
7. **The IntelliJ grammar does not append a generic scope to every operator scope.** 21 of 23 `keyword.operator.*` rules get the generic suffix; `projection` and `sigil.introspection` do not. The IntelliJ copy also lacks the `$%[` measure-bundle and `<<|>>` stream rules (which sit in `dialect-exp`). It has two extra header rules (`# wip —` and metadata).
8. **The read-aloud probe is not "one identical templated line".** It appears 48 times in 48 files, but in three variants:
   - "pauses mark grain boundaries" ×17
   - "pauses mark biome edges" ×16
   - "pauses mark structural joints" ×15

   The point that it is templated still stands.
9. **Decoration mask counts.** Re-running the same heuristic (`'`/backtick spans that cross a newline) gives **74 files and 3,443 lines** (3,581 if opener lines are counted). With `'` alone it is 57 files and 2,922 lines; with `"` added it is 78 files and 4,732 lines. No variant reproduces 78 / 3,562. The order of magnitude is confirmed. `materials-ontology.spw` lines 3→103 is confirmed exactly.
10. **"No ANSI except `init.ts`"** holds only for `packages/spw-cli`. The contract's own parse gate (`contract.spw:160`, `npm run lint:spw`) uses `scripts/analyzers/spw-syntax-validate.ts:229-267`, which prints unguarded ANSI. Verified: it still printed `\x1b[32m` with `NO_COLOR=1` set. Addition 8 should cover it too.
11. **Light-mode contrast misses one color.** `phasePotential` light `#1B8F6A` is 4.05:1 on white, also below 4.5:1. It colors `~` and every `~#k:` compound. `#BF8803` at 3.12:1 is confirmed independently.
12. **L7 width check ("water pass, max 88").** The prototype (`gate_probe.py:18`) strips indent before measuring. water148:125 (now :130) is 90 columns from column 1 and 88 without indent. Under the rule as worded ("within 88 columns") it fails by 2. Either define width as excluding indent, or the cut fails L7.
13. **"`#!settled` … the heading affordance disappears when semantic tokens are on".** This conflicts with the report's own §1.1 hedge that bold survival is unverified. Only the color loss follows from the scope mapping; bold may persist.
14. **"Predict: nothing" is slightly overstated.** There is no dedicated predict verb (no `predict`/`forecast` in `packages/spw-cli/src`). But `measure` (declared facet against measured value, `mass.ts:107-147`) and `delta` on a hand-written forecast card already support predict-then-check by hand. A prior run did exactly this: `reading/verify/out/delta.txt`, `census.forecast.spw → census.actual.spw`.
15. **`spw lattice` and "readings".** Its species spectrum mixes `~#name(…)` readings (paren=14) with `~#k:` datums (colon=23), for example title, claim, proof. Canon calls the colon form a "datum, not a viewpoint" (`apposition.spw:25`). So E7's "lattice counts your recurring readings" needs the paren/colon split, which lattice reports only as totals.
16. **`valence-architecture.spw` also has one apostrophe line** outside strings (`:122`, `# Each component's…`), besides the 7 non-ASCII lines. That is a decoration-spill trigger in canon.
17. **The valence-architecture quote** is at `:38-39`, not `:39-40`.

## C. Tooling claims confirmed (code read, and run where marked)

**Semantic tokens (`semantic-tokens.ts`)**
- The character scanner is at `:105-412`, with 9 token types and 6 modifiers at `:75-78`.
- The `# ` branch at `:122-125` is a no-op.
- Mappings: `#:` type+def (`:216-222`), `#!` function+mod, `#>` keyword+decl (`:232-238`), `$%[` keyword+def (`:144`), and `.` as an operator.
- Ran `sem.mts`:
  - water:70 and :146 paint `.` and `3` (the `cm3` split)
  - water:125 paints `~`, `1900` and `1936`
  - contract:1 paints `2026 09 30` as numbers
  - water:118 paints `1712 . . 1781`

**Decorations (`surface-decorations.ts`)**
- The mask is at `:89-109` and crosses newlines.
- The status tiers (`:147-154`, `:391-403`) use the implemented/partial/proposed/deprecated vocabulary.
- Weights are set at `:175-188`.
- The `~#k:` compound is ungated (`:272`, `:424`). `package.json:204` nonetheless says highlightSemantics controls it.
- `!bone` matches through `/!(…)\b/` at `:359`.
- The surface settings apply live (`:463-465`).

**TextMate, both grammars (ran `tok.cjs`)**
- `cm`+`3` numeric.
- `~#(` gives an unscoped `~` and `#` as the schema operator.
- `^["edges"]` gets `markup.heading.section`.
- `?[…]` gets `variable.other.open-question`.
- `!hold`, `!build` and the schedule's bare `^` are unscoped.
- `#:valence #!bone` gets the intent scope.
- `#[` gets the schema operator.
- The IntelliJ `'` rule at `ijtm:172` swallows probe lines 18–26. The VS Code grammar has `(?<!\w)'` at `tm:176`.

**Theme**
- VS Code 1.139 hard-codes `COLOR_THEME_DARK="Dark 2026"`, with `semanticHighlighting: true`.
- Scopes resolved through the theme's include chain:

  | Scope | Color |
  |---|---|
  | `entity.name.tag` | #7ee787 |
  | `keyword.operator` | #d4d4d4 |
  | `keyword.control` | #C586C0 |
  | `entity.name.type` | #4EC9B0 |
  | `entity.name.function` | #d2a8ff |
  | `variable.other` | #c9d1d9 |
  | `variable.other.constant` | #79c0ff |
  | `markup.heading` | #79c0ff bold |
  | `constant.numeric` | #b5cea8 |
  | `comment` | #8b949e |

  Editor foreground is #BBBEBF.

**Palette (`package.json:230-253`)**
- 23 color ids, 13 distinct hexes in dark mode and 14 in light; the shared-hex groups are as stated.
- The boon and bane descriptions are at `:249-250`.
- Normal-vision ΔE76, computed independently: 23.0, 18.9, 12.8 and 5.7, which matches the report.
- The Machado severity-1.0 matrices in `cvd.py` match the published values.

**Inlay hints (ran `inlay.mts`)**
- 7 hints with the defaults; 6 with all three settings off.
- The depth hints (`:1285-1326`) and incoming-reference hints (`:1328-1350`) are ungated.
- `│bent_polar` restates the name already on the line.
- Settings arrive only through `extension.ts:100-105` and `stdio-server.ts:198`.
- There is no `didChangeConfiguration` case in the server. The client does sync the `spw` section (`extension.ts:98`), but the server ignores it.
- The restart command exists (`package.json:94-95`).

**CLI and format**
- **`inspect source --through tokens`:** reports one IDENTIFIER for `water.rho_ice_g_cm3`, `$` and `%` as two OPERATOR tokens, APPOSITION for `~#(…)` and `~#lens(…)`, and PARTICLE for `#>`, `#:` and `#!`. A `# ` title line is a COMMENT. Whitespace is shown as `·`/`↵`, followed by a `^["next"]` card with command, purpose and cost.
- **`format`:**
  - `canonical` leaves water unchanged.
  - `layout` re-indents to 2 spaces and pads `lineage:`/`corrections:` `#[` and `primary:`/`transfers:`/`tensions:` `#topic` to a column.
  - `pretty` wraps water:3 and `shortDiff` misaligns every later line. Nuance: the diff is capped at 12 hunks plus "…".
  - The mechanism is `canonicalize.ts:257-265` against `comments.ts:55-67`.
- **`stack`:** prints `reading author`, and also `format layout`. That makes the cut's own resolved format profile the one that damages it, which strengthens finding 8.
- **`emit pack --host brief`:** prints only Title, Audience, Claim, Proof and Door.
- **Verbs:** `taste --fidelity`, the `measure` verdicts, `atlas`, `authority`, `refactor` (plan) and `pulse` (plan) all exist in `commands.ts`.

**JetBrains**
- Gutter icons `ImplementedMethod` and `Tag` with a null navigation handler (`SpwAnnotationLineMarkerProvider.kt:28-54`). The tooltip still says "navigate to references".
- Folding and structure view are registered. There is no color settings page. The LSP toggle is in `SpwLspConfigurable.kt:28`.

**Canon**
- `vscode-spw.spw:108,111`
- `representational-disclosure.spw:38-40,49,112,144`
- `apposition.spw:23-25,45-47,92`
- `shelves.spw:33,41`
- `cli.spw:105-109`
- `ux.spw:13,27`
- gate `:262-264` (warns on apostrophes in `#` lines only)

**Legibility metrics**
- `legibility.py` reproduces the water148, shelves, valence-architecture and representational-disclosure rows exactly.
- Line-start counts: `key:` 44, `}` 25, `^` 24, `#:` 18, `#>` 12, `~#` 7, `?[` 1; ratio 0.67.
- `gate_probe` results:
  - water: L6 fails at :28 and :133 only.
  - contract and vocabulary: 0 findings.
  - shelves: fails L1 and L4.
  - apposition: fails L8 at :23-25 and :51-56.

## D. Sketch validation (§5.1 proposed frame)

- `reading/legib/proposal.spw` is identical to the report's frame.
- `spw-syntax-validate.ts` passes 5 of 5 files: proposal, water148, water153, contract and vocabulary.
- `parse()` gives success, 0 errors, 0 warnings and 0 Prose nodes. `corrections` (a multi-line `#[`), `steps` (a multi-line `<<…>>`) and the following `after` all parse as Binding keys.
- `spw lint` gives 0 findings.

## E. Research citations

| Citation | Verdict | Notes |
|---|---|---|
| Sarkar 2015, PPIG 26th workshop | **corrected** | 8.4 s is the difference in **medians** (Wilcoxon, p = .047), not an average. Context switches: median difference 23 (p = .045). Python tasks. Eye-tracking analyses used 7 of 10 participants (3 excluded for glasses). The rest is confirmed. |
| Hannebauer, Hesenius & Gruhn 2018, EMSE 23:2795–2828 | confirmed | 390 undergraduates in an intro Java course. The outcome was task correctness. The "no evidence" and "squanders a feedback channel" wording is confirmed. |
| Beelders & du Plessis 2016, JEMR 9(1):1–11 | confirmed | Fixations, durations and regressions were numerically higher for black-and-white code but not significantly. Students rated colour easier to read and more aesthetically pleasing. |
| Flavell 1979, Am. Psychol. 34(10):906–911 | confirmed | |
| Nelson & Narens 1990, PLM 26:125–173 | confirmed | |
| Rhodes & Castel 2008, JEP:G 137(4):615–625 | confirmed, **add hedge** | Mueller, Dunlosky, Tauber & Rhodes (2014, *J. Memory and Language* 70:1–12) attribute the font-size effect on judgments of learning mainly to **beliefs** about memory, not felt fluency. Say "perceptual features inflate JOLs; the mechanism is contested". |
| Koriat 1997, JEP:G 126(4):349–370 | confirmed | |
| Nelson & Dunlosky 1991, Psych. Sci. 2(4):267–270 | confirmed | Scope: delayed cue-only JOLs for paired associates. Applying it to census prediction is extrapolation. |
| Lichtenstein, Fischhoff & Phillips 1982 | confirmed | In Kahneman, Slovic & Tversky (Eds.), pp. 306–334. |
| Brier 1950, MWR 78(1):1–3 | confirmed | |
| Rozenblit & Keil 2002, Cog. Sci. 26(5):521–562 | confirmed | |
| Bjork 1994; Bjork & Bjork 2011 | confirmed | pp. 185–205 and 56–64. |
| Diemand-Yauman, Oppenheimer & Vaughan 2011, Cognition 118(1):111–115 | confirmed | |
| Meyer et al. 2015, JEP:G 144(2):e16–e30 | confirmed | The original study plus 16 replications. Note it concerns problem-solving on the Cognitive Reflection Test, not learning or recall. |
| Xie, Zhou & Liu 2018, EPR 30(3):745–771 | confirmed | 25 articles, 3,135 participants. Recall d = −0.01, transfer d = 0.03, JOLs d = −0.43, learning time d = 0.52. |
| "2021 comment" | **corrected: name it** | Weissgerber, Brunmair & Rummer (2021), "Null and void? Errors in meta-analysis on perceptual disfluency…", *EPR* 33(3):1221–1247. Whether their reanalysis overturns the null is unverifiable here. |
| Slamecka & Graf 1978, JEP:HLM 4(6):592–604 | confirmed | |
| Bertsch et al. 2007, Mem. & Cog. 35(2):201–210 | confirmed | 0.40 is from the abstract (86 studies, 445 effect sizes). Drop the "from memory" hedge. |
| Kornell, Hays & Bjork 2009; Richland, Kornell & Kao 2009 | confirmed | |
| Wood, Bruner & Ross 1976; Renkl et al. 2002 | confirmed | Renkl, Atkinson, Maier & Staley. |
| Kalyuga, Ayres, Chandler & Sweller 2003, Ed. Psych. 38(1):23–31 | confirmed | |
| Brooks 1983; Wiedenbeck 1986; Soloway & Ehrlich 1984 | confirmed | Venues and pages are as given. |
| Ericsson & Simon 1993 | confirmed | MIT Press, revised edition. |
| Fox, Ericsson & Best 2011, Psych. Bull. 137(2):316–344 | confirmed | 94 studies, about 3,500 participants, r = −.03, slower completion. That explanation requests are reactive is confirmed; the direction ("improved") is consistent with the paper but rests on my recall of the abstract. |
| Chi et al. 1989; Chi et al. 1994 | confirmed | |
| Alderson-Day & Fernyhough 2015, Psych. Bull. 141(5):931–965 | confirmed | |
| Birch 2012, JOSA A 29(3):313–320 | **corrected** | About 8% of men and about **0.4%** (not 0.5%) of women, in "European Caucasians", not specifically Northern European. |
| Brysbaert 2019, JML 109:104047 | confirmed | 238 wpm silent non-fiction, 183 wpm aloud. The 4.3 s, 9.8 s and roughly 90-word figures check out. |
| Healey 1996; Ware | partly unverifiable | The Healey venue (Proc. IEEE Visualization '96) is correct from memory. The "6–10 colors" range is appropriately hedged. |
| Machado et al. 2009 | add venue | *IEEE TVCG* 15(6):1291–1298. |
| WCAG SC 1.4.1 / 1.4.3 | confirmed | |

## F. Small additions

- Finding 1, "the only rendering that shows what the parser sees", is too strong. `inspect source --through structure` and `inspect spacing` also show the parser's view.
- `spw read --lines` prints a `# spw skim` header and reports `lines=149` for a 148-line file. This is a minor rendering inconsistency that matters for a plain-text-first report.

Sources:
- [Hannebauer et al. 2018](https://link.springer.com/article/10.1007/s10664-017-9579-0)
- [Beelders & du Plessis 2016](https://bop.unibe.ch/JEMR/article/view/2429)
- [Rhodes & Castel 2008](https://www.semanticscholar.org/paper/Memory-predictions-are-influenced-by-perceptual-for-Rhodes-Castel/7ea627cdb256ce507cedd75b1dc7ac34e08aeb46)
- [Mueller et al. 2014 (via PLOS ONE discussion)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0200888)
- [Xie et al. 2018 (ERIC)](https://eric.ed.gov/?id=EJ1186638)
- [Weissgerber et al. 2021 (ERIC)](https://eric.ed.gov/?id=EJ1310126)
- [Meyer et al. 2015](https://digitalcommons.chapman.edu/esi_pubs/96/)
- [Fox, Ericsson & Best 2011 (ERIC)](https://eric.ed.gov/?id=EJ933832)
- [Birch 2012](https://opg.optica.org/josaa/abstract.cfm?uri=josaa-29-3-313)
- [Bertsch et al. 2007](https://www.semanticscholar.org/paper/The-generation-effect:-A-meta-analytic-review-Bertsch-Pesta/44727fee56dc25b9205f06a765b9a8bdb833835c)

---

## transforms

I ran every tool on a scratch copy of the water exemplar and contract, and wrote six new notations; all of them parse. Each tool claim is tagged (a) canon, (b) code or (c) aspirational. Only files under `…/scratchpad/reading/xform/` were written. The repo does show two modified files (`.spw/caches/index.spw`, `scripts/analyzers/spw-cut-gate.ts`), and this pass did not write them.

# Expansions, comprehensions, reductions and transformations over Spw surfaces: rendering and CLI as metacognitive instruments

**Method.** The scratch consumer root is `…/reading/xform/root/`. It holds a copy of `cut-staging/2026-09-30/`, plus an `index.spw` with a `^[bundle]` of two fragment bias edges, a `templates/wonder.spw`, and a stub `.spw/mount.spw` because `pulse` needs one. The CLI ran through `understand/spw.sh` with that root as the working directory. Parse checks used three tools: `spw-syntax-validate`, my AST shape checker (`xform/shape.mts`, which reports errors, prose-degradation warnings, ProseChunk counts and the node type behind every binding value), and direct `parse().errors`. I checked `parse().errors` directly because the validator hides lexer errors (syntax_breadth F2).

## 0. Headlines

1. **What exists is mostly reduction; there is very little comprehension.**
   - Reductions: `emit` packs, `census`, `graph`, `lattice`, `outline`, `form`, `fingerprint`.
   - Expansions: `expand` (transclusion along bias edges), and `emit expand` / `snippet hydrate` (slot fill).
   - Transformations: `pulse`, `mutate`, `refactor`.
   - Comparisons: `delta`, `cycle`, `atlas --from/--to`.
   - Nothing generates a product of values (a comprehension), plays an arc across files, or compares readings (beliefs) rather than bytes.
2. **Several instruments are miscalibrated.** For metacognitive use this matters more than any missing feature: a reader who checks a prediction against a wrong instrument learns the wrong lesson.
   - `census` reported 14 broken targets; 9 of them are fragment refs that `resolve` verifies as OK.
   - `lattice` counts appositions quoted inside strings.
   - `form` counts every `.` and `#` character, including sentence periods and title comments.
   - `outline` hides the file's only wonder and every `#:claim` mood.
   - The LSP path hover ignores `#fragment`.
   - `pulse --stdin` can never show a planned change.
3. **Expansion is not path-hygienic.**
   - `expand` pastes a fragment's raw text, so relative refs keep the source file's base: 3 missing files when the digest is resolved in place.
   - `emit expand --derivative` writes `base:` relative to the working directory, not to the output file.
   - `refactor anchor:` renames the `#>` particle but none of the 3 `~"…#anchor"` refs that point at it.
4. **Spw already has the notation for most of what was asked.** All six sketches parse with 0 errors, 0 degradations and 0 prose. They reuse canon rungs and forms rather than new jargon:
   - Stream `@sink` for the breath line.
   - Scope `@(here)` for personas.
   - Couple `<>[…]` plus a reflexive template edge for the Llull wheel.
   - Act-consequence `?{…} ~<prediction>` for predictions.
   - Particle moods for dated readings.
5. **Three prototypes ran end to end in scratch.**
   - Wheel: 12 cells, 6 drawn, 19/19 refs resolve, 6 open hypotheses for the reader.
   - Breath line: derived versus authored line, with a continuity check.
   - Readings diff: catches `contested → emerging`, which `spw delta` misses.

---

## 1. Inventory: what exists, verified

| tool | input | output | kind | metacognitive act | grounding |
|---|---|---|---|---|---|
| `expand` | surface with reflexive or labelled bias edges `={ ~"p[#a]" }` | source plus `<<  # ⟵ ~"…" … >>` blocks; `--write` gives `<stem>.expanded.spw` | **expansion** (transclusion) + **projection** (the anchored node only) | compare a reading with its sources | `expand.ts:34-38` (edge filter), `:87-95` (fragment slice), `:113-117` (derived write) **(b)**; `bias-product.spw:34` verb "template" **(a)** |
| `emit pack --host …` | `^"emit"{}` traits | host text plus a measure block | **reduction** to a card | check: continuity and positive-ground holds | `emit/extract.ts:1-4` ("Line-oriented… without full AST"), `:43` fallback; `codecs.ts:205` brief, `:276-300` audio **(b)** |
| `emit fields` / `ir` | surface | traits, slots, dims, anchors, `includes` | **reduction** to IR | inspect | `includes` is never followed (emit_bundle F1) **(b)** |
| `emit holes` / `emit expand --bind` / `--derivative` | template with `${k=d}`, `$k`, `_` | filled text plus a report; `^"lineage"{}` stamp | **expansion** (fill) + **lineage** | predict: `_` holes are open generation slots | `template-fill.ts:78-83` (regex slots), `:96-111` **(b)** |
| `select` / `query` (Spw.q) | file or roots plus a preset or `--expr` | rows, skim lines, `^["summary"]` card | **comprehension (filter half)** | search / check | `selector-expr.ts:8-14` (`$` opens the query envelope), `:16-22` open gaps **(b)** |
| `form` (`geometry`) | file or directory | brace and operator census, lessons, resonance card | **reduction** to measures | reflect on voice | `geometry-inspect.ts:106-122` raw-character census; `geometry.ts:477-481` **(b)** |
| `pulse --ladder` | a boundary or operator id | graded rungs, each parsed with a health flag | **projection** of a catalog (form ladders) | tunable complexity | `form-ladders.spw:41-67` **(a)**; `--contour` at `:86-92` is rejected **(a≠b)** |
| `pulse` / `mutate` / `beat` | file or stdin buffer | plan, diff, ChangeReport, matrix; `beat` gives ticks only | **transformation** (planned, then applied) | plan, then check | `pulse.ts:1236-1276` (stdin), `:1488`; `mutation-automata.ts:544` **(b)** |
| `refactor` | roots plus `kind:from=to` | a `spw.refactor.plan/1` | **transformation** (rename) | plan | `refactor.ts:43-63` **(b)** |
| `fingerprint` | file or expression | node-type signature, `complete`, `prose` | **reduction** to a signature | check that a surface really parses | CLI help **(b)** |
| `measure` | `@self` plus `%mass` | drift | **reduction** | calibrate declared against observed | no-op on the cut (`no surfaces declare @self`) **(b)** |
| `census` / `graph` | roots | `^["census"]`, `^["corpus"]`, `^["population"]` / `^["hubs"]` cards | **reduction** to corpus cards | predict, then check | `corpus-disclosure.ts:143` (absolute `among`) **(b)** |
| `atlas` | roots and revisions | region dialect, hubs, anchors; `--save`, `--trend`, `--from A --to B` | **projection over time** | reflect across revisions | help text **(b)** |
| `lattice` | roots | apposition species spectrum | **reduction** | reflect on readings | `apposition-scan.ts:1-6` ("Parse-free") **(b)** vs `apposition.spw:91` **(a)** |
| `outline` (`skim`/`read`) / `tree` | file / root | landmark lines with glyphs `◆ · ~`; a tree | **reduction** to landmarks | orient | `view.ts:219-231`, `:268-269` **(b)** |
| `delta` / `cycle` | two revisions | `^["delta"]` ChangeReport / sense receipts | **comparison** | compare before with after | `change-report.ts:347` **(b)** |
| `inspect compose` / `source` | an expression or text | `^["act_consequence"]`, staged products, `^["next"]` cards | **projection** | plan: every next step carries command, purpose and cost | `composition-forms.spw:38-44`, `cli.spw:105-109` **(a)** |
| `snippet` / VS Code snippets / JetBrains live templates | an id plus `--bind` | seed text | **expansion** (hydrate) | scaffold | `canonical/snippet.ts:98-108`; `snippets/spw.json:46`; `spwTemplates.xml` (7 templates, none a wonder) **(b)** |
| LSP hover / VS Code decorations | caret or setting | markdown peek; 5 highlight and 3 inlay toggles | **projection** in the editor | read with or without highlighting | `display.ts:960-982`; `package.json:154-205`; `surface-decorations.ts:51-75` **(b)** |

### Commands run, with trimmed output

The output lines follow each `$` command.

```
$ spw expand index.spw
^[bundle]{
 ={ ~"./matter/water.spw#water_density_max" }
<<  # ⟵ ~"./matter/water.spw#water_density_max"
^["density_maximum"]{ #:claim #!settled … source: ~"../registries/sources/matter.spw#src_crc_handbook" }
>>
$ (digest copied beside the index) spw resolve --from . --warn
# spw resolve  total=33 ok=30 missing_file=3        <- the transcluded ../registries refs were not rebased

$ spw emit pack matter/water.spw --host audio --measure
TITLE: Water
CTA:
Follow the phase diagram next, then the history of who controlled water.
  ! continuity: missing 1/2 anchor(s): density maximum        <- audio drops the claim; brief/plain/copy hold 2/2

$ spw emit expand templates/wonder.spw --bind anchor=… --bind question=… --bind lens="energy budget" … --out ../gen-steam.spw
── expand complete=false filled=6 open=0 bare=1              <- ~#hypothesis: "_" stays open for the reader
$ spw emit expand templates/wonder.spw … --derivative fork:templates/wonder.spw:wonder_fork_1
  open: anchor           <- ${anchor=d} fills; a later ${anchor} in =id[p_${anchor}] stays open (defaults are per occurrence)
^"lineage"{ mode: #fork  base: ~"templates/wonder.spw" … }   <- base is cwd-relative, not relative to the output

$ spw select matter/water.spw --expr '$%[_]' --skim
# hits=6   47:11 op:%  %[water.hoh_angle_deg, water.dipole_debye] …
$ spw select matter/water.spw --expr '$^["try"]'
spw: --expr parse failed           <- frames cannot be selected by name (only $^[_])

$ spw form matter/water.spw --spw
kinds  ()=0  []=38  {}=27 …   .  68  30.5%  ground / facet   #  80  35.9%
                                 <- 68 = every '.' in the file, sentence periods included; not an Spw card
$ spw pulse --ladder frame
steps=7 structured-ok=5 conceptual=2
  1. [empty] []  health=complete_structured … 6. [product] #[a, b] … 7. [fold] #[a, b, c]
$ spw pulse --ladder frame --contour axes
spw-pulse: unknown option "--contour"          <- canon form-ladders.spw:87-89 documents it

$ spw pulse scratch/messy.spw --profile layout_full --diff  -> edits=3 [layout-evidence] … +  #>water_try_density
$ cat scratch/messy.spw | spw pulse --stdin --profile layout_full --json -> "changed": false, "stop": "fixed_point"

$ spw refactor . --rename anchor:water_density_max=water_density_maximum
would rewrite 1 mark(s) in 1 file(s)       <- index.spw:28, water.spw:135 and water.spw:146 keep ~"…#water_density_max"

$ spw census . --sort degree       -> ~#among: #[ "<tmp>/…/root" ]   refs … broken=14
   broken targets: 4 from the mount stub, 1 template slot, 9 fragment refs that resolve verifies (e.g. matter/water.spw#water_density_max)
$ spw atlas .   -> 8 surfaces · 25 anchors · 7 edges        (graph: 38 links; resolve: 26 refs)

$ spw lattice .  -> contract.spw  paren/colon 3/5    <- 3 "cells" are quoted inside strings (contract.spw:70, :78, :94)
$ spw outline matter/water.spw   -> 39 landmarks; no line 140 ?[…] wonder, no #:claim moods, no ~#proof/~#door

$ spw delta before.spw after.spw  (after: hydrophobic #!contested→#!emerging, plus one new wonder)
    ~#labelDelta: #[ "+field" ; "+p_matter_water_foam" ]      <- the mood change is not reported
$ spw cycle before.spw after.spw  -> probes=1→2 wonder=1→2 flowRoleDeltas bias:+2 probe:+2   (again no mood)

$ spw inspect compose '?{ which coast swings more } ~<prediction>'
^["act_consequence"]{ ^["geometry"]{ ~#head: "?"  ~#consequence: prediction } ^["link"]{ ~#from: "probe body" ~#to: "potential membrane" } }
$ spw inspect source --text '?["x"]{ }' --through structure
^["next"]{ ^["step-1"]{ ~#command: "…--through tokens…" ~#purpose: "ask what the lexer sees…" ~#cost: "token stage only; …names omissions" } }

$ spw snippet hydrate wonder.probe --bind id=… --bind question=…
#>matter_water_boil_q
?["Why does pasta water foam?"]{ #:depth #!experiential  !probe{ =id[p1] }  $%[Hold] }   <- no ~#lens, no status, no neighbor
$ spw cite matter/water.spw -> "// cite  dual-read point arm"   (cli.spw:41 retires "dual-read")
$ spw fingerprint cards/form-card.spw -> complete=true prose=false  Scope=1 NRange=1 …   (a human table "parses")
```

### Defects that affect metacognitive use (all (b), verified)

| id | defect | where | why it matters for a reader |
|---|---|---|---|
| D1 | `expand` does not rebase relative refs inside transcluded fragments | `expand.ts:94-97` slices raw text | a digest's source links break once it is read or published from the index |
| D2 | `emit expand --derivative` writes `base` relative to the working directory, not the output file | `template-fill.ts` `stampDerivative` | the lineage in a fork does not resolve from where the fork lives |
| D3 | a slot default applies per occurrence, not per name | `template-fill.ts:96-111` | a template with `${a=x}` … `${a}` never reports complete |
| D4 | `refactor anchor:` renames only the particle | `refactor.ts:43-63` | every fragment ref to the anchor silently breaks |
| D5 | `pulse --stdin` reports `result.source` and `result.changed` | `pulse.ts:1251-1256`; `mutation-automata.ts:544`, `:585` (plan-only keeps the input as `source`) | the REPL and HMR preview can never show a change (the disk path uses `plannedSource`, `pulse.ts:1488`) |
| D6 | `census`/`graph` count fragment targets as broken | `corpus-scan.ts:193-208` | a prediction of "0 broken" is scored as wrong when it was right |
| D7 | `among` is absolute | `corpus-disclosure.ts:143` | violates the path law at `cli.spw:61` and `:102` |
| D8 | `lattice` is parse-free and counts mentions as uses | `apposition-scan.ts:1-6` | a reading spectrum inflated by quoted examples |
| D9 | the `form` operator census counts raw characters | `geometry-inspect.ts:106-122` | the "voice" lesson ("# leads at 36%") is driven by prose punctuation and title comments |
| D10 | `form --spw` prints a human report | `geometry.ts:477-481` | breaks the card law at `cli.spw:37`; parseability is accidental (Scope and NRange out of `()=0`) |
| D11 | `outline` skips every `#` line, `?[` wonders, and traits outside a whitelist | `view.ts:231`, `:268-269` | the orientation view hides the questions and the epistemic status |
| D12 | the LSP path hover previews the first 10 lines of the file and ignores `#fragment` | `display.ts:960-982` | the editor's "peek" is not the anchored node that `expand` would show |
| D13 | the canon-documented `--contour` is rejected | `form-ladders.spw:86-92` vs `pulse.ts` (no match for `contour`) | the ladder cannot be projected per axis |
| D14 | the three wonder scaffolds disagree | `snippet.ts:103-108`; `spw.json:46` (5-value depth pick-list, `$%[register.path]`); JetBrains has none | none carries `~#lens(…)`, which the cut contract requires |

---

## 2. Metacognitive reading of the instruments

**The frame (hedged).**
- Flavell (1979, *American Psychologist* 34(10):906-911) split metacognition into knowledge, experiences, goals and strategies.
- Nelson and Narens (1990, *Psychology of Learning and Motivation* 26:125-173) model it as *monitoring* (object level to meta level) and *control* (meta level to object level).
- CLI instruments sit on the monitoring side. Only `pulse`, `mutate` and `refactor` are control.

| act | exists | gap |
|---|---|---|
| **predict** | `emit holes` (open `_`), `?{…} ~<prediction>` (the compose form recognizes it, but it is not stored), `shelves.spw:48` "the reader fills this gap" **(a)** | nothing records a prediction and scores it (G6) |
| **check** | `resolve --warn`, `fingerprint` (complete / prose), `emit --measure` holds, `pulse --check` | the instrument disagreements D6, D8, D9, D11 |
| **compare** | `expand` (reading against sources), `delta`, `cycle`, `atlas --from/--to` | no comparison of readings (G5), no authored against derived line (G2) |
| **reflect** | `lattice`, `taste`, `graph` strands | no dated reading receipts (G5) |
| **plan** | `^["next"]{ command purpose cost }` cards (`cli.spw:105-109`), `emitNext` (`geometry.ts:444`) | no trail or arc sequencing (G4) |

**The flow schedule as a metacognitive cycle.** This mapping is **(c) interpretive**. Canon roles (`flow-protocol-sigils.spw:33`): `<< ~ ; ? ; % ; ! ; * ; ^ >>`. My reading of each step:

- `~` potential: predict, or defer.
- `?` wonder: ask.
- `%` measure: run the census.
- `!` act: edit.
- `*` value: collapse, i.e. compare prediction with observation.
- `^` integrate: record a reading receipt.

`% ; *` is monitoring and `! ; ^` is control. The limit, per `cli.spw:49`, is that this is a memory aid. The runtime does not execute the schedule as a learning loop. `operational-transform.spw:67-71` already warns against equating spirit phase order with an edit sequence.

**Research the proposals lean on.** I cited these from memory; verify venues and pages before the cut cites them, and note that no effect sizes are claimed.

- **Calibration and judgments of learning.**
  - Lichtenstein, Fischhoff and Phillips 1982 (in Kahneman, Slovic and Tversky, eds., *Judgment under Uncertainty*, Cambridge UP).
  - Glenberg and Epstein 1985 (*JEP: LMC* 11(4)): comprehension is poorly calibrated.
  - Nelson and Dunlosky 1991 (*Psychological Science* 2(4)): delayed judgments of learning are more accurate.
  - Koriat 1997 (*JEP: General* 126(4)): judgments rest on cues, not direct access to memory.
  - Thiede, Anderson and Therriault 2003 (*J. Educational Psychology* 95(1)) and Thiede and Anderson 2003 (*Contemporary Educational Psychology* 28(2)): delayed keywords and summaries improve metacomprehension accuracy. This is the closest support for a one-breath line as a self-test (G2).
  - Rozenblit and Keil 2002 (*Cognitive Science* 26(5)): the illusion of explanatory depth drops after people try to explain. This supports "predict before expanding."
  - Richland, Kornell and Kao 2009 (*JEP: Applied* 15(3)): pretesting helps even when the guesses are wrong. This supports predicting a census before running it (G6).
- **Generation and production.**
  - Slamecka and Graf 1978 (*JEP: HLM* 4(6)): the generation effect. It supports keeping `~#hypothesis: "_"` open instead of auto-filling it.
  - MacLeod et al. 2010 (*JEP: LMC* 36(3)): the production effect, meaning items read aloud are remembered better. It supports the shelves probe "read aloud for 30 seconds" (`shelves.spw:41`) and G2.
  - On inner speech: Alderson-Day and Fernyhough 2015 (*Psychological Bulletin* 141(5)).
  - Rayner et al. 2016 (*PSPI* 17(1)): suppressing inner speech costs comprehension.
- **Think-aloud.**
  - Ericsson and Simon 1993 (*Protocol Analysis*, rev. ed., MIT Press).
  - Fox, Ericsson and Best 2011 (*Psychological Bulletin* 137(2)): plain verbalization is largely non-reactive on accuracy but slows people down, while instructions to *explain* change performance.
  - So a probe that says "say where you pause" and one that says "explain why" are different interventions, and a prompt should declare which it is.
- **Highlighting.** These studies are about reading code; transfer to Spw is not established.
  - Hannebauer, Hesenius and Gruhn 2018 (*Empirical Software Engineering* 23(5)): no measurable benefit for novices.
  - Sarkar 2015 (PPIG): faster with colouring, small sample.
  - Beelders and du Plessis 2016 (*J. Eye Movement Research* 9(1)): little difference in reading behaviour.
  - Stripping highlighting as a "desirable difficulty" (Bjork 1994, in Metcalfe and Shimamura, eds., *Metacognition*, MIT Press) is plausible. But disfluency gains (Diemand-Yauman, Oppenheimer and Vaughan 2011, *Cognition* 118(1)) failed to replicate broadly (Meyer et al. 2015, *JEP: General* 144(2)).
  - So offer a bare mode as practice, not as a claimed speed-up.
  - Shape-coded output such as `outline`'s `◆ · ~` avoids relying on colour alone (WCAG 2.1, SC 1.4.1).
- **Tunable complexity.**
  - Sweller 1988 (*Cognitive Science* 12(2)): cognitive load.
  - Kalyuga et al. 2003 (*Educational Psychologist* 38(1)): the expertise reversal effect. What helps a novice burdens an expert, which is why persona projections (G3) are needed rather than one "best" view.
  - Renkl and Atkinson 2003 (*Educational Psychologist* 38(1)): fading from worked examples to problem solving. This maps onto ladder rungs.
- **Arcs and wheels.**
  - Bush 1945 (*The Atlantic Monthly* 176(1)): associative trails.
  - Llull's combinatory figures (*Ars brevis*, 1308); see Bonner 2007, *The Art and Logic of Ramon Llull* (Brill).
  - Breath group: Lieberman 1967 (*Intonation, Perception, and Language*, MIT Press).
  - Speech rates vary by genre: Tauroza and Allison 1990 (*Applied Linguistics* 11(1)). The 150 wpm used in G2 is an assumption behind a flag.

**The instrument has to be trusted first.** In G6's prototype my prediction of "broken: 0" was *right* according to `resolve`, and `census` scored it as off by 14. Fix D6, D8, D9 and D11 before shipping any predict/check loop.

**Ethics.** `cli.spw:117-124` and `:138` say that inspection evidence and exploratory activity "never… infer a person-level trait, or become an authority-facing score." Calibration receipts must therefore stay local to the reader and must not roll up into an aggregate.

---

## 3. Gaps and sketches

All six sketches live in `…/xform/root/proposals/` and share these results:
- `spw-syntax-validate`: 6/6 pass.
- Parse errors: 0.
- Prose-degradation warnings: 0; ProseChunks: 0.
- `spw resolve --from proposals`: 13/13 OK.

Every CLI addition runs at effect S0 (read) or S1 (sandbox), as defined in `range-transform.spw:50-53`. None writes source.

### G1. Comprehension: the Llull wonder wheel (lens × claim × era)

```
^["wheel"]{
 ~#(each turn couples one value from every ring; the budget caps how many cells are drawn)
 rings: .{
  lens: #[ "material grain", "energy budget", "historical layer" ]
  claim: #[ ~"../matter/water.spw#water_density_max", ~"../matter/water.spw#water_heat_capacity" ]
  era: #[ industrial, contemporary ]
 }
 turn: <>[lens, claim, era]
 yields: ={ ~"../templates/wonder.spw" }
 budget: 6
 order: #rarest_first
}
```

- **What the AST gives:** `turn` is an `<>` operation with a frame, `yields` is an `=` operation with a body, and `select --selector bias` finds the edge. Today `spw expand` transcludes the raw template.
- **Prototype** (`xform/wheel-proto.mts`, about 70 lines): `rings=lens:3 claim:2 era:2 product=12 drawn=6`. The six drawn cells are coverage-first, meaning each ring value appears before any repeats. Output is `proposals/zz-wheel-draw.spw`:
  - validator pass, 0 prose, 19/19 refs resolve;
  - `emit holes` reports `bare=6`, the open hypotheses.
  - Sample cell: `?["What does water heat capacity look like through energy budget in the contemporary era?"]{ #:depth #!experiential ~#lens(energy budget) … ~#hypothesis: "_" … }`.
  - The limit showed up immediately: the questions are mechanical scaffolds. Their value is the reader's generated hypothesis (the generation effect), not the question text.
- **Minimal CLI addition:** `spw expand <f> --wheel [--budget N] [--draw coverage|all] [--write]` in `expand.ts`.
  1. Add `wheelSites(ast)` to find `^["wheel"]`.
  2. Take the product over `rings`.
  3. Call `expandTemplate` (`emit/template-fill.ts:85`) per cell on the `yields` template edge.
  4. Write through `derivedSurfaceName(abs,'expanded')` (`expand.ts:115`), so scanners skip the output.
- **Canon.**
  - Frame contour rungs `#[a, b]` are "product" and "fold" (`form-ladders.spw:44`, `:82`).
  - `<>` with a frame operand keeps kind "couple" (`form-ladders.spw:69-75`; `operator-ladders.spw:23`).
  - Reflexive edge means template (`bias-product.spw:23`, `:34`).
  - `mode.template`: "holes + expand later" (`representational-disclosure.spw:107`).
  - The lens stays a level-3 apposition (`apposition.spw:70-78`).
  - Related plan **(c)**: `curiosity-mutation-ergonomics/wip.spw:109` has "combinator cell = sigil × boundary × …". That plan covers *form* combinators; the wheel is the reader-facing *content* version.
- **Comprehension equals generator plus filter.** The wheel is the generator. Spw.q (`$?[_]`, `selector-expr.ts:8-14`) is the filter half, but it cannot yet select frames by name (`$^["try"]` fails).
- **Falsifiers:** any drawn cell that states a claim instead of leaving `_`; any omitted cell that goes unreported (`form-ladders.spw:96`).

### G2. Reduction: a spoken one-breath line per surface

```
^["breath"]{
 of: ~"../matter/water.spw#matter_water"
 line: << "Water" ; "densest near four degrees" , "so ice floats" ; "and lakes freeze from the top" >>@voice
 ~#(a semicolon is a breath, a comma is a catch in the voice)
 budget: .{ words: 20, seconds: 6 }
 authored_by: #reader
}
```

- **What the AST gives:** `line` is a Stream with a sink Reference (`@voice`).
- **Prototype** (`xform/breath-proto.mts`):

  ```
  derived   words=15 est_s=6.0 continuity=2/2  Water: hydrogen bonding gives water a density maximum near 4 C, a large heat capacity.
  authored  words=14 est_s=5.6 breaths=3 continuity=1/2  Water densest near four degrees so ice floats and lakes freeze from the top
  ```

  The comparison is the metacognitive payload: the reader's own line drifted from the card's continuity anchor "density maximum". The derived clause split is naive, as the dangling "a large heat capacity" shows.
- **Minimal CLI addition:** `spw emit pack <f> --host breath [--words 20] [--wpm 150] [--compare <breath.spw>]`.
  1. Add `encodeBreath` beside `encodeAudio` in `emit/codecs.ts:276`.
  2. Add `breath` to the `EmitHost` union and the emit.ts host list.
  3. Reuse `attachHolds` (`codecs.ts:57`) for continuity.
  4. Separately, make `encodeAudio` speak the claim; it currently fails continuity (1/2).
- **Canon.**
  - Stream contour `<<a, b>> … <<x>>@sink` (`form-ladders.spw:61`).
  - Separators: `;` sequential, `,` parallel inside `<<` (`flow-protocol-sigils.spw:48`). A breath group is a parallel bundle, and `;` is the step between breaths.
  - Shelves probe: "read aloud… where do you pause?" (`shelves.spw:41`).
  - The omission law applies: a reduction must name what it dropped (`cli.spw:100`).

### G3. Projection by persona: physics student versus designer

```
^["readers"]{
 student: @(physics_student){ keep: #[ molecule, anomalies, limits, try ]  drop: #[ history ]  order: << molecule ; anomalies ; try >>  grain: #card }
 designer: @(designer){ keep: #[ try, anomalies, wonder ]  drop: #[ molecule ]  order: << try ; anomalies ; wonder >>  grain: #point }
}
```

- **What the AST gives:** `@` operation plus a Scope; the keep and drop sets are `#` operations with frames, and `order` is a Stream.
- **Looseness to note:** the body attaches to the enclosing Expression, not to the `@` operation. The alternative `@physics_student{…}` parses as a Reference carrying the body.
- **Minimal CLI addition:** `spw read <f> --reader <readers.spw#anchor>:designer [--rung N]`, using the `read` alias that `outline` already has.
  - Filter `skimOutline` (`view.ts:219`) by the keep and drop frame labels, and emit the `order`.
  - First fix D11, so wonders (`?[`) and `#:claim` moods count as landmarks.
  - End with an `^["omitted"]{}` card, per the omission law.
  - `--rung N` hides constructs above ladder rung N, using `pulse --ladder` rung ids: a tunable-complexity dial.
  - Spw.q should gain `$^["name"]` so a persona can be a saved query. This is the same shape as the proposed structural address in `range-transform.spw:65-70` (`~"doc.spw"#^["section"]`).
- **Canon.**
  - Scope contour `@() => @(here)` (`form-ladders.spw:52`).
  - "() is the @ container, which answers who is looking" (`apposition.spw:38`).
  - Grain `#[point, card, surface]` (`representational-disclosure.spw:111-116`).
  - "Disclosure never renames identity" (`representational-disclosure.spw:45`): a persona view is disclosure, never a new product.

### G4. Arcs across frames: trail playback

```
^["trail"]{
 stops: <<
  ~"../matter/water.spw#water_density_max" ;
  ?{ what happens to a lake if ice sinks } ~<prediction> ;
  ~"../matter/water.spw#water_heat_capacity" ;
  ?{ which coast swings more in a year } ~<prediction> ;
  ~"../matter/water.spw#water_steam_engines"
 >>
 dwell: .{ seconds: 45 }
}
```

- **What the AST gives:** the Stream's sequence holds a PathRef, then `?` with a body plus `~` with Capsule `<prediction>`, then a PathRef, and so on. `inspect compose` recognizes the act-consequence silhouette. `spw expand proposals/trail.spw` unfolds 0 today, because plain PathRefs are not template edges.
- **Minimal CLI addition:** `spw expand <f> --trail <anchor> [--step N] [--interactive]`.
  - Walk the stream in order.
  - For each PathRef, reuse the fragment projection in `renderTemplate` (`expand.ts:70-98`; export it).
  - At each `?{…} ~<prediction>`, print the question and, when interactive, read one line.
  - Append the answers to `derivedSurfaceName(abs,'trail')`, a receipt; the source is not written.
  - The canon command list (`cli.spw:12`) stays unchanged because this is a mode of `expand`.
- **Canon.**
  - Stream contour plus act-consequence `?{…} ~<answer>` (`composition-forms.spw:38-44`).
  - Serial sequence: "each step sees previous output" (`operational-transform.spw:53`).
  - Order sensitivity (`operational-transform.spw:61-65`): arc order is part of the arc.
  - `trail` is already a closed form value in `vocabulary.spw:32`.
  - **(c)** For evaluation: whether a prediction step improves learning here is untested. The pretesting literature suggests it may.

### G5. Comparing readings across time

```
#>reading_water_hydrophobic_2026_10_14
^["reading"]{
 of: ~"../matter/water.spw#water_hydrophobic"
 as_of: "2026-10-14"
 #:claim #!emerging
 held: "size matters: small solutes follow the entropy account, large ones a different regime"
 ~#confidence(low, after reading the source)
 supersedes: ~"./readings.spw#reading_water_hydrophobic_2026_09_30"
}
```

- **What the AST gives:** `#:claim #!emerging` binds to the `held:` binding (checked with `particleBindings`), so the mood travels with the reading.
- **Prototype** (`xform/readings-proto.mts`) on the same before/after pair where `delta` reported only `+field +p_matter_water_foam`:

  ```
  ^["readings"]{ ~#anchors: 11  ~#moved: 2
   ^["matter_water_foam_q"]{ ~#state: #new  after: #[ "#:depth", "#!experiential", …, "~#lens(bodily rhythm)" ] }
   ^["water_hydrophobic"]{ before: #[ "#!contested" ]  after: #[ "#!emerging" ] } }
  ```

  The card itself parses: 0 errors, 0 prose.
- **Minimal CLI addition:** `spw delta <before> <after> --readings` in `delta.ts`.
  - Key the `particleBindings` output (seed `canonical/particles.ts`) and appositions by the owning `#>` anchor, then compare mood and apposition sets.
  - Later: `atlas --save` could snapshot the mood counts so `--trend` shows how belief moved.
- **Canon.**
  - ChangeReport as product, with `delta_card` as its disclosure (`representational-disclosure.spw:64`, `:72`).
  - The `supersedes` relation and the `claim` status set in `vocabulary.spw`.
  - Apposition by degree: `~#confidence(…)` recurs, so it earns a name (`apposition.spw:24`).

### G6. Predict, then check: calibrating a census

```
^["prediction"]{
 of: ~"../index.spw#cut_index"
 command: "spw census . --sort degree"
 expect: .{ files: 8, links: 30, broken: 0 }
 hubs: #[ ~"../matter/water.spw", ~"../registries/sources/matter.spw" ]
 ~#confidence(high on files, low on links)
 ?{ which file has the most outgoing links } ~<answer>
}
```

- **Prototype** (a Node one-liner reading `census --json`):

  ```
  ^["calibration"]{ files: .{ expected: 8, observed: 8, error: 0 }  links: .{ expected: 30, observed: 38, error: 8 }  broken: .{ expected: 0, observed: 14, error: 14 } }
  ```

  The last row is D6 rather than a bad prediction. The first run, before I isolated the root, read `11/64/17` because scratch files were still in it. The instrument's scope is part of the check.
- **Minimal CLI addition:** `spw census <roots> --predict <file#anchor>` in `inventory.ts` (runner at `:217`).
  - Match `expect` keys against the product fields and emit `^["calibration"]` with an error, normalized to [0,1] per the measure axiom (`wonder-calculus.spw:47`).
  - Mark it `interprets: subjective`, which "may rank and disclose only" (`operational-field.spw:66-71`).
  - Keep receipts local (`cli.spw:117-124`).

### G7. Editor rendering, with and without highlighting

- **Fix D12 so hover becomes the in-editor expand.** At `display.ts:960-962`, when the target has `#frag`, run `resolveFragment` and slice the bound span, as `expand.ts:87-95` does.
- **Add a "Spw: Toggle Bare Reading" command.** It would flip the 5 `spw.surface.highlight*` and 3 `spw.inlayHints.*` settings (`package.json:154-205`, read at `surface-decorations.ts:51-75`). The practice loop is to read bare, write the breath line or prediction, then re-enable highlighting to check. Offer it as practice, not as a proven gain (see §2).
- **Unify the wonder scaffold.** Add `~#lens(…)`, `#:claim #!speculative` and a `neighbor` ref to `snippet.ts:103`, `spw.json:46`, and a new JetBrains `wonder` live template, all generated by `spw snippet emit` so they stop drifting. `plugin.xml:75-94` has no expand or peek action for JetBrains; a later step could route `spw expand` output to a scratch editor.

---

## 4. Canon crosswalk: each proposal extends an existing rung or form

| proposal | canon rung or form | file:line | new vocabulary |
|---|---|---|---|
| G1 wheel | frame `#[a, b]` product/fold; `<>[…]` couple with frame operand; reflexive template edge | `form-ladders.spw:44,69-75,82`; `bias-product.spw:23,34` | none (`wheel` and `rings` are frame labels) |
| G2 breath | stream `<<a, b>>@sink`; `;` versus `,` separators; omission law | `form-ladders.spw:61`; `flow-protocol-sigils.spw:48`; `cli.spw:100` | none |
| G3 readers | scope `@(here)`; `()` as the @ container; grain; structural address `#^["section"]` | `form-ladders.spw:52`; `apposition.spw:38`; `representational-disclosure.spw:111-116`; `range-transform.spw:65-70` | none |
| G4 trail | act-consequence `?{…} ~<answer>`; serial fold; order sensitivity | `composition-forms.spw:38-44`; `operational-transform.spw:53,61-65` | `trail` is already in `vocabulary.spw:32` |
| G5 readings | ChangeReport product and delta_card; mood particle; `supersedes` | `representational-disclosure.spw:64,72`; `apposition.spw:24` | none |
| G6 calibration | honest-metric `interprets`; `%X ∈ [0,1]`; social graces | `operational-field.spw:66-71`; `wonder-calculus.spw:47`; `cli.spw:117-124` | none |
| all | S0/S1 effect grades; the "reduced contour omits points without reporting loss" falsifier | `range-transform.spw:50-53`; `form-ladders.spw:96` | none |

## 5. Suggested order

1. Fix the instruments: D6, D11, D12, D5, D1, D4, D8, D9, D10, D13. Calibration is meaningless before this.
2. G5 `delta --readings` and G2 `--host breath`. Both are small, and prototypes exist.
3. G1 `expand --wheel`. The prototype exists.
4. G6 `census --predict`.
5. G3 `read --reader`, which needs `$^["name"]` in Spw.q.
6. G4 `expand --trail`.
7. G7 editor parity.

## Files (scratch only)

All paths are under `<scratchpad>/reading/xform/`.
- Proposals: `root/proposals/{wheel,breath,readers,trail,readings,predict}.spw`
- Generated outputs: `root/proposals/zz-wheel-draw.spw`, `root/proposals/zz-readings-card.spw`, `calibration.spw`
- Prototypes: `wheel-proto.mts`, `breath-proto.mts`, `readings-proto.mts`
- Checkers: `shape.mts` (AST shape), `errs.mts` (lexer errors)
- Before/after pair: `root/zz-delta/{before,after}.spw`
- Scratch root: `root/`, with `index.spw`, `index.expanded.spw`, `templates/wonder.spw` and `.spw/mount.spw`

### verification

# Verification of the "transforms" report

**Verdict:** the report holds up well. All 14 tooling defects (D1–D14) reproduce, and all 6 sketches parse cleanly. The corrections are mostly precision fixes. I found five problems the report missed: N1 (expand output drops a template's first line), N2 (CLI cards lose tag, list and path values in the parsed tree), N3 (no proposal passes the cut gate), N4 (the effect-grade claim is wrong) and N5 (the ladder rungs are used as a difficulty dial, which canon rules out). I made no repo writes. Scratch work is under `…/scratchpad/reading/verify-xform/`. One temp file went to `/tmp/x.json` and was deleted straight away.

## 1. Research citations

| Citation | Status | Note |
|---|---|---|
| Flavell 1979, *Am. Psych.* 34(10):906–911 | confirmed | knowledge / experiences / goals (tasks) / actions (strategies) |
| Nelson & Narens 1990, *PLM* 26:125–173 | confirmed | Calling `pulse`, `mutate` and `refactor` "control" is an analogy, label it (c). N&N's control is a learner's meta-level steering of cognition, not a tool editing a file. |
| Lichtenstein, Fischhoff & Phillips 1982, in Kahneman, Slovic & Tversky (eds.), CUP | confirmed | pp. 306–334 |
| Glenberg & Epstein 1985, *JEP:LMC* 11(4) | confirmed | pp. 702–718 |
| Nelson & Dunlosky 1991, *Psych. Sci.* 2(4) | confirmed | pp. 267–270 |
| Koriat 1997, *JEP:Gen* 126(4) | confirmed | pp. 349–370 |
| Thiede, Anderson & Therriault 2003, *J. Ed. Psych.* 95(1) | confirmed, needs a hedge | pp. 66–73. The gain needs a **delay**: immediate keywords did not help. G2 should ask for the breath line some time after reading, not straight away. |
| Thiede & Anderson 2003, *Contemp. Ed. Psych.* 28(2) | confirmed | pp. 129–160; delayed summaries |
| Rozenblit & Keil 2002, *Cog. Sci.* 26(5) | confirmed, claim stretched | pp. 521–562. Ratings drop after people try to *explain*. That supports "explain before expanding", not "predict before expanding". |
| Richland, Kornell & Kao 2009, *JEP:Applied* 15(3) | confirmed, transfer is (c) | pp. 243–257. Pretesting means trying to recall content you are about to learn. Guessing corpus statistics before a census is an analogy. |
| Slamecka & Graf 1978, *JEP:HLM* 4(6) | confirmed | pp. 592–604 |
| MacLeod et al. 2010, *JEP:LMC* 36(3) | confirmed, needs a hedge | pp. 671–685. The effect is strongest in mixed lists (some items aloud, some silent). Reading a whole surface aloud is a pure-list case; Fawcett 2013 (*Acta Psychologica* 142(1):1–5) finds only a smaller between-subjects benefit. |
| Alderson-Day & Fernyhough 2015, *Psych. Bull.* 141(5) | confirmed | pp. 931–965 |
| Rayner et al. 2016, *PSPI* 17(1) | confirmed | pp. 4–34; suppressing subvocalization reduces comprehension |
| Ericsson & Simon 1993, MIT Press | confirmed | |
| Fox, Ericsson & Best 2011, *Psych. Bull.* 137(2) | confirmed | pp. 316–344. Plain think-aloud is non-reactive on accuracy but slower; instructions to explain change performance. |
| Hannebauer, Hesenius & Gruhn 2018, *EMSE* 23(5) | confirmed | pp. 2795–2828 per my recall (search did not show pages); no evidence highlighting improves novice comprehension correctness |
| Sarkar 2015, PPIG | confirmed | 26th PPIG, pp. 49–58; n=10, faster task completion, effect weakens with experience |
| Beelders & du Plessis 2016, *JEMR* 9(1) | confirmed | pp. 1–11 |
| Bjork 1994, in Metcalfe & Shimamura (eds.), MIT Press | confirmed | pp. 185–205 |
| Diemand-Yauman, Oppenheimer & Vaughan 2011, *Cognition* 118(1) | confirmed | pp. 111–115 |
| **Meyer et al. 2015, *JEP:Gen* 144(2)** | **corrected** | It pools 17 attempts at the Alter et al. 2007 font effect on math problems (the CRT; the original plus 16 replications). It is not a replication of Diemand-Yauman 2011. For the learning claim, cite Xie, Zhou & Liu 2018 (*Educ. Psych. Rev.* 30, doi 10.1007/s10648-018-9442-x): no effect on recall or transfer, but disfluency **lowers judgments of learning** (d≈−0.43) and increases study time. Its recall result was questioned in a 2021 reproducibility critique in *EPR*. The lower-JOL finding actually supports offering a bare mode as a metacognitive cue. |
| Sweller 1988, *Cog. Sci.* 12(2) | confirmed | pp. 257–285 |
| Kalyuga et al. 2003, *Ed. Psych.* 38(1) | confirmed | pp. 23–31 |
| Renkl & Atkinson 2003, *Ed. Psych.* 38(1) | confirmed, canon conflict | pp. 15–22. Mapping it onto ladder rungs conflicts with canon; see N5. |
| Bush 1945, *Atlantic* 176(1) | confirmed | pp. 101–108 |
| Llull, *Ars brevis* (1308); Bonner 2007, Brill | confirmed | |
| Lieberman 1967, MIT Press | confirmed | |
| Tauroza & Allison 1990, *Appl. Ling.* 11(1) | confirmed | pp. 90–105. Radio about 150–170 wpm, lectures 125–160, so 150 wpm is a defensible flagged default. |
| WCAG 2.1 SC 1.4.1 (Use of Color) | confirmed | |

## 2. Tooling claims

### Confirmed by re-running (scratch root with 8 files)

- **Census:** `files=8 links=38 broken=14`.
  - The broken targets are exactly 4 from the mount stub, 9 `file#fragment` refs and 1 `templates/${neighbor}`.
  - `hubs` also lists fragment targets as separate nodes, which is more evidence for D6.
- **Resolve:** `total=34 ok=26 missing_file=8`, and every missing file comes from the mount stub or the template slot.
- **D1:** `expand` correctly unfolds `density_maximum` and `hydraulic_states`, but they keep their `../registries/…` refs.
  - Copying the digest into place as `digest.spw` adds exactly 3 `missing-file` rows.
  - Refinement: `resolve` skips `index.expanded.spw` as a derived file, so the break stays invisible until the digest is renamed or published.
- **Audio continuity:** audio is 1/2 (missing "density maximum"); brief, plain and copy are 2/2.
  - Exact cause: `codecs.ts:282-283` puts `claim` into `fields`, but the text built at `:284-290` leaves it out.
- **`emit expand`:** `complete=false filled=6 open=0 bare=1` reproduces.
  - The derivative reports `open: anchor` (D3) and stamps `base: ~"templates/wonder.spw"` into `gen/fork.spw` (D2).
- **`select`:** `$%[_]` gives hits=6; `$^["try"]` gives "--expr parse failed"; `$^[_]` works (22 hits).
- **`form`:** `. 68 30.5%` and `# 80 35.9%` equal raw `grep -o` character counts (D9). `fingerprint` of the `--spw` output gives `complete=true prose=false … NRange=1 Scope=1` (D10).
- **Ladders:** `pulse --ladder frame` gives `steps=7 structured-ok=5 conceptual=2`, with rungs 6 and 7 being product and fold. `--contour` gives "unknown option" (D13).
- **D5:** on the same buffer, the disk path reports `edits=3 wouldChange=true`, while stdin reports `changed:false, rules:[]` and usefulness `noop: "No planned edits … nothing to apply"`.
  - The stdin card actively misinforms.
  - Decisive lines: `mutation-automata.ts:621` (`resultSource = canApply ? current : source`) and `:639`. `wouldChange` and `plannedSource` already exist at `:640` and `:562`.
- **D4:** `refactor` would rewrite 1 mark. The 3 refs it leaves behind are at `index.spw:28`, `water.spw:135` and `water.spw:146`.
  - Exact cause: `renameParticle` at `semantic-edit.ts:280-297` selects `nodeType:'Particle'` only.
- **`atlas`:** `8 surfaces · 25 anchors · 7 edges`.
- **D8:** `lattice` reports contract.spw paren/colon 3/5; all 3 paren cells are inside strings (`contract.spw:70,78,94`).
- **D11:** `outline` shows 39 landmarks. Missing: the line-140 wonder, all 10 `#:claim` lines, `~#proof` (`:17`) and `~#door` (`:18`).
- **`delta` / `cycle`:** `delta` reports only `labelDelta "+field" ; "+p_matter_water_foam"`. `cycle` reports `probes 1→2 wonder 1→2 bias:+2 probe:+2`. Neither reports the mood change.
- **`inspect`:** `inspect compose` and the `inspect source ^["next"]{command purpose cost}` card match the report.
- **`snippet hydrate wonder.probe`:** output as stated.
- **`cite`:** prints `// cite  dual-read point arm`, against `cli.spw:41` and `:130`.
- **`measure`:** "no surfaces declare @self".
- **Code lines confirmed:**
  - `expand.ts:34-38, 87-95, 113-117`
  - `extract.ts:1-4, :43`
  - `codecs.ts:57, 205, 276`
  - `template-fill.ts:78-83, :85, :96-115`
  - `selector-expr.ts:8-14`
  - `geometry-inspect.ts:106-122`
  - `geometry.ts:477-481`
  - `pulse.ts:1236-1276, :1488`
  - `refactor.ts:43-63`
  - `corpus-disclosure.ts:143`
  - `corpus-scan.ts:193-208`
  - `apposition-scan.ts:1-6`
  - `view.ts:219-231, 268-269` (glyphs at `:299-306`)
  - `change-report.ts:347`
  - `display.ts:961-962`
  - `package.json:154-205` (3 `inlayHints` + 5 `surface.highlight*`)
  - `spwTemplates.xml` (7 templates: frame, intent, anno, subroot, prop, episode, stream)
  - `plugin.xml:75-94` (no expand or peek action)
  - `canonical/snippet.ts:98-108`
  - `spw.json:46`
  - `inventory.ts:217`
  - `particles.ts:82`
- **Canon lines confirmed:**
  - `bias-product.spw:23,34`
  - `form-ladders.spw:44,52,61,69-75,82,86-92,96`
  - `operator-ladders.spw:23`
  - `representational-disclosure.spw:45,64,72,107,111-116`
  - `apposition.spw:24,38,70-78,91`
  - `flow-protocol-sigils.spw:33,48`
  - `composition-forms.spw:38-44`
  - `operational-transform.spw:53,61-65`
  - `range-transform.spw:50-53,65-70`
  - `shelves.spw:41,48`
  - `cli.spw:12,37,41,49,61,100,102,105-109,117-124,138`
  - `wonder-calculus.spw:47`
  - `operational-field.spw:66-71`
  - `wip.spw:109`
  - staging `vocabulary.spw:32` (`trail`), `:41` (claim set), `:44` (`supersedes`), `:51` (all lenses used are in the closed set)

### Corrections

1. `selector-expr.ts` open gaps are at **:18-24**, not :16-22.
2. **D7 is partial.** `among` is absolute only in `^["corpus"]`; `^["population"]` prints `~#among: #[ "." ]`.
3. "resolve: 26 refs" should read **26 ok of 34**.
4. **G1 "19/19 refs resolve" is misattributed.** `zz-wheel-draw.spw` has 6 refs. The 19 is the whole `proposals/` directory: the 13 from the six sketches plus those 6.
5. **G1 is internally inconsistent.** The sketch says `order: #rarest_first`, but the prototype and the proposed flag are coverage-first (`--draw coverage|all`). The drawn balance is confirmed: lens 2/2/2, era 3/3, claim 3/3.
6. **G2:** the host list is `EMIT_HOSTS` in `emit/types.ts:21-31` (union at `:10-19`), with dispatch in `encodeHost` at `codecs.ts:10`. `emit.ts` only has help text (`:427`).
7. **G2's AST claim needs qualifying.** The parser does not group a breath. `line` parses as 4 flat Literals with `separators [";", COMMA, ";"]`, so breath groups must be rebuilt from the separator array. `breath-proto.mts` reads the line with a regex, not the AST. Reading `,` as "a catch in the voice" is (c); canon `,` means parallel.
8. **G3 is imprecise.** In `@x{…}` the body belongs to the Expression, not the Reference (Reference keys: `type, path, raw`). In `@(x){…}` both the Scope and the Body attach to the Expression and the `@` Operation is bare. Neither form gives the operator the body.
9. **G4:** `?{…} ~<prediction>` inside the stream is **two** sequence entries (Operation `?` and Operation `~`) joined by a `null` separator, not one act-consequence node. The 7 entries are PathRef, `?`, `~`, PathRef, `?`, `~`, PathRef. A trail walker must pair adjacent entries itself.
10. **G5 confirmed:** `particleBindings` binds `#:claim` and `#!emerging` to `held:`. But the generated card's `~#state: #new` detaches (see N2). Also note that `readings` is already the alias for `lattice` (`cli.spw:14`), so `delta --readings` overloads the name. And `supersedes:` sits inline, whereas the cut contract puts relations in `^[edges]{ relation: [ … ] }` (`contract.spw:68`).
11. **D12 refinement.** Go-to-definition already resolves `#fragment` (`navigation.ts:63-107`, `fragmentRange`). The hover fix should reuse that, not `expand.ts`.
12. **D14 refinement.**
    - The VS Code snippet *does* carry `~#hypothesis` (`spw.json:52`); the canonical one does not.
    - VS Code's 5-value depth pick-list lacks 4 of the cut's 9 depths (historical, physical, social, ethical; `vocabulary.spw:42`).
    - The point that no scaffold carries `~#lens(…)` stands (`contract.spw:94`).
13. **Status labels.** `representational-disclosure.spw:65,73` (product and disclosure) and `range-transform.spw:66` (L1 structural address) are `status: proposed`. Label them (a, proposed).
14. **Order warning.** `operational-transform.spw:67-71` warns about the *spirit* sequence `?~<#.>@…^`, not the flow schedule. It applies to the flow schedule only by analogy.
15. **Repo status has drifted.** It now shows `M .agents/plans/index.spw`, `M scripts/analyzers/spw-cut-gate.ts`, and an untracked `.agents/plans/caches-cut-2026-09-30/`. `.spw/caches/index.spw` is no longer modified.

### New findings the report missed

- **N1 (code, verified): expand output can lose its first line.** `renderExpandResult` (`template-fill.ts:326-335`) drops the trailing `''` through `.filter(Boolean)`, so the last header comment fuses with the template's first line.
  - Observed: `# defaults: hypothesis, kind# Wonder Template`.
  - With a template that starts `#>${anchor=topic_q}`, the output is `# defaults: anchor, q#>topic_q`, so the **anchor is swallowed into a comment**.
  - This affects every `emit expand --out` and any G1 path that goes through this renderer.
- **N2 (code, verified): CLI cards lose values in the parsed tree.** A spaced `~#k:` followed by a `#tag`, `#[…]` or `~"path"` parses as an Annotation with `value=undefined`.
  - Examples: `~#cyclic: #no`, `~#among: #[ "." ]`, `~#of: ~"…"` in census, `~#labelDelta: #[…]` in delta, `~#scoped: #no` in compose.
  - So CLI "cards" pass the syntax check but lose these values structurally. A G6 `census --predict` that reads card fields would get undefined.
  - The working-tree gate already codifies this (`spw-cut-gate.ts:51`).
- **N3 (verified): no proposal passes the cut gate.** Running the modified working-tree `spw-cut-gate.ts` over a copy marks all 6 proposals ✗:
  - all 6 are missing `^"provenance"` and `^"emit"`;
  - `predict.spw:15` links up to `index.spw`;
  - `readings.spw` claims have no `source:` (warnings);
  - `zz-readings-card` has no header and has the N2 detach;
  - `templates/wonder.spw` uses `~#lens(${…})`, which is not in the vocabulary, and has an unresolved `${neighbor}`.
  - The report claims only validator passes, but these sketches are not yet cut-legal.
- **N4 (canon): the effect-grade claim is wrong.** "Every addition S0/S1 … none writes source" holds only for the first half. S1 means "no disk write" (`range-transform.spw:52`). G1 `--write`, the G4 receipt append and G6 stored receipts all write to disk, and `census` already writes `.spw/gen/session/corpus-memo/*` (observed).
- **N5 (canon conflict): ladder rungs are not difficulty levels.** `form-ladders.spw:80-81` says `=>` is "ordered enrichment or inspection in this catalog only", with `not: … developmental_stage`. G3's `--rung N` complexity dial and the Renkl & Atkinson fading mapping treat rungs as difficulty, which canon rules out. Label this (c) and say that it conflicts with canon.

## 3. Sketches

- **`spw-syntax-validate`:** 17/17 pass. That covers the six report-inline sketches, the two inline cards, the six proposal files, `zz-wheel-draw`, `zz-readings-card` and `calibration.spw`.
- **Lexer errors:** `parse().errors` is 0 on all 17.
- **Shape checker:** 0 degradations and 0 ProseChunks on every file.
- **Bindings:**
  - `turn` is `Op(<> frame)` and `yields` is `Op(= body)`.
  - `line` is a Stream with a Reference sink.
  - Both `order` bindings and `stops` are Streams with no sink.
- **Resolve:** `--from proposals` gives `total=19 ok=19`, which is 13 from the six sketches.
- **Prototypes reproduce exactly:**
  - breath: `derived words=15 est_s=6.0 2/2` and `authored words=14 est_s=5.6 breaths=3 1/2`;
  - readings: `anchors 11 moved 2`, contested→emerging;
  - wheel: `emit holes bare=6`.
- **`spw expand proposals/trail.spw`:** `unfolded=0`, as stated.

Sources:
- [Meyer et al. 2015](https://digitalcommons.chapman.edu/esi_pubs/96/)
- [Xie, Zhou & Liu 2018](https://link.springer.com/article/10.1007/s10648-018-9442-x)
- [2021 critique of that meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC7854329/)
- [Hannebauer et al. 2018](https://link.springer.com/article/10.1007/s10664-017-9579-0)
- [Beelders & du Plessis 2016](https://doi.org/10.16910/jemr.9.1.1)
- [Sarkar 2015](https://ppig.org/files/2015-PPIG-26th-Sarkar1.pdf)
- [Fawcett 2013](https://pubmed.ncbi.nlm.nih.gov/23142670)
- [Thiede & Anderson 2003 (via Cambridge Handbook chapter)](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-cognition-and-education/improving-students-metacomprehension-accuracy/D4DF5EA5C99D6127F7B790F7C9B4FD9C)
- [Rayner et al. 2016](https://www.researchgate.net/publication/290492746_So_Much_to_Read_So_Little_Time_How_Do_We_Read_and_Can_Speed_Reading_Help)
- Tauroza & Allison 1990: search results only, no primary link

---

## subvocal_arcs

# Subvocalized wonder and engagement arcs in Spw: what canon says, how the CLI and editors render it, what research supports, and verified sketches

Labels used throughout: **(a)** canon says it, **(b)** code does it (checked by me unless marked otherwise), **(c)** aspirational.

I only read the repo. All scratch work is under `SP=<scratchpad>/reading/`, mainly `subvoc/` (a copy of the cut plus my sketches) and `subvoc-vault/` (a reader's overlay).

**While I worked, `cut-staging/2026-09-30` changed.** Someone else updated `contract.spw` (it gained `^["ethics"]` and `^["graph"]`), `water.spw` (it gained `src_hills_1989`), and `scripts/analyzers/spw-cut-gate.ts` (it now fails a claim with no source). I re-copied staging and re-applied my edits, so every result below is against the current versions.

## 0. Headline findings

1. **Canon already has a reading-aloud probe, but it is 48 copies of one template.** The probe "read aloud for 30 seconds; where do you pause?" (e.g. `.spw/shelves.spw:41`) appears 48 times, and only its last clause varies across three endings (biome edges ×16, grain boundaries ×17, structural joints ×15). The companion metric `~#reading_feel` appears 51 times and "felt rhythm" 18 times. No code reads any of them: grep over `packages/`, `src/` and `scripts/` returns nothing. (a) exists, but as generated boilerplate, never instrumented.

2. **"Voice" in canon means operator ratio.** The recurring probe is "compare operator frequencies; files with similar content but different operator ratios have different voices" (`.spw/hot.spw:73-77` and about 20 other files). The cut gate accepts `op.distribution` as a handle (`spw-cut-gate.ts:37`). The only thing that renders it is census `~#sigils`, and there the header stack dominates. `lesson.spw` shows `"!6"`, and those six `!` are exactly its six `#!` header moods, not actions. (b) The voice signal exists but is drowned by boilerplate.

3. **The CLI's reading outline hides the question spine.** `skimOutline` skips every line starting with `#` (`view.ts:231`). It only matches frames written with `^` (`:222`) and whitelists five traits (`:269`). So a skim never shows:
   - particles (`#>`, `#:claim #!…`)
   - `?["…"]` wonders
   - `<< … >>` schedules
   - `cold_open` say-lines
   - `~#door`

   I checked this on `water.spw` and `live.spw`: both show structure but not the questions. (b)

4. **The spoken publishing path already exists, and the cut's cards are silent in it.** `encodeAudio` (`packages/spw-cli/src/emit/codecs.ts:276-300`) renders TITLE / DURATION / COLD OPEN / SPINE / CTA. Its text omits the claim; the claim is kept only as a field.
   - Water's current card produces only TITLE + CTA, and `--host audio --strict-continuity` exits **2**.
   - Adding one line, `cold_open: "Water has a density maximum just above freezing, so ice floats and lakes freeze from the top."`, makes it exit **0**. The brief gate still exits 0.
   - The continuity gate therefore forces the spoken line to carry the anchor phrase.

5. **The readings scanner finds recurrence but also counts quoted text.** `spw readings` (the alias for `lattice`, `cli.spw:14`) is parse-free (`apposition-scan.ts:2-7`).
   - It counts appositions inside string literals. Checked: `contract.spw`'s `~#lens(phrase)`, `~#neighbor(nearest)` and `~#(author year)` all live inside strings and are all counted.
   - Its `mask` hashes the exact envelope (`:36`, `:94`). Two identical anonymous readings share mask `e0b5755c` (checked), so the canon rule "named the moment it recurs" (`apposition.spw:92`) is mechanically detectable today.

6. **Reader overlays work with no code change.** A reader's readings can live outside the consumer root, declared as an external root in `.spw/workspace.spw` (`workspace.ts:189-191`). Checked:
   - `spw roots` shows `@readings external`.
   - `spw readings @readings` works.
   - `spw resolve --from @readings --warn` shows 6/6 ok, including the cross-root anchors into the cut.
   - `spw census @cut` never sees the vault.

   One gap: `spw expand @readings/...` fails with ENOENT because `expand.ts:109` uses `path.resolve(target)`. That also means `expand` skips the consumer-root guard.

7. **Existing compare tools don't calibrate.** Neither `spw delta` nor census can compare a forecast with a result key by key:
   - I wrote a forecast census card and ran `spw delta` against the real one. It reports only counts (`replaced:4 inserted:21`), not which values differed.
   - Census reports `~#broken: 29` where resolve reports 55/60 ok (the 5 misses are canon links that can't resolve from scratch). It also reports `~#in: 0` for water, the most-cited file. Both come from the known fragment-node bug. A reader checking a forecast against census would be "wrong" because the tool is.

8. **Plan streams record almost no surprises and no forecasts.** Across 1132 `>>` entries in `.agents/plans/**/wip.spw` (including the archive), there are 17 `surprise`, 282 `decide`, and 0 `forecast` or `predict` entries. The schema defines `surprise` as "the interesting part" (`_schema/wip.spw:262`), but nothing records the forecast a surprise is measured against. (b)

9. **Only VS Code gets the one reflective editor view.** `spw/cacheReflection` reads the LSP document cache as a record of attention (`cache-reflection.ts:1-19`). VS Code shows it under "What stands out" (`extensions/vscode-spw/src/instruments/commands.ts:160-190`). JetBrains has 0 references to it; its "Spw Cache" action runs `inspect cache --json` instead (`SpwCliInvocation.kt:39-43`).

10. **Editors break up the prose of a reading.**
    - The TextMate grammar has no apposition rule (`spw.tmLanguage.json:341-362`). In `~#(Cutler and Miller 2005 …)` the `~` is unscoped and the years are painted `constant.numeric`, in both VS Code and IJ (sibling harness `SP/tm/water.*.tm.txt:124`).
    - JetBrains turns spellcheck off for `.spw` entirely (`SpwSpellcheckingStrategy.kt:8-10` returns `EMPTY_TOKENIZER`).
    - Reading profiles (`author|prompt|research|creative`, `dialect/types.ts:54`) are labels only. They are displayed (`display.ts:430`, `profile.ts:99`), nothing branches on them, and no preset assigns `creative`.

## 1. What canon already says (a)

| Theme | Where | What it says / state |
|---|---|---|
| Reading as apposition | `docs/theory/spw/apposition.spw:23-25, 30-31, 38, 44-47, 70-77, 92` | Three degrees: anonymous `~#(…)`, named `~#name(…)`, and datum `~#name: v`. "The comma pair in that sentence does what these parens do". `()` is the `@` (perspective) container. The body is raw prose. The liminality ladder runs 0-4. "Anonymous for a one-off reading; named the moment it recurs." |
| Marginalia | `.spw/conventions/hash-resonance.spw:8` | "Prefer `#` for Spw-native marginalia". But `#` prose is dropped from the AST, so `#` marginalia are invisible to tools. Appositions are the countable marginalia. |
| Readings command | `.spw/conventions/cli.spw:14, 48` | `readings -> lattice`. "implemented scan: named and anonymous ~# apposition cells; comments are not interstitial cells". |
| Read aloud | `.spw/shelves.spw:33, 38-41` (+47 copies) | Orientation: "plain-text-first; legible in terminal, Obsidian, Notion". Probe: "read aloud … pauses mark grain boundaries". Templated. |
| Voice | `.spw/hot.spw:73-77`, `.spw/conventions/cli.spw:145-150`, … | Voice = operator ratio. Templated. |
| Publishing voice | `prompts/substrate/tone-anatomy.spw:31, 113-119`; `packages/spw-cli/src/emit/registers.ts:8-73, 68, 75` | "change one dimension per saga step". Pace: patient / kinetic. Phrases include `'breath between beats'` and `'taste said aloud'`. Registers `#voice_*` are tuned with `--set`. |
| Cadence | `docs/theory/spw/looper-architecture.spw:61-65`; `docs/theory/spw/audio-architecture.spw:64` | Cadence biases `glance` / `browse` / `deep_work`, and a pacing gate "immersive caps at 0.5×". These are **(c) here**: the cited `src/infra/shaders` and `src/infra/audio` do not exist in this repo, and grep for `deep_work` finds nothing. |
| Cadence per archetype | `.spw/surfaces/surface-archetypes.spw:11, 14-75` | "names what a surface does to attention and participation". Twelve archetypes, each with a cadence and evidence list, e.g. `guided_curriculum/#guided_escalation`, `seasonal_exhibit/#bounded_cycle{opening, interaction, closing, archive}`, `coordination_protocol/#serialized_turn_taking`. |
| Clocks | `docs/theory/spw/operational-field.spw:47-51, 56, 71`; `.spw/hot.spw:34-39` | "never share names across clocks". `wonder` is a **collate** act. "interprets:subjective may rank and disclose only". `beat` = cadence only, no side effects. |
| Loops | `.spw/process/loop-observation.spw:9-16, 60-67`; `docs/features/spw/lens-walk.spw:27-28`; `docs/examples/spw/sense-loop.spw:26-33`; `docs/examples/spw/spirit-cycle.spw:45` | Loop-observation: a beat is the "smallest state advance", at micro / meso / macro scale. Lens-walk: "observe -> perturb -> compare -> reframe -> log; change one variable at a time". Sense loop: invent → drill. Spirit cycle: "Phase 6 feeds into phase 1 of the next cycle". |
| Scenes | `docs/theory/spw/scenes/dusk-oak.spw:2, 224-229` | "? streams = motion/duration". An `eye_path: ?< … >` whose last step reads "cycle restarts". This is a guided attention arc. |
| Arcs (history) | commit convention (see `git log`) | Every episode is `~[scene] → ![change] → ^[affords]{easier, possible} → *[verify]`: a canon four-beat narrative arc. |
| Arcs (plans) | `.agents/plans/_schema/wip.spw:18, 24-25, 45-53, 72-77, 262` | Card is the "glance" region. Stream is append-only. Lane glyphs include `?` research and `~` curriculum. `surprise` stream type. |
| Arcs (learning) | `docs/learn/index.spw:29-33, 60`; `docs/learn/path.md:24, 68, 103` | Time-boxes t15 / t60 / t1d. "**Checkpoint:** you can say what a hub is": retrieval checkpoints in speech form. "measure_first". |
| Handoff and arrival | `.spw/caches/resume/2026-09-30-direction.spw:28, 30, 31, 64-65, 70` | "Repetition does not make a command more true". "A practiced circuit is earned by holding attention". Cards are "stills". "Keep charge off the visit arc … Do not map valence onto spirit-cycle phases". Refuse "A command tour as onboarding". |
| Reading vs source | `docs/research/spw/navigable-focus.spw:19, 39-40, 55, 63, 75-78, 96, 99` | Status proposed. `draft` = an unsaved variant with its source link. `stale` revalidates. `see_reading` = "compare interpretations without losing the original". "joining comparison is an explicit act". Measure "can they say how a reading arose?". Refuse "dwell time as comprehension". |
| Lossy reduction | `docs/theory/spw/form-ladders.spw:80, 96`; `.spw/conventions/cli.spw:100` | "a reduced contour omits points without reporting loss" is a falsifier. "every bounded product states omitted rows". |
| Personal data | `.spw/conventions/cli.spw:117-124, 138` | Inspection is "local, explicit, read-only", keeps "no hidden activity log", and "never … infers a person-level trait". |
| Arc infrastructure asked about | — | I found no "arc bench" in this repo (grep returns 0). The nearest references are the "visit arc" and spirit-cycle phases in the resume note, which live in the consumer site. I could not verify them here. `onboarding-arc` is explicitly deferred (`consumer-cli-instruments/PLAN.md:14`). |

## 2. Rendering as a metacognitive tool: what exists for each move (b)

| Move | Existing instrument | What it renders | Checked gap |
|---|---|---|---|
| Predict | none | — | No forecast type in the plan stream (0/1132). No `--forecast` option on any command. |
| Check | `emit … --strict-continuity`, `spw resolve --warn`, `spw taste --fidelity` (declared vs parser-visible), `spw fingerprint` completeness | pass/fail cards | Census broken/in-degree counts are wrong for fragment refs, so a check against census misleads. |
| Compare | `spw delta a b` (`delta.ts`), `spw cycle`, `spw expand` | ChangeReport counts; flow roles (`flow×1` for a schedule); transclusion | `delta` has no key-wise diff. `expand` copies source-relative links verbatim (`expand.ts:96-102`): placing the handoff digest at the index location broke 5 links (checked). `expand` ignores `@root` selectors (`:109`). |
| Monitor progress | `spw emit holes` | counts bare `_` | A wonder arc with `observe/reflect/next: _` shows `bare=3`, and `bare=0` once filled (checked). Works as an arc progress meter. |
| Reflect | LSP `spw/cacheReflection` (`cache-reflection.ts:30-35, 100-136, 181-186`) | notes: expired-view > wrote-without-return > returning > churning | VS Code only. It describes a single session and says so (`:16-18`). |
| Plan | `formatRecommendations` → `^["next"]{command purpose cost}` (`view.ts:79-104`; `cli.spw:105-109`); plan card `next:`; `~#door` | copyable next moves | `~#door` is invisible in skim (`view.ts:269`). |
| Hear | `emit --host audio` / `social` (`codecs.ts:276-323`); `emit registers` | COLD OPEN / SPINE / CTA | Silent unless the `^"emit"` frame has `cold_open` / `hook` / `beat` / `body` slots (`extract.ts` SLOT_KEYS). |
| Read in the editor | LSP wonder summary (`display.ts:301-307`) | depth, lens, probe, metrics, neighbor | Lens is read only from `// lens:`, and neighbor only from `~<…>`. So the cut's wonders, written in `~#lens(…)` + `~"…" ~#neighbor(nearest)` form, show neither. Hover column rules: see sibling `lens_lsp.md` F4. |

**With and without highlighting, as it bears on subvocalization.**
- Today a reading's body is visually broken up: sigils are colored and digits are painted as numbers. That pulls the eye, and plausibly the inner voice, toward the numbers inside an aside.
- The evidence does not support turning highlighting off as a learning aid:
  - Syntax highlighting showed no measurable comprehension benefit for 390 novices (Hannebauer, Hesenius & Gruhn, 2018, *Empirical Software Engineering* 23:2795-2828).
  - Perceptual disfluency had a null effect on recall and transfer, but it **lowered judgments of learning** and increased study time (Xie, Zhou & Liu, 2018, *Educational Psychology Review* 30:745-771; the meta-analysis was later criticized for errors by Weissgerber et al., 2021).
- **Design reading:** a plain-text pass changes *confidence* more than *learning*. That is a metacognitive signal worth pairing with calibration, not a way to learn more.
- **(c) proposal:** a "reading" rendering (the unused `creative` reading profile) that
  - paints each apposition body as one prose scope,
  - dims sigils,
  - shows questions, say-lines and doors first,
  - and leaves parse and reconcile truth unchanged (`.spw/tooling/vscode-spw.spw:111`).

## 3. Research, graded by strength

Items marked ✓ I rechecked online this session; the rest are from memory and flagged.

**Strong:**
- **Retrieval practice.** Roediger & Karpicke 2006, *Psychological Science* 17:249-255 (not rechecked). Dunlosky et al. 2013, *PSPI* 14:4-58 (not rechecked) rates practice testing and distributed practice as high utility, and highlighting, rereading and summarization as low.
- **Spacing.** Cepeda et al. 2006, *Psychological Bulletin* 132:354-380; 2008, *Psychological Science* 19:1095-1102 (not rechecked). The best gap grows with the retention interval. Applying that to a 95-day season is an extrapolation.
- **Production effect** (saying a word aloud helps you remember it):
  - robust within-subject: MacLeod et al. 2010, *JEP:LMC* 36:671-685 (not rechecked);
  - smaller but real between-subject: Fawcett 2013, *Acta Psychologica* 142:1-5 ✓;
  - hearing your own recorded voice falls between speaking and hearing someone else: Forrin & MacLeod 2018, *Memory* 26:574-579 ✓.
- **Pretesting and errorful guessing** help *when the answer is studied afterwards.* Kornell, Hays & Bjork 2009, *JEP:LMC* 35:989-998 ✓; Pan & Carpenter 2023, *Educational Psychology Review* 35:97 ✓. This is the evidence for putting the forecast before the probe.
- **Subvocalization and comprehension.** Suppressing inner speech (speed reading) trades away comprehension: Rayner, Schotter, Masson, Potter & Treiman 2016, *PSPI* 17:4-34 ✓.
- **Monitoring accuracy.** Delayed judgments of learning are more accurate (Nelson & Dunlosky 1991, *Psychological Science* 2:267-270, not rechecked). Writing keywords *after a delay* improved metacomprehension accuracy and learning (Thiede, Anderson & Therriault 2003, *Journal of Educational Psychology* 95:66-73 ✓). People feel they understand more than they do (Glenberg, Wilkinson & Epstein 1982, *Memory & Cognition* 10:597-602, not rechecked). **Implication:** say it again later, not only right after reading.

**Moderate:**
- **Self-explanation.** Chi et al. 1989, *Cognitive Science* 13:145-182; Chi et al. 1994, *Cognitive Science* 18:439-477 (not rechecked).
- **Elaborative interrogation** (Pressley et al. 1987, *JEP:LMC* 13:291-300, low confidence on details) and **question generation** (Rosenshine, Meister & Chapman 1996, *Review of Educational Research* 66:181-221; King 1992, *Educational Psychologist* 27:111-126; not rechecked).
- **ICAP** (interactive > constructive > active > passive): Chi & Wylie 2014, *Educational Psychologist* 49:219-243 ✓. The level ordering is debated in practice.
- **Metacognition frameworks.** Flavell 1979, *American Psychologist* 34:906-911; Nelson & Narens 1990, *Psychology of Learning and Motivation* 26 (monitoring vs. control) (not rechecked).
- **Think-aloud.** Ericsson & Simon 1993, *Protocol Analysis* (MIT Press). Fox, Ericsson & Best 2011, *Psychological Bulletin* 137:316-344 (not rechecked): plain verbalization doesn't change accuracy but slows people down; asking for explanations can change performance. So a "say it" step changes the task, and that is intended.
- **Inner voices differ between people.** 80.7% of 570 respondents report an inner reading voice, with individual accent, pitch and tone (Vilhauer 2017, *Scandinavian Journal of Psychology* 58:269-274 ✓). Inner speech follows the reader's own regional accent (Filik & Barber 2011, *PLoS ONE* 6:e25782 ✓). Review: Alderson-Day & Fernyhough 2015, *Psychological Bulletin* 141:931-965 (not rechecked).
- **Prosody.** Nominal appositions are among the parentheticals with prosodic phrasing analyzed in Dehé 2014, *Parentheticals in Spoken English* (CUP) ✓. That supports reading `~#(…)` aloud as a spoken aside. Pauses align with syntactic boundaries: Cooper & Paccia-Cooper 1980, *Syntax and Speech* (not rechecked). That makes "pauses mark grain boundaries" plausible, not established.
- **Unit size.** One new idea per intonation unit (Chafe 1994, *Discourse, Consciousness, and Time* ✓). Memory span roughly tracks how much can be said in about 2 seconds (Baddeley, Thomson & Buchanan 1975, *JVLVB* 14:575-589, not rechecked). A one-breath line is a design heuristic, not a measured optimum.
- **Curiosity helps memory.** Kang et al. 2009, *Psychological Science* 20:963-973; Gruber, Gelman & Ranganath 2014, *Neuron* 84:486-496 (not rechecked).

**Weak, contested, or analogical:**
- Flow's challenge-skill balance (Csikszentmihalyi 1990) has mixed experimental support (Engeser & Rheinberg 2008, *Motivation & Emotion* 32:158-172; not rechecked).
- Six emotional arc shapes from sentiment analysis (Reagan et al. 2016, *EPJ Data Science* 5:31; contested method). Boyd, Blackburn & Pennebaker 2020, *Science Advances* ✓ find staging, plot progression and cognitive tension; this is descriptive, not a recipe.
- Endings and temporal landmarks: peak-end (Kahneman et al. 1993, *Psychological Science* 4:401-405) and the fresh-start effect (Dai, Milkman & Riis 2014, *Management Science* 60:2563-2582) (not rechecked). Using them to design celebration and a Jan-4 reset is analogy.
- Writing a plan reduces intrusive thoughts about unfinished goals: Masicampo & Baumeister 2011, *JPSP* 101:667-683 (not rechecked). This supports the "leave one question" note.
- Massive chat stays coherent through "crowdspeak" (Ford et al. 2017, CHI EA ✓, qualitative).
- Family arcs: elaborative reminiscing (Fivush, Haden & Reese 2006, *Child Development* 77:1568-1588), dialogic reading (Whitehurst et al. 1988, *Developmental Psychology* 24:552-559), learning by observing and pitching in (Rogoff 2014, *Human Development* 57:69-81) (not rechecked).
- Tunable complexity: the expertise-reversal effect (Kalyuga et al. 2003, *Educational Psychologist* 38:23-31, not rechecked). Scaffolds that help novices can hurt experts, which argues for disclosure grain.

## 4. Design proposals with checked sketches

All sketch files parse OK in the parse checker (`SP/../understand/archcheck.ts`), and the cut gate reports **13 files, 0 failing, 0 warnings** on `SP/subvoc/cut`. Brief and audio emit gates exit 0 on every new file (run per file from the scratch root, because the gate's `--emit` can't reach a scratch directory past the consumer-root guard).

### (a) Reader-marginalia protocol

- **Home:** the reader's own vault, declared as an external root (`@readings: ~"../../subvoc-vault"` in `SP/subvoc/.spw/workspace.spw`). It is never inside the cut.
- **Direction:** one-way. The reader points at the cut; the cut never links back. Backlinks appear only if the reader opts in (they come from the reference graph).
- **Law:** `interprets: #subjective` means a reading may rank and disclose only (`operational-field.spw:71`). No scores, no activity log (`cli.spw:120-122`).

```
#>r_water_density_max_1
^["reading"]{
 of: ~"../../subvoc/cut/matter/water.spw#water_density_max"
 frame: #lesson
 at: "2026-10-02"
 ~#(the bottom of a frozen pond stays near 4 C, and that is where the fish wait)
 ~#say(cold sinks, ice floats, fish wait at four degrees)
 forecast: "ice is a little lighter than water, maybe 2 percent"
 checked: "about 8 percent lighter, per the claim"
}
```

Checked:
- `readings @readings` counts 3 anonymous and 3 named cells (`say`×2, `lens`×1). The repeated anonymous reading shares mask `e0b5755c`, so it is the promotion candidate.
- `resolve` reports 6/6 ok.
- A `^["compare"]{ ={ ~"…#water_density_max" } }` frame plus `spw expand` renders the reading with the canon claim transcluded beneath it. That is navigable-focus's `see_reading`, working today.

(c) What's missing:
- `spw readings --recur` to list promotion candidates;
- a string-aware lattice;
- `expand` that accepts `@root` paths and rebases links;
- a reader root that corpus walks skip by default (`fs-walk.ts:13-19, 60-65` skip only `.spw/gen` and `*.expanded.spw`).

### (b) "Say it": a one-breath reduction

- **Per surface:** `cold_open:` inside `^"emit"`. The audio host renders it, and continuity is gated.
- **Per claim:** a `~#say(…)` apposition. It is a reading, so `spw readings` counts it and emit ignores it.
- **Checked:** water's audio gate goes from exit 2 to exit 0. `lesson.spw` failed until its say-line contained the continuity word "door", so the gate itself enforces that the spoken line carries the anchor.
- **Loss rule for the contract** (from `form-ladders.spw:96`, `cli.spw:100`): "a say line drops numbers, sources, and limits; the claim frame keeps them."
- **Aim:** one new idea per clause (Chafe). Treat a ~20-word ceiling as a heuristic.
- **(c) A spoken rendering of sigils:** voice each sigil by its reader-vocabulary name (`operators.spw:27-44`). `~#(` becomes "aside", `#:claim #!settled` becomes "settled:", and `<< a ; b >>` becomes "a, then b".

### (c) The wonder arc: keep canon order

**I recommend the canon flow order `<< ~ ; ? ; % ; ! ; * ; ^ >>`** (`flow-protocol-sigils.spw:33, 102`) **over the task's proposed `<< ? ; ~ ; ! ; % ; ^ ; ? >>`.**
- Canon already puts the measure before the act. That makes `%` the written forecast and `!` the probe, which matches both the pretesting evidence and "measure_first" (`learn/index.spw:60`).
- The steps are hunch `~`, question `?`, forecast `%`, probe `!`, observation `*`, reflection `^`.
- The next question is the next cycle (`spirit-cycle.spw:45`), not a seventh slot.
- Spoken mnemonic: "potential, wonder, measure, action, value, ascension."

In `SP/subvoc/cut/trails/arcs/wonder.spw`:
- the schedule parses as a Stream node, and `spw cycle` reports `flow×1`;
- the instance frame has `observe/reflect/next: _`, and `emit holes` shows `bare=3`, then `bare=0` once filled;
- a `^["limits"]{ metaphor: … }` frame applies the metaphor boundary (`cli.spw:49`).

### (d) Arcs for each context

| Frame | File | Archetype / cadence | Clock | Schedule | Hands off to |
|---|---|---|---|---|---|
| Wonder | `arcs/wonder.spw` | exploratory_biome / metastable_spiral | — | `~ ? % ! * ^` | next arc |
| Lesson | `arcs/lesson.spw` | guided_curriculum / guided_escalation | minute | retrieve; forecast; probe; explain; check; door | family |
| TikTok LIVE | `arcs/live.spw` | ephemeral_portal / single_beat | minute | open; ask; torrent; probe; say; close | lesson |
| Production day | `arcs/day.spw` | reflective_feedback / reflective_latency | hour | warm; plan; make; live; cut; log (one `surprise`) | season crescendo |
| Season 2026-10-01 → 2027-01-04 | `arcs/season.spw` | seasonal_exhibit / bounded_cycle | week | reflection; crescendo; celebration_reset | wonder |
| Family table | `arcs/family.spw` | coordination_protocol / serialized_turn_taking | turn | story; question; try; say_round (youngest first); reflect; note | wonder |

- **Archetypes:** each arc carries `^["archetype"]{ of: ~".spw/surfaces/surface-archetypes.spw#spw_surface_archetypes" … }`.
- **Season rules:**
  - Each movement names `counts` (what a tool can count) and a `limit` (e.g. "crescendo counts output; it measures neither quality nor audience response").
  - Only the owner's two endpoint dates are filled; the boundaries between movements are `_` holes for the owner to set.
  - `#:season` sits inside each rung; `#:valence` stays file-level (resume note `:65`).
- **Live-session rules:**
  - No platform facts; `as_of` is stated.
  - The torrent frame refuses ranking chatters: "a chat line is evidence of a guess, never of a person" (`cli.spw:122`).
  - Chat guesses become the forecast step (pretesting).
- **Handoffs:** every rung links forward via `feeds` edges plus a rung-level `hands_off:` pointer. `trails/index.spw ^["bundle"]{ ={ …#arc_live_close } … }` plus `spw expand` renders a one-page **handoff digest** of every closing rung (checked). Because expand does not rebase links, handoff pointers inside bundled rungs should be root-relative until it does.

### (e) File layout for the cut

```
2026-09-30/
  trails/index.spw            ^["tree"] + ^["bundle"] handoff digest
  trails/readings.spw         reader-overlay protocol (form protocol); no personal readings inside the cut
  trails/arcs/{wonder,lesson,live,day,season,family}.spw
  matter/*.spw                + cold_open in ^"emit"; optional ~#say(...) per keystone claim
readers' vaults               outside the consumer root, declared @readings; mirror cut paths
```

**Contract additions:**
- say-lines carry the continuity anchor and declare their loss;
- every arc names a clock and an archetype;
- season movements name counts and a limit;
- readings are subjective, one-way, and annotated rather than deleted.

**Vocabulary decisions for you:**
- `season` lacks `celebration`; I folded it into `reset`;
- `domain` has only `meta` and `matter`, so arcs use `meta`, and a `practice` value may be warranted;
- whether `hands_off` should become a relation.

**Issue in the current staging files (checked):** `vocabulary.spw` fails the brief continuity gate, "missing anchors: closed sets". Its claim says "a closed set".

## 5. Tool changes worth making, in order of payoff (c)

1. **Spoken skim:** `spw skim --arc` (or `--say`) showing questions, schedules, say-lines and doors. Fix at `view.ts:219-290`.
2. **Keyed calibration:** `spw census --forecast <card>` rendering `^["calibration"]{ ~#files: .{said, saw} }`, objective, not retained. First fix the fragment graph bug so calibration is fair.
3. **Forecast stream type:** add `forecast` to the plan stream so a `surprise` can cite the forecast it missed.
4. **Lattice fixes:** make `lattice` string-aware and add `--recur`.
5. **Expand fixes:** accept `@root` paths, apply the consumer-root guard, and rebase transcluded links.
6. **Editor rendering:**
   - a TextMate and semantic-token apposition rule that paints the body as one prose scope;
   - JetBrains spellcheck for strings and apposition bodies;
   - an LSP wonder summary that reads `~#lens(…)` and `~"…" ~#neighbor(…)`;
   - `cacheReflection` in JetBrains.
7. **Reading profiles that change disclosure:** make `creative` put questions and say-lines first.
8. **Voice without boilerplate:** census `~#sigils` that excludes the header stack, and splits `#!` and `#:` out of the `!` and `#` counts.

## 6. Open questions for you

- Should a say-line be canon (`cold_open`) or reader-only (`~#say`)? Or both, with the reader's version compared against the author's?
- Is `~#say` a sanctioned named reading? It recurs, so under canon rules it earns a key.
- Declaring the external `@readings` root edits the consumer's `.spw/workspace.spw`. Should reader roots live in an untracked local manifest instead?
- Should the 48 templated read-aloud probes be retired, or turned into one real instrument?
- Where do the season's internal boundaries fall, and does "celebration" deserve its own vocabulary value?

## Files

- Say-line sketch: `SP/subvoc/cut/matter/water.spw`
- Arcs and protocol: `SP/subvoc/cut/trails/{index,readings}.spw`, `SP/subvoc/cut/trails/arcs/{wonder,lesson,live,day,season,family}.spw`
- Reader overlay: `SP/subvoc-vault/matter/water.spw`, `SP/subvoc/readers/reader_a/matter/water.spw`, external-root declaration in `SP/subvoc/.spw/workspace.spw`
- Calibration probe: `SP/subvoc/predict/census.{forecast,actual}.spw`
- Expand and holes checks: `SP/subvoc/expcheck/{wonder.filled,index.digest}.spw`

## Sources (checked this session)

- [Forrin & MacLeod 2018](https://uwaterloo.ca/memory-attention-cognition-lab/sites/default/files/uploads/files/forrinmacleodmem18.pdf)
- [Hannebauer et al. 2018](https://link.springer.com/article/10.1007/s10664-017-9579-0)
- [Thiede et al. 2003](https://education.ufl.edu/dtherriault/files/2013/03/Metacognition_article_2003.pdf)
- [Filik & Barber 2011](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0025782)
- [Pan & Carpenter 2023](https://eric.ed.gov/?id=EJ1393374)
- [Ford et al. 2017](https://www.semanticscholar.org/paper/Chat-Speed-OP-PogChamp:-Practices-of-Coherence-in-Ford-Gardner/468b23e5849a6ef261efff6934eba24ddbed5f2d)
- [Vilhauer 2017](https://www.researchgate.net/publication/317378573_Characteristics_of_inner_reading_voices)
- [Chafe 1994](https://press.uchicago.edu/ucp/books/book/chicago/D/bo3631492.html)
- [Rayner et al. 2016](https://www.semanticscholar.org/paper/So-Much-to-Read,-So-Little-Time-Rayner-Schotter/32b937fd02a7d1b76ea3e4041c29b2b10801e325)
- [Boyd et al. 2020](https://eprints.lancs.ac.uk/id/eprint/144703/)
- [Dehé 2014](https://www.cambridge.org/core/books/parentheticals-in-spoken-english/396FE8170A46FAF1BDEA16E20FD46053)
- [Kornell, Hays & Bjork 2009](https://www.researchgate.net/publication/26655655_Unsuccessful_Retrieval_Attempts_Enhance_Subsequent_Learning)
- [Xie et al. 2018](https://link.springer.com/article/10.1007/s10648-018-9442-x)
- [Weissgerber et al. 2021 critique](https://pmc.ncbi.nlm.nih.gov/articles/PMC7854329/)
- [Chi & Wylie 2014](https://www.semanticscholar.org/paper/The-ICAP-Framework:-Linking-Cognitive-Engagement-to-Chi-Wylie/9f30b9a4796209ea5ae872ff8959247ebeb15742)
- Fawcett 2013 (confirmed via search summary; no direct link captured)

### verification

# Verification of the subvoc_arcs report

Everything was re-run on 2026-10-01 against repo HEAD `229aedcf` (plus the uncommitted `spw-cut-gate.ts`) and current `cut-staging/2026-09-30`. The scratch evidence is in `<scratchpad>/reading/verify/`, mainly `out/*.txt`, `subvoc/merge/cut` (current staging plus the report's sketches) and `subvoc/t/`.

## A. Corrections, most material first

1. **Plan-stream counts (§0.8) are wrong.**
   - The 1132 entries and 282 `decide` don't reproduce at HEAD, HEAD~1 or HEAD~2.
   - All `wip.spw` files, archive included, now hold **1322** typed `>>[…]` entries with **339** `decide`.
   - Tracked files at HEAD hold 1313 entries with 337 `decide`; the untracked `caches-cut-2026-09-30` plan adds the other 9.
   - `surprise` = 17 is confirmed, and `forecast`/`predict` = 0 is confirmed. The conclusion holds.
2. **Census and resolve numbers (§0.7) are stale against the report's own final sketches.**
   - Census on `@cut` now gives `~#broken: 30` (not 29) and `~#links: 66`.
   - Resolve gives **55/66 ok with 11 missing_file**, not 55/60 with 5. The 6 new misses are the `^["archetype"]` links `~".spw/surfaces/…"`, which are root-relative and absent in scratch.
   - `predict/census.actual.spw` (lines 1019, links 60, broken 29) was captured before those frames were added.
   - **Water is not the most-cited file.** `registries/sources/matter.spw` is cited 19 times from 2 files, and census labels it **orphan with in:0**. That is a stronger example of the fragment-node bug.
   - Census also resolves root-relative refs relative to the file. Its hub list shows the non-existent `cut/trails/arcs/.spw/surfaces/surface-archetypes.spw#…`.
3. **"Only VS Code" (§0.9) is wrong.** Neovim also requests `spw/cacheReflection` and renders "What stands out" (`extensions/neovim-spw/lua/spw/instruments.lua:115-143`). JetBrains is the only editor without it; it has 0 references, which is confirmed.
4. **The four-beat episode arc ("Arcs (history)") is not canon.**
   - CLAUDE.md defines three beats: `~[scene] ![change] *[verify]`.
   - `^[affords]` appears in only 5 of the last 200 commit bodies (`da5189bb`, `1f17c86e`, `e495d903`, `2c082311`, `b42f9853`). The two newest commits lack it.
   - No skill or workflow defines it.
5. **The continuity gate checks the whole audio packet, not the spoken line (§0.4, §4b).**
   - `attachHolds` measures anchors over the full rendered text: TITLE, COLD OPEN, SPINE and CTA (`emit/codecs.ts:57-59`; anchors come from `continuity.ts` `collectAnchors`).
   - So the anchor can be supplied by the title or the `~#door`. "Forces the spoken line to carry the anchor" holds only because, for water and lesson, nothing else in the packet contains the phrase.
6. **Mapping `%` to "forecast" is (c) interpretation, not canon support (§4c).**
   - `measure_first: "effect.l0.measure before l1/l2"` (`docs/learn/index.spw:60`) is about effect levels: read-only before writes.
   - The flow-protocol `%` role is "measure: `$%[…]` / `%[…]`", i.e. observation (`flow-protocol-sigils.spw:40`).
   - Counterpoint: the only canon surface tagged `#!forecast` writes forecasts as a wonder stream, `?<next>` (`.spw/applications/symmetry/symmetry-forecast-projection-sound.spw:6,11`).
7. **Dehé 2014 is cited correctly but over-applied.**
   - Bibliographic details are confirmed (CUP), and nominal appositions are one of the six types analyzed.
   - However, the book's thesis challenges the assumption that parentheticals are prosodically phrased apart by default.
   - So it does **not** straightforwardly support "read `~#(…)` as a spoken aside with pauses". Hedge further.
8. **Chafe is misstated in §4(b).** It says "one new idea per clause". Chafe's constraint is per **intonation unit** (§3 has it right).
9. **The highlighting evidence is one-sided.**
   - Hannebauer et al. 2018 is confirmed (390 students, correctness, no evidence of benefit).
   - Omitted: Sarkar 2015 (PPIG workshop; eye-tracking, n=10; text at `verify/sarkar.txt`). It found highlighting significantly cut completion time (p=0.047, median 8.4 s) and context switches, with the benefit weakening as experience grows.
   - Restate as: no correctness benefit, a possible speed benefit for novices.
10. **Weissgerber et al. 2021 needs completing.**
    - Full citation: Weissgerber, Brunmair & Rummer, *Educational Psychology Review* 33(3):1221-1247.
    - Their re-check found Xie et al.'s transfer result robust, but the **recall** and **moderator** results doubtful. The JOL and study-time effects were not the target.
    - So the "lowers JOLs" claim rests on Xie et al. alone. A search result (Ebersbach 2023, *Applied Cognitive Psychology*) suggests the same JOL-not-learning pattern. Unverified.
11. **Stale line numbers in the resume note** (HEAD `229aedcf` shifted lines). "Keep charge … off the visit arc / Do not map valence" is now `:67` (was `:65`). "A command tour as onboarding" is now `:73` (was `:70`). Lines 28, 30 and 31 are correct.
12. **Smaller location and count fixes:**
    - `~#reading_feel` occurs **50** times, not 51.
    - The "voice = operator ratio" probe appears in **47 files**, not "about 20 other files".
    - `deep_work` has 4 hits in docs (including the cited `looper-architecture.spw:64`) and 0 in code. Say "no code", not "grep finds nothing".
    - `form-ladders.spw:80` is the `=>` arrow semantics. The loss falsifier is only at `:96`.
    - "person-level trait" is at `cli.spw:121`, not `:122`.
    - The wonder-summary neighbor regex is at `display.ts:308`, not inside `:301-307`.
    - `fs-walk.ts:13-24` also skips `node_modules`, `dist`, `release`, `build`, `_workbench` and `.git`, not only `.spw/gen` and `*.expanded.spw`. The point that no reader root is skipped stands.
13. **Sketch inconsistency in §4(d)** ("every rung links forward via `feeds`"):
    - `wonder.spw` has no `feeds` and no `hands_off`, and `family.spw` uses `case_of` instead.
    - In `day.spw`, `feeds` points to live but `hands_off` points to season.
    - In `season.spw`, `feeds` points to day but `hands_off` points to wonder.
    - `feeds` encodes nesting (season → day → live → lesson → family) while `hands_off` encodes handoff, so "forward" is ambiguous.
14. **Staging changed again after the report.**
    - `contract.spw` gained `^["inspection"]` and a same-line-tag rule (`:114-120`, `:151`).
    - `water.spw` gained `^["receipts"]`.
    - `vocabulary.spw` gained `event`/`care`/`outcome`.
    - The gate gained a same-line-tag ban and receipt-vocabulary checks.
    - The report's `subvoc/cut/matter/water.spw` predates the receipts. I re-applied its two lines (`cold_open` and `~#say`) to current staging, in `verify/subvoc/merge/cut`. Results: gate 13 files / 0 failing / 0 warnings, audio exit 0, brief exit 0. The sketches stay valid.

## B. Additions the report missed (checked)

- **The lattice is not comment-aware either.** `~#lens(…)` after `//`, and `~#(…)` on a `#` line, are both counted (`t/cmt.spw`: cells=2). The scan loop has no comment handling (`apposition-scan.ts:105-165`). A reading written on a `#` line is therefore counted by `readings` but absent from the AST.
- **Other renderers also lack an apposition rule:**
  - The JetBrains grammar is a separate copy (`extensions/intellij-spw/src/main/resources/textmate/spw.tmLanguage.json:312-328`) and also has none.
  - LSP semantic tokens are a line-regex scan that paints digits as `number` with no apposition case (`packages/spw-lsp/src/handlers/semantic-tokens.ts:248-251`), so VS Code semantic highlighting adds to the effect.
- **`contract.spw` fails the audio gate** (`missing anchors: sourced; addressable`, exit 2). Brief passes. `vocabulary.spw` fails both brief and audio ("closed sets"), as reported.
- **The gate's `--emit` fails from scratch.** Run on scratch it reports 11/13 failing, all with "Path is outside the consumer root", because it spawns with `cwd: REPO` (`spw-cut-gate.ts:354`). This confirms the report's workaround.

## C. Confirmations

**Tooling claims (code read or command re-run):**

- 48 read-aloud probes, split 16 / 17 / 15 across the three endings; `shelves.spw:33,38-41`; "felt rhythm" ×18; no hits in `packages/`, `src/` or `scripts/`.
- `hot.spw:73-77`; `spw-cut-gate.ts:37` contains `op.distribution`; census sigils come from a character histogram (`packages/spw-seed/src/math/corpus.ts:379-390`); lesson's `"!6"` is exactly its six `#!` header moods.
- Skim (`view.ts`):
  - `:231` skips lines starting with `#`, `:222` is the `^` frame regex, `:269` is the five-trait whitelist.
  - `spw skim` on water and live hides the wonder, the `cold_open`, the `~#door` and the `<<…>>` schedule.
- Audio packet:
  - `codecs.ts:276-300` renders TITLE / DURATION / COLD OPEN / SPINE / CTA, and the claim is a field only.
  - Water baseline and current staging: audio exit 2, brief exit 0. With `cold_open`: exit 0.
  - Lesson without "door": audio exit 2.
- Readings scanner:
  - `cli.spw:14` and `commands.ts:218` define the `readings` alias; `apposition-scan.ts:2-7` says parse-free; `mask` at `:36`/`:94`.
  - The contract's three in-string appositions are counted.
  - The vault gives 3 named (say×2, lens×1) and 3 anonymous cells; the mask `e0b5755c` is shared.
- Reader overlay:
  - `workspace.ts:186-191`; `roots` shows `@readings external`; resolve from `@readings` is 6/6 ok; census `@cut` is 13 files with no vault.
  - `expand.ts:109` uses `path.resolve`, giving ENOENT on `@readings/…`. It also expands repo files from the scratch root, which census refuses.
- Compare and progress tools:
  - `delta` JSON gives counts and form findings only (replaced 4, inserted 21), no key-wise values.
  - Expand copies links verbatim; the digest broke 5 links.
  - `emit holes`: bare=3 → 0. `spw cycle`: flow×1. The `Stream` node is present.
- Cache reflection and editors:
  - `cache-reflection.ts:1-19, 30-35, 100-136, 181-186`; VS Code `commands.ts:160-190`; JetBrains `SpwCliInvocation.kt:39-43`.
  - `SpwSpellcheckingStrategy.kt:8-10` returns `EMPTY_TOKENIZER`.
  - TextMate grammar `:341-362`.
  - `ReadingProfileId` (`dialect/types.ts:54`) is display-only (`profile.ts:99`, `display.ts:430`). No preset uses `creative`, and nothing branches on the profile.
- Other code: `formatRecommendations` at `view.ts:79-104`. No `--forecast` option exists anywhere in the CLI.

**Canon line references:**

- `apposition.spw:23-25, 31, 38, 44-47, 70-77, 92`; `hash-resonance.spw:8`; `cli.spw:48-49, 100, 105-109, 117-124, 138, 145-150`.
- `tone-anatomy.spw:31, 115-118`; `registers.ts:68, 75`; `looper-architecture.spw:61-65`; `audio-architecture.spw:64`; `src/infra/{shaders,audio}` are absent.
- `surface-archetypes.spw:11` and 12 archetypes with the stated cadences; `operational-field.spw:46-50, 56, 71`; `hot.spw:34-37`; `loop-observation.spw:9-16, 61-66`; `lens-walk.spw:27-28`; `sense-loop.spw:26-33`; `spirit-cycle.spw:45`; `dusk-oak.spw:2, 222-229`.
- `_schema/wip.spw:18, 24-25, 72-77, 262`; `learn/index.spw:28-33, 60`; `path.md:24, 68, 103`; `navigable-focus.spw:5, 19, 39-40, 55, 63, 75-78, 96, 99`; `vscode-spw.spw:111`; `operators.spw:27-44`; `flow-protocol-sigils.spw:33, 102`; `consumer-cli-instruments/PLAN.md:14`.

**Sketches:** all 15 files pass the parser (`archcheck.ts`) with no diagnostics. The new trail files exit 0 on both the brief and audio gates. The cut gate reports 13 files, 0 failing, 0 warnings, against both the report's cut and the merged current-staging cut.

## D. Citations

**Confirmed by web search this session:**

- Vilhauer 2017, *Scandinavian Journal of Psychology* 58:269-274. 80.7% of 570; voices have accent, pitch and tone.
- Hannebauer, Hesenius & Gruhn 2018, *Empirical Software Engineering* (390 students).
- Xie, Zhou & Liu 2018, *Educational Psychology Review* 30:745-771. Recall d=−0.01, transfer d=0.03, JOL d=−0.43, study time d=0.52.
- Pan & Carpenter 2023, *Educational Psychology Review* 35, article 97.
- Fawcett 2013, *Acta Psychologica* 142:1-5.
- Forrin & MacLeod 2018, *Memory* 26(4):574-579. The memory gradient is confirmed.
- Kornell, Hays & Bjork 2009, *JEP:LMC* 35(4):989-998.
- Thiede, Anderson & Therriault 2003, *Journal of Educational Psychology* 95(1):66-73.
- Rayner et al. 2016, *PSPI* 17(1):4-34.
- Filik & Barber 2011, *PLoS ONE* 6(10):e25782.
- Chi & Wylie 2014, *Educational Psychologist* 49:219-243.
- Boyd, Blackburn & Pennebaker 2020, *Science Advances* (staging, plot progression, cognitive tension).
- Ford et al. 2017, CHI EA ("crowdspeak").
- Chafe 1994, University of Chicago Press (one new idea per intonation unit).
- Pressley et al. 1987, *JEP:LMC* 13(2):291-300. Generating elaborations helped learning more than reading them.
- Engeser & Rheinberg 2008, *Motivation & Emotion* 32:158-172. The challenge-skill balance was only partly supported.
- Fivush, Haden & Reese 2006, *Child Development* 77:1568-1588.
- Rogoff 2014, *Human Development* 57:69-81.
- Masicampo & Baumeister 2011, *JPSP* 101:667-683.
- Nelson & Narens 1990, *Psychology of Learning and Motivation* 26:125-173.
- Dehé 2014 (CUP), with the caveat in A7.
- Weissgerber et al. 2021, with the completion in A10.

**Consistent with my knowledge; venue, volume and pages look right, but I did not web-check them:**

- Roediger & Karpicke 2006; Dunlosky et al. 2013 (the utility ratings are correctly stated).
- Cepeda et al. 2006 and 2008; MacLeod et al. 2010.
- Nelson & Dunlosky 1991; Glenberg, Wilkinson & Epstein 1982.
- Chi et al. 1989 and 1994; Rosenshine, Meister & Chapman 1996; King 1992.
- Flavell 1979; Ericsson & Simon 1993; Fox, Ericsson & Best 2011 (the findings are correctly stated).
- Alderson-Day & Fernyhough 2015; Cooper & Paccia-Cooper 1980 (Harvard University Press); Baddeley, Thomson & Buchanan 1975.
- Kang et al. 2009; Gruber, Gelman & Ranganath 2014; Csikszentmihalyi 1990.
- Reagan et al. 2016; Kahneman et al. 1993; Dai, Milkman & Riis 2014.
- Whitehurst et al. 1988; Kalyuga et al. 2003.

**Unverifiable:** none.

---

## cli_ergonomics

# CLI ergonomics and talkability: audit and ranked proposals

**How I gathered this.** I ran every canonical command's `--help` and about 100 invocations in a scratch consumer root that holds a copy of the 2026-09-30 staging cut. The root is `…/scratchpad/reading/cli-ergo/root`, and the cut has 6 files and 516 lines. Raw outputs are in `…/reading/cli-ergo2/out/*.{out,err}` and the per-run log (exit code, seconds, line counts, ANSI count) is `…/reading/cli-ergo2/log.tsv`. Help captures are in `…/reading/cli-ergo/help/*.txt`. Experiments are in `cli-ergo/root/cards/` (card diffs and parse round-trips) and `cut3/`, `cut4/` (fingerprint stability).

**Labels.**
- **(a) canon**: what a `.spw` or doc surface says.
- **(b) code**: what the source does or what a run showed. I ran it unless marked otherwise.
- **(c) aspirational**: my proposal.

I don't cover the role taxonomy, the transform algebra or play dialects; the parallel study has those.

---

## 0. Headlines

1. **The instruments disagree with each other, and the census is wrong about anchors (b).**
   - On the same 6-file cut, `census`, `graph` and `density` report `broken=10`. `resolve` reports `total=26 ok=26`, and `atlas` reports `0 dangling`.
   - All 10 "broken" targets are `file#anchor` refs that resolve fine. `corpus.ts:200` compares `l.to`, with its fragment, against the set of known files. `corpus-scan.ts:264` then calls `fs.access("file#anchor")`, which fails.
   - The same bug marks `registries/sources/matter.spw` as an **orphan with `in: 0`**, though it is cited 10 times through anchors. `vocabulary.spw` is also marked orphan.
   - "How many hubs?" gets four answers: census `roles hub:4`, graph `~#hubs: 12` (the top-N cap from `map.ts:52`), density `hubs=14`, and atlas lists 5 under "load-bearing".
   - "How many links?" gets 26 from census and graph, and "7 edges · 24 deep-links" from atlas.
   - A reader who calibrates against these tools is being miscalibrated by them.
2. **Next-step frames can't be copied (b), against canon (a).** `census`, `graph`, `density` and `formula` end with `"spw graph <roots>"` and similar placeholders (`inventory.ts:321-326`, `map.ts:299-303`, `analyze.ts:290`, `formula.ts:351`). Canon `.spw/conventions/cli.spw:105-108` asks for `[command, purpose, cost]` and refuses "unexplained command strings". The helpers for this already exist (`view.ts:84-110` `formatRecommendations` and `shellArg`), but only `inspect source` and `inspect spacing` use them. `inspect corpus` already fills in the real root (`"spw census cut"`), so it is possible today.
3. **Alias names leak into the canonical surface (b), against the code's own rule.** `commands.ts:67` says aliases are "never taught in headers / Examples / next:". Observed:
   - `spw outline --help` is titled "Spw Skim" and teaches `spw skim` (`skim.ts:100`).
   - `spw stack --help` is titled "Spw Surface" and calls `stack` the alias (`profile.ts:54-59`).
   - `spw form` prints `# spw geometry`; that header comes from the seed (`spw-seed/src/canonical/geometry-inspect.ts:215`).
   - JSON `command` fields read `"skim"`, `"profile"` and `"geometry"`.
   - Errors say `spw surface:`, `spw geometry:`, `spw skim:` and `spw mass:`.
   - Typo suggestions offer aliases: `tour` gets "did you mean: topo, form, mount, tree?".
4. **Two entry points, two error contracts (b).**
   - The installed bin `scripts/spw.ts:5-8` prints `spw: spw doctor: unknown option --wat` (double prefix) and exits 1.
   - `npm run spw` goes through `packages/spw-cli/src/main.ts:4-11`, prints a single prefix and exits 2.
   - `census`, `graph` and `form` catch their own flag errors and exit 1 (`inventory.ts:221-224`, `map.ts:189-192`, `geometry.ts:315-318`). `pulse` also exits 1 (`commands.ts:123`). The contract in `exit.ts:5-9` says 2.
5. **Shape commands write without asking (b).**
   - `spw format` rewrites files unless `--check` is given (`format.ts:509-510`). Its group is described as "Shape — preview or project source transformations" (`commands.ts:80`).
   - `-w` means `--width` in `format` (`format.ts:153`) and `--write` in `pulse` (`pulse.ts:244`).
6. **Some checks pass when they checked nothing (b).** `spw resolve --from nope` prints "all citations resolve" and exits 0. `spw lint --from nope` prints "annotations and anchors are well-formed" and exits 0. `spw census nope` exits 0 and writes a zero-file card to stderr only.
7. **Ids in output can't be pasted back as input (b).** Census, graph and query print `path#anchor`, which is Spw's own address form. `outline`, `select`, `expand` and `fingerprint` all reject `cut/matter/water.spw#water_density_max`. `expand` responds with a raw `ENOENT` that includes an absolute `<tmp>/...` path, which breaks the path law at `cli.spw:102`. The `~#fingerprint` is an mtime/size memo key (`corpus-memo.ts:8`), so `touch` changes it and two byte-identical copies under different roots get different values. It can't serve as a shareable id.
8. **Cards diff well with plain `diff`, but the Spw delta can't name what changed (b).**
   - Removing one link in `cut2` gave a 7-hunk plain `diff` of the census cards: `links 26→25`, `broken 10→9`, contract degree `3→2`.
   - `spw delta` on the same two cards reported only `lexOps=14 · brace=eq · nest=eq · labels=eq`, with no facet values. For "what changed in my measurement?", plain `diff` was the better tool.

---

## 1. Command surface audit

### 1.1 Inventory and naming

- **Size (b).** There are 40 canonical commands in 5 cost groups and 25 aliases, so 65 accepted tokens (`commands.ts:127-440`, `knownCommands` at `:443`).
- **Root help (b).** It is 106 lines, and 26 of them (about 25%) list aliases (`commands.ts:532`). No outcome-first summary comes before the 40-row list.
- **Canon has drifted (a).** `cli.spw:12` lists 37 public commands. It is missing `fingerprint`, `lint` and `resolve`, and `fp` is missing from the alias list at `:14`.
- **Nouns or verbs?** Code and canon pull in different directions:
  - The code favors noun products for collate commands: "Prefer IrKind when the command collates that product" (`commands.ts:62-64`; `docs/runtime/spw/cli-command-surface.spw:89-135`). So collate commands are nouns (census, graph, atlas, formula, density, form, lattice, delta, stack), and select, shape and effect commands are mostly verbs.
  - Canon `cli.spw:129` says "Canonical help prefers spw verbs".
  - The noun rule is coherent and reads well aloud ("the spw census of prompts"). It should be written into canon instead of contradicting it.
- **The sense-loop vocabulary exists in two versions:**

| Surface | Spine |
|---|---|
| Root help "Question path" (`commands.ts:509-517`) (b) | census, graph, formula, density, query, outline, each paired with a question: "what is present?", "how does it connect?", … |
| `docs/runtime/md/sense-loop.md:14-18` (a) | Inventory `invent`, then Topography `map`, Formulas, Analysis `analyze`, Drill `skim` (all alias names) |
| `docs/learn/worked-cli.md:16-77` (a) | invent, map, analyze, skim |
| `CLAUDE.md:89,97-103` (a) | `spw:skim`, `spw:surface` (an alias of stack), `spw:analyze`, `spw:geometry`, `--hubs 12`; `:82` describes `spw:ls` as "List .spw surfaces", which is wrong (see 2.2) |
| `package.json:107-116` (b) | npm scripts exist for aliases (`spw:skim`, `spw:surface`, `spw:analyze`, `spw:map`, `spw:invent`, `spwq`); 14 canonical commands have none, including `density`, `stack`, `outline`, `lint` |

The question-per-command pairing in root help is the best talkability asset in the CLI. The learning docs don't use it.

### 1.2 Where aliases leak (b)

| Leak site | Example | Source |
|---|---|---|
| Help title and usage | "Spw Skim", `spw skim <file>`; "Spw Surface", `spw stack # alias (identity only)` | `skim.ts:100`, `profile.ts:54-59` |
| stderr header | `# spw skim file=…`, `# spw geometry braces=66…` | `skim.ts:38`, seed `geometry-inspect.ts:215` |
| JSON `command` | `"skim"`, `"profile"`, `"geometry"`, `"form.static"` | `skim.ts:54`, `profile.ts:175`, `geometry.ts:529,411` |
| Error prefix | `spw surface: unknown flag`, `spw geometry: unknown flag`, `spw mass:` | `profile.ts:46`, `geometry.ts:159`, `mass.ts:234,253,257` |
| Did-you-mean | `tour` → `topo` | `run.ts:26` passes `knownCommands()`, which includes aliases |
| `next:` lines | `delta` help: "(skipped by invent/map as gen)" | `cli-ergo/help/delta.txt` |
| Docs and npm scripts | see 1.1 | |

**Root cause (b).** `run.ts:41` passes `spec.printHelp(command)` and `spec.run(command, …)`, where `command` is the typed token rather than `spec.name`. Most modules also hard-code an older name.

### 1.3 Flag consistency (b, from help captures; partial grep)

| Concept | Spellings in use | Notes |
|---|---|---|
| Row cap | `--limit/-n` (census, graph, outline, query, select); `--top` (density, formula, ls, taste, lattice); `--hubs` (graph, docs) | canon `cli.spw:112` also routes `--limit → --sample` |
| Roots | positional (census, graph, resolve, lint, tree); `--from` (query only, positional rejected with "unexpected argument cut", exit 2); `--root` (ls, resolve) | `query cut` fails; `resolve cut` works |
| Depth | `--depth` = spread profile (census, graph, compat); directory depth (tree); recursion depth (expand) | three meanings |
| Profile | `stack` alias; `pulse --profile` = mutation profile; `query --profile` = stage receipts; review profiles | four meanings |
| Write | `format` writes by default; `pulse --write --accept-semantic-risk`; `measure --write` ungated l2; `refactor --write`; `expand --write` (derived file); `mutate --dry-run` | `-w` is write in pulse and width in format |
| Check | `format --check`, `pulse --check` (exit 1); `measure` always checks (exit 1 on drift, `mass.ts:258`); `mount check` is a subcommand | |
| Output | `--json` (≈38/40); `--spw` (7 commands, and `stack` rejects it: `spw surface: unknown flag --spw`); `--table` (4); `--quiet/-q` (9) | `form --spw` prints the human text, not a card (`geometry.ts:477-480`) |
| Missing value | `census cut -n` is silently accepted and shows all rows, exit 0 | |

### 1.4 Exit codes: contract versus observed

Contract (b, `exit.ts:5-9`): 0 ok (zero matches included), 1 assertion, 2 usage, 3 unreadable source, 4 apply refused.

| Case | Observed | Should be |
|---|---|---|
| Unknown command | 2, plus 106 lines of help on **stdout** (`run.ts:34`) | 2, short hint on stderr |
| `--version`, `version` | 2 ("unknown command") | 0 (GNU Coding Standards §4.8 expects `--version`) |
| `spw help census` | 0, root page (topic ignored, `run.ts:13`) | census page |
| Unknown flag: census, graph, form, pulse | 1 | 2 |
| Unknown flag: stack, doctor (npm path) | 2 | 2 |
| Unknown flag via installed bin | 1, double prefix | 2 |
| Missing file (`outline nope.spw`) | 1 | 3 |
| Directory given to `outline`, `fingerprint` | 1, "cannot read cut" / raw `EISDIR` | 2 with a hint |
| `resolve` or `lint` on a missing root | 0, success sentence | 3, "nothing to check" |
| doctor fail, measure drift, `format --check` | 1 | 1 |

### 1.5 Error messages (b)

- **About seven prefix styles:** `spw census:`, `spw-pulse:`, `spw-format:`, `spw-doctor:` (`doctor.ts:416`), `spw:ls:`, alias prefixes, plain `spw:` (`main.ts:8`), the bin's double prefix, and a leaked `fatal: not a git repository` from `atlas`.
- **No flag suggestions.** Command typos get did-you-mean (`view.ts:158-164`); flag typos don't (`spw census: unknown flag --jsn`).
- **Raw Node errnos** appear: `EISDIR`, `ENOENT … '<tmp>/…'`.
- **Broken English:** `spw-format: 1 file(s) scanned, 0 need.` (`format.ts:611`).
- **Two good examples to copy:**
  - `expand` on a missing anchor lists the anchors that do exist: `# (anchor missing; has: matter_water, …)` (`cli-ergo/out/expand-bad.out`).
  - `doctor` pairs each `fail:` with a `fix:` command.

### 1.6 Streams, JSON, piping (b)

- **Stream law.** "meta → stderr, body → stdout; header card on stderr; next card" (`view.ts:4-7`; `cli-command-surface.spw:166-173`). Commands follow it unevenly:
  - Census puts a 16-line header on stderr and the card on stdout.
  - `inspect corpus` puts everything on stderr and leaves stdout empty.
  - `form`, `stack`, `measure` and `doctor` put everything on stdout.
- **Three header formats are live:**
  - the Spw card from `emitHeader`, used by census and graph;
  - `# spw <name> k=v` hash lines, used by density, formula, lattice, resolve, lint and query (`cli-command-surface.spw:167`);
  - `metaBlock` cards whose numbers are stringified (`~#frames: "24"`, `view.ts:119` `facet.str`), used by outline.
- **Four JSON shapes:**
  - the `spw.cli.envelope` v1, used by census, graph, form, stack, lint, resolve, fingerprint and inspect;
  - a bare `{command,…}`, used by density, formula, lattice, query, select, tree, taste, outline and expand;
  - `surface:"spw.doctor/1"` and `"spw.pulse"`;
  - `version:"spw.mass/1"`.

  Canon's envelope_law (`cli.spw:101`) asks for one.
- **`measure --json` emits plain text after the JSON** on stdout (`spw mass: 0 subject(s), 0 drifted.`, `mass.ts:257`), so `| jq` fails.
- **Flag errors under `--json`** leave stdout empty: no error envelope, except pulse's own (`commands.ts:106-124`).
- **The envelope `timestamp`** (`envelope.ts:16-23`) and the card's `~#under: disk|fresh` / `~#memo:` facets change between runs on an unchanged corpus. That adds noise to every `diff` of two runs.
- **Absolute paths leak:**
  - `inspect` prints `session <tmp>/…/corpus-memo` (`inspect.ts:612`);
  - `census /abs/path` puts the absolute path into `~#among`;
  - `expand` errors show absolute paths.

  All three go against `cli.spw:61,102`.

### 1.7 Are the cards re-readable? (b)

- **Every output I fed through `spw fingerprint` parsed `complete=true prose=false`** (`cli-ergo/root/cards/rt/`). That includes the doctor's plain text: 0 frames, 0 annotations, 19 "Bindings".
  - So "parseable as Spw" (`cli.spw:37`) is too weak a test to tell a card from prose.
  - Frame and annotation counts do tell them apart: census card 13 frames and 74 annotations; graph 24 and 68; `form --spw` 1 and 0; doctor 0 and 0.
- **One run, two names for the same facts.** Stdout `^["corpus"]` and stderr `^["census"]` restate files, lines, links, cyclic, roles and broken. The keys differ (`~#under` vs `~#memo`) and so does the id length (`~#fingerprint` is 16 hex, `fp=` is 12). Canon `representational-disclosure.spw:45` says "Disclosure never renames identity", and `:147` says "one card per product disclosure".
- **A one-row-per-line census card parses fully** (`cards/rt/census-compact.spw`: Frame=8, Annotation=28, PathRef=3) in 9 lines. The default card is 94 lines for 6 files. At the default `-n 80`, a census of `/private/tmp` produced 983 card lines.
- **Read-aloud friction proxy** (non-alphanumeric characters as a share of visible characters, and words per line):

  | Output | Symbols | Words/line | Max col |
  |---|---|---|---|
  | Census card | 29% | 1.7 | 309 |
  | Graph card | 28.5% | — | 512 |
  | `census --table` | 15% | 4.9 | — |
  | Doctor | 9% | 7.7 | — |
  | Query rows | — | 12 | — |

  Long single lines (the hub list at 309 columns, the graph at 512, the density header at 171) don't wrap meaningfully in a terminal.

### 1.8 Startup latency (b)

- **Quiet window** (`log.tsv`, 2026-09-30 23:14-23:34):
  - 0.51–0.77 s: `-h` 0.61 s, `census cut` 0.64, `formula` 0.65, `outline` 0.77, `form` 0.86.
  - 1.5–2.8 s: `graph` 1.52, `resolve` 2.10, `density` 2.83; `--json` variants run 1.1–4.8 s.
  - Two outliers (`help` 262 s, `census --jsn` 334 s) did not reproduce; I treat them as host stalls.
- **Loaded window** (now, 5 interleaved runs):

  | Run | Range | Median |
  |---|---|---|
  | `node -e 0` | 0.35–0.76 s | — |
  | tsx on a trivial file | 0.75–1.19 s | — |
  | `spw -h` | 1.33–1.99 s | 1.87 s |
  | `census cut -q` | 1.65–1.97 s | — |
  | `outline` | 1.61–2.01 s | — |

- **Reading.** `help` costs about as much as `census`, so fixed cost dominates: tsx transpile plus eager static import of all 40 command modules (`commands.ts:1-48`). The import graph alone measured 1.15 s under load (`cli-ergo2/imp.mts`).
- **Other entry points add more.** The bin is a `.ts` file run through tsx (`package.json:20`, `scripts/spw.ts:1`). JetBrains adds npm on top (`SpwCliInvocation.kt:15-23`). The cut gate's `--emit` starts one node+tsx process per file (`scripts/analyzers/spw-cut-gate.ts:354`, working-tree version).
- **Why it matters (hedged).** The usual thresholds are about 0.1 s for "instant" and about 1 s to keep the flow of thought (Miller 1968, AFIPS FJCC 33:267-277; Nielsen 1993, *Usability Engineering*, Academic Press). Help and `--version` sit above the 1 s mark under load.

### 1.9 Color and TTY (b)

- Output is monochrome everywhere except `init`, which writes raw ANSI with no `isTTY` or `NO_COLOR` check (`init.ts:12-14`). Under a pseudo-TTY (`script`), census shows 0 escape codes; the stderr header prints first, then the stdout card.
- Truncation uses fixed widths (`view.ts:126-136`; outline labels are capped at 28, `view.ts:293-294`) and ignores `process.stdout.columns`.
- There is no ASCII fallback for `◆ · ─ ├─ └─ … ≤ → ⟵ ×`.
- Piping keeps stdout and drops the header and next card, which is the intended design. But anyone who pastes a screen into chat pastes both cards.

---

## 2. Talkability

### 2.1 How the commands sound

| Command as said | Reads as a sentence? | Needs a glossary? | Collision |
|---|---|---|---|
| `spw census prompts` | yes ("a census of prompts") | roles hub/orphan/leaf | editor "Probe & Measure Census" means something else (`vscode-spw/package.json:123`) |
| `spw graph prompts` | yes | "familiarity strands" | `~#cyclic` and the `cycle` command |
| `spw outline water.spw` | yes | no | help calls it skim/read |
| `spw tree cut`, `doctor`, `init`, `lint`, `format`, `resolve`, `expand`, `query`, `select` | yes; follow common CLI usage | no | `expand` vs `emit expand` (2.2) |
| `spw density prompts` | weak ("density of what?") | "selector density" | |
| `spw form water.spw` | ambiguous verb/noun | "form geometry" | HTML form; `pulse --form <id>` |
| `spw stack water.spw` | no | "profile stack" | stack trace, tech stack |
| `spw lattice`, `taste`, `pulse`, `beat`, `cite`, `follow`, `authority`, `atlas` | evocative | yes, each needs a mapping (`cli.spw:45-51` metaphor law) | `cite` vs citation managers |
| `spw ls` | collides | yes: operator/brace sequences, not file listing | Unix `ls`; `CLAUDE.md:82` itself mis-describes it |
| `spw exp`, `mem`, `q`, `fp` | abbreviations | yes | `exp` = exponent |

**Research context, hedged.**
- Furnas, Landauer, Gomez & Dumais (1987), "The vocabulary problem in human-system communication", *CACM* 30(11):964-971: people rarely pick the same name for the same function. That supports keeping aliases as access routes but never as taught names.
- Clark & Wilkes-Gibbs (1986), *Cognition* 22(1):1-39, and Brennan & Clark (1996), *JEP:LMC* 22(6):1482-1493: speakers converge on short shared names ("conceptual pacts") through repeated use. The CLI should give tutorials one stable name per product so the pacts form around canonical words, not aliases.
- Baddeley, Thomson & Buchanan (1975), *JVLVB* 14(6):575-589 (word-length effect): longer spoken units load the phonological loop. Sigil-dense lines like `~#index_depth: standard` have no settled spoken form. This is a hypothesis about subvocalization, not a measured effect on Spw readers.

### 2.2 Homonyms inside Spw (b/a)

- **cut** has three meanings:
  - a dated reference cut (`.spw/caches/2026-09-30`, the cut gate);
  - `pulse --cut`, which banks a stencil;
  - `delta` "Compare two cuts", meaning surface revisions.
- **expand** has two meanings:
  - `spw expand` projects `={}` template lineage;
  - `spw emit expand` fills `${slots}` from `--bind` (emit help). Its own help calls this "Fill", so `emit fill` is the natural rename (c).
- **hub** has four definitions (headline 1). **links/edges**: 26 / 26 / 7 / 24.
- **surface** is three things: any `.spw` file, a `stack` alias, and `ls --surface`.
- **measure** is three things: the command, the `%` operator, and every collate command's `effect.l0.measure`.
- **read** is two things: an `outline` alias and the `lattice` alias "readings".
- **Recommendation (c):** add a `^["homonyms"]` frame to `.spw/conventions/cli.spw` that gives each word one owner, following the existing law at `cli-command-surface.spw:161`: "Do not invent a second metaphor for the same product."

### 2.3 Ids that travel

- **What works (b):**
  - `query` prints `file:line:col`, which terminals and VS Code make clickable.
  - `doctor` prints commands you can paste.
  - `shellArg` quotes `#`, since its regex excludes it (`view.ts:107-110`).
- **What breaks (b):**
  - `path#anchor` from the output isn't accepted as input anywhere I tested (outline, select, expand, fingerprint).
  - `~#fingerprint` is an mtime memo key:
    - `cut3` before `touch` gave `065a…`, after `touch` `c826…`;
    - `cut4`, a byte-identical copy, gave `5066…`.

    `corpus-memo.ts:8` documents this, but the card presents it as an identity.
- **Spoken name (a).** I found nothing in canon on how "spw" is pronounced (searched for "pronounc|said aloud|read aloud" across `.spw`, `docs`, README). Streams and tutorials need one line that settles it. Letter by letter, "ess-pee-double-you" is five syllables.

### 2.4 Shareable forms (c)

- **`--line`** prints one ASCII sentence of at most 100 columns, with a content id:
  `spw census cut · 6 files · 516 lines · 26 links (10 anchored, 0 broken) · hubs water, quantities · content 3f2a91c0`
- **A compact card**: one `^["row"]{…}` per line, canonical facet names, no memo or process facets. It opens with `# spw census cut · 2026-10-01 · content 3f2a91c0`. Shown to parse in 1.7.
- **For chat:** the card inside a ` ```spw ` fence. It stays plain-text-first per `.spw/shelves.spw:33` ("legible in terminal, Obsidian, Notion without custom renderer").

---

## 3. Metacognitive affordances

### 3.1 What exists, by move (b)

| Move | Commands today | Gap |
|---|---|---|
| **Predict** | none explicit. Closest: plan-by-default `pulse` and `refactor`, `mutate --dry-run`, `format --check`, `expand` (projection, source untouched) | no way to record an expectation before measuring |
| **Check** | `format --check`, `pulse --check`, `measure` (exit 1 on drift), `doctor`, `lint`, `resolve`, the cut gate | vacuous passes (1.4); census mislabels anchors as broken |
| **Compare** | `delta a b` (lexical and structural), `graph --compare`, `atlas --from/--to/--trend/--save`, `cycle --before/--after`, `format --profiles a,b`, plain `diff` of cards | no facet-level card diff; timestamp and memo facets add noise |
| **Reflect** | `form` "lessons"; `atlas --advice`; `measure` verdicts **match / drift / undeclared / unmeasurable** (mass help); `authority` (claim vs observed); `taste` (declared vs observed); VS Code receipt line `source · buffer version · client cache` (`instruments/commands.ts:258-261`); JetBrains "completed in N ms · source: CLI · effect: read-only" (`SpwCliRunner.kt:99-101`) | no `~#limits` facet saying what a measure can't see (e.g. that census doesn't resolve anchors; that formula scores 0.45–0.70 are heuristics) |
| **Plan** | `^["next"]` frames; doctor `next:`; `formatRecommendations` (command/purpose/cost) | placeholders; three generations of next-rendering |

The `measure` verdict vocabulary is the best calibration grammar already in the CLI. It compares a declared number against an observed one and names the gap. It should be generalized.

### 3.2 Research grounding (hedged)

None of these studies tested a CLI for reading corpora; carrying them over is a hypothesis.

- **Monitoring and control.** Flavell (1979), "Metacognition and cognitive monitoring", *American Psychologist* 34(10):906-911. Nelson & Narens (1990), "Metamemory: A theoretical framework and new findings", *Psychology of Learning and Motivation* 26:125-173. Monitoring informs control. A card that states what it measured and where that measure stops supports monitoring; a filled next step supports control.
- **Judgments of learning and calibration.**
  - Koriat (1997), *JEP: General* 126(4):349-370: judgments rest on cues that may not be valid.
  - Nelson & Dunlosky (1991), *Psychological Science* 2(4):267-270: delayed judgments are more accurate than immediate ones.
  - Lichtenstein, Fischhoff & Phillips (1982), in Kahneman, Slovic & Tversky (Eds.), *Judgment under Uncertainty*, Cambridge UP, pp. 306-334.
  - Brier (1950), *Monthly Weather Review* 78(1):1-3.
  - Calibration needs many judgments; one predict-then-check is an anecdote. Aggregate deliberately (see 3.8).
- **Predict, observe, explain; pretesting.**
  - White & Gunstone (1992), *Probing Understanding*, Falmer Press.
  - Richland, Kornell & Kao (2009), *JEP: Applied* 15(3):243-257.
  - Kornell, Hays & Bjork (2009), *JEP:LMC* 35(4):989-998.
  - Wrong guesses can help learning, mainly when feedback follows quickly. That fits "predict a census, then run it" well.
- **Illusion of explanatory depth.** Rozenblit & Keil (2002), *Cognitive Science* 26(5):521-562. People overrate how well they understand a system until asked to explain it. A blank census card is a cheap way to expose this for a corpus.
- **Think-aloud.**
  - Ericsson & Simon (1993), *Protocol Analysis: Verbal Reports as Data* (rev. ed.), MIT Press.
  - Fox, Ericsson & Best (2011), *Psychological Bulletin* 137(2):316-344: plain concurrent verbalization is largely non-reactive, but instructions to explain change performance.
  - Chi, Bassok, Lewis, Reimann & Glaser (1989), *Cognitive Science* 13(2):145-182: self-explanation can aid learning.
  - So a "say why" prompt is an intervention, not a neutral measurement. Label it that way.
- **Reflective practice and gulfs.** Schön (1983), *The Reflective Practitioner*, Basic Books. Norman (1986), "Cognitive engineering", in Norman & Draper (Eds.), *User Centered System Design*, Erlbaum, pp. 31-61. The gulf of evaluation: output should restate the question it answers.
- **Error messages.**
  - Molich & Nielsen (1990), *CACM* 33(3):338-348.
  - Marceau, Fisler & Krishnamurthi (2011), SIGCSE '11. I'm unsure of the page numbers.
  - Becker et al. (2019), "Compiler error messages considered unhelpful", ITiCSE-WGR '19. I'm unsure of the page numbers.
  - Common thread: say what happened, why, and what to do next, in the user's terms.
- **CLI conventions.** Prasad, Firshman, Tashian & Parish (2020), *Command Line Interface Guidelines* (clig.dev, web). GNU Coding Standards §4.8 (`--help`, `--version`). The NO_COLOR convention (no-color.org, an informal standard).

### 3.3 Ranked changes: biggest noticeable payoff per unit of effort

Effort: S is under 2 hours, M is about half a day, L is more than a day.

| # | File : function | Change | Test | Effort |
|---|---|---|---|---|
| 1 | `spw-seed/src/math/corpus.ts:196-209` `analyzeTopography`; `spw-cli/src/corpus-scan.ts:260-271` `scanCorpus` | Strip the `#fragment` before `known.has` and `fs.access`. Count fragmented refs as file edges. Add `~#anchored: N`. Only call something "broken" after checking the anchor (reuse resolve's logic) | Fixture `a.spw` → `~"./b.spw#x"` with `#>x` in b: `broken=0`, b's role ≠ orphan. Census and resolve agree on cut (26/26) | S |
| 2 | `inventory.ts:321-326`, `map.ts:299-303`, `analyze.ts:290`, `formula.ts:351` | Replace `<roots>` with `shellArg(args.roots)` via `emitRecommendations({command, purpose, cost})`. Fix the bare `spw census --role hub` suggestion | Snapshot: the next card for `census cut` contains `spw graph cut`, no `<`, each step has a purpose | S |
| 3 | `scripts/spw.ts:5-8`; `inventory.ts:221-224`; `map.ts:189-192`; `geometry.ts:315-318`; `commands.ts:123` | One `handleFatal` shared by bin and main: single prefix, `setExitCode('usage')` for option errors | Table-driven over `COMMANDS`: `run(spec.name, ['--zz'])` gives exitCode 2 and stderr `^spw <spec.name>:` | S |
| 4 | `run.ts:41,45`; `skim.ts:16,38,54,100`; `profile.ts:46,54-59,175`; `geometry.ts:159,529`; seed `geometry-inspect.ts:215`; `mass.ts:234-257` | Pass `spec.name` to modules; canonical names in titles, headers, JSON `command` and error prefixes; filter did-you-mean (`run.ts:26`) to canonical names | Per spec: help line 1 contains `spec.name`; each usage line starts `spw ${spec.name}`; `--json` gives `.command === spec.name` | M |
| 5 | `commands.ts:528`, `inspect.ts:269-270` | Change `--stamp` to `--cut` | Parse every root-help Examples line with its command's arg parser (dry) | S |
| 6 | `run.ts:13-37` | `spw --version` / `version` (read `package.json`, and retire the hard-coded `envelope.ts:52-55`); `spw help <cmd>`; unknown command gets a 2-line stderr hint, no stdout dump | exit 0 for version; `help census` equals `census --help`; unknown command leaves stdout empty | S |
| 7 | `resolve.ts:47-60,224`; `lint.ts:160`; `inventory.ts` (no files) | Nonexistent root gives `spw resolve: nothing to check — nope does not exist`, exit 3. Zero files never prints a success sentence | `resolve --from nope` exits 3, stdout empty | S |
| 8 | `mass.ts:253,257`; JSON paths in density, formula, lattice, query, select, tree, taste, outline, expand | Guard text output behind `!json`; migrate to `formatJsonEnvelope`; emit an error envelope on stdout when `--json` is set and parsing fails | `measure --json \| node -e JSON.parse`; `census --json --zz` gives `{ok:false}` | M |
| 9 | `format.ts:153,509-510,611` | Drop `-w` for width (keep `--width`); end every write with a receipt such as `spw format: rewrote 3 files (preview with --check --diff)`; fix "0 need". Later: plan-by-default to match the Shape group blurb, behind a migration notice | `-w` is an unknown flag in format; the receipt line appears | S, then M |
| 10 | Commands that take a file (`skim.ts:28-35`, select, expand, fingerprint, cite) | Accept `path#anchor`: resolve the anchor, then outline or expand that frame. Directories get "is a directory; try `spw tree X` or `spw outline X/index.spw`" | `outline cut/matter/water.spw#water_density_max` shows only that frame; `fingerprint cut` exits 2 with the hint | M |
| 11 | `inventory.ts` (header plus product), `corpus-memo.ts`, `view.ts:119` | One card name per product. Rename `~#fingerprint` to `~#memo_key`; add `~#content` (a sha of sorted path+bytes) for sharing. Drop `under`/`memo` from stdout. Numbers as atoms | `cp -R` copies under one root and `touch` both leave `~#content` unchanged | M |
| 12 | `workspace.ts:237-240` | Rewrite the path error (3.4) | Message contains "spw roots" | S |
| 13 | `commands.ts:1-48` | Lazy `import()` per command; esbuild bundle for the bin (`bundle:jsdist` exists) | `spw -h` within about 0.15 s of the tsx-trivial baseline | M |
| 14 | `init.ts:12-14`, `view.ts:126-136` | Honor `NO_COLOR` and `!isTTY`; width-aware truncation; `SPW_ASCII=1` glyph fallback | Snapshots with `NO_COLOR=1` and with `columns=60` | S |
| 15 | `package.json:107-116`; `docs/runtime/md/sense-loop.md:14-40`; `docs/learn/worked-cli.md`; `CLAUDE.md:82-103`; `docs/runtime/index.spw:70`; `.spw/conventions/cli.spw:12-14` | Add canonical npm scripts (`spw:outline`, `spw:stack`, `spw:density`, `spw:lint`); teach canonical names; fix the `ls` description; add the three missing commands to canon | `commands.test.ts`: every canon command has an npm script; a docs grep finds no alias as the primary name | S |
| 16 | `delta.ts` (c) | `--facets` mode: align two cards by frame path and facet key; print `links: 26 → 25` lines | `cards/census-before.spw` vs `census-after.spw` lists exactly links, broken, hub paths, contract degree, out, pathRefs, sigils | M |
| 17 | `inventory.ts`, `map.ts` (c) | `--blank` emits the product card with `_` holes, which is emit's "bare `_`" vocabulary (emit help). `--against <card.spw>` reports per facet using measure's verdict words | Filled guess for `cut`: `files` match, `links` off by +6, `hubs` 1 of 4 | M |
| 18 | `--line` on every collate command (c) | One-sentence summary with `~#content` | Width ≤ 100, ASCII only, stable across runs | S each |
| 19 | New `spw tour` (c) | See 3.6 | Golden output for `tour cut`; never writes | M |

### 3.4 Error-message rewrites: before and after

1. **Path outside the root**
   - Before: `spw: Path is outside the consumer root: ../x.spw`
   - After:
     ```
     spw outline: ../x.spw is outside this workspace (consumer root: .)
       spw reads only under the folder that holds .spw/. Run it from the file's own workspace, or declare a root in .spw/workspace.spw; `spw roots` lists the current ones.
     ```
2. **Unknown flag**
   - Before: `spw census: unknown flag --jsn` (exit 1)
   - After: `spw census: unknown flag --jsn — did you mean --json? (spw census --help)` (exit 2)
3. **Renamed flag**
   - Before: `spw-pulse: unknown option "--stamp"`
   - After: `spw pulse: --stamp is now --cut (banks a stencil for spw mutate --from)`
4. **Directory given**
   - Before: `spw skim: cannot read cut`, or `spw fingerprint: EISDIR: illegal operation on a directory, read`
   - After: `spw outline: cut is a directory; outline reads one file. Try: spw tree cut · spw outline cut/index.spw`
5. **Anchor given**
   - Before: `spw: ENOENT: no such file or directory, open '<tmp>/…/water.spw#water_density_max'`
   - After, until #10 lands: `spw expand: cut/matter/water.spw#water_density_max — this command takes a file; pass cut/matter/water.spw, or bundle the anchor with ={ ~"…#water_density_max" }`
6. **Nothing checked**
   - Before: `all citations resolve` (total=0, exit 0)
   - After: `spw resolve: nothing to check — nope does not exist` (exit 3)
7. **Positional root on query**
   - Before: `spw query: unexpected argument cut`
   - After: `spw query: roots follow --from — spw query --from cut …`
8. **Unknown command**
   - Before: `spw: unknown command "tour"` / `did you mean: topo, form, mount, tree?` plus 106 lines on stdout
   - After: `spw: unknown command "tour". Did you mean form, mount, tree? (spw help lists all)`
9. **Double prefix**
   - Before: `spw: spw doctor: unknown option --wat`
   - After: `spw doctor: unknown option --wat (spw doctor --help)`
10. **Format summary**
    - Before: `spw-format: 1 file(s) scanned, 0 need.`
    - After: `spw format: 1 file checked, 0 would change`

### 3.5 Shape of help text (c)

Shape every command's help in this order, which follows `cli.spw:28-34` (outcome, then cost, then compatibility):

1. One line naming the question the command answers. Root help already pairs commands with questions.
2. `Usage:` lines with the canonical name only.
3. Two or three examples with realistic roots.
4. `Reads / Writes:` the effect level.
5. `Output:` card, table or JSON, and which stream each goes to.
6. `Exit:` the codes it uses.
7. `See also:` canonical names only.

At the root level:
- Put the Question path first.
- Move the 26 alias rows behind `spw help aliases`.
- Add `spw help words` for the homonym table.

### 3.6 First run: `spw tour [root]` (c)

Spine: the canon schedule `<< ~ ; ? ; % ; ! ; * ; ^ >>` (`docs/theory/spw/flow-protocol-sigils.spw:33`). Its own wonder asks "Can one schedule teach all crawl verbs without English?" (`:99-104`); a tour is an experiment that answers it.

```
spw tour cut          # prints a path; runs nothing unless --run
<< ~ ; ? ; % ; ! ; * ; ^ >>
~  where am I?          spw roots · spw tree cut
?  what do you expect?  spw census cut --blank > guess.spw   # fill 3 holes: files, biggest hub, one orphan
%  measure              spw census cut --against guess.spw
!  look closer          spw outline cut/matter/water.spw      # the biggest hub, filled in from the census
*  compare              spw expand cut/index.spw              # projection vs your reading
^  keep                 write a ^["reading"]{ } card in your own notes (spw never writes it for you)
```

- Each step is a filled-in, copyable command with a question. That is the root help's question path, sequenced.
- `--run` pauses between steps only on a TTY.
- Use an anonymous apposition `~#(phrase)` for a one-off note, and a named `~#name(phrase)` once it recurs (`docs/theory/spw/apposition.spw:23-24,92`). That gives a format for personal readings that is subvocalizable and later queryable.
- Optional, labeled as an intervention (Fox et al. 2011): at `*`, "say aloud for 30 seconds where the measure surprised you". This echoes the canon probe "read aloud for 30 seconds; where do you pause?" (`.spw/shelves.spw:41`).

### 3.7 Consistency rules for new commands such as the cut gate, or comprehension and reduction verbs (c)

1. **Register in `commands.ts`**, in a group by cost. Use one canonical token: a noun if it names a collated product, a verb if it acts. No alias at birth.
2. **Streams.** Header card via `emitHeader` on stderr; body on stdout; `--json` via `formatJsonEnvelope`, including errors; `--spw` produces a real card (frames and facets, not prose); `-q`.
3. **Exit codes** follow `exit.ts:5-9`. A gate failure is 1, a usage error is 2, unreadable input is 3.
4. **Error format.** Errors start `spw <name>:`. Line one says what happened; line two says what to do.
5. **Paths** are consumer-relative (`cli.spw:102`). Findings use `path:line: level message`.
6. **Next steps** go in a recommendation card with roots filled in: command, purpose, cost (`cli.spw:105-108`).
7. **Writes** need `--write`; `--check` means "exit 1 if it would change"; plan-only is the default.
8. **Identity.** Card keys equal JSON keys. Identity facets (content hash) stay separate from memo and process facets. The card states its limits in `~#limits`.

**The cut gate specifically.**
- Register it as `spw gate <cut-dir>` in the collate group. It matches `^[gate]` in the staging `contract.spw` and the script name.
- Header: `^["gate"]{ ~#cut ~#files ~#failing ~#warnings }`.
- Its findings already use `rel:line message` (`spw-cut-gate.ts:374`). Keep that.
- Run `--emit` in-process instead of spawning per file (`:354`).
- Give `✗⚠✓` an ASCII fallback.
- Add a next step: `spw resolve --from <cut> --warn`.
- The gate overlaps `lint` and `resolve`. State the division in canon.

**Reduction and comprehension verbs.**
- Prefer canon words that come in pairs: `expand` ↔ `fold` (the form-ladders rung "… → fold", which `form` already prints under "lessons"), and `emit fill` in place of `emit expand`.
- Every reduction should state its loss with an omission line (`cli.spw:100`).

### 3.8 Constraint on predictions from canon (a)

- Canon says single-source inspection "does not persist a hidden activity log" and evidence "never… infers a person-level trait, or becomes an authority-facing score" (`cli.spw:117-124`). It also says editor activity and cache warmth "never become person-level authority evidence" (`:138`).
- So guesses must be authored `.spw` cards the reader writes and keeps.
- `--against` reports how the guess compares to the corpus, never a grade of the person.
- Any ledger across sessions (for real calibration, per Lichtenstein et al.) is opt-in and owned by the consumer, like `atlas --save` writing `.spw/gen/atlas-history.jsonl`.

---

## 4. Rendering: plain terminal versus editors

- **Terminal (b).**
  - Two cards per run on screen: stderr `^["census"]`, then stdout `^["corpus"]`. They repeat each other.
  - Monochrome, unicode glyphs, fixed truncation, lines up to 512 columns.
  - The default card is about 12 times taller than `--table` (94 lines vs 8). Good for re-reading and parsing, heavy to scan at a glance.
- **VS Code (b).**
  - Instruments re-render the LSP results as markdown: "Inspect Form" (`instruments/commands.ts:105-120`) is headed `# Spw form`, while the CLI prints `# spw geometry`. "Inspect Surface Stack" is at `:130-150`.
  - They open via `openTextDocument({content})` as untitled preview documents (`:268-275`; also `vscode-spw/src/commands.ts:29-38,104-108`).
  - That makes a third rendering of the same product, with no line giving the equivalent CLI command.
  - Untitled documents with content count as dirty, so tabs may pile up and prompt to save. That comes from API semantics (`understand-out/plugin_theory.md` B3); it was not observed in VS Code.
  - Palette names don't match CLI names: "Reference Hubs & Orphans" (`package.json:91`), "Probe & Measure Census" (`:123`), "Re-ground Workspace Atlas" (`:147`).
  - The receipt line (`instruments/commands.ts:258-261`) correctly discloses partiality (`representational-disclosure.spw:182`).
- **JetBrains (b).**
  - Runs `npm --prefix <toolRoot> run --silent spw -- form <file> --resonance --spw` (`SpwCliInvocation.kt:15-30`).
  - Opens stdout as a read-only `LightVirtualFile` named `Spw Form.spw` with the Spw file type (`SpwCliRunner.kt:92-97`), so the output gets Spw highlighting.
  - Because `form --spw` emits prose (`geometry.ts:477-480`), lines like `kinds ()=0 []=38…` are highlighted as operators. That is misleading.
  - Stderr, which holds the header and next steps, is dropped on success.
  - The notification is a good receipt (`:99-101`).
- **What a shareable rendering should look like (c).** The same bytes in terminal, editor and chat: a compact card with one comment line naming the command, date and content id, one frame per line, canonical keys, `path#anchor` ids that are also valid inputs, a `~#limits` facet, and a filled next step. For example:

```spw
# spw census cut · 2026-10-01 · content 3f2a91c0
^["census"]{ ~#among: #[ cut ] ~#files: 6 ~#lines: 516 ~#links: 26 ~#anchored: 10 ~#broken: 0 ~#cyclic: #no }
^["row"]{ ~#of: ~"cut/matter/water.spw" ~#role: hub ~#in: 1 ~#out: 12 }
^["row"]{ ~#of: ~"cut/registries/sources/matter.spw" ~#role: source ~#in: 10 ~#out: 0 }
^["limits"]{ ~#hub: "role by in/out degree, not top-N" ~#links: "path refs; anchors resolved" }
^["next"]{ ^["step"]{ ~#run: "spw graph cut" ~#asks: "how does it connect?" ~#cost: "reuses census memo" } }
```

- Editors should open this with the Spw language mode, as JetBrains already does, and add one `# equivalent: spw …` line. GUI instruments then become talkable commands.
- The design choice of plain-text-first with optional highlighting matches `.spw/shelves.spw:33`. Evidence that syntax highlighting aids comprehension is mixed: Hannebauer, Hesenius & Gruhn (2018), *Empirical Software Engineering* 23(5):2795-2828, found no benefit for novices. So the rendering should not depend on color. The parallel study covers highlighting in depth.

---

**Caveats.** The cut-gate line numbers refer to the working-tree version of `scripts/analyzers/spw-cut-gate.ts`, which had uncommitted edits while I read it. Latency figures come from a loaded host, so treat them as ranges.

### verification

# Verification: cli_ergonomics report

**Bottom line:** most of the report holds up. All 28 citations exist and their author, year and venue are right. Four need fixing: one page range, two claims that rest on the wrong source, and one 1 s threshold attributed to the wrong paper. Most file:line anchors are correct; the few that are wrong are listed in B. The main factual corrections:

- The source file is cited 17 times, not 10.
- `density` also exits 1 on a bad flag, and `fingerprint` exits 3 on a directory.
- 12 canonical commands lack an npm script, not 14, and `lint` has one.
- There are at least six JSON shapes, not four.
- Canon's envelope law covers only new products.
- On an idle host, latency is about half what the report shows.

All 6 sketches pass the strict validator.

Evidence is under `<scratchpad>/reading/verify-cli/`:
- re-runs: `out/*.{out,err}`, including `out/e-*` for exit codes
- help captures: `help/`
- sketches: `root/sk/`
- Crossref lookup script: `cr.sh`

## A. Research citations

| Citation | Verdict |
|---|---|
| Furnas, Landauer, Gomez & Dumais 1987, *CACM* 30(11):964-971 | confirmed (Crossref) |
| Clark & Wilkes-Gibbs 1986, *Cognition* 22(1):1-39 | confirmed |
| Brennan & Clark 1996, *JEP:LMC* 22(6):1482-1493 | confirmed |
| Baddeley, Thomson & Buchanan 1975, *JVLVB* 14(6):575-589 | confirmed |
| Flavell 1979, *Am. Psychologist* 34(10):906-911 | confirmed |
| Nelson & Narens 1990, *PLM* 26:125-173 | confirmed |
| Koriat 1997, *JEP:General* 126(4):349-370 | confirmed |
| Nelson & Dunlosky 1991, *Psych. Science* 2(4):267-270 | **corrected: pp. 267-271** |
| Lichtenstein, Fischhoff & Phillips 1982, in *Judgment under Uncertainty*, pp. 306-334 | confirmed. A 1981 tech-report version also exists (DTIC ADA101986). |
| Brier 1950, *MWR* 78(1):1-3 | confirmed |
| Richland, Kornell & Kao 2009, *JEP:Applied* 15(3):243-257 | confirmed |
| Kornell, Hays & Bjork 2009, *JEP:LMC* 35(4):989-998 | confirmed |
| "Wrong guesses help mainly when feedback follows quickly" | **corrected: wrong source.** Neither 2009 paper tests feedback timing; both used immediate feedback. The claim belongs to Hays, Kornell & Bjork 2013, *JEP:LMC* 39(1):290-296 (delayed feedback can remove the benefit). Against it: Kornell 2014, *JEP:LMC* 40(1):106-114 (the benefit survives a delay for meaningful questions). The evidence is mixed. |
| Rozenblit & Keil 2002, *Cog. Sci.* 26(5):521-562 | confirmed |
| Ericsson & Simon 1993, *Protocol Analysis* rev. ed., MIT Press | confirmed from memory, not fetched |
| Fox, Ericsson & Best 2011, *Psych. Bull.* 137(2):316-344 | confirmed; the summary is accurate |
| Chi, Bassok, Lewis, Reimann & Glaser 1989, *Cog. Sci.* 13(2):145-182 | confirmed, **with a caveat:** the 1989 study is correlational. Causal evidence is Chi, de Leeuw, Chiu & LaVancher 1994, *Cog. Sci.* 18(3):439-477. |
| Schön 1983, Basic Books; White & Gunstone 1992, Falmer Press | confirmed from memory, not fetched |
| Norman 1986, "Cognitive engineering", in *User Centered System Design*, pp. 31-61 | confirmed (Crossref reprint lists 31-62) |
| Molich & Nielsen 1990, *CACM* 33(3):338-348 | confirmed |
| Marceau, Fisler & Krishnamurthi, SIGCSE '11 | confirmed; **pp. 499-504** (the report left pages open) |
| Becker et al. 2019, ITiCSE-WGR '19 | confirmed; **pp. 177-210** (the report left pages open) |
| Miller 1968, AFIPS FJCC '68 (Fall, part I), p. 267ff | exists; **corrected: wrong source for the 1 s claim.** Miller's thresholds were about 0.1 s and about 2 s. The "about 1 s keeps the flow of thought" limit is Card, Robertson & Mackinlay 1991, CHI '91 pp. 181-186, and Nielsen 1993. |
| Nielsen 1993, *Usability Engineering*, Academic Press | confirmed from memory |
| GNU Coding Standards §4.8 | confirmed: §4.8 "Standards for Command Line Interfaces"; §4.8.1 `--version`; §4.8.2 `--help` |
| Prasad, Firshman, Tashian & Parish, clig.dev | confirmed (all four names are on the site) |
| no-color.org | confirmed |
| Hannebauer, Hesenius & Gruhn 2018, *EMSE* 23(5):2795-2828; no benefit for novices | confirmed |

## B. Tooling claims

### Confirmed by re-run or code read

**Headline 1 (census anchor bug)**
- The bug is at `corpus.ts:200` (`!known.has(l.to)` with the fragment still attached) and `corpus-scan.ts:264` (`fs.access`).
- `broken=10`: all 10 targets are `file#anchor` refs. `resolve` reports `total=26 ok=26`.
- Atlas prints "6 surfaces · 23 anchors · 7 edges", 5 "load-bearing" files, "24 deep-links used, 0 dangling", and a leaked `fatal: not a git repository`.
- Density reports `hubs=14`. Census `--table` shows sources/matter.spw and vocabulary.spw as orphans.

**Headline 2 (next-step placeholders)**
- The placeholders are at `inventory.ts:321-326`, `map.ts:299-303`, `analyze.ts:290` and `formula.ts:351`.
- The helpers are `view.ts:89-110`. Only `inspect-source.ts:275` and `inspect-spacing.ts:258` use them.
- `inspect.ts:621` already fills in the real root: `"spw census cut"`.
- Canon: `cli.spw:105-108`.

**Headline 3 (alias leaks)**
- `commands.ts:67` says aliases are never taught.
- Leak sites: `skim.ts:16,38,54,100`; `profile.ts:46,54-59,175`; `geometry.ts:159,411,529`; seed `geometry-inspect.ts:215`.
- `run.ts:26` passes `knownCommands()` to did-you-mean; `run.ts:41,45` pass the typed token. `tour` gets "topo, form, mount, tree".
- JSON `command` fields read `skim`, `profile` and `geometry`.

**Headline 4 (two error contracts)**
- The bin `scripts/spw.ts:5-8` prints `spw: spw doctor: unknown option --wat` and exits 1. `main.ts` exits 2.
- Exit 1 on an unknown flag: census, graph, form, pulse. Exit 2: stack, doctor.
- The contract is in `exit.ts:5-9`.

**Headline 5 (shape commands write)**
- `format.ts:509-510` writes by default. `-w` means width at `format.ts:153` and write at `pulse.ts:244`. The "0 need." string is at `format.ts:611`.

**Headline 6 (vacuous passes)**
- `resolve --from nope` and `lint --from nope` both exit 0 with a success sentence (`resolve.ts:224`, `lint.ts:160`).

**Headline 7 (ids)**
- outline, select, expand and fingerprint all reject `path#anchor`. `expand` shows an absolute ENOENT.
- The fingerprint is an mtime memo key (`corpus-memo.ts:8`). My re-run reproduced the pattern with different values: f99b… → 5cf1… after `touch`, and d01a… for a byte-identical copy.

**Headline 8 (delta)**
- Plain `diff` of the census cards gives 7 hunks: links 26→25, broken 10→9, degree 3→2.
- The `delta` note says only `lexOps=14 · brace=eq…`. Its own stderr header says `brace=none`, which contradicts the note.

**Section 1.4 (exit codes)**
- `--version` and `version` exit 2.
- `help census` prints the root page (`run.ts:13`).
- An unknown command exits 2 and dumps 106 lines on stdout (`run.ts:34`).
- `outline nope.spw` and `outline cut` exit 1.
- `census cut -n` is accepted silently.
- `query cut` fails with "unexpected argument"; `resolve cut` works.

**Sections 1.1 to 1.9**
- **Counts:** 40 commands and 25 aliases (`knownCommands()` returns 66 because it adds `help`). The alias block in root help is 26 lines.
- **Canon drift:** `cli.spw:12` is missing fingerprint, lint and resolve, and `:14` is missing fp.
- **Canon lines that check out:** `cli.spw` lines 28-34, 37, 45-51, 61, 100, 102, 112, 117-124, 129 and 138. `cli-command-surface.spw` lines 86-135, 161 and 166-173.
- **Learning docs:** `sense-loop.md:14-18`, `worked-cli.md:16-77` and `CLAUDE.md:82,89,97-103` all teach alias names.
- **Root-help Examples** still teach `--stamp` (`commands.ts:528`, `inspect.ts:270`), which pulse rejects.
- **Header formats:** stringified metaBlock numbers (`view.ts:119`, `~#frames: "24"`).
- **Streams:** `inspect corpus` writes nothing to stdout and leaks a `session <tmp>/…` path (`inspect.ts:612`).
- **JSON:** `measure --json` adds a trailing text line (`mass.ts:257`). A flag error under `--json` leaves stdout empty. Pulse's error envelope is at `commands.ts:106-124`.
- **Card nondeterminism:** `~#memo` flips between fresh and disk across runs.
- **Card parse stats** match: census 13 frames / 74 annotations, graph 24 / 68, `form --spw` 1 / 0, doctor 0 / 0 with 19 Bindings, compact card 8 / 28 / 3 PathRef in 9 lines.
- **Line widths:** max columns 309 (census) and 512 (graph).
- **Color:** `init.ts:12-14` is the only ANSI source. Truncation is fixed in `view.ts:126-136,293-294`.
- **Help flag counts:** `--spw` appears on 7 pages, `--table` on 4, `--quiet` on 9.

**Section 2 and 3**
- `query --skim` prints `file:line:col`.
- `shellArg`'s regex excludes `#`.
- Measure's verdict words match the report.
- Emit's "bare `_`" vocabulary and expand-as-"Fill" are in emit's help.
- atlas `--save` writes `.spw/gen/atlas-history.jsonl`.
- Canon quotes in `shelves.spw:33,41`, `flow-protocol-sigils.spw:33,99-104`, `apposition.spw:23-24,92` and `representational-disclosure.spw:45,147,182` are accurate.
- No canon line says how "spw" is pronounced.

**Section 4 (editors)**
- VS Code: `# Spw form` at `instruments/commands.ts:107`; `openTextDocument` at `:270`; palette titles at `package.json:91,123,147`.
- JetBrains: npm invocation at `SpwCliInvocation.kt:15-30`; read-only `LightVirtualFile` with the Spw type at `SpwCliRunner.kt:92-97`; stderr dropped on success; notification at `:100`.

**Cut gate**
- One spawn per file at `spw-cut-gate.ts:354`; `rel:line` output at `:374` (working tree).

### Corrected

1. **Headline 1 citation count.** `registries/sources/matter.spw` is cited **17** times (9 as `../registries/sources/matter.spw#…`, 8 as `../sources/matter.spw#…`, out of 26 refs), not 10. The "10" is only the in-degree of one anchor pseudo-node (`#src_crc_handbook`); `#src_eisenberg_kauzmann` adds another 4.
2. **Headline 1 hub counts.**
   - Graph's `~#hubs: 12` is `primary.hubs.length` (`map.ts:242`), from a top-12 list (`map.ts:52`, `corpus.ts:188`). That list contains `file#anchor` pseudo-nodes, so it is the same fragment bug, not just a cap.
   - Census itself gives two answers: `roles hub:4`, and `^["hubs"] ~#paths` with 8 entries, 4 of them anchors.
   - So "how many hubs?" has five answers, not four.
3. **Headline 4 and §1.4 flag errors.** `density` also exits 1 on an unknown flag (`analyze.ts:152`; observed `spw density: unknown flag --wat`). Add it to the census/graph/form/pulse list.
4. **§1.4 directories.** `fingerprint cut` exits **3**, not 1, with a raw `EISDIR`. Only `outline cut` exits 1.
5. **Headline 6.** `census nope` is not a silent pass. It prints `(no files)` and `tip: pass a root with .spw files…`, though only to stderr. The vacuous-pass criticism holds for resolve and lint.
6. **§1.1 and #15 npm scripts.**
   - **12** canonical commands lack an npm script: density, lattice, delta, authority, stack, exp, cycle, cite, follow, outline, snippet, refactor.
   - `lint` has one, `spw:lint:axes` (`package.json:121`).
   - `spwq` is at `:102`, outside the cited 107-116.
   - A new `spw:lint` would sit next to the existing `lint:spw` (parse-validate), which is another homonym.
7. **§1.6 JSON shapes.** There are at least six shapes, not four. Missing from the report:
   - `lattice`: `{command, version:"spw.lattice/1"}`
   - `roots`: neither `command` nor `surface`

   Also, `envelope_law` (`cli.spw:101`) applies only to *new* structured products and explicitly allows legacy unwrapped JSON behind a migration boundary. "Asks for one" overstates it.
8. **§1.6 absolute paths.** In `census /abs/…`, the product frame's `~#among` stays relative (`cut`). Only the population frame's `~#among` is absolute, so the same card carries two disagreeing `~#among` facets.
9. **§1.2.** "(skipped by invent/map as gen)" is a prose line in delta's help, not a `next:` line. Delta's "Compare two cuts" wording comes from root help (`commands.ts:227`).
10. **§1.3.**
    - `--json` appears in 35 of 40 help pages, not about 38.
    - In graph, `--hubs`, `--limit` and `-n` are one flag (`map.ts:98`).
    - `query` and `select` also accept `--top` as `--limit` (`args.ts`).
11. **§1.5.** `spw-doctor:` (`doctor.ts:416`) is a status header on stdout, not an error prefix.
12. **§1.7.**
    - The census card is **95** lines (`wc -l`), not 94.
    - The symbol share depends on method. I got census 31.3%, graph 30.1% and doctor 9.9%. For `--table` I got 11.6% without the `─` rule glyphs and 29.6% with them, so the report's 15% can't be reproduced unless the method is stated.
    - Words per line reproduce: 1.8, 4.9 and 7.8.
13. **§1.8 latency.**
    - Idle re-run: `node -e 0` 0.22 s, tsx on a trivial file 0.26 s, `spw -h` 0.47-0.50 s, `census cut -q` 0.51-0.57 s, `commands.ts` import graph 216-230 ms. The report had 1.15 s for the import graph.
    - "Help costs about what census costs; fixed cost dominates" still holds.
    - The magnitudes were inflated by host load. When idle, `-h` is under 1 s, and the gap over the tsx baseline is already about 0.23 s. That makes #13 lower priority than presented.
14. **§3.1.** The VS Code receipt line is at `instruments/commands.ts:260-263`, not 258-261.
15. **§4 alias leaks in editors.**
    - VS Code's surface instrument is titled `# Spw surface stack` and hardcodes `client cache: bypassed` (`:134-136`).
    - JetBrains titles stack "Spw Surface Stack" (`SpwCliInvocation.kt:34`).
    - VS Code already opens dual-read output in `spw` language mode (`vscode-spw/src/commands.ts:104-107`). So "as JetBrains already does" applies to that VS Code command too.
16. **§3.7.** The staging `contract.spw:156` has `^["gate"]` with a quoted label, not `^[gate]`.
17. **#5 (`--stamp`).** Canon also teaches `--stamp`: `docs/runtime/spw/cli-command-surface.spw:157` has `spw pulse <file> --stamp`. Add it to the fix list.
18. **Headline 7 additions.**
    - `spw cite cut/matter/water.spw#…` prints a raw `ENOENT … '<tmp>/…'` with **no `spw` prefix at all**, exit 1. This is the worst error message in the CLI, and the report missed it.
    - `fingerprint`'s ENOENT stays relative.
    - Census help does disclose the mtime basis ("keyed by mtime fingerprint", `inventory.ts:187`), so the disclosure is in help but not on the card.

## C. Sketches

I re-ran the validator with `scripts/analyzers/spw-syntax-validate.ts --strict -v` on `root/sk/*.spw`. **All 6 pass** with no warnings. `spw fingerprint` also gave `complete=true prose=false` for each.

| Sketch | File | Tokens |
|---|---|---|
| Compact census card | `s-compact.spw` | 206 |
| §4 shareable card | `s4-card.spw` | 159 |
| Gate header | `s-gate.spw` | 17 |
| Tour schedule | `s-tour.spw` | 27 |
| Apposition (anonymous and named) | `s-appos.spw` | 13 |
| `={ ~"…#anchor" }` bundle | `s-bundle.spw` | 9 |

As the report notes, passing the parser is a weak test: doctor's plain text also passes.

Sources:
- [Hannebauer et al. 2018 (Springer)](https://link.springer.com/article/10.1007/s10664-017-9579-0)
- [Becker et al. 2019 (Semantic Scholar)](https://www.semanticscholar.org/paper/Compiler-Error-Messages-Considered-Unhelpful:-The-Becker-Denny/a7b86daca8560a25e7ca58b3ea36944dcb9e6a87)
- [SIGCSE 2011 report (Marceau et al.)](https://sigcse.org/about/reports/chair/2011.html)
- [Nelson & Narens 1990 reference](https://www.scirp.org/reference/referencespapers?referenceid=3295296)
- [GNU Coding Standards: Command-Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)
- [clig.dev](https://clig.dev/)
- [no-color.org](https://no-color.org/)
- [Crossref API](https://api.crossref.org/)