# Tokens, roles, transforms and play dialects: a Spw language-implementation design study

**Scope.** This is a read-only study of `main` @ `229aedcf`, and it brings together three research reports and their verifiers. Wherever a verifier corrected a claim, the corrected version is used here; refuted claims are left out. Every claim carries a label:
- **(a)** the canon says it
- **(b)** the code does it
- **(c)** a proposal or aspiration

"Verified" means a probe was run. Probe locations:
- Research and verifier probes: `…/scratchpad/tokens-ast/{highlight,xforms,dialect-play,verify-roles2,verify-dp}/`
- New probes from this pass: `…/scratchpad/tokens-ast/synth/`

**Thesis.** The three studies arrive at the same design. The editor needs one stream of roles derived from the parse. Practice modes, say lines, arcs and dialect lowerings are then filters or lowerings over that stream. Each derived byte points back to the source bytes it came from, and a byte with no source is marked synthetic.

That design needs two things fixed first:
- **Spans must be true.** Dialect preprocessing currently breaks them.
- **Errors must be visible.** Today a lexer error leaves `success` set to true.

---

## 1. Tokenizer/AST findings

### What tokens and nodes carry (b)

**Tokens**
- There are **32** `TokenType`s (`types/token.ts:40-71`). `ERROR` is declared but never emitted.
- The `kind` field carries the operator, modifier or connector subtype (`token.ts:88`).
- `aim` is one of `>`, `:` or `!` (`types/ast/nodes.ts:315`).
- Only deixis, case and mood are lexed as `PARTICLE` tokens. Aspect, written `~#`, stays on the Annotation path (`lexer/matchers/particles.ts:9-12`).

**AST nodes**
- There are 28 `ASTNodeType`s (`types/ast/index.ts:13-41`).
- `AnnotationNode.apposition` holds the reading body (`nodes.ts:284-297`).

**Derived, not stored**
- Particle binding is computed, not stored on nodes (`canonical/particles.ts:63-104`).
- Gap classes `tight`, `open`, `cadence` and `episode` (`lexer/gaps.ts:11-17`) already form a prosody channel.

**Lexer errors are invisible to every consumer (b, verified).**
- They appear in `parse().errors`, for example `tokenize@3 "Unexpected character: é"`, and the offending characters land in `gaps[].raw`.
- `success` stays **true** anyway. As a result:
  - The LSP publishes nothing, because it only reports when `!pr.success` (`handlers/analysis.ts:52`).
  - `spw-syntax-validate.ts` passes the file, because it fails only on `!success` (`:209,:227`), even though it reads `errors` at `:194`.
- Cases that fit this pattern: `café:` (gap `é`) and `t: -3` (gap ` -`).
- `"a⏎b"` is different: it raises an unterminated-string error and drops no characters.

**Event retention cost (b).** The default `eventPolicy` is `'trace'` (`types/state.ts:72`, `lexer/lex.ts:14`). The LSP never reads `.events`, yet `server-index.ts:371` keeps 88,181 of them for `mutation-flow-automata.spw` (701 lines) on every edit.

Timings on that file, re-run (they depend on machine load):

| step | time |
|---|---|
| regex highlighter | 17 ms |
| `lex` | 48 ms |
| `parse`, `trace` events | 1.73 s |
| `parse`, `none` events | 1.15 s |

**Parse cost and reuse (b).**
- `parse` is roughly 24–36× the cost of `lex`.
- Walking roles and encoding them adds cost within noise on top of the parse.
- The LSP already skips a reparse when `contentHash` is unchanged (`server-index.ts:259-264,336-338`).
- The LSP calls `parse()` again, using only the tokens, at `:392,:424,:485,:747,:816` and `:1117` (the last is a fallback).

### Four coloring layers, none from the seed (b, verified)

The layers are:
1. **TextMate (VS Code).**
2. **TextMate (IntelliJ).** A copy that has drifted: it lacks `dialect-exp`, the `(?<!\w)'` guard and the `=key:` rule, and differs in other ways.
3. **LSP `semantic-tokens.ts`.** A line-regex scanner (`:105-413`) with a legend of 9 types and 6 modifiers (`:75-78`). It imports only types from the seed (`:31`).
4. **`surface-decorations.ts`.** Regexes plus its own string mask (`:89-109`).

The 23 color ids in VS Code resolve to 13 distinct hex values. Because the status tiers reuse the valence colors (`:236-239`), "deprecated" looks like `bane`. That contradicts the canon's charge-neutral valence (a) (`valence-architecture.spw:38-39`).

**Where the layers diverge from the parse (all verified)**

| construct | the seed's reading | regex layers |
|---|---|---|
| `a: 1 # note {x} 42` | inline `# ` comments to end of line (`comments.ts:58-67`) | TextMate paints `#` as `sigil.schema`. The LSP paints `{` `}` `42`, because its `# ` branch at `:122-125` is empty. |
| `~#lens(it's 50% done)` | one APPOSITION token, body taken raw (a: `apposition.spw:43-47`) | TextMate and the LSP paint `50`/`%`. IntelliJ opens a `'` string. Decorations mask from `'`. |
| `x: boon.honk`, `^bane[…]` | MODIFIER tokens; the tight `.` is `OPERATOR(.)` joining a `ModifierChain` | No layer paints bare valences. TextMate reads `^bane` as one integration label. |
| `a ~> b => c` | `CONNECTOR ~>`, `ARROW =>` | VS Code TextMate gets `=>` right. The LSP paints `=` as `property.readonly` and decorations call it `constraint`. TextMate paints `~` as potential. |
| `~<tag>"./x.spw"` | `Op(~)` + Capsule + Literal; **not a PathRef** | TextMate and the LSP (`:190`) paint one path unit. Decorations hover `~<tag>` as a path and mask the string. All three promise a jump the parser can't deliver. |
| `##>root` | lexes as PARTICLE `#>root`; AST holds `Op(#)` + ProseChunk | painted as an anchor (`semantic-tokens.ts:173`) |
| `/* x { */`, `?[x >= 3]{}` | live code, or Prose fallback | TextMate `comment.block` (`:89`), `open-question` (`:440`); nothing signals the degradation |

**Corpus rates (verified)** across 786 tracked `.spw` files, canon / caches / agents:

| measure | canon | caches | agents |
|---|---|---|---|
| hash-prose comments | 2,557 | 631 | 1,242 |
| … with LSP paint inside | 1,149 | 370 | 672 |
| `=>` painted as configuration | 218 | — | 109 |

**Quote spill in decorations.** Text after an opening quote stays unmasked and gets painted: 13 / 20 / 25 files across the three groups. It is about 58% `'` and 41% `"` in canon, so it is a quote-spill problem, not only an apostrophe one.

**Same-line holes (b, verified).** Four constructs disagree about what a line break means:
- the medial capsule `48<cm>⏎` swallows the next line (syntax_breadth F5)
- an empty binding takes the next line as its value
- inline `# ` comments run to end of line
- **new:** valence-only capture. In `mood: boon.honk⏎^bane["x"]{ z }`, the `^` on the next line binds as the value's Operation (span L1–2), and `bane[…]{…}` becomes a sibling.

**Prefix hazards.**
- `?~"x"` at top level demotes the path to a ProseChunk line payload, because `INLINE_PAYLOAD_OPERATORS = {#,?}` (`expressions.ts:47`).
- Inside a Stream, `?~"x"`, `~~"x"`, `%~"x"` and `!~"x"` split into siblings.
- Only `^~"x"` takes the path as its subject.
- `?(` is special-cased as a subject (`expressions.ts:379-391`). Every other `G(` attaches as an Expression `scope` postfix.

**Dialect spans (b, verified).**
- `applyDialectPreprocess` joins all lines (`dialect/detect.ts:116-126`, called at `parser/products.ts:213`).
- Under `Spw.l`/`Spw.q`, `?` is reported at L1 offset 30. Its real position is L6 offset 33.
- In the LSP, which parses without a path (`server-index.ts:371`), this hits only files that declare a header pragma.
- `desugar` changes offsets too, but it runs only in the runtime pipeline (`spw-runtime/src/pipeline/stages.ts:228`), so it does not affect the LSP.

---

## 2. Role taxonomy, legend, practice modes

**Principle (a/c).** Glyphs carry kinds, and color may add only relations the parser derives. This follows two pieces of canon:
- plain-text-first (`.spw/shelves.spw:33`)
- "Disclosure never renames identity" (`representational-disclosure.spw:45`)

It also follows the invariant against a "second editor-only semantics stack" (`.spw/tooling/vscode-spw.spw:108`).

**Visible without color (b):**
- the operator (13 sigils)
- particle aim (`#>` `#:` `#!`)
- datum vs reading (`~#k:` vs `~#k(…)`)
- container shape (`[] {} () <>`, `<< >>`)
- comment and string

**What color may add (c):**
- the node a particle run binds to
- an operator's reach (its label and brackets)
- whether a reference resolves
- whether a span is a prose fallback
- dropped characters (`unlexed`)
- lexer and parse errors

**What the grammar must fix, because color can't (c):**
1. Bare valence words look like identifiers but are reserved MODIFIERs (`matchers/modifiers.ts:18`). This is why `boon:` as a key degrades the surface.
2. Line breaks follow four rules. One same-line law should cover the capsule, empty bindings, inline `# ` and valence capture.
3. Compounds such as `$%`, `##>` and `~<tag>"p"` read one way and parse another.
4. Lexer errors must become diagnostics.

**Role record vs wire legend (c).** The modifier budget is the binding constraint: LSP modifiers are a 32-bit field. The prototype (`highlight/roles.mts`) uses 29 of them. Dialect packs want more, such as `evidential`, `quantity` and `utterance`.

The fix is to separate the two levels. The seed emits a rich `RoleSpan`, and the LSP encodes only what themes need:

```ts
interface RoleSpan { start: number; end: number; type: RoleType
  op?: ReaderName            // 13 canon reader names, operators.spw:28-41
  aim?: 'deixis'|'case'|'mood'; valence?: Valence; ref?: 'root'|'path'|'fragment'
  side?: 'open'|'close'; flags: { declaration?; bound?; degraded?; unlexed?; error? }
  particle?: { name: string; bound: SourceSpan|null }; dialect?: { id: string; role: string } }
```

**Wire legend (c), with superTypes corrected by the verifier.**

| type | superType |
|---|---|
| `sigil` | `operator` |
| `particle` | `decorator` |
| `apposition` | `decorator` |
| `trait` | `property` |
| `container` | `operator` |
| `connector` | `operator` |
| `reference` | `variable` |
| `key` | `property` |
| `opLabel` | `macro` (renamed: `label` is already a standard VS Code type) |
| `valence` | `enumMember` (`modifier` is not a VS Code standard type, so older themes get no color) |
| `string`, `number`, `comment` | standard |
| `prose`, `unlexed`, `plain` | none |

Wire modifiers: 13 `op` + 3 `aim` + 5 `valence` + `declaration`, `bound`, `degraded`, `path`, `fragment`, `status` = **27**. That leaves 5 bits reserved for packs, enforced by an assertion at module load. `side` and `root` stay server-side only.

The legend becomes a contract that themes depend on, so it uses the canon reader names (`operators.spw:44`: "stable reader vocabulary") rather than code names. In code, `.` is called Subject and `^` Integration (`spw-runtime/src/state/type-affinities.ts:20,27`).

**Practice modes are server-side predicates over `RoleSpan[]` (c).** Prototype counts on one sample were verified:

| mode | keep | tokens |
|---|---|---|
| full | all | 56 |
| aims | `particle` or `bound` | 10 |
| op:wonder | `op=wonder` (the sigil plus its brackets) | 5 |
| valence | `valence` set | 4 |
| structure | containers, connectors, `degraded` | 24 |
| honesty | `degraded`, `prose`, `unlexed`, `error` | 0 on clean files |
| plain | emit `plain` (mapped to foreground) plus a TextMate floor of comments and strings | 0 roles |

The plain floor matters because in VS Code, wherever no semantic token is emitted, the TextMate color shows through. Emitting nothing therefore gives TextMate colors, not monochrome.

**The practice mode itself is predict-then-reveal, not monochrome.**
1. Hide one derived relation, such as the target of a binding.
2. Ask the reader for it.
3. Reveal the parser's answer and log accuracy per role.

**Evidence, hedged.** Findings conflict on whether highlighting helps:
- Sarkar (PPIG 2015; n=10, eye tracking) found significantly lower task time, with the effect weakening as experience grows.
- Hannebauer, Hesenius & Gruhn (*EMSE* 23, 2018; 390 novices) found no evidence that highlighting improves comprehension.

Mechanisms that may justify fading supports:
- fading scaffolds (Renkl & Atkinson 2003)
- the expertise reversal effect (Kalyuga et al. 2003)
- generation and retrieval practice (cited from memory, not re-checked)

Making text harder to read is not the mechanism: Meyer et al. (*JEP:G* 2015) found no disfluency effect across 17 experiments, scoped to disfluent fonts on Cognitive Reflection Test problems.

An honest claim: **"may strengthen recall of particle binding and roles for readers past the novice stage; unmeasured for Spw."** Per-role accuracy logs turn it into a measurement.

**Optimizations that apply with or without highlighting (b→c):**
- `eventPolicy:'diagnostics'` at `server-index.ts:371`
- `lex()` at the token-only sites
- reuse the cached `doc.parseResult` for tokens
- `resultId` plus `full:{delta:true}`; today the server advertises `full:true, range:false` (`stdio-server.ts:227-231`)

---

## 3. Typed transform algebra

### Today (b)

The seed **finds** with spans intact: particle binding, `resolveFragment`, `readBias`, `spwq`, and `SemanticPlan` edits (`semantic-edit.ts:121,280`). It cannot **produce** a tree:
- There is no printer from AST or ONF back to Spw; `onfToSpw` (`stages.ts:440`) and `printAST` (`parser/trace.ts:87`) are debug dumps.
- ONF drops offsets: 40 nodes, 0 offsets on the `tide.spw` sample. Canon marks the round trip as *proposed* (a) (`onf.spw:90,98`).

Where the existing commands sit:
- `spw expand` finds its sites through the AST: `biasSites` runs `spwq` and `readBias` (`bias-edges.ts:26-41`), and fragments resolve via `parse` + `resolveFragment` (`expand.ts:89`). Only the splice step works on text, by line (`expand.ts:56-66`).
- The provenance `expand` leaves is a `#` comment (`expand.ts:79`). That is liminality level 0 (a: `apposition.spw:70-78`), and the transcluded fragment loses its own `#>` anchor.
- `emit` extracts with regexes (`emit/extract.ts:25-26`) and drops the wonder, the `~#lens(…)` and the probes.

### Carriers and verbs (c; parts prototyped)

```ts
type Segment = { at; len; kind: 'source'|'transclusion'|'generated'|'frame'; origin?: { uri; offset } }
interface Projection { text: string; segments: Segment[]; receipts: Receipt[] }   // its AST is parse(text)
expand(site, resolver, { depth }): Projection
comprehend(edge /* axis=comprehend */, resolver, { budget, sample? }): { tuple; view: Projection; ok }[]
reduce(node, 'say'|'card'|'brief'|'mass', { overlays }): { line: string; from: Origin[] }
transform(node, step: LadderStep|SemanticRule, ceiling: EffectGrade): SemanticPlan
project(node, { overlays, grain: GranularityDepth, reading: ReadingProfileId }): Projection
```

### Laws

| law | statement | status |
|---|---|---|
| L1 | Views never write; the source is the fold. | design |
| L2 | Every projected byte has a segment. | verified: projection byte 636 maps to `basin.spw` byte 94, and the projection parses with 0 errors |
| L3 | Provenance is visible in the AST: each block opens with `<< ~"src#a" ~#(transcluded) ; … >>`. | plausible: the scanner finds it, but no Spw.q selector exists for `$~#…` yet (`selector-expr.ts:21`) |
| L4 | `reduce` returns an authored `~#say` unchanged. | design |
| L5 | `comprehend` yields ∏\|disc\| tuples that all parse, with discs in ranked target order. | design; reporting unbound holes is (c), not built |
| L6 | `transform` returns plans, never trees. | design |
| L7 | Overlays merge by anchor without touching canon. | needs a real test; the prototype compared a file with a cached copy of itself, so it could not fail |
| L8 | Operations refuse to run when spans don't map to source bytes (l/q preprocessing). | design |

### Notation that parses today

`synth/samples/notation.spw` gives 0 errors, and the validator passes all 5 files.

| verb | notation | parse (verified) |
|---|---|---|
| expand | `=ref{ ~"./basin.spw#basin_resonance" }` | bias edge, fragment target |
| comprehend | `=~"./wheel.spw#wonder_tpl"[comprehend]{ ~"./wheel.spw#lens_disc" ; ~"./wheel.spw#era_disc" }` | anchor `wonder_tpl`, axis `comprehend`, 2 ranked targets |
| hole | `lens: $lens`, `${lens=living_system}` | `Op($ label)` / `Op($ body)`. Inside strings and appositions a hole is text only, and `#!$x` splits. |
| reduce | `!reduce[say]{ ~"./tide.spw#wonder_tide_1" }`, authored `~#say(…)` | `Op(! label frame body)`; named apposition |
| transform | `![indent]{ ~"./tide.spw#:L12-L18" }` | a single PathRef, but `resolveFragment(':L12-L18')` returns `binding:null` (**new, verified**), so it needs a line-range branch |
| project | `=~"./tide.spw#wonder_tide_1"[reading]{ ~"./sam.spw#sam_tide_1" }` | axis `reading` |

**Range notation to avoid (b).** The canon's illustrative `~"doc.spw"#:L12-L28` is a PathRef plus a detached `#:` particle. That particle binds to the **next** item, so it silently marks an unrelated node. Canon already labels the form proposed and illustrative (`range-transform.spw:79,109-110`).

### Comprehension

A run over `wheel.spw` produced 9 views, all of which parse (verified). Composing `reduce∘comprehend` makes all three `era` tuples reduce to the same line, because the `~#say` template never uses `$era`. That collision can become a lint: "generator axis invisible in the say view".

This is Llull-style volvelle combinatorics. Because of the explosion (631 `#>wonder_` anchors outside the caches), `comprehend` needs a budget and sampling.

**Gaps blocking generators:**
- Set targets in `readBias` are silently dropped (`read-bias.ts:55-96`).
- `@` refs can't carry a `#fragment` (`references.ts:32-43`).
- A bare `@alias` is never a link (`spw-selector.ts:180`).

### Subvocalization becomes first-class (c)

**Say lines.** `reduce(node,'say')` takes its line from, in order:
1. the reader's overlay `~#say`
2. the canon's `~#say`
3. a line computed as question + "through ⟨lens⟩" + mood

Verified lines:
- Computed: "Where does the two-bulge picture stop being enough? through ecological zone (computational)".
- From Sam's overlay: "the moon pulls twice, and the basin answers once".

A say line is a string plus origin spans. That makes it the plain-text practice lever: ghost text, a hover or terminal output, **with or without color**. Attention moves through words instead of hue.

Voice is a register the reader chooses (`emit/registers.ts`). Following v0.1's presentation rule (a, archival: `lib/spw-v0.1.0-alpha/dialects/PHASES.md:134`), it never changes canonical text or hashes.

Evidence, hedged:
- Rayner et al. (*PSPI* 2016) report that suppressing inner speech does not allow faster reading with comprehension intact.
- Alderson-Day & Fernyhough (2015) is a general inner-speech review and supports the reading link only weakly.

**Arcs.** An arc is a Stream of `G["cue"]{ target }` beats: the glyph sets the attention mode, the frame holds the spoken cue, and the body holds the target.
- `Sequence.separators` keeps `;` and `||`; `||` marks a branch.
- `=` is excluded, because it would read as a bias edge.
- `arc2.spw` produced 5 beats, all resolving (verified). `glyphs.spw` produces **13** beats.

Default template (a): the canon's flow schedule `<< ~ ; ? ; % ; ! ; * ; ^ >>` (`flow-protocol-sigils.spw:33`). The canon names `~` "potential" and gives "hold" to `@(…)` (`:38`), so the earlier "hold → wonder…" gloss is corrected.

Reading `?` as opening an information gap and `!`/`^` as closing it follows Loewenstein (1994). That mapping is interpretive (c).

**Cursor and runtime.**
- `ArcCursor { arc: Address; beat; branch?; phase? }` is per-viewer state, never canon.
- The runtime flattens a Stream (`interpreter.ts:272-279`), so stepping must live in a new `canonical/arc.ts`.

**Overlays.**
- An overlay file is `#:overlay #!personal` plus `[reading]` edges anchored at canon fragments; the `mergeOverlays` prototype returned 2 anchors.
- A dangling overlay is reported in the overlay, with `available` suggestions.
- Overlays depend on anchor rename following fragment refs. Today `spw refactor --rename anchor:` plans 1 edit; on the scratch corpus it should plan **8**, because 7 PathRefs would dangle.

---

## 4. Dialects for play

### The system today

**Canon (a).**
- Dialects `Spw.b/l/m/x/q/f/p/t`, plus the regional `Spw.o` with `fallback:"Spw.l"` (`.spw/registries/dialect-spec.spw:14-23`).
- One active dialect per file; header beats path, which beats the default (`:30-37`).
- The stack is "resolved once, shared by parse, format, hook, LSP" (`syntax-profile-stack.spw:27`).

**Code (b, verified).**

*A dialect is an id plus flags.* Four flags act:
- `newlineAsSpace`: a source rewrite
- `planStream`: the only lexer branch (`tokenize.ts:88`)
- `machineLint`: emits warnings
- `contextMode`: `high` for l/q/t (`syntax-stack.ts:60,110,161` → `products.ts:205` → `expressions.ts:221`, `references.ts:418,618,663`). Under `Spw.t`, `x: ~./foo.spw` becomes a PathRef; under `Spw.b` it degrades.

Other flags do nothing:
- `flowGlyphs` and `highContext` are only displayed.
- `unknownAsText` is wired but no dialect sets it, so the prose lex profile can't be reached through a dialect.

*Detection* is duplicated in **at least 7 places**, mostly hard-coding `[blmxqfpt]`:
- `detect.ts:14-23`
- `semantic-tokens.ts:128`
- `display.ts:394`
- `spw-probes.ts:541-542` (only x/f; ignores `#:dialect`)
- the TextMate `dialect-exp` rule
- `experimental/scan-refs.ts:8`
- `.agents/skills/spw-commit-review/scripts/spw-syntax-review.ts:262-264`

*`Spw.o` is inconsistent across layers.*
- Detection resolves it to `Spw.b` by default, which contradicts the canon fallback `Spw.l`.
- Forcing `Spw.o` crashes at `syntax-stack.ts:299,308`.
- Meanwhile `resolveRuntimeMedium` (`spw-runtime/src/session/medium-matrix.ts:76`) allows it.

*Other detection behavior.*
- Conflicting pragmas produce no diagnostic.
- Pragmas after 4096 characters are ignored.

*The LSP and the CLI disagree.*
- The LSP parses without a path. Across 77 `wip.spw` files, 71 have lexer errors without the path and 3 with it.
- The `spw/surfaceProfile` request does pass a path (`spw-probes.ts:406-424`, invoked from `extensions/vscode-spw/src/instruments/commands.ts:129`). It reports `Spw.p` while the outline and index were built from `Spw.b` tokens.
- This is the canon's live open question `?[tool_disagree]` (`syntax-profile-stack.spw:212`).

*Path defaults damage files.* Through `spw surface`, the path default turns each of the four `.spw/biome/ocean/query/*.spw` files into one COMMENT token, and it still prints `parse.ok true`.

### Lineage case study (a/b, from the archives)

The checkout's history starts at v0.1 (2026-01-07; first commit `a1e509c6`, 2026-01-08). Nothing from 2020–2025 is in this checkout.

| | v0.1 (2026-01-07) | v0.2 (2026-02-26/27) | v0.3 + code |
|---|---|---|---|
| dialect model | composable phases `Spw.surface.structure.domain.orientation.presentation` (`v0.1/dialects/PHASES.md:16-26`) | same; composition "❌ Not implemented" (`v0.2/…/PHASES.md:131`) | one `DialectId` + flags (`dialect/types.ts:12-20`) |
| natural surface | `Spw.n` (`:44`) | `PROSE_LEX_PROFILE` | can't be reached through a dialect |
| presentation | never affects canonical text or hashing (`:134`) | carried | none; the `reading` axis is display-only (`display.ts:430`) |
| letters | `x` = index, `p` = prompting | `x` open question; no `p` | `x` = executable, `p` = plan streams |

**Pattern (b, from dated commits).** The enhancements that landed did two things: **the lexer owns the raw text, and the result lowers to an existing node.**
- particles (`8cdaf2a9`, 2026-07-23)
- apposition (`925e982e`, 2026-07-26, renamed from "gloss"; it lowers to `Annotation`, so "every existing selector counts it", `apposition.spw:91`)
- lossless plan-stream entries (`c855e832`, 2026-09-08)

Ideas that stayed flags or prose never got that mechanism: `Spw.n`, `flowGlyphs`, phase composition. Also, `lib/spw-v0.3.0/README.md:25` claims a `dialects/` directory was carried forward, but it is absent.

### Play dialect packs (c)

Each pack lowers to core Spw with a span map. All 8 lowered samples in `dialect-play/lowered/` pass `--strict` with 0 lexer errors, and `spw resolve` resolves 10 of 10. In core Spw, each raw surface passes the validator only because lexer errors keep `success` true.

| pack | audience | lexer addition | lowers to | where the metaphor breaks |
|---|---|---|---|---|
| `Spw.chat` | streamers (TikTok LIVE/Twitch) | line owner for `[t] handle: …` → TEXT/`utterance`; `!cmd` `@x` `#t` as span metadata | `#>utt_N` + `.{ at, by, cmd, tags, said }`, `order: << … >>` | `@user` is a person, not a perspective; `#topic` is not resonance; `!raid` is not an action (ingest at `draft`, ceiling `none`, `channels.ts:84-91`) |
| `Spw.gloss` | linguists (Leipzig rule 2: morpheme/gloss hyphen counts match) | tier lines; split cells on `-`/`=`; arity diagnostic | `^["igt_1"]{ line gloss free cells: [.{m g}] }` | must **not** lower to `~#(…)`: "a gloss explains where an apposition asserts" (`apposition.spw:52`); `\ex/\gl/\tr` follows LaTeX gloss packages, SIL Toolbox uses `\tx \mb \ge \ft` |
| `Spw.unit` | physics students | sign/exponent/`±`; a tight `9.81<m/s^2>` with no right arm | `.{ value, unit, sigma }`; derivations as `[derives]` bias edges | capsules are relations (`catalog.ts:23-36`); no dimensional algebra (cf. Kennedy, CEFP 2009); `%` is limited to [0,1] |
| `Spw.grid` | designers | `16px`/`1fr`/hex as STRING-kind | `^["layer_x"]{ z, cols: 1..6, fill }` | `#ff6600` is not resonance; inclusive `..` is this pack's own convention (core does not define it); "layer" collides with `#:layer` |
| `Spw.verse` | poets | `verse_line` TEXT; blank line ends a stanza | `lines: << "…" ; "…" >>` + `~#volta(…)` | caesura can't be `//` or `\|`; nothing in verse maps to `\|\|` |
| `Spw.kin` | children with parents | a `?`-ending line opens a wonder; "I saw/heard/guess" become moods | see below | `!` means action; evidentials are obligatory only where they are a grammatical category (Aikhenvald 2004), so a missing mark ≠ "no source"; keep child data local |

`Spw.kin` lowered sample (verified: each evidential binds to its own claim):

```
#>why_sky
?["Why is the sky blue?"]{
 #:evidence #!heard
 because: "light bounces off the air"
 #:evidence #!saw
 noticed: "at sunset it turns orange"
 next: ?["Why is it orange at sunset?"]{ }
}
```

**Cross-cutting (b/c).**

*Placement.* Particles inside a wonder's body bind to the apposition, so they must sit above `?[`.

*Reduplication (heads only).* As heads, `??[`, `!![` and `**[` appear in 0 corpus files. As text the picture differs:
- `**` appears in 33 files, and lexes as two `*` operators 9 times.
- `??` appears in 1 file, inside strings.
- The real digraphs are `..`, `->`, `~>`, `||`, `<>`, `<<`, `>>`; `##` is two `#` operators.

Reduplication is morphologically conditioned (Inkelas & Zoll 2005), so any doubled-sigil meaning should be one closed rule.

*Chat privacy.* The prototype keeps 16 bits of hash, which reaches about 50% collision probability near 300 handles, and its span map keeps raw mentions. Use a keyed hash of at least 64 bits, and never keep raw handles in the span map.

*Fragmentation guard.* Packs emit only existing token types, varying by `kind`, and lower to existing nodes plus a span map. New node types need canon graduation. Racket's `#lang` follows the same idea (Tobin-Hochstadt et al., PLDI 2011).

*Waves (b→c).*
- Streams keep separators (`[";","||",";"]`, verified).
- `DreamSchedule` (`canonical/dream-schedule.ts:74-86`) is hard-coded TypeScript with no consumers.
- `spw beat` ticks every 500 ms with no link to the tree.
- The `wave-step.mts` prototype steps `season.spw` into 5 groups and 16 beats.
- The looper, audio and phasor canon cites `src/infra/*` and `src/core/*`, which are absent from this checkout. That canon is interpretive only.

---

## 5. LSP and plugin implications; ranked proposals

**Surfaces.**

*LSP*
- One profile stack per document, computed with the path and stored on `DocumentState`.
- Every request reads the cached `RoleSpan[]`.
- Custom requests: `spw/roles`, `spw/expand`, `spw/reduce`, `spw/arc`, `spw/overlays`.
- `workspace/executeCommand` plus an `executeCommandProvider`. Today every code lens has `command:''` (`display.ts:1085-1194`). This is the only portable route for JetBrains, whose native client calls no `spw/*` method.
- `didChangeConfiguration` and `semanticTokens/refresh`. The client already syncs `configurationSection:'spw'` (`extension.ts:98`), but the server has no handler.

*VS Code*
- Contribute `semanticTokenTypes` and `semanticTokenModifiers`.
- Remove the regex decoration passes.
- Add a `spw-view:` content provider for projections, which replaces the untitled dirty tabs (plugin_theory B3).
- Arc keybindings (there are 0 today).
- Path-hinted dialect snippets via glob `include`. This is confirmed for user snippet files and inferred for snippet files an extension contributes. Pragma-declared dialects need LSP completion instead.

*JetBrains*
- `semanticTokens/full` support starts at 2024.2.2, while `sinceBuild` is `242` (`build.gradle.kts:53`).
- No `lspCustomization` is set (`SpwLspServerSupportProvider.kt:128-143`).
- How custom types map to TextAttributesKeys is unverified and needs a `runIde` smoke test.

*CLI*
- `spw practice`, `spw expand --map`, `spw reduce`, `spw arc`, `spw lower`, `spw play`.

**Ranked proposals.** Effort: S ≤1 day, M 2–4 days, L ≥1 week (agent-time, rough).

| # | change (file → function) | tests | effort |
|---|---|---|---|
| 1 | `handlers/analysis.ts:52` publish `pr.errors` whatever `success` is; `spw-syntax-validate.ts:209,227` fail when `errorCount>0` (land after #2, or 71 wip files flood) | `café: 1`, `t: -3`, `"a⏎b"` give diagnostics; clean fixtures don't | S |
| 2 | `server-index.ts:371` `parse(doc.text,{path:rel,eventPolicy:'diagnostics'})`, stack cached on `DocumentState`; `lex()` at `:392…:816` after checking lex-profile parity | wip doc lexes `>>[` as STREAM_CLOSE+TEXT; outline equals CLI; retained events = 0 under trace-free policy | S |
| 3 | `detect.ts:116` `applyDialectPreprocess` → lexer option "NEWLINE as whitespace"; no metasyntax rewrite for path-only dialects (`syntax-stack.ts:214-219`); until then, refuse transforms (L8) | Spw.l `?` at L6 offset 33; Spw.l outline has 3 frames; `ocean/query/q.spw` gives >1 token | M |
| 4 | `semantic-tokens.ts:122-125` `# ` consumes to EOL; `~>`/`=>` before the `~`/`=` branches | no non-comment semantic token falls inside a lexer COMMENT span across a fixture corpus | S |
| 5 | new seed `canonical/roles.ts` `tokenRoles(out, source): RoleSpan[]`, export from `index.ts`; total over non-trivia tokens (cover IDENTIFIER, COMPARISON, COLON, COMMA); AST overrides (`.` in ModifierChain ≠ sigil; `##>` → prose); `unlexed` from gaps; under preprocessing, token-only roles | `# a {b} 42` → 1 comment; apposition → head + string; connectors not sigils; `boon.honk` → 2 valences, no `sigil.ground`; `!` after particles `bound`; `?[n >= 3]{}` fully `degraded`; `café` → `unlexed`@3; `~<tag>"p"` no `reference.path`; valence capture pinned (flip when the same-line law lands) | M |
| 6 | `semantic-tokens.ts` encode from `RoleSpan[]` with the §2 wire legend; modifier-budget assertion; `resultId` + delta in `stdio-server.ts:227` | 53 tests rewritten as role expectations; delta(full A→B) applied to A equals full(B) | M |
| 7 | `spw/roles` request; `spw.practice.mode` via `didChangeConfiguration` + refresh; role-card hover in a new `handlers/roles-hover.ts` (`display.ts` is ~1461 lines) | each mode's output ⊆ full; mode switch triggers a refresh | M |
| 8 | VS Code: contribute legend; delete `surface-decorations.ts:295-404` and the duplicate `:438-444`; ruler lanes from `spw/roles`; status-bar mode; `spw.practice.predict` QuickPick | extension typecheck; decoration count on apostrophe fixtures = 0 spill | M |
| 9 | anchor rename follows fragments: `semantic-edit.ts` `renameAnchorRefs`; `refactor.ts` emits both rules | scratch corpus goes from 1 to 8 edits, 0 danglers | S–M |
| 10 | `canonical/projection.ts` `projectBias`; `expand.ts:46-98` delegates; stream head `~"src#a" ~#(transcluded)`; slice from particle-run start | every segment's origin text matches; a PathRef in each spliced Stream; transcluded `#>` kept; cycle/depth → `frame` | M |
| 11 | `resolve-fragment.ts` line-range branch for `#:Lm-Ln` inside quotes; `selector-expr.ts` `$#>name`, `$~#name` | `~"t.spw#:L12-L18"` resolves to a range; `$~#say` selects | S |
| 12 | `canonical/reduce.ts` `reduceSay`/`reduceCard`; `emit/extract.ts` reads wonder and apposition from the AST | authored `~#say` idempotent; overlay wins; tide golden line; `emit fields` keeps lens and question | M |
| 13 | `canonical/overlay.ts`, `canonical/arc.ts` (`readArc`, `stepArc`), code lens + `executeCommand`; `spw arc` | `glyphs.spw` → 13 beats; `\|\|` branches; `=` beat rejected with reason; dangling overlay reported with `available` | M |
| 14 | `canonical/comprehend.ts` + `liftHoles`; per-slot defaults in `template-fill.ts:100-130`; `readBias` `kind:'set'` (`read-bias.ts:55`) | wheel → 9 parsing views in rotation order; unbound `$foo` reported; `era` collision lint fires; 2 set targets read | M |
| 15 | `dialect/registry.ts` `registerDialect(pack)`; one detector accepting `Spw\.[a-z][a-z0-9_]*`; remove the ≥7 regex sites; `Spw.o` → canon fallback; warn on conflicting pragmas | `Spw.o` detected, gated, no crash; conflict warns | M |
| 16 | `LexProfile.lineOwners` (generalizes `tokenize.ts:88`); tagged block scalar `k: \|chat` → `ProseChunk{dialect}`; owned bodies don't raise apostrophe errors | plan-stream tests unchanged; untagged `raw: \|` with `it's` gives 0 errors | M–L |
| 17 | `canonical/lower.ts` `lowerDialect → {core, spanMap, receipt}`; `'lowered'` in `DERIVED_SPW_KINDS` (`derived-surface.ts:28`); `spw lower` | each chat anchor maps back to its source line; no raw handle in the map | L |
| 18 | `canonical/wave.ts` `waveFromStream`, `scheduleFromSpw`; `spw play --voice` at ceiling l0 | `season.spw` → 5 groups, 16 beats | M |
| 19 | `spw practice <file> --axis aims\|ops\|valence`: terminal predict-then-reveal scored against `tokenRoles`, JSONL log | deterministic quiz on a fixture; accuracy computed per role | M |
| 20 | TextMate single source: Gradle `processResources` copies the VS Code grammar; inline `#` comment, apposition begin/end, delete `/* */`, connectors first, bare valences, `.lens` → `.case` | diff test between the two copies | S–M |
| 21 | JetBrains: choose a `sinceBuild` floor for roles; `lspCustomization` color map; `runIde` smoke | manual smoke (API unverified) | M |
| 22 | reserve `??[`, `!![`, `**[` heads with a diagnostic; profile the `dusk-oak` chunk (slower than the whole file; backtracking plausible, not shown); top-level incremental reparse that respects particle runs | chunked and whole top-level sequences equal | S / L |

---

## 6. The reference cut: planned `spw/` surfaces

Each surface follows `contract.spw`:
1. title comment, then the `#>` anchor
2. axes `#:layer #!semantics #:domain #!meta`; `meta` until the ontology adds a language domain
3. `^"emit"`, `^"provenance"` with `^["receipts"]`, `^["edges"]`, `^["concepts"]`
4. anchored claims with `#:claim #!status`, `source:` and `^["limits"]`
5. `^["try"]`, then wonders

Code and canon claims are sourced to a new `registries/sources/spw.spw`. Its cells hold `file`, `lines`, `commit` and `kind: #code`; research works sit beside them.

**Verified in this pass.** Gate check:
- A copy of the staging cut, plus a skeleton `spw/tokens-and-roles.spw` and `registries/sources/spw.spw`, passes `spw-cut-gate.ts` with 7 files, 0 failing and 0 warnings.
- The same copy passes `spw-syntax-validate --strict` (7 of 7).
- The brief emit gate refused the path as "outside the consumer root". It was not run.
- Skeleton location: `…/tokens-ast/synth/cut/`.

| path | anchor | form | purpose and keystones |
|---|---|---|---|
| `spw/index.spw` | `#>spw_branch` | index | `^["tree"]` to the surfaces below; `^["bundle"]` of their digests |
| `spw/tokens-and-roles.spw` | `#>spw_tokens_roles` | field_guide | plain-text floor (`#!interpretive`); the layer-divergence ledger with corpus counts (`#!settled`, as_of commit); `RoleSpan` and wire legend; same-line law; try: predict-then-reveal binding; wonder lens "formal structure" |
| `spw/practice-modes.spw` | `#>spw_practice_modes` | protocol | mode predicates; highlighting evidence `#!contested` (Sarkar vs Hannebauer); practice claim `#!speculative`; disfluency `#!refuted` only within Meyer's scope; probe `=kind[field]` logging accuracy per role |
| `spw/transforms.spw` | `#>spw_transforms` | catalog | five verbs, laws L1–L8 with status, carriers, verified notation table, range-notation hazard, volvelle budget; edges `extends` to `onf`/`range-transform` canon |
| `spw/arcs-and-readings.spw` | `#>spw_arcs_readings` | trail | say lines, arcs, overlays, cursor; the flow-schedule template with the `~`/`@` correction; Loewenstein mapping `#!interpretive`; try: walk a 5-beat arc aloud |
| `spw/dialects-and-play.spw` | `#>spw_dialects_play` | comparison | six packs, each anchored (`spw_dialect_chat` …) with lowering, verified sample, `breaks:`, privacy/scope; fragmentation guard; reduplication reservation |
| `spw/lineage.spw` | `#>spw_lineage` | timeline | v0.1 → v0.2 → v0.3 rungs, commit receipts (`#!settled`); the "lexer owns raw text, lowers to existing node" pattern (`#!interpretive`); letter reuse; missing `dialects/` |
| `registries/sources/spw.spw` | `#>src_spw_registry` | bibliography | code and canon cells pinned to a commit; research works with exact titles (Sarkar 2015 title confirmed from the PDF) |

**Additions for the contract's `^["hazards"]` frame (b):**
- lexer errors pass silently while `success` stays true
- `~"doc.spw"#:L…` outside the quotes marks the next node
- `?~"x"` demotes to prose
- valence-only capture across lines
- path-only dialects (`/query/`) can turn a surface into one comment

---

## 7. Open theory questions

**Roles and legend**
1. Reach: canon says `#` owns `[]` and `@` owns `()` (`apposition.spw:40`), while the prototype tags brackets with the prefix operator's role. Which reach should highlighting show?
2. Do `~>` and `=>` carry their sigil's reader role as a modifier, or are they pure connectors?
3. Valence visibility: sigil-marked, allowed in key position, or both? How should the canon's charge-neutral valence be reconciled with code that defines `bane` as "hazard / error" (`catalog.ts:43-49`)?
4. Claim status: a registered mood vocabulary (`#!contested`) with its own modifier, or never colored?
5. Is the 32-bit modifier budget spent on operator identity or on dialect roles? Should operator identity become 13 types?

**Same-line law and visibility**
6. Should one law govern the capsule, empty bindings, inline `# ` and valence capture?
7. Should lexer errors fail `success`, or stay soft and be surfaced as diagnostics only?

**Transforms and provenance**
8. Is a say line a reading (authored, personal) or a product (derived, cacheable)? May computed say lines ever be written back, given "Disclosure never renames identity"?
9. Should `?`, `~`, `%` and `!` take a PathRef subject the way `^~"x"` does, and should `?(` lose its special case?
10. Is `comprehend` a consumer verb on a verb-neutral bias edge, or a product? Is the outer disc the first ranked target?

**Readings, overlays and arcs**
11. Which retention plane do overlays live on (`cache-field.spw`)? Is `#:overlay` a new case, and is `[reading]` a new stance cell?
12. Does the arc cursor live in an overlay file or in LSP memory? Does a loop re-enter at beat 0 or at the phasor's phase?
13. Should the `reading` axis (author|prompt|research|creative) choose the default reducer and the default practice mode?

**Dialects**
14. Should a dialect again be optional axes (surface lexer, lowering, vocabulary, voice), as in v0.1's phases?
15. Can tagged block scalars embed another dialect without breaking "one active dialect per file"?
16. Is evidentiality a new aim, or a closed value set under mood, and how does it relate to claim status?
17. Should dialects be named as words (`Spw.chat`), with the single letters as aliases? Should `breaks:` be lint-enforced (`register-geometry.spw:26`)?
18. Chat pseudonyms: a per-session salt (unlinkable) or a per-channel salt (arcs can span sessions)?

**Practice and evidence**
19. Is practice a per-reader setting, a per-surface default, or both? What accuracy threshold should fade a mode?