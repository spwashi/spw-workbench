## tokens_roles

# Syntax highlighting as a projection of Spw token and AST roles, with affordances that can fade for practice

This study only read the repo. All probes are in `…/scratchpad/tokens-ast/highlight/`: `tm.mts` (a TextMate simulator using JS regex), `layers.mts`, `corpus.mts`, `roles.mts`, `timing.mts`, `valence-capture.mts`, `dialect-offsets.mts`, `errs.mts`, `degraded.mts`.

Tags: **(a)** the canon says it, **(b)** the code does it, **(c)** a proposal or aspiration. "Verified" means I ran it.

**Bottom line:** today the LSP's highlighting ignores the seed lexer and parser entirely, and four highlighting layers disagree with the parser in the ways listed in §1. Deriving one role stream from the parse, and fading it by filtering, is cheap as long as the LSP reuses its cached parse.

## 1. Inventory: which layer decides a color today

**Kernel vocabulary (b).**
- 31 `TokenType`s (`types/token.ts:39-71`). `kind` carries the operator, modifier or connector subtype (`:88`).
- `ERROR` is declared (`:71`) but never emitted. A lexer error drops the character, which then shows up only in `parse().gaps[].raw` (for example `raw:"é"` or `raw:" → "`). The gap classes are `tight`, `open`, `cadence` and `episode` (`lexer/gaps.ts:11-17`), which amount to a prosody channel that already exists.
- 28 `ASTNodeType`s (`types/ast/index.ts:13-41`).
- `ParticleNode.aim` is `>`, `:` or `!` (`nodes.ts:315`). `AnnotationNode.apposition` holds the reading body (`:284-297`).
- Particle binding is derived, not stored (`canonical/particles.ts:1-13,82`).

**Four coloring layers. In VS Code a decoration color wins over a semantic token, which wins over TextMate.**

| layer | input | vocabulary for operators |
|---|---|---|
| TextMate, VS Code (`syntaxes/spw.tmLanguage.json`) | line regex | `sigil.schema` for `#` (`:492`), `integration` for `^`, `lens` for `#:` (`:380`) |
| TextMate, IntelliJ copy | line regex, **drifted** (verified by diff): no `dialect-exp`, no `(?<!\w)'` guard, no `=key:` rule, different topic lookbehind | same, plus a `keyword.operator` suffix |
| LSP `semantic-tokens.ts` | **regex over raw lines, not lexer tokens and not the AST** (`:105-413`) | 9 generic types and 6 modifiers (`:75-78`); `#:` is "lens" (`:216`) |
| `surface-decorations.ts` | regex plus its own string/comment mask (`:89-109`) | frame, observer, collapse, constraint, merge, schema, residual (`:212-223`) |

**Color reuse.** The 23 VS Code color ids resolve to only 13 distinct dark-theme hex values (verified), so several roles share a color:
- `#:` = `?` = `boon`
- `#!` = `!` = `bonk`
- `#topic` = `$` = path refs
- `##>` = annotation = `honk`

The status tiers reuse the valence colors (`surface-decorations.ts:236-239`). That makes "deprecated" look like `bane`, which contradicts the canon's charge-neutral valence (theory_state F2).

The server advertises `full: true, range: false` and no delta (`stdio-server.ts:227-231`). The client passes no middleware (`extension.ts:110`) and contributes only `semanticTokenScopes` (`package.json:281`), with no custom types or modifiers.

**Where the regex layers disagree with the lexer or AST.** Every case in this table was verified with `layers.mts`.

| construct | seed says | regex layers say |
|---|---|---|
| `a: 1 # note {x} 42` | inline `# ` is a comment to end of line (`comments.ts:58-67`) | TextMate: `#` as `sigil.schema`, then `}` and `42`; LSP: `{`, `}` and `42` painted; decorations: braces. The LSP branch meant to skip `# ` prose is empty (`semantic-tokens.ts:122-125`). |
| `~#lens(it's 50% done)` | one APPOSITION token; body taken raw (a: `apposition.spw:43-47`) | TextMate and LSP paint `50` as a number and `%` as a keyword. The IntelliJ grammar opens a `'` string. Decorations mask from `'` onward. |
| `x: boon.honk`, `^bane[…]` | MODIFIER tokens in a `ModifierChain` | No layer paints bare valences. TextMate reads `^bane` as a single integration label. |
| `a ~> b => c` | `CONNECTOR ~>`, `ARROW =>` (a sequence separator) | `~` is painted as potential, `=` as configuration, `>` as a brace or definition |
| `<< a ; b >>`, `?[x >= 3]` | `STREAM_OPEN`, `COMPARISON` | decorations paint `<`, `>` and `>=` as braces (`:316`) |
| `~<tag>"./x.spw"` | `Op(~)` + Capsule + a loose Literal, **not a PathRef** (syntax_breadth F4) | all three regex layers paint one navigable path unit (`semantic-tokens.ts:190`). The highlighting promises a jump that the parser can't deliver. |
| `##>root` | `Op(#)` with a ProseChunk payload, not a particle | all layers show a prompt-root anchor |
| `/* note { */` | live code: `/ * note {` (`comments.ts:4-6`), parse degrades to Prose | TextMate `comment.block` (`:89`), so the live `{` looks inert |
| `?[x >= 3]{}` | the whole expression degrades to Prose | TextMate `variable.other.open-question` (`:440`). Nothing signals the degradation. |
| `#:dialect Spw.b` | a Particle plus a sibling Identifier | VS Code TextMate: `keyword.control.dialect`; IntelliJ: `lens`; LSP: `type.definition` |
| `t: -3`, `"a⏎b"`, `café:` | lexer errors, with the characters dropped into gaps | painted as ordinary code; no layer shows the error |

**Corpus rates from `corpus.mts`, all 786 tracked `.spw` files.**

| measure | canon (378 files, 40,722 lines) | caches | .agents |
|---|---|---|---|
| hash-prose comments | 2,557 (624 inline) | 630 | 1,242 |
| … with LSP paint inside | 1,149 (45%) | 369 | 672 |
| … not comment-scoped by TextMate | 988 (39%) | 209 | 247 |
| … with decoration paint inside | 426 | 182 | 323 |
| `=>` painted as `=` configuration by the LSP | 218 | 0 | 109 |
| decoration apostrophe spill over code (files / chars) | 13 / 9,839 | 20 / 12,641 | 25 / 45,546 |
| TextMate comment scope over live code | 1 file | 0 | 1 file |
| bare valences unpainted by LSP / TextMate | 32 / 21 of 117 | 5 / 5 of 5 | 31 / 26 of 36 |

Some hazards exist but have no instances today:
- **Apposition bodies:** 0 painted as code. All 447 current bodies are plain words.
- **Prose fallback:** canon 0 files, caches 1 (`decorations.spw`), agents 6.
- **Dialect preprocessing:** 0 files. But when `Spw.l`/`Spw.q` preprocessing does run, token spans stop mapping to raw bytes. In `dialect-offsets.mts`, token `a` reported offset 32, where the raw text holds a space. The LSP calls `parse(doc.text)` with `autoDialect` on (`server-index.ts:371`).

**A new capture found while prototyping** (`valence-capture.mts`). `mood: boon.honk` followed by the line `^bane["x"]{ z }` binds the next line's `^` as the value's Operation, carrying `boon.honk` (span L1-2). `bane[…]{…}` becomes a sibling. This is a fourth same-line-law hole, alongside syntax_breadth F5. A role stream exposes it: `^` gets painted as boon.honk. The regex layers hide it.

## 2. Role taxonomy: one stream, many disclosures

**Principle.** Glyphs carry kinds, and color may add only relations. This follows the plain-text-first canon, (a) `.spw/shelves.spw:33`, and Green & Petre's split between primary and secondary notation.

**What the grammar already carries visibly, with no color:**
- which operator (13 sigils)
- particle aim (`#>` `#:` `#!`)
- datum vs reading (`~#k:` vs `~#k(…)`)
- container kind (bracket shape: `[]{}()<>` `<<>>` `(())`)
- comment (`# `, `//`) and string

**Where the plain-text reading and the parser reading diverge.** Color cannot repair these; the grammar has to:
1. Bare valence words look like identifiers but are reserved lexemes (`matchers/modifiers.ts:18`). This is the cause of the `boon:` degradation (syntax_breadth F1).
2. `~>` and `=>` begin with sigil glyphs but are connectors.
3. `$%`, `##>` and `~<tag>"p"` look compound but parse otherwise.
4. Line breaks are sometimes boundaries and sometimes not (F5, plus the capture above).

**What color may legitimately add**, because it is derived and invisible by construction:
- which node a particle run binds to
- an operator's reach (its label and brackets)
- whether a reference resolves
- whether text reached the AST only as a prose fallback
- whether characters were dropped by the lexer (non-whitespace gaps)

**Proposed legend (c), prototyped and verified in `roles.mts`.** Roles are derived from tokens, then the AST, then `particleBindings`.

- **14 types**, each with a VS Code `superType` so older themes still resolve a color:
  - `sigil`→operator
  - `particle`→decorator (LSP 3.17)
  - `trait`→property
  - `apposition`→decorator
  - `container`→operator
  - `connector`→operator
  - `reference`→variable
  - `key`→property
  - `label`→macro
  - `valence`→modifier
  - `string`, `number`, `comment`
  - `prose`, which has no superType on purpose
- **29 modifiers, under the ~31-bit budget:**
  - 13 operator roles, using the canon reader names from `operators.spw:29-41`
  - `deixis`, `case`, `mood`
  - `root`, `path`, `fragment`
  - `open`, `close`
  - `boon`, `bane`, `bone`, `bonk`, `honk`
  - `declaration`, `bound`, `degraded`
- Add a 30th, `status`, once a claim-status mood vocabulary exists.

Verified output on a claim-ledger sample:
- `#:claim`=particle.case
- `!`=sigil.action.bound, with its brackets tagged `.action`
- `~"./sources.spw`=reference.path and `#src_survey"`=reference.fragment
- `~#lens(` head=apposition; body=string
- `?[n >= 3]{` gets `.degraded`

**Practice modes are filters over that one array, which is the canon's rule that "disclosure never renames identity"** (a) `representational-disclosure.spw:45,108`, and it respects the invariant against a second editor-only semantics stack (`vscode-spw.spw:108`). Verified token counts on the sample:

| mode | keep predicate | tokens |
|---|---|---|
| full | everything | 56 |
| plain_text | nothing | 0 |
| aims | `particle` or `bound` | 10 |
| one operator (wonder) | modifier `wonder` | 5 (the sigil plus its brackets) |
| valence | any valence modifier | 4 |
| structure | containers, connectors, `degraded` | 24 |
| honesty | `degraded` or `prose` | 0 on clean files |
| reveal-on-hover | nothing painted; hover reads the same array | — |

**VS Code caveat, from the Semantic Highlight Guide.** Where no semantic token is emitted, TextMate coloring shows, and an unmatched semantic type falls back through the scope map. So "emit nothing" gives TextMate colors, not monochrome. A real plain-text mode needs one of two things: a TextMate grammar cut down to a lexical floor (comments and strings), or a `plain` type mapped to foreground.

## 3. Research, and what an honest practice-mode claim would be

**The evidence for highlighting itself is weak and depends on expertise.**
- Sarkar (PPIG 2015): n=10, eye tracking, within-subjects. Highlighting shortened task time, with fewer context switches, and the effect weakened as experience grew.
- Hannebauer, Hesenius & Gruhn (EMSE 23(5), 2018): 390 novice Java students. They found no evidence that highlighting improves comprehension, and argue that it wastes a feedback channel.

**The learning-science mechanisms are real, but none was tested on notations like Spw.**
- Desirable difficulties (Bjork & Bjork 2011) help only when the learner can still succeed.
- The generation effect (Slamecka & Graf 1978) and retrieval practice (Roediger & Karpicke 2006) favor producing an answer, then getting feedback.
- Fading scaffolds (Renkl & Atkinson 2003) and the expertise reversal effect (Kalyuga et al. 2003) say the same support can help novices and hinder experts.
- The caution: making text harder to read on its own ("disfluency") failed replication. Meyer et al. (JEP:General 2015) pooled 17 experiments and found no effect.

**An honest claim.** Monochrome alone is disfluency, not practice. A practice mode should run a predict-then-reveal loop: remove one derived cue, ask the reader for the role, and show the parser's answer. The claim would read:

> "may strengthen recall of Spw roles and particle binding for readers past the novice stage; unmeasured for Spw"

Because roles come from the parser, accuracy per role can be logged, which turns the claim into a measurement.

## 4. Implications

**LSP.**
- The semantic-tokens handler should read the cached `doc.parseResult` and never re-parse.
- Timing (`timing.mts`, run under tsx on this machine, 5-run averages): on `mutation-flow-automata.spw` (702 lines), the regex handler takes 53 ms, lexing 107 ms, and parsing 2.6 s with the default event policy. With `eventPolicy:'none'` the parse takes 1.4 s. Walking roles and encoding costs about as much as the parse.
- **Optimization that applies with or without highlighting:** the default event policy is `'trace'` (`types/state.ts:72`, `lexer/lex.ts:14`). The LSP never reads `.events` (grep), yet `server-index.ts:371` keeps about 88k events for that file on every edit.
- Six other `parse(text)` calls use only `tokens` (`:392,:424,:485,:747,:816,:1117`). `lex()` would be about 15–25× cheaper there; check that the lex profile stays the same.
- Delta support (`resultId` plus an integer-array diff) is cheap. Range requests save little, because the full parse is needed anyway.
- Add `workspace/didChangeConfiguration` (it is missing, B12) and `workspace/semanticTokens/refresh` so modes can switch live.
- Add a `spw/roles` request (range → spans with particle name, bound span, canon operator name and dialect). Hover, decorations, JetBrains and the CLI can then all disclose from one source.

**VS Code.**
- Remove the regex passes in `surface-decorations.ts` (`:295-404`). Keep only what semantic tokens can't express, the overview-ruler lanes (anchors, degraded spans), and feed those from `spw/roles`.
- `:438-444` repeats the `setDecorations` calls from `:426-432`.
- Contribute `semanticTokenTypes` with `superType`, and `semanticTokenModifiers`.
- Add a `spw.practice.mode` setting with a status-bar toggle.

**JetBrains.**
- The JetBrains docs list `semanticTokens/full` support from **2024.2.2**. The plugin's `sinceBuild` is `242` (`build.gradle.kts:53`), so 2024.2.0 and 2024.2.1 are covered but can't paint roles.
- The descriptor sets no `lspCustomization` (`SpwLspServerSupportProvider.kt:128-143`).
- **Unverified:** how custom types and modifiers map to TextAttributesKeys, and whether platform defaults apply to a TextMate-backed file type. This needs a `runIde` smoke test.
- The TextMate copy has drifted from the VS Code grammar. Practice modes should therefore be filtered on the server, which works for every client.

## 5. Ranked implementation proposals

1. **Seed `canonical/roles.ts` (new, portable).**
   - Add `tokenRoles(out: ParseOutput, source): RoleSpan[]` plus `ROLE_TYPES` and `ROLE_MODIFIERS`, with an assertion of at most 31 modifiers. Port the logic from `roles.mts`.
   - Add a non-whitespace gap → `unlexed` span.
   - If `out.dialectPreprocessed` is set, fall back to token-only roles from `lex(source)`.
   - Export it from `src/index.ts`.
   - Tests in `roles.test.ts`:
     - `# a {b} 42` gives one comment span
     - `~#lens(it's 50% done)` gives only apposition + string
     - `a ~> b => c` gives connectors and no sigil
     - `x: boon.honk` gives two valence spans
     - particles followed by `!["x"]{}` mark `!` as `bound`
     - `?[n >= 3]{}` is `degraded`
     - `café: 1` gives an `unlexed` span at offset 3
     - `~<tag>"p"` gives no `reference.path`
     - `mood: boon.honk⏎^x{}` pins the current capture; flip this test when the same-line law lands
2. **LSP quick wins** (can ship before item 1):
   - `semantic-tokens.ts:122-125`: make `#`+whitespace consume to end of line as `comment`.
   - Classify `~>` and `=>` as `operator` before the `~` and `=` branches.
   - `server-index.ts:371`: pass `{eventPolicy:'diagnostics'}`.
   - Token-only sites: use `lex`.
   - Test: across a fixture corpus, no non-comment token falls inside a lexer COMMENT span.
3. **LSP `semanticTokens` from roles.**
   - Replace the legend with the one from item 1 and read `doc.parseResult`. Keep the regex path only when `parseResult` is null.
   - Add `resultId` and `full:{delta:true}`.
   - Rewrite the 53 existing tests as role expectations (`semantic-tokens.test.ts`).
4. **Practice modes on the server.**
   - Read `spw.practice.mode` via `didChangeConfiguration`, filter the role array, and send a refresh.
   - Add a hover "role card" as the first section of `display.ts`: type, aim, bound target line, canon operator name.
   - Add `spw/roles`.
   - Test: every mode's output is a subset of `full`, so the stream is filtered and never recomputed.
5. **VS Code.** Contribute types and modifiers, remove the regex decoration passes, feed ruler lanes from `spw/roles`, and add a mode toggle and a `spw.practice.predict` command (QuickPick the role at the cursor, then reveal).
6. **TextMate, one source and two copies.**
   - Treat inline `#(?=[ \t]|$)` as a comment.
   - Add a begin/end apposition rule whose body is a string.
   - Delete `/* */` (`:89`).
   - Put connector digraphs before sigils.
   - Add bare valence words.
   - Rename `.lens` to `.case`, keeping the old scope as a second scope.
   - Have Gradle `processResources` copy the grammar from `extensions/vscode-spw/syntaxes`, and add a diff test.
7. **JetBrains.** Decide the `sinceBuild` floor for semantic roles, add an `lspCustomization` color mapping, and run a `runIde` check. Several of these API details are unverified.
8. **CLI `spw practice <file> --axis aims|operators|valence`.** A terminal predict-then-reveal quiz scored against `tokenRoles`. It is plain-text-first and doubles as the evaluation harness for the claim in §3.

## 6. Open theory questions

1. **Bracket ownership.** Canon says `#` owns `[]` and `@` owns `()` (`vscode-spw.spw:109`). The prototype tags brackets with the prefix operator's role. Which "reach" should highlighting show?
2. **Connectors that start with a sigil glyph.** Do `~>` and `=>` carry the potential or configuration role as a modifier, or are they pure connectors? Readers will sound out the sigil either way.
3. **Valence visibility.** Should valence be sigil-marked, or allowed in key position, so that plain text can tell a charge from an identifier?
4. **Claim status.** Should it be a registered mood vocabulary (`#!contested`), or `status:` bindings painted with valence colors, which contradicts the charge-neutral canon?
5. **Where practice lives.** The `reading` axis (`syntax-profile-stack.spw:37`; `dialect/types.ts:54`) is resolved but only displayed (`display.ts:430`). Is practice a per-reader setting, a per-surface default, or both?
6. **Which names become the legend.** The legend becomes a contract that themes depend on. Should it use the canon reader names (`operators.spw:44`) or the code names (Subject for `.`, Integration for `^`)?
7. **One same-line law.** Should one rule cover the medial capsule, empty bindings, inline `# ` and the valence-only capture, so that line breaks read the same to the parser and to a reader sounding the text out?

**Sources**
- [Sarkar 2015, PPIG](https://ppig.org/files/2015-PPIG-26th-Sarkar1.pdf)
- [Hannebauer et al. 2018, EMSE](https://dl.acm.org/doi/10.1007/s10664-017-9579-0)
- [Kalyuga et al. 2003](https://www.scirp.org/reference/referencespapers?referenceid=747628)
- [Meyer et al. 2015](https://digitalcommons.chapman.edu/esi_pubs/96/)
- [JetBrains LSP API](https://plugins.jetbrains.com/docs/intellij/language-server-protocol.html)
- [VS Code Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
- Cited from memory, not re-checked: Bjork & Bjork 2011; Slamecka & Graf 1978; Roediger & Karpicke 2006; Renkl & Atkinson 2003; Green & Petre 1996.

Probe files are in <scratchpad>/tokens-ast/highlight/:
- tm.mts
- layers.mts
- corpus.mts
- roles.mts
- timing.mts
- valence-capture.mts
- dialect-offsets.mts
- errs.mts
- degraded.mts

### verification

## Verification of the tokens_roles report

The verification probes are in `<scratchpad>/tokens-ast/verify-roles2/`:
- `pct.mts`, `walk.mts`, `ev.mts`, `spill.mts`, `succ.mts`, `dq.mts`
- the sample files in `samples/01..14-*.spw`

I also re-ran the report's own probes: `layers.mts`, `corpus.mts` (all 786 files), `roles.mts`, `timing.mts`, `valence-capture.mts`, `dialect-offsets.mts`, `errs.mts` and `degraded.mts`.

### Material corrections (fix these before relying on the report)

1. **`TokenType` count.** There are **32** token types, not 31. `types/token.ts:40-71` holds 32 entries, `ERROR` included.

2. **Bracket ownership citation (open question 1).** The canon says "# owns [] and @ owns ()" at **`docs/theory/spw/apposition.spw:40`**. The cited `vscode-spw.spw:109` is a different invariant: root and landmark navigation is owned by the LSP.

3. **`"a⏎b"` is not a gap-dropping lexer error.**
   - The error is `string` (unterminated). The tokens are `STRING "a`, `IDENTIFIER b`, `STRING "`, and no characters are dropped into gaps.
   - VS Code TextMate paints it as one string across both lines. The LSP leaves it unpainted, and decorations mask it.
   - So it is not "painted as ordinary code". Only `t: -3` (gap `" -"`) and `café:` (gap `"é"`) fit that row.

4. **"A lexer error … shows up only in `gaps[].raw`" is imprecise.**
   - The error is also in `parse().errors`, e.g. `tokenize@3 "Unexpected character: é"`.
   - **New finding that strengthens the report:** `parse().success` stays `true` with lexer errors (checked with `succ.mts`). As a result:
     - The LSP publishes no diagnostic for them, because `handlers/analysis.ts:52` only reports when `!pr.success`.
     - `spw-syntax-validate.ts` passes them: `samples/11-neg`, `12-multiline-string` and `13-unicode` all show ✓ with 0 warnings.
   - So "no layer shows the error" holds for the diagnostics and the validator too.

5. **The `~<tag>"./x.spw"` row ("all three regex layers paint one navigable path unit").** This is true for TextMate and the LSP (`semantic-tokens.ts:190`). It is not true for decorations:
   - The decoration path regex `~(?:"…"|'…'|<[^>]+>)` (`surface-decorations.ts:280`) matches only `~<tag>` and hovers it as "Spw path ref".
   - The string itself is masked.
   - `layers.mts` misses this because its decoration port leaves out the path pass.

6. **The `a ~> b => c` row.**
   - VS Code TextMate paints `=>` correctly as `keyword.operator.arrow`. The `=`-as-configuration paint comes only from the LSP (`property.readonly`) and decorations (`constraint`).
   - TextMate paints `~` as `sigil.potential` and `>` as `angle.close`.

7. **Timing.**
   - Re-running `timing.mts` on `docs/theory/spw/mutation-flow-automata.spw` (701 lines) gave:

     | step | report | re-run |
     |---|---|---|
     | regex handler | 53 ms | **17 ms** |
     | `lex` (events none) | 107 ms | **48 ms** |
     | parse, default events | 2.6 s | **1.73 s** |
     | parse, `eventPolicy:'none'` | 1.4 s | **1.15 s** |
     | events retained | about 88k | 88,181 |

   - Absolute times depend on machine load. The ordering and the event cost hold.
   - "Walking roles and encoding costs about as much as the parse" is **wrong as worded**. Roles plus encode plus parse took 1.0–1.25 s against 1.0–1.7 s for the parse alone (`walk.mts`), so the walk and encode add a cost within noise.
   - The parse/lex ratio comes out at about 24× (events none) to 36× (trace), against the report's 15–25×.

8. **`?[n >= 3]{` gets `.degraded` (§2).**
   - Only `?`, `[`, `3` and `]` get `degraded`. The `{`/`}` body does not, because it parses as an `Expression` inside the `Prose`.
   - `n` and `>=` get no role at all: `roles.mts` has no case for `IDENTIFIER`, `COMPARISON`, `COLON` or `COMMA`.
   - This sample comes from the "prose fallback probe", not the claim-ledger sample.

9. **Proposed legend `superType`s.**
   - `valence`→`modifier`: `modifier` is an LSP type but **not** in VS Code's standard type list (the Semantic Highlight Guide lists 23 types, without `modifier`). Older themes would get no color from that `superType`.
   - `label`: VS Code **already has a standard `label` type**. A custom `label` with `superType: macro` collides with it, so it needs a new name such as `opLabel`.

10. **Corpus, caches column.** The re-run gives hash-prose **631** (report 630) and LSP paint inside **370** (report 369). Every other cell in the corpus table matches exactly.

11. **"Decoration apostrophe spill".** The counts match (13/9,839, 20/12,641, 25/45,546), but `spill.mts` attributes the spilled characters by the quote that opened them. The label "apostrophe" undercounts double quotes:

    | group | `'` | `"` | backtick |
    |---|---|---|---|
    | canon | ~58% | ~41% | ~2% |
    | caches | ~62% | ~38% | — |
    | agents | ~88% | ~11% | <1% |

12. **Meyer et al. 2015.** The source is real: JEP:General 144(2), e16–e30, the original study plus 16 replications (17 in all), no effect. Its scope is disfluent fonts on Cognitive Reflection Test math problems, not learning or recall. The report's generalisation to "making text harder to read" should be hedged.

13. **Roles prototype wart (not stated in the report).** In `x: boon.honk` the tight `.` is lexed as `OPERATOR(.)`, so the role stream paints it `sigil.ground`, even though it only joins a `ModifierChain`. Separately, `##>root` lexes to a `PARTICLE` token (`#>root`) while the AST holds a `ProseChunk`. A role stream built from tokens first would paint it as a particle unless the AST pass overrides that.

### Confirmed code claims (read and, where marked, re-run)

**Seed kernel**
- `kind` field at `token.ts:88`.
- `ERROR` is declared at `:71` and never emitted. A grep of seed src finds it only in `types/token.ts`.
- Gap classes `tight`/`open`/`cadence`/`episode` at `lexer/gaps.ts:11-17`. The `raw:"é"` and `raw:" → "` gaps were re-run.
- 28 `ASTNodeType`s at `types/ast/index.ts:13-41`.
- `aim` at `nodes.ts:315`; `AppositionLabel`/`Annotation` at `:284-297`.
- `particles.ts:1-13` (header) and `:82` (`particleBindings`).
- `modifiers.ts:18` (the reserved valence list).
- `comments.ts:4-6` (no block comments) and the hash-prose matcher around `:52-67`.
- Default `eventPolicy:'trace'` at `state.ts:72` and `lex.ts:14`.
- `retainsParseEvent` has a `'diagnostics'` policy, and `errors` survive under every policy (re-run).

**LSP**
- `semantic-tokens.ts` imports nothing from the seed (only types, at `:31`).
- Line-regex loop at `:105-413`; legend of 9 types and 6 modifiers at `:75-78`.
- Empty `# ` branch at `:122-125`; `#:` "lens" at `:216`; `~<label>"path"` unit at `:190`; `##>` at `:173`.
- `stdio-server.ts:227-231` advertises `full:true, range:false`, no delta.
- The server has no `didChangeConfiguration` handler. Note that the client already syncs `configurationSection:'spw'`, at `extension.ts:98`.
- `server-index.ts:371` calls `parse(doc.text)` with `autoDialect` on by default. The LSP never reads `.events`.
- Token-only `parse()` calls at `:392`, `:424`, `:485`, `:747`, `:816` and `:1117`; the last is a fallback.
- `semantic-tokens.test.ts` has 53 tests.
- `display.ts:430` shows `reading`. It is also echoed in `spw-probes.ts:444`, the CLI `profile` and `emit/axes`, but never changes behavior.

**VS Code extension**
- `extension.ts:110` sets `middleware: undefined`.
- `package.json:281` has only `semanticTokenScopes`; there are no `semanticTokenTypes` or `semanticTokenModifiers`.
- 23 color ids resolve to 13 distinct dark hex values (re-run), with exactly the listed collisions.
- Status tiers at `surface-decorations.ts:236-239` reuse the valence colors; `proposed` uses `phaseMeta`, not a valence color.
- Mask at `:89-109`; operator decorations at `:212-223`; braces including `<>` at `:316`.
- `:438-444` duplicates `:426-432` exactly.

**TextMate grammars**
- `:89` `comment.block`; `:380` `lens`; `:440` `open-question`; `:492` `sigil.schema`; `:476` integration; `:364` prompt-root anchor.
- The IntelliJ drift was diffed: no `dialect-exp`, no `(?<!\w)'` guard, no `=key:` rule, a different topic lookbehind, and a `keyword.operator` suffix. It also has extra header rules, and `=` is "assignment".

**IntelliJ plugin**
- `build.gradle.kts:53` sets `sinceBuild` to `242`.
- `SpwLspServerSupportProvider.kt:128-143` has no `lspCustomization`.

**Parser behavior on the report's samples (re-run with `v1.mts` and `layers.mts`)**
- inline `# ` → COMMENT
- `~#lens(it's 50% done)` → one APPOSITION token. TextMate and the LSP paint `50` as a number and `%` as `sigil.measure`/keyword; the IntelliJ grammar opens a `'` string; decorations mask from `'` onward.
- Bare valences are unpainted by every layer, and VS Code TextMate paints `^bane` as one integration label.
- `STREAM_OPEN`/`COMPARISON` get decoration `brace`.
- `~<tag>"…"` → `Op(~)` + Capsule + Literal.
- `##>root` → `Op(#)` + `ProseChunk`.
- `/* note { */` → Prose under a TextMate `comment.block`.
- `?[x >= 3]{}` → Prose under TextMate `open-question`.
- `#:dialect Spw.b` → VS Code TextMate `keyword.control.dialect`, IntelliJ `lens`, LSP `type.definition`.

**Probes**
- The valence capture is real: `^` binds as the value's Operation carrying `boon.honk`, spanning L1–2, and `bane[…]{…}` becomes a sibling.
- Dialect offset shift is real for **Spw.l and Spw.q only** (`dq.mts`), with token `a` at offset 32 over a space. No corpus files are preprocessed.
- Prose fallback: canon 0, caches 1 (`decorations.spw`), agents 6.
- 447 appositions, 0 painted as code.
- Corpus canon and agents columns, and 786 tracked files: every cell matches.
- `roles.mts`: 14 types, 29 modifiers. Mode counts are 56/0/10/5/4/24/0, and the claim-ledger tags match.

**Sample validation.** I recreated the 14 samples and ran `spw-syntax-validate.ts` on them: 14 pass, 3 warn. The warnings are "degraded" on `02-apposition`, `06-degraded` and `09-block-comment`. The three files with lexer errors pass silently, as described in correction 4.

### Confirmed canon claims (read)
- `.spw/shelves.spw:33`: "plain-text-first".
- `apposition.spw:43-47`: "taken raw to the matching paren", with the example `it's the root map, 50% done`.
- `representational-disclosure.spw:45` ("Disclosure never renames identity") and `:108`.
- `.spw/tooling/vscode-spw.spw:108`: no "second editor-only semantics stack".
- `operators.spw:29-41`: the reader names match `OP_ROLE` exactly; `:44` calls them "stable reader vocabulary".
- `docs/theory/spw/syntax-profile-stack.spw:37`: the `reading` axis; `dialect/types.ts:54`.
- `valence-architecture.spw:38-39`: "charge-neutral". These lines are `# ` comment prose.
- The code names in open question 6 are real: `.` = Subject and `^` = Integration in `packages/spw-runtime/src/state/type-affinities.ts:20,27`. TextMate, however, uses "subject" for `&`.

### Research citations
- **Sarkar 2015 (PPIG): CONFIRMED** from the PDF text. n=10, eye tracker, randomised within-subjects. Task time was lower (WSRT p=0.047, median difference 8.4 s). There were fewer context switches (T=13.5, p=0.045). There was no significant effect on fixation counts or durations. The effect weakened with experience.
- **Hannebauer, Hesenius & Gruhn: CONFIRMED.** EMSE vol. 23, pp. 2795–2828, October 2018; I inferred the issue number (5) from the date. 390 undergraduates in an introductory Java course; no evidence that highlighting helps; "squanders a feedback channel".
- **Kalyuga et al. 2003: CONFIRMED.** Educational Psychologist 38(1), 23–31. The linked scirp page is a reference listing only.
- **Renkl & Atkinson 2003: CONFIRMED.** Educational Psychologist 38, 15–22.
- **Meyer et al. 2015: CONFIRMED with a scope correction** (see correction 12).
- **JetBrains LSP docs: CONFIRMED.** `semanticTokens/full` is listed from [2024.2.2], and `LspCustomization` exists.
- **VS Code guide: CONFIRMED.** Semantic highlighting is "an addition to syntax highlighting", the scope-map fallback exists, and `decorator`/`macro`/`label` are standard types. `modifier` is not (see correction 9).
- **Bjork & Bjork 2011, Slamecka & Graf 1978, Roediger & Karpicke 2006, Green & Petre 1996:** I didn't web-check these. They look correct from my own knowledge, but I couldn't confirm them here.

### Unverifiable here
- "A decoration color wins over a semantic token, which wins over TextMate." This is consistent with how VS Code behaves, but I found no documentation stating it.
- How JetBrains maps custom semantic token types to TextAttributesKeys, and whether TextMate-backed file types apply platform defaults. The report already flags this; it needs a `runIde` smoke test.
- The TextMate results come from the JS-regex simulator in `tm.mts`, not Oniguruma, so they are approximate.

---

## ast_transforms

I've verified all of this against scratch files. Now the report.

# Tokens and AST as a transform algebra: expand, comprehend, reduce, transform, project, with arcs and reader overlays

**Short answer.** The seed can already find things on the tree and keep their source spans: particle binding, fragments, bias edges, queries and semantic edits. It cannot *produce* a tree. There is no AST or ONF printer back to Spw text, ONF drops spans, and `expand` and `emit` work on text with regexes. So the algebra should use two carriers:
- **`Projection { text, segments }`** for views. Every byte either maps back to a source file and offset, or is marked as synthetic.
- **`SemanticPlan`** for writes.

The AST is only ever rebuilt by re-parsing. Everything the designer asked for can be written in Spw today without new sigils: comprehension, one-breath "say it" lines, arcs of beats, and personal reader overlays. The notation below parses, but the seed does not yet act on these forms, and three bugs would undermine them first (§5 P1–P3).

Tags: **(a)** canon, **(b)** code, **(c)** aspirational. Scratch files are in `<scratchpad>/tokens-ast/xforms/`:
- corpora: `c/` (tide, basin) and `n/` (wheel, arc2, sam, glyphs, beats, xform)
- probes: `inv.mts`, `check.mts`, `proto.mts`, `spanmap.mts`, `time2.mts`, `chunk.mts`

The repo was not modified.

## 1. Inventory of AST-level operations (b)

| op | seam | in → out | spans kept? | round-trip | verified on scratch |
|---|---|---|---|---|---|
| particle binding | `canonical/particles.ts:63-104` | AST → `{particle, bound}` | yes (`bound` is a live node) | read-only | `#>wonder_tide_1` → `?[…]{}` Expression L21 |
| deixis / fragment | `particles.ts:148-156`, `resolve-fragment.ts:24-31` | AST × name → binding + `available` | yes | read-only | resolves; `available` = `tide,tide_claim,wonder_tide_1` |
| bias edge | `read-bias.ts:102-117` | Operation(`=`) → `{anchor, axis, targets, sign}` | no (values only) | read-only | anchor, axis, ranked fragment targets all read |
| ONF | `normalize.ts:126`, `normalize-construction.ts:12-37` | AST → `{sigil, args, frames}` | **no**: 40 nodes, 0 offsets; only `reg=construction` frames carry spans (`types/ast/onf.ts:20-26`) | none; canon lists `surface→ONF→expand→surface` as *proposed* (`onf.spw:90,98`) (a) | yes |
| value projection | `projectONFForValue` (`normalize-construction.ts:58`) | ONF → ONF + loss receipt | receipt spans only | n/a | 0 omissions on tide |
| query | `query/spwq.ts:27`, `selector-expr.ts:558` | AST × selector → matches | yes | read-only | `$?[_]`, `$~"_"`, `$=` work; `$#>_` throws (gap listed at `selector-expr.ts:18-24`) |
| semantic edit | `semantic-edit.ts:121,280` | source × rules → `SemanticPlan` (edits, conflicts, withheld) | yes (byte ranges) | converges | anchor rename = 1 edit, 181-193 |
| corpus refactor | `spw-cli/src/refactor.ts` | corpus → plan | yes | **fragment refs not followed**, see F6 | — |
| mutation / pulse | `mutation-automata.ts:506` | source → source + differential | edits | hash-checked | `hygiene` profile: 1 step |
| range transform | `range-transform.ts:192,252` | source × `#:L14-L18` → `RangePlan` | yes | `writeSafe` | indent plan with 1 edit |
| OT fold | `operational-transform.ts:58,131` | edits × edits → rebased edits | offsets | overlap = conflict (`operational-transform.spw:31`) (a) | — |
| form / operator ladders | `form-ladders.ts:709,863`; `form-sequence.ts:241` | op → catalog of surfaces; surface string → surface string | none | text only | `?` ladder has 6 steps, all parse; `advanceFormSurface('{&}','select')` = `{&[moon, basin]}` |
| composition | `composition-forms.ts:334,370` | source → silhouette card | none | — | `?{ ask } ~<answer>` → `act_consequence` |
| expand | `spw-cli/src/expand.ts:46-98` | file → text with blocks spliced in | **no map** | projection; source untouched | see F2 |
| template fill | `spw-cli/src/emit/template-fill.ts:85` | text × bindings → text | none | — | see F7 |
| emit extract | `spw-cli/src/emit/extract.ts:28` | text → slots/traits (regex) | none | lossy | see F3 |
| formatter | `canonical/canonicalize.ts:450` | text → text | none | idempotent | `pretty` profile: 568 → 573 bytes |

## 2. Findings

**F1. Finding and writing are split by carrier. (b)**
- Tree operations keep spans. ONF drops them.
- The only ONF printer is a debug dump (`spw-runtime/src/pipeline/stages.ts:440`).
- So every write today is a `SourceEdit`, and every view is text. That is a sound stance ("the edge IS the canonical fold", `expand.ts:8-10`). The algebra should formalize it, not fight it.

**F2. `expand`'s provenance sits at liminality level 0.** (Level 0 is the bottom of the apposition canon's ladder: "inert text, present in the file and absent from the AST".)
- Provenance is written as a `#` comment, `<<  # ⟵ ~"…"` (`expand.ts:79`).
- Parsing the expanded tide file: the spliced-in Stream has 1 step and **no PathRef**. The transcluded fragment also loses its own `#>` anchor, because the slice starts at `bound.span`.
- Canon's ladder puts this at level 0, "inert text… absent from the AST" (`apposition.spw:70-78`) (a).

**F3. Reduction drops the wonder.**
- `spw emit fields tide.spw` keeps only `gist` and `statement`.
- It loses the `?["…"]` question, `~#lens(…)`, `~#source(…)` and `!probe`. `lenses: []`, because it only reads `lenses: [#x]` (`extract.ts:25-26`).

**F4. Ladder "transforms" work on strings.**
- Ladders are catalogs with parse probes.
- `advanceFormSurface` rewrites a surface string. No operation moves a *node* one ladder step.

**F5. Spans are wrong under Spw.l/q preprocessing and desugar.**
- `applyDialectPreprocess` collapses newlines (`dialect/detect.ts:116-125`, called at `parser/products.ts:213`).
- Result: `?` is reported at L1, offset 30, but it is really at L6, offset 33. `autoDialect:false` gives the correct L6.
- `desugar` (`normalize.ts:17`) changes length from 29 to 34 bytes and keeps no offset map.
- Any hover or code action on an l/q file would therefore land on the wrong text.

**F6. Anchor rename orphans fragment refs.**
- `spw refactor c n --rename anchor:wonder_tide_1=…` plans exactly 1 edit.
- Three `~"…#wonder_tide_1"` refs in `arc2.spw`, `sam.spw` and `arc.spw` would dangle.
- Reader overlays keyed by anchor would lose their target silently.

**F7. Holes: defaults, and where holes are visible.**
- Defaults apply per occurrence (`template-fill.ts:100-128`). In `${lens=living system}` followed by `~#lens(${lens})`, the first gets the default and the second is reported open.
- In value position, `$lens` parses as `Operation($ label=lens)` and `${lens=d}` as `Operation($ body)`, so the tree can see them. `$` is "substrate", which fits holes.
- Inside strings and apposition bodies, holes are text only.
- `#!$depth` splits into separate nodes, so particle names cannot be holes.

**F8. `readBias` silently drops targets that are not scalars.**
- `=~"…#tpl"[comprehend]{ #[a ; b] ; #[c ; d] }` gives `targets: []` (`read-bias.ts:55-96`).
- `@wheel.lens` refs are kept, but `@` names are file-local.
- So generators have to be addressed by fragment.

**F9. Parsing is expensive, and the LSP re-parses everything.**
- Warm, in-process under tsx, a 49-file canon sample gave: median 314 ms for 74 lines, p90 1.37 s. `mutation-flow-automata.spw` (702 lines) takes about 1.5–2.3 s.
- The LSP uses full sync (`stdio-server.ts:210`) and runs a whole parse on every change (`server-index.ts:371`).
- Chunking at blank lines would be about 10× cheaper per edit on `mutation-flow-automata.spw` (122 ms worst chunk against 1.46 s whole). But it is **not equivalent**:
  - Particle runs bind *across* blank lines (tide's header binds to `^["card"]`).
  - One chunk of `dusk-oak.spw` alone takes 1.9 s, which points to backtracking.

**F10. Unused hooks already in the code.**
- The stack's `reading` axis (`dialect/types.ts:54`: author|prompt|research|creative) is resolved and printed (`spw-cli/src/profile.ts:99`), but nothing acts on it.
- There is a granularity ladder `skim|card|field|full` (`ir/granularity.ts:14`).
- `dream-schedule.ts` (beat-weighted phases) has no importer outside the canonical index and one test.

## 3. A typed transform algebra for the seed

**Carriers (c; the parts have been prototyped):**
```ts
type Address = { uri: string; fragment?: string }                      // ~"file#anchor"
type Segment = { at: number; len: number; kind: 'source'|'transclusion'|'generated'|'frame';
                 origin?: { uri: string; offset: number } }              // synthetic bytes have no origin
interface Projection { text: string; segments: Segment[]; receipts: Receipt[] }   // AST = parse(text)
interface Resolver { load(uri): { source: string; ast: ASTNode; hash: string }
                     pole(from: string, value: string): { uri; bound: ASTNode|null; available: string[] } }

expand(site: BiasSite, r: Resolver, o?: { depth: number }): Projection
comprehend(edge: BiasEdge /* axis=comprehend */, r: Resolver): Array<{ tuple: Record<string,string>; view: Projection; ok: boolean }>
reduce(node: ASTNode, reducer: 'say'|'card'|'brief'|'mass', ctx: { overlays: Reading[] }): { line: string; from: Origin[] }
transform(node: ASTNode, step: LadderStep | SemanticRule, ceiling: EffectGrade): SemanticPlan
project(node: ASTNode, lens: { overlays: Reading[]; grain: GranularityDepth; reading: ReadingProfileId }): Projection
```

**Laws. Each is testable, and most are already shown on scratch.**
- **L1.** The source is the fold. Views never write. `--write` emits only derived surfaces (`derivedSurfaceName`).
- **L2.** Every projected byte has a segment.
  - Prototype: `spanmap.mts` maps projection offset 636 to `basin.spw:94`, and the text there reads "A basin near".
  - The projection parses with 0 errors.
- **L3.** Provenance is visible in the AST. The prototype frames each block as `<< ~"src#a" ~#(transcluded) ; … >>`, which gives a PathRef plus an anonymous apposition. That meets canon's rule that "an apposition earns the form only if a selector finds it" (`apposition.spw:17`) (a).
- **L4.** `reduce` returns an authored `~#say(…)` unchanged, so it is idempotent on authored lines.
- **L5.** `comprehend` yields ∏|disc| tuples, all of which parse. Discs are taken in ranked target order. Unbound holes are reported, never guessed.
- **L6.** `transform` returns a `SemanticPlan`: edits, conflicts and withheld rules under an effect ceiling. It never returns trees.
- **L7.** `project` merges overlays by anchor without touching canon. The prototype confirms canon bytes are unchanged.
- **L8.** Operations refuse to run on a parse whose spans do not map to the source (F5).

**Written in Spw.** Every form below passes `spw-syntax-validate` and has 0 `parse().errors`. Structure was checked with `check.mts`.

| verb | notation | parses as |
|---|---|---|
| expand | `=ref{ ~"./basin.spw#basin_resonance" }` | bias edge (already exists) |
| comprehend | `=~"./wheel.spw#wonder_tpl"[comprehend]{ ~"./wheel.spw#lens_disc" ; ~"./wheel.spw#era_disc" }`, with discs `#>lens_disc` `lens: #[ecological_zone ; molecular_binding ; formal_structure]` | `readBias` → anchor = template fragment, axis `comprehend`, ranked disc targets |
| hole | `lens: $lens`, `${lens=living_system}`; `$lens` inside `"…"` and `~#lens(…)` | `Op($)`, visible in the tree; text holes in strings |
| reduce (authored) | `~#say(the tide, seen as $lens)` | named apposition, meaning "a reading that recurs, so it earns a key" (`apposition.spw:24`) (a) |
| transform | `!step[wrap]{ ~"…#tide_claim" }`, `![indent]{ ~"doc.spw#:L12-L18" }` | `Op(! label frame body)`. Canon's own `~"doc.spw"#:L12-L28` (`range-transform.spw:83`) parses as a PathRef plus a sibling **case particle `#:L12-L28` bound to null** (a≠b) |
| project | `=~"../c/tide.spw#wonder_tide_1"[reading]{ ~"./sam.spw#sam_tide_1" }`; `@sam{ ~"…" }` | overlay edge; a Reference with a body ("sam's hold") |
| arc | `<< ?["wonder first"]{ ~"…#wonder_tide_1" } ; ~["let it hang"]{ … } ; %["how much"]{ … } \|\| @["whose view"]{ … } ; ^["say it whole"]{ … } >>` | Stream of `Op(glyph frame body)`; `Sequence.separators` keeps `;` and `\|\|` |

Hazards found while choosing the notation:
- The `G["cue"]{ target }` beat form is uniform across all 12 glyphs (`glyphs.spw`). `=` is excluded because it would become a bias edge.
- `?~"x"`, `~~"x"` and `%~"x"` split into sibling steps. Only `^~"x"` takes the path as its subject.
- `?(~"x")` makes the scope the *subject*, but `%(~"x")` and `@(sam){}` attach it as an Expression postfix. These are inconsistent.

**Comprehension, run.** `comprehend(wheel.spw)` produced 9 nodes, and all 9 parse. Each carries an origin of `comprehend ecological_zone×newton → wheel.spw L16`.

Composing `reduce ∘ comprehend` exposed something useful. All three `era` tuples reduced to the same line ("the tide, seen as ecological zone"), because the template's `~#say` never uses `$era`. Colliding reductions show which disc a given view actually depends on. That can become a lint: "this generator axis is invisible in the say view".

This is Llull's rotating-disc (volvelle) combinatorics, with ranked targets giving the rotation order. The product explodes quickly (715 wonder blocks exist in the non-cache canon), so `comprehend` should support sampling and a budget, not just exhaustive listing.

## 4. Subvocalization, arcs, overlays

**Say lines.** `reduce(node,'say')` looks for sources in this order:
1. the reader's overlay `~#say`
2. canon's `~#say`
3. a computed line: the question text, plus "through ⟨lens⟩", plus the mood

Prototype results:
- `wonder_tide_1` → "Where does the two-bulge picture stop being enough? through ecological zone (computational)" (12 words, drawn from `?[q]@L21` and `~#lens@L23`).
- With Sam's overlay → "the moon pulls twice, and the basin answers once".

A reduction is just a string plus its origin spans, so it is plain text first (`.spw/shelves.spw:33`) (a). It works as ghost text, a hover, or terminal output, **with or without syntax color**. That is the concrete lever for the designer's "with/without highlighting" practice question. A no-color practice mode could turn semantic tokens off and put meaning into say lines and beat cues, so that attention runs through words instead of hue.

Research on this, hedged:
- Studies of syntax highlighting report small or no comprehension effects (as I recall: Hannebauer, Hesenius & Gruhn 2018, *Empirical Software Engineering*, novices; Sarkar 2015, PPIG).
- Inner speech is linked to reading comprehension (Rayner et al. 2016, *Psychological Science in the Public Interest*; Alderson-Day & Fernyhough 2015, *Psychological Bulletin*).
- None of this validates Spw-specific claims. Treat these as starting points to check before any of them goes into canon.

**Arcs.**
- An arc is a Stream of beats. The glyph sets the mode of attention, the frame holds the spoken cue, and the body holds the target.
- Canon's flow schedule `<< ~ ; ? ; % ; ! ; * ; ^ >>` (`flow-protocol-sigils.spw:33,102`) (a) can serve as the default arc template: hold → wonder → measure → act → value → integrate.
- Reading `?` as opening an information gap and `!`/`^` as closing it follows Loewenstein's (1994) information-gap account of curiosity. That mapping is (c), interpretive.
- `||` offers a choice.
- A loop means re-entering the Stream. Looper canon is literally "the rAF loop replays the entire gain chain" (`looper-architecture.spw:119-120`) (a).
- Phasor layers (syntactic, semantic, pragmatic; `phasor.spw:12-34`) could be a third cursor coordinate (c).
- Prototype `arcBeats(arc2.spw)`: 5 beats, all targets resolve, and `then: ||` is recorded on beat 2.
- Proposed cursor type: `ArcCursor { arc: Address; beat: number; branch?: number; phase? }`. It is per-viewer state and never canon.
- `spw beat` (`spw-cli/src/beat.ts`, pure ticks) can drive it: `spw arc play --every 4000` prints one beat and one say line per tick.

**Overlays.**
- An overlay file is `#:overlay #!personal` plus `[reading]`-axis bias edges anchored at canon fragments, with targets in the overlay itself.
- `mergeOverlays` builds `Map<uri#anchor, Reading[]>`. Verified: 2 anchors, canon unchanged.
- A dangling overlay is reported *in the overlay*, with `available` suggestions from `resolveFragment`.
- This depends on fixing F6 first.

## 5. Implications: LSP, plugins, CLI

**LSP (b = exists today; c = proposed)**
- **Custom requests:** `spw/expand`, `spw/reduce`, `spw/comprehend`, `spw/arc` and `spw/overlays` (c). Each returns a `Projection` or plan carrying segments.
- **Hover** on a fragment ref or bias edge: say line plus the first N lines of the bound node, with a "from" link built from segments.
- **Inlay hint:** a say-line ghost after `?["…"]{`, off by default.
  - The existing lens part of the wonder hint is dead code (`display.ts:249`; lens_lsp F5).
- **Code actions:**
  - "Insert `~#say(…)`" (a SemanticRewrite).
  - "Preview comprehension (9)".
  - "Move reading to my overlay": a cross-file WorkspaceEdit (delete in canon, append in overlay).
- **Code lens:** "▸ beat 2/5 · ~ let it hang".
  - Today every lens has `command: ''` (`display.ts:1085-1194`) and the server advertises no `executeCommandProvider` (`stdio-server.ts:209-245`).
  - Add `workspace/executeCommand` plus `window/showDocument`. That is the only portable route for JetBrains, whose native client calls none of the `spw/*` methods.
- **Configuration:** `spw.reader.overlays` needs `workspace/didChangeConfiguration`, which the server does not handle (plugin_theory B12).
- **Incremental reparse:** cache parses by `contentHash`, since transforms parse their targets. Re-parse at top-level granularity only at boundaries that do not split a particle run (F9). Refuse transforms on l/q parses until F5 is fixed.

**VS Code**
- Add a `spw-view:` TextDocumentContentProvider for projections. It gives read-only views and replaces the untitled-dirty-tab behaviour (plugin_theory B3).
- Add DocumentLinks from segments back to origins.
- Add an Arc tree view, or children in the concepts view.
- Show the current beat cue in the existing context strip.
- Add keybindings for next and previous beat; there are 0 keybindings today.

**JetBrains:** everything above through standard LSP only.

**CLI**
- `spw expand --map` (JSON segments)
- `spw reduce <file#anchor> [--overlay dir]`
- `spw comprehend <file> [--sample N]`
- `spw arc <file#arc> [--step i | play --every ms]`

## Ranked implementation proposals

1. **Span-mapped expand with AST-visible provenance.**
   - New `packages/spw-seed/src/canonical/projection.ts`: `projectBias(source, sites, resolver)` → `Projection`. `spw-cli/src/expand.ts:46-98` delegates to it, and the stream head becomes `~"…" ~#(transcluded)`.
   - Tests:
     - A projection offset inside a transcluded block maps to its origin, and the origin text matches.
     - The expanded output has a PathRef inside each Stream.
     - Cycle and depth frames are marked `frame`.
2. **Offset map for dialect preprocessing.**
   - `detect.ts:116` `applyDialectPreprocess` returns `{text, map}`, and `parser/products.ts:213` remaps spans. Until then, the LSP parses with `autoDialect:false`.
   - Test: the Spw.l fixture reports `?` at L6, offset 33.
3. **Anchor rename follows fragments.**
   - `semantic-edit.ts`: add `renameAnchorRefs(targetUri, from, to)`, which selects PathRefs whose resolved `path#from` equals the target. `refactor.ts` emits both rules for `anchor:`.
   - Test: the scratch corpus goes from 1 edit to 4 edits, with 0 danglers after `--write`.
4. **A `reduce` module.**
   - `canonical/reduce.ts`: `reduceSay` and `reduceCard`, using the say-line precedence from §4 and returning `from` spans. `emit/extract.ts` reads wonder text and appositions from the AST.
   - Tests:
     - An authored `~#say` is idempotent.
     - An overlay line wins.
     - The tide line equals the golden.
     - `emit fields` keeps `lens`.
5. **Overlays.**
   - `canonical/overlay.ts`: `readOverlays(asts)` → `Map<Address, Reading[]>`, plus diagnostics for dangling anchors.
   - LSP: config key and `didChangeConfiguration`.
   - Tests: canon bytes are unchanged, and a dangling overlay anchor is reported with suggestions.
6. **Arcs.**
   - `canonical/arc.ts`: `readArc(stream)` → `Beat[]` and `stepArc(cursor)`.
   - LSP: code lens plus `executeCommand`. CLI: `spw arc`.
   - Tests:
     - `glyphs.spw` gives 12 uniform beats.
     - `||` creates a branch.
     - An `=` beat is rejected with a reason.
7. **Comprehend.**
   - `canonical/comprehend.ts` (reads the axis `comprehend`) and `liftHoles(ast)`, which yields the `Op($)` hole nodes.
   - Fix per-slot defaults in `template-fill.ts:100-128`.
   - Tests:
     - The wheel yields 9 nodes, all of which parse, in rotation order.
     - An unbound `$foo` is reported.
     - The reduction-collision lint fires on `era`.
8. **`readBias` set targets.**
   - Add `kind:'set'` with `values` in `termScalar` (`read-bias.ts:55`), so `{ #[a;b] }` is no longer silently dropped.
   - Test: 2 set targets are read.
9. **Parse performance.**
   - A cache keyed by `contentHash` in `server-index.ts:371`.
   - Top-level incremental re-parse that respects particle runs.
   - A profiling probe on `docs/theory/spw/scenes/dusk-oak.spw`.
   - Test: chunked and whole parses give equivalent top-level node sequences.
10. **Selector gaps.**
    - `$#>name` and `$~#name` in `selector-expr.ts` (listed at :18-24), so overlays, appositions and arcs can be addressed by `Spw.q`.

## Open theory questions

1. Is a say line a *reading* (an apposition, authored and personal) or a *product* (derived, cacheable)? Representational-disclosure says "disclosure never renames identity" (`representational-disclosure.spw:44-45`). Should computed say lines ever be written back?
2. **Glyph as attention mode.** Operator names differ across the canon, `form-ladders.ts` and `geometry-inspect.ts` (theory_state F1). Which naming does an arc beat inherit? Should an `=` beat be allowed at all?
3. Should `?`, `~` and `%` take a PathRef subject the way `^~"x"` does? And should `?(x)` and `%(x)` attach their scopes the same way?
4. Is `comprehend` a consumer verb on a verb-neutral bias edge (the current design), or a new product? Do ranked targets mean the outer disc or the inner one?
5. Overlays are authored but personal. Which retention plane or clock do they live on (`cache-field.spw`)? Is `#:overlay` a new case, and is `[reading]` a new stance cell in the lattice?
6. Does the arc cursor belong in an overlay file (durable and shareable) or in LSP memory (ephemeral)? And does a loop re-enter at beat 0 or at the phasor's current phase?
7. Should canon's range notation `~"doc.spw"#:L12-L28` be made to parse, or be rewritten with the fragment inside the quotes?
8. Should the `reading` stack axis (author|prompt|research|creative) choose the default reducer: card, brief, claim or say?

### verification

# Verification: ast_transforms report

I re-ran the claims on 2026-10-01. My probes are in `<scratchpad>/tokens-ast/xforms/verify2/` (`refs.mts`, `subj.mts`, `range.mts`, `tide.exp.txt`). I also re-ran the report's own probes: `inv.mts`, `check.mts`, `proto.mts`, `spanmap.mts`, `time2.mts`, `chunk.mts`, `ladder.mts`, `set.mts`, `holes.mts`, `span.mts`, `more.mts`, plus `verify/scope.mts`, `verify/misc.mts`, `verify/chunk3.mts` and `verify/qpath.mts`.

## Spw samples
- **CONFIRMED.** `spw-syntax-validate` on `c/*.spw` and `n/*.spw` reports "9 files 9 passed". Every file has 0 `parse().errors`.

## §1 inventory and code citations
- **CONFIRMED: particle binding and fragments.**
  - `particles.ts:63-104` (`bindItems` / `particleBindings`), `:148-156` (`deixisTable`), `resolve-fragment.ts:24-31`.
  - `#>wonder_tide_1` binds to the Expression at L21.
  - `available` is `tide,tide_claim,wonder_tide_1`.
- **CONFIRMED: `readBias`.** At `read-bias.ts:102-117`, with `termScalar` at `:55`.
- **CONFIRMED: ONF.**
  - `normalize.ts:126`, `normalize-construction.ts:12-37` and `:58`, `types/ast/onf.ts:20-26`.
  - Tide gives 40 ONF nodes and 0 offsets; `projectONFForValue` makes 0 omissions.
  - `onf.spw:90` and `:98` hold `round_trip_target = proposed`.
  - Both files live at `packages/spw-seed/src/`, not under `canonical/`.
- **CONFIRMED: queries.** `spwq.ts:27`, `selector-expr.ts:558`, gap list at `:18-24`. `$?[_]`, `$~"_"` and `$=` each match 1 node. `$#>_` throws `SelectorParseError`.
- **CONFIRMED: other function locations.**
  - `semantic-edit.ts:121/280`: the rename produces 1 edit at `181-193`.
  - `mutation-automata.ts:506`: the hygiene profile runs 1 step and includes the input and output hashes.
  - `range-transform.ts:192/252`: 1 edit, `writeSafe` true.
  - `operational-transform.ts:58/131`; `operational-transform.spw:31` holds the "Overlap is conflict" law.
  - `form-ladders.ts:709/863`: the `?` ladder has 6 steps and all parse.
  - `form-sequence.ts:241`: `advanceFormSurface('{&}','select')` returns `{&[moon, basin]}`, but only because the probe passed `arms:['moon','basin']` in.
  - `composition-forms.ts:334/370`: `act_consequence`.
  - `canonicalize.ts:450`: 568 → 573 bytes, and a second pass gives 573 again, so it is idempotent.
  - `template-fill.ts:85`, `emit/extract.ts:28` with the regexes at `:25-26`.
- **CONFIRMED: no printer back to Spw text.** The only printers are debug dumps: `onfToSpw` at `stages.ts:440` and `printAST` at `parser/trace.ts:87`.
- **CORRECTED: "expand and emit work on text with regexes."**
  - Only emit uses regexes.
  - `expand` finds its sites through the AST: `biasSites` calls `spwq.fromSource` and `readBias` (`bias-edges.ts:26-41`). It resolves fragments with `parse` and `resolveFragment` (`expand.ts:89`).
  - Only the splice step works on text, by line (`expand.ts:56-66`).

## §2 findings
- **F1 CONFIRMED.**
- **F2 CONFIRMED.**
  - `expand.ts:79` and `:8-10`; `apposition.spw:70-78`.
  - The re-expanded tide parses with 0 errors. The spliced Stream at L26 has 1 step. The only PathRef is the original at L25.
  - The deixis table is `tide,tide_claim,wonder_tide_1`, so `basin_resonance` has been dropped.
- **F3 CONFIRMED, one addition.** The slots are only `gist` and `statement`, and `lenses` is `[]`. The output also keeps `includes: ["./basin.spw#basin_resonance"]`.
- **F4 CONFIRMED.** `advanceFormSurface` takes a surface string.
- **F5 CONFIRMED, with three corrections.**
  - Confirmed: under Spw.l the `?` is reported at L1, offset 30. The true position is L6, offset 33. With `autoDialect:false` it is L6.
  - Confirmed: `detect.ts:116-126` and the call at `products.ts:213`.
  - Confirmed: `desugar` takes 29 bytes to 34.
  - Correction: `desugar` only runs in the runtime pipeline (`spw-runtime/src/pipeline/stages.ts:228`). Neither the seed `parse` nor the LSP calls it, so it cannot move LSP hovers.
  - Correction: the LSP calls `parse(doc.text)` with no path (`server-index.ts:371`). The shift therefore only hits files that declare the dialect in a header, such as `@dialect:Spw.l`.
  - Correction: files whose dialect is detected from their path parse as Spw.b in the LSP. This applies to `.spw/biome/ocean/query/q.spw` and `sel.spw`, which are Spw.q only when a path is given (`verify/qpath.mts`).
- **F6 CORRECTED.**
  - `spw refactor c n --rename anchor:wonder_tide_1=…` does plan exactly 1 edit, and `refactor.ts` has no PathRef or fragment handling.
  - But the scratch corpus has **7** AST PathRefs to `#wonder_tide_1`, not 3: arc.spw L10, arc2.spw L9, beats.spw L7 and L8, sam.spw L8, xform.spw L5 and L6 (`verify2/refs.mts`).
  - So proposal 3's test should go from 1 edit to **8** edits, not 4.
- **F7 CONFIRMED.**
  - Defaults apply per occurrence (`template-fill.ts:100-115`). In the probe the first `${lens}` got its default, `open` was `['lens']`, and the short `$name` pass (`:118-130`) never applies defaults.
  - `$lens` parses as `Op($ label=lens)` and `${lens=…}` as `Op($ body)`. `#!$depth` splits into separate nodes.
  - "`$` = substrate" matches `form-ladders.ts:494-499`, `normalize.ts:194` and `mutation-flow-automata.spw:83`. But `geometry-inspect.ts:66` names it `'select / address'`, which is the naming split theory_state F1 describes.
- **F8 CONFIRMED in part.**
  - Set targets give `targets: []`, and `@wheel.lens` and `@wheel.era` are kept as refs.
  - **CORRECTED:** "`@` names are file-local" is too loose.
    - Root scope combines the default roots, `shelves.spw`, `config.json` and the file's own declarations (linking.md F5, `helpers.ts:112-169`).
    - The real blockers are that `@` refs cannot carry a `#fragment` (linking F4, `references.ts:32-43`), and that a bare `@alias` with no `/` is never a link (`spw-selector.ts:180`).
- **F9 CORRECTED.**
  - Confirmed: full sync at `stdio-server.ts:210`, and a reparse at `server-index.ts:371`.
  - The LSP already skips reparsing when `contentHash` has not changed (`server-index.ts:259-264`, `336-338`). Proposal 9's "cache keyed by contentHash" therefore partly exists.
  - The LSP also calls `parse(text)` again in `loadShelves`, `loadTopology`, `loadEditing`, `extractSelectorDefs` and `parseProjectionGraph` (`:392`, `:424`, `:485`, `:747`, `:816`).
  - My rerun of `time2.mts` gave median 96 ms for 74 lines and p90 403 ms. The report says 314 ms and 1.37 s. The timings depend on machine load, and the 49-file sample includes `.agents/plans` surfaces, so it is not only "canon".
  - The script has no per-file warmup, so "warm" only means the process was warm.
  - `mutation-flow-automata.spw` is 701 lines and takes 1.49–1.53 s whole. Its worst chunk takes 81–165 ms. Neither the ~10× speedup nor the claim that chunking is not equivalent changes: top-level counts are 49 vs 64 and 21 vs 27.
  - A `dusk-oak` chunk takes 1.27–1.79 s, which is slower than the whole file at 0.9–1.2 s. Backtracking is a plausible cause, but nobody showed it.
- **F10 CONFIRMED, with additions.**
  - `dialect/types.ts:54`, `profile.ts:99`, `ir/granularity.ts:14`.
  - The `reading` axis is also shown in the LSP (`display.ts:430`, `spw-probes.ts:444`), but no code acts on it.
  - `dream-schedule` is imported only by `canonical/index.ts:568-578` and `form-sequence.test.ts`.

## §3 laws and notation
- **CONFIRMED: L2.** Projection offset 636 maps to `basin.spw` and the text there reads "A basin near". That 94 is a byte **offset**, not line 94; basin.spw has 9 lines. The projection parses with 0 errors.
- **L3 PLAUSIBLE.**
  - `scanAppositions` finds the PathRef at L26 and the `(anon):transcluded` apposition.
  - But a Spw.q selector cannot select `$~#…` yet (`selector-expr.ts:21`). So "a selector finds it" only holds if you count the scanner as an instrument, which is how the goal at `apposition.spw:16` is phrased.
- **L7 CONFIRMED but weak.** The "canon bytes unchanged" check compares the file with a cached copy of itself, so it cannot fail.
- **CONFIRMED: notation table.**
  - Comprehend: `readBias` gives anchor `wonder_tpl`, axis `comprehend` and targets `[lens_disc, era_disc]`.
  - Sam's overlay edges have axis `reading`.
  - The `@sam{}` form is a Reference with a body.
  - `!step[wrap]` gives `Op(! label frame body)`.
  - arc2 is a Stream of 5 `Op(glyph frame body)` with separators `; ; || ;`.
  - glyphs.spw has 12 distinct glyphs, each `Op(G frame body)`.
  - `=["b"]{…}` reads as a bias edge with axis "b".
- **CORRECTED: canon range notation.**
  - `~"doc.spw"#:L12-L28` gives a PathRef plus a detached `#:L12-L28` particle.
  - That particle binds to null only when it is the last item. Otherwise it binds to the **next** item (`^"next"{…}` in `verify2/range.mts`), so it silently marks an unrelated node.
  - Canon does not claim this notation parses. `range-transform.spw:79` marks it `status: proposed` and `:109-110` says "Illustrative surfaces. Not current lexer/grammar tokens." So this is not a canon-vs-code contradiction, and open question 7 is answered in part.
- **CORRECTED: hazards.**
  - The sibling split of `?~"x"`, `~~"x"` and `%~"x"` holds only inside a Stream.
  - At top level, `?~"x"` gives `Op(?)` with a ProseChunk `linePayload`, so the path is demoted to prose with no PathRef. The cause is `INLINE_PAYLOAD_OPERATORS = {#,?}` at `expressions.ts:47`.
  - `!~"x"` also splits.
- **CORRECTED: scope attachment.**
  - `?` is the outlier. `expressions.ts:379-391` special-cases `?(` as the subject.
  - `%(`, `~(`, `!(`, `^(` and `@(` all attach as an Expression `scope` postfix, not only `%` and `@`.
- **CONFIRMED: comprehend prototype.**
  - 9 nodes, all parse, origin `ecological_zone×newton → L16`.
  - All 3 `era` tuples reduce to "the tide, seen as ecological zone".
  - The prototype substitutes `$k` in text and leaves unbound holes in place; "unbound holes are reported" is (c), not built.

## §4–5
- **CONFIRMED: prototypes.**
  - The say line for `wonder_tide_1` is the stated 12 words, built from `?[q]@L21` and `~#lens@L23`.
  - With Sam's overlay the line is "the moon pulls twice…".
  - `mergeOverlays` returns 2 anchors.
  - `arcBeats(arc2)` gives 5 beats, all resolve, and beat 2 is followed by `||`.
- **CONFIRMED: canon citations.**
  - `flow-protocol-sigils.spw:33,102`.
  - `looper-architecture.spw:120`. The quote is accurate; reading it as an arc loop is (c).
  - `phasor.spw:12-34`.
  - `representational-disclosure.spw:45` (the law is on 45; 44 is taste).
  - `shelves.spw:33`.
  - `cache-field.spw` exists.
  - The "value" gloss for `*` comes from `geometry-inspect.ts:60`; canon `:36` says "collapse discharge".
- **CONFIRMED: LSP and plugins.**
  - `display.ts:249/256`: the lens comes from `depthLine`, which is inside `bodyText`, so it is always suppressed.
  - Every code lens has `command: ''` (`display.ts:1085-1194`).
  - There is no `executeCommandProvider` (`stdio-server.ts:209-245`) and no `didChangeConfiguration` handler.
  - The IntelliJ Kotlin code calls no `spw/*` method.
  - VS Code has 0 keybindings and no `TextDocumentContentProvider`.
  - `context-strip.ts` and the concepts tree exist.
  - `beat.ts` has `--interval` and `--count`.
- **CORRECTED: proposal 6.** The test should say `glyphs.spw` yields **13** beats (12 glyphs plus `?["end"]`), not 12.
- **CORRECTED: internal reference.** "§5 P1–P3" does not exist; it means ranked proposals 1–3.
- **CONFIRMED: repo untouched.** The working-tree changes are `.agents/plans/index.spw`, `caches-cut-2026-09-30/` and `spw-cut-gate.ts`. All have timestamps after the report (Sep 30 23:26 to Oct 1 06:00), so they come from other sessions.
- **UNVERIFIABLE: "715 wonder blocks".** The count depends on method:
  - 631 `#>wonder_` anchors
  - 725 lines containing `?["`
  - 1112 lines starting with `?[`

  These come from tracked `.spw` files outside caches.

## Research citations
- **CONFIRMED: Hannebauer, Hesenius & Gruhn 2018.** *Empirical Software Engineering* 23:2795–2828, 390 novices, no evidence that highlighting improves comprehension.
- **CORRECTED: Sarkar 2015.** PPIG 2015, pp. 49–58, n=10, eye tracking. It found highlighting **significantly reduced task completion time**, with the benefit shrinking as experience grows, and fewer context switches. It does not belong under "small or no effects".
- **CONFIRMED: Rayner, Schotter, Masson, Potter & Treiman 2016.** *PSPI* 17(1):4–34. Suppressing inner speech does not allow faster reading with comprehension intact.
- **CORRECTED: Alderson-Day & Fernyhough 2015.** *Psychological Bulletin* 141(5):931–965 is real, but it is a general inner-speech review. Its abstract does not mention reading comprehension, so it only weakly supports that claim.
- **CONFIRMED: Loewenstein 1994.** *Psychological Bulletin* 116(1):75–98, the information-gap account.
- **CONFIRMED: Llull's Ars Magna.** It used rotating concentric discs (volvelles).

Sources: [Hannebauer 2018](https://link.springer.com/article/10.1007/s10664-017-9579-0), [Sarkar 2015](https://ppig.org/files/2015-PPIG-26th-Sarkar1.pdf), [Rayner et al. 2016](https://journals.sagepub.com/doi/full/10.1177/1529100615623267), [Alderson-Day & Fernyhough 2015](https://durham-repository.worktribe.com/output/1430570/inner-speech-development-cognitive-functions-phenomenology-and-neurobiology), [Loewenstein information-gap summary](https://psychologyfanatic.com/information-gap-theory/), [Llull volvelles (Crupi 2019)](https://iris.uniroma1.it/retrieve/e3835321-1611-15e8-e053-a505fe0a3de9/Crupi_Volvelles-of-knowledge_2019.pdf)

---

## dialects_play

# Dialects with linguistic enhancements and "waves of play": a tokenizer, AST and LSP design study

This touched nothing in the repo. Scratch work is in `<scratchpad>/tokens-ast/dialect-play/`.

Each claim carries a label:
- **(a)** the canon says it
- **(b)** the code does it
- **(c)** aspirational or doc-only

"Verified" means I ran it on scratch input.

On "since 2020": nothing in this checkout is older than the v0.1 spec (dated 2026-01-07; `lib/spw-v0.1.0-alpha/README.md:5-6`) or the first commit (2026-01-08). The lineage in §2 therefore covers 2026 only.

---

## 1. The dialect system: canon vs code

**Canon (a).**
- There are 8 core dialects, `Spw.b/l/m/x/q/f/p/t` (`.spw/registries/dialect-spec.spw:13-22`), plus the regional dialect `Spw.o` (`:23`).
- Invariants (`:30-37`):
  - exactly one active dialect per file
  - a header beats the path, which beats the `Spw.b` default
  - no switching dialect mid-file
- The stack is dialect × review × format × lex × mutation × reading × domain. It is "resolved once, shared by parse, format, hook, LSP" (`docs/theory/spw/syntax-profile-stack.spw:27`).
- The canon teaches the dialects in order: b → p → q/l → m → f → x → t (`:161`).

**Code (b), verified.**

- **F1. A dialect is an id plus six flags. Only three flags change anything.**
  - All 8 dialects use `lex: 'default'` (`syntax-stack.ts:43-159`).
  - The flags that act:
    - `newlineAsSpace` is a source rewrite (`detect.ts:116-126`).
    - `planStream` is the only lexer-level branch (`tokenize.ts:88`, `plan-stream.ts:10-33`).
    - `machineLint` only emits warnings (`products.ts:220`).
  - The flags that do nothing:
    - `flowGlyphs` and `highContext` are only displayed (`display.ts:407`; `profile.ts:105-108`).
    - `unknownAsText` is wired (`products.ts:207`), but no dialect sets it. That makes the prose lex profile (`profiles.ts:50-57`) unreachable through dialect.
  - `LexProfile` can only retune operator and connector tables, quote characters and unknown-as-text (`types/lex.ts:11-36`). It has no hook for numbers, lines or regions.

- **F2. Detection is done by five separate regexes, and `Spw.o` falls through all of them.**
  - The regexes: `detect.ts:14-23`, `semantic-tokens.ts:128`, `display.ts:394`, `spw-probes.ts:541-542` (which ignores `#:dialect`), and the TextMate `dialect-exp` rule.
  - All of them hard-code `[blmxqfpt]`.
  - Verified with `@dialect:Spw.o`:
    - The pragma resolves silently to the `Spw.b` default.
    - Forcing `{dialect:'Spw.o'}` crashes both `resolveSurfaceProfile` and `prepareSource`: `DIALECT_DEFAULTS[dialect]` is undefined (`syntax-stack.ts:299,308`).
    - Meanwhile `resolveRuntimeMedium('ocean','Spw.o')` reports `allowed true` (`channels.ts:52,118`; `dialect-policy.ts:161-172`).
  - Other verified behaviour:
    - Pragmas after the first 4096 characters are ignored (`detect.ts:42`).
    - `@dialect:` beats `#:dialect` whatever their order.
    - Two conflicting pragmas produce no diagnostic, although the canon invariant says one dialect per file.

- **F3. The LSP and the CLI lex the same file differently.**
  - `ServerIndex.parseDocument` calls `parse(doc.text)` without a path (`server-index.ts:371`), so path defaults never apply in the editor. The validator does the same (`spw-syntax-validate.ts:192`).
  - Across the 77 `.agents/plans/*/wip.spw` files (only 5 declare `Spw.p`):
    - Parsed without a path, 71 produce lexer errors. With the path, 3 do.
    - In 68 of them, the token count differs between the two parses.
    - `success` stays true either way, so no squiggles appear.
  - The LSP's own `spw/surfaceProfile` probe *does* pass the path (`spw-probes.ts:421-424`). The editor's hover therefore reports `Spw.p` while the outline and index were built from `Spw.b` tokens. This is the canon's open question `?[tool_disagree]` (`syntax-profile-stack.spw:212`), and it is live.

- **F4. Collapsing newlines to spaces loses spans and swallows files.**
  - `applyDialectPreprocess` joins all lines (`detect.ts:125`).
  - A `// note` or `# Title` line then comments out the rest of the file.
  - Every span lands on line 1, so the LSP outline for an `@dialect:Spw.l` file returns only `@dialect@L0`, where `Spw.b` returns 3 frames (verified with `outlineFromSource`).
  - The path default is broad (`/query/`, `selector`, `.q.spw`; `syntax-stack.ts:214-219`). As a result, `spw surface` turns each of the four real `.spw/biome/ocean/query/*.spw` files into **one COMMENT token** and still prints `parse.ok true`.

- **F5. The two pragma forms are real AST nodes, but detection never reads them.**
  - `#:dialect Spw.q` becomes `Particle(:dialect)` followed by `Identifier(Spw.q)`. The case particle binds forward to the identifier (`canonical/particles.ts:24-79`), so grammatically the pragma is a case-marked noun.
  - `@dialect:Spw.f` becomes `Binding(Reference dialect → Identifier)`.
  - Detection is done on raw text instead.

- **F6. The editor side has no concept of dialect.**
  - VS Code has one language id (`spw`), one grammar and 24 snippets with no dialect conditions (`package.json:255-280`).
  - The IntelliJ copy of the grammar contains 0 `dialect` rules.
  - LSP semantic tokens come from a line-by-line character scanner, not from seed tokens (`semantic-tokens.ts:95+`). The dialect cannot affect highlighting.

**The linguistic layer that already exists.**

- **Particle lattice.** It is named after grammatical categories: deixis `#>`, case `#:`, mood `#!`, aspect `~#` (`lexer/matchers/particles.ts:4-20`).
  - `particleMix` is described in the code as the surface's "dialect signature" (`particles.ts:103-111`).
  - `spw/particles` serves it to the editor (`spw-probes.ts:576-600`).
- **Apposition is the model enhancement.**
  - It started as a grammatical term: commit `925e982e` (2026-07-26) renamed "gloss" to "apposition".
  - The lexer owns the raw body (`apposition.spw:43-47`).
  - It lowers to the existing `Annotation` node, so "every existing selector counts it without being taught" (`:91`).
- **Valence.** The canon frames it chemically ("like electron charge", `valence-architecture.spw:39`). The linguistic sense of the word (Tesnière's valency: how many argument slots a verb has) would correspond to frame/body arity, not to boon/bane material quality. That is a break worth naming.
- **Fixity.** Prefix, postfix, interior, membrane. The electromagnetic reading is explicitly "silhouette language" (`em-fixity-association.spw:1-11,53`).

## 2. Lineage case study (lib archives)

| | v0.1 (2026-01-07) | v0.2 (2026-02-26/27) | v0.3 plus the code |
|---|---|---|---|
| Dialect model | Composable phases, `Spw.surface.structure.domain.orientation.presentation` (`v0.1/dialects/PHASES.md:16-26,142-178`) | Same model; `#dialect: Spw.b.q` composition "❌ Not implemented" (`v0.2/dialects/PHASES.md:131`) | One `DialectId` plus flags (`dialect/types.ts:12-20`) |
| `Spw.x` | 0-D index geometry, linkage (`GEOMETRY.md:13-17`) | Index; open question (`v0.2/dialects/index.spw:47-55`) | executable / hot |
| `Spw.p` | prompting, with sys/usr/ctx/inst role markers (`FUNCTIONS.md:14-40`) | — | plan / agent streams |
| Natural surface | `Spw.n`, "prose-like; sigils mark force" | `PROSE_LEX_PROFILE` | reachable only as a lex option |
| Presentation | poetic / terse / literate / annotated; "Presentation NEVER affects canonical_text or hashing" | carried forward | none; `reading:` is display-only |

Pattern: the enhancements that landed all did two things. The lexer owns the raw text, and the result lowers to an existing node:
- particles (2026-07-23, `8cdaf2a9`)
- apposition (2026-07-26)
- lossless plan-stream entries (2026-09-08, `c855e832`)

The ideas that stayed as flags or docs never got a lexer mechanism: natural, flowGlyphs, and phase composition.

Two further lineage notes:
- Reusing letters (`x`, `p`) means archived documents now misreport their own dialect.
- `lib/spw-v0.3.0` claims `dialects/` was "carried from v0.2.0" (`README.md:25`), but no such directory exists.

## 3. Linguistically enhanced play dialects

Each dialect below says what it adds or relaxes at the lexer and AST level, how it lowers to core Spw, and where its analogy breaks.

**First, what core Spw does with each dialect's surface today (verified).** Every one of these files passes the validator, because lexer errors leave `success = true`:
- **Chat line:** the apostrophe in `it's` opens an unterminated string, and `handle:` becomes a Binding.
- **Gloss:** `ı` is a lexer error.
- **Unit:** `±` and `-3` are errors, and `120ms` splits into a number plus an identifier.
- **Grid:** `16px` becomes `Binding(16)` plus a stray `Identifier(px)`, and `#ff6600` becomes a resonance tag.
- **Unit capsule:** `drop: 48<cm>⏎ next: 1` makes `next` the capsule's right arm.
- **Reduplication:** `??["x"]{}` degrades to a prose line payload, and `!!` splits into two ops.

**Lowered samples.** They are under `dialect-play/lowered/`. All pass the validator in strict mode, show 0 lexer errors, and have particle bindings as intended; `spw resolve` finds 10/10 citations resolved.

**A. `Spw.chat`**: TikTok LIVE or Twitch streamers and their chat, as an ingestion dialect for chat torrents.
- **Lexer:** a line owner for `[hh:mm:ss] handle: …` produces one TEXT token of kind `utterance`. A sub-scan records `!cmd`, `@mention` and `#topic` spans as token metadata without tokenizing the prose, so apostrophes and emoji are safe.
- **Lowering:** each line becomes `#>utt_NNNN` + `uNNNN: .{ at, by, cmd: #x, tags: #[…], to: […], said }`, then `order: << … >>`. `by` holds a salted-hash pseudonym. The lowering emits a span map from dialect lines to lowered lines.
- **Verified:** the prototype `lower-chat.mts` produces `chat-generated.spw` with 0 errors, 5 bound anchors, and mention handles pseudonymized inside `said`. The hand-written `chat.spw` adds a cluster, a wonder block and a ranked bias edge:
  ```
  #>wonder_bass_chest
  #:evidence #!reported
  ?["Why does bass feel like it is in my chest?"]{ ~#seed(viewer question at 00:14:05) … }
  ^["arc"]{ wave: << gather ; cluster || prompt ; voice ; reset >>
   =~"./chat.spw#wonder_bass_chest"[answers]{ ~"./chat.spw#utt_0002" ; ~"./chat.spw#utt_0003" } }
  ```
- **Where it breaks:**
  - `@user` is a person, not a perspective root, so it lowers to a string and never to a Reference.
  - `#topic` is a hashtag, not resonance.
  - `!raid` is a bot command, not an action. The ingestion channel must be `draft`, whose effect ceiling is `none` (`channels.ts:84-91`).
- **Placement lesson (verified):** particles written inside the wonder's body bind to the apposition, not to the wonder. They have to sit above `?[`.

**B. `Spw.gloss`**: linguists, as interlinear glossed text in the spirit of the Leipzig Glossing Rules (Comrie, Haspelmath and Bickel, 2008).
- **Lexer:** owns `\ex` / `\gl` / `\tr` tier lines (a Toolbox-like convention). It splits cells on whitespace and on `-` / `=`, and gives a diagnostic when the number of morphemes and glosses differ.
- **Lowering:** `^["igt_1"]{ line: "kitap-lar-ım", gloss: "book-PL-1SG.POSS", free: "my books", cells: [ .{ m: "kitap", g: "book" }, … ] }`, verified.
- **Where it breaks:**
  - Canon chose "apposition" over "gloss" because "a gloss explains where an apposition asserts" (`apposition.spw:52`). Gloss tiers must therefore not lower to `~#(…)`.
  - `.`, `=` and `-` are Spw operators or connectors, so cells must be strings.

**C. `Spw.unit`**: physics students.
- **Lexer:** a number grammar hook for sign, exponent and `±`. Plus a *tight* QUANTITY form `9.81<m/s^2>` whose capsule binds to its number and has no right arm, which removes the swallow hazard.
- **Lowering:** `g: .{ value: 9.81, unit: "m/s^2", sigma: 0.02 }`. Negative or exponent values are written as strings. Derivations become `=~"./physics.spw#q_h"[derives]{ ~"…#q_g" ; ~"…#q_t" }`, which `readBias` reports as an edge (verified).
- **Where it breaks:**
  - Capsule channels are relations (`catalog.ts:23-36`), and a unit is not a relation.
  - Spw has no dimensional algebra; type-level units in the style of Kennedy's work on units of measure (CEFP 2009) would be a type system Spw does not have.
  - `%X` measures are in [0,1], which is not physical measurement.
  - The electromagnetic fixity metaphors are silhouettes, not physics claims.

**D. `Spw.grid`**: graphic designers.
- **Lexer:** dimension literals (`16px`, `1fr`) and hex colors become STRING-kind tokens.
- **Lowering:** `^["layer_hero"]{ z: 2, cols: 1..6, rows: 1..2, fill: "#ff6600" }` and `stack: << layer_hero ; layer_caption >>`, verified.
- **Where it breaks:**
  - `#ff6600` is not resonance.
  - `1..6` is an inclusive span, while CSS grid `1 / 7` uses an exclusive end line, so a CSS emitter must add 1.
  - "Layer" as z-order collides with both `#:layer` and LAYERS.md.

**E. `Spw.verse`**: poets and authors.
- **Lexer:** the inverse of `Spw.l`. Each line is owned as a `verse_line` TEXT token and a blank line breaks the stanza. A caesura mark cannot be `//` (comment) or `|` (connector).
- **Lowering:** `lines: << "…" ; "…" >>` with `~#volta(…)` and `~#meter(…)` appositions, verified. A reading of a line is exactly what apposition is for.
  - Bullets `.. text` keep the text in `Bullet(ProseChunk)`, including `bane` and `it's`, but the lexer still raises the apostrophe error (verified). The lexer and the AST disagree here.
- **Where it breaks:**
  - Valence words are MODIFIER tokens.
  - `;` means time order, which suits reading order. But nothing in verse maps cleanly to `||`.

**F. `Spw.kin`**: children with parents.
- **Lexer:** forgiving. A line ending in `?` opens a wonder, `because …` becomes a claim, and the phrases "I saw", "I heard" and "I guess" become evidential moods.
- **Lowering:** `?["Why is the sky blue?"]{ #:evidence #!heard because: "…" #:evidence #!saw noticed: "…" next: ?["Why is it orange at sunset?"]{ } }`. Verified: each evidential particle binds to its own claim.
- **Where it breaks:**
  - In `!`, Spw means action, not exclamation.
  - Grammatical evidentials are obligatory in languages that have them (Aikhenvald, *Evidentiality*, 2004). Here they are optional, so a missing mark does not mean "no source".
  - Child data should default to local-only storage.

**Cross-cutting enhancements.**
- **Evidentials:** a closed mood vocabulary for `#:evidence`.
- **Reduplication:** `??`, `!!` and `**` appear in **0** corpus files, so the space is free. Candidate meanings are iterative aspect ("every beat") or meta-wonder. Linguistic reduplication is lexically constrained (Inkelas and Zoll, 2005), and doubled sigils collide with the existing digraphs `..`, `||`, `<<` and `##`.
- **"Register" for tone:** do *not* add a fourth meaning of "register". Map tone to the existing emit voice registers (`emit/registers.ts:7+`).

## 4. Waves of play

**What exists (b).**
- The AST keeps stream separators. `<< reflect ; gather || sketch ; crescendo >>` gives separators `[";","||",";"]` (verified).
- The runtime then evaluates a Stream to a flat argument array. It does not distinguish `;` from `||` and does not step (`interpreter.ts:272-279`).
- `spw beat` ticks on the wall clock every 500 ms and has no link to the tree (`beat.ts:1-9`).
- `BeatCache` measures TTL in beats.
- `DreamSchedule` has phases with beats, an effect level and a CLI hint (`canonical/dream-schedule.ts`, including a `play` schedule at :71-83). The schedules are hard-coded in TypeScript, and outside the barrel export nothing consumes them (verified by grep).
- `scanFlowProtocol` finds schedules only as regex strings.

**Doc-only (a/c).** The looper, audio and phasor canon (`looper-architecture.spw`, `audio-architecture.spw`, `phasor.spw`) cites `src/infra/shaders/*`, `src/infra/audio/*` and `src/core/*`. All of these are **missing from this checkout** (verified), so it is interpretive only.

**Prototype.** `wave-step.mts` steps an arc from the AST alone. It groups steps by `;` versus `||`, takes beats and prompts from the sibling facets, and voices each prompt in a chosen register:
```
beat  0.. 3  reflect            (slowly) What surprised us last season?
beat  4.. 4  gather || sketch
beat  5..12  crescendo          (slowly) Which one piece carries the season?
beat 13..14  celebrate          (slowly) Who do we thank by name?
beat 15..15  reset              cycle beats 16
```

**Three waves.**
- **Streamer session:** chat torrent → clustered topics → wonder prompts → arc, using the `chat.spw` shape. Chat `!cmd` never discharges.
- **Classroom:** `Spw.kin` or `Spw.unit` why-chains on a `<< wonder ; guess || try ; share ; reflect >>` cycle, in the spirit of Resnick's creative-learning spiral (*Lifelong Kindergarten*, 2017).
- **Production season:** reflection → crescendo → celebration → reset, as in `season.spw`.

**Subvocalization.** "Voicing" belongs to v0.1's *presentation* phase: it must never change canonical text or hashes. Inner speech varies a lot between people (Alderson-Day and Fernyhough, *Psychological Bulletin*, 2015), so the voice should be a register the person picks, not a fixed reading.

## 5. LSP and plugin implications

- **One stack per document.** Compute the profile stack once in `parseDocument`, with the repo-relative path, and store it on `DocumentState`. Hover, outline, semantic tokens and completion all read that one stack. This closes F3.
- **Dialect-aware lexing.** It belongs in the seed, as dialect packs with line owners and lowering. It must not live in LSP regexes. Every position feature maps back through the pack's span map.
- **Completion and hover per dialect.** A pack contributes its vocabulary:
  - Leipzig abbreviations after `g:` for gloss
  - unit names after `<` for unit files, in place of `MEDIAL_CAPSULE_CHANNELS`
  - evidential moods after `#:evidence #!` for kin
  - topics seen so far for chat

  Hover on the pragma already shows the stack (`display.ts:365-430`).
- **Semantic tokens.** Derive them from seed tokens plus a role map in each pack. *Append* modifiers (for example `evidential`, `quantity`, `utterance`) so the legend (`semantic-tokens.ts:75-78`) stays stable. A `spw.highlight: full|core|bare` setting would give "without highlighting" practice. A "Show lowered core" virtual document gives a reader the core Spw beside the dialect surface.
- **Language IDs.** Keep one `spw` id on VS Code and one fileType on JetBrains.
  - Static VS Code snippets are keyed by language id and, as far as I know, cannot be conditioned on anything else. Serve per-dialect snippets as LSP completion items instead.
  - Compound extensions such as `.chat.spw` can act as path hints, as `.q.spw` already does, with the pragma winning.
  - Resync the IntelliJ TextMate copy.
- **Fragmentation guard: one AST.** Packs may emit only existing token types, varying by `kind`. Their output must lower to existing nodes plus a span map, and new node types need canon graduation. This is the design of Racket's `#lang`, where readers expand to a core so the tools keep working (Tobin-Hochstadt et al., "Languages as Libraries", PLDI 2011).

## 6. Proposals, ranked

1. **LSP parses with a path.**
   - Change: `server-index.ts:371` becomes `parse(doc.text, { path: rel })`, and the stack is cached on `DocumentState`.
   - Test: a wip doc lexes `>>[` as `STREAM_CLOSE`+`TEXT`; the outline matches the CLI.
2. **Remove the newline-collapse source rewrite.**
   - Change: replace `applyDialectPreprocess` (`detect.ts:116-126`) with a lexer option that treats NEWLINE as whitespace, so comments still end at `\n` and spans are kept.
   - Change: stop applying metasyntax preprocessing when the dialect came only from the path (`syntax-stack.ts:214-219`).
   - Tests: an `Spw.l` outline has 3 frames; `Spw.q` + `//` keeps later tokens; `ocean/query/q.spw` produces more than one token.
3. **A dialect registry.**
   - Change: new `dialect/registry.ts` with `registerDialect(pack)` and a `DialectPack` of `{ id, status, channelGate, defaults, lex?, lineOwners?, lower?, vocab?, voice?, breaks }`.
   - Change: detection accepts `Spw\.[a-z][a-z0-9_]*`; unknown ids produce a warning.
   - Change: remove the five regexes (see F2).
   - Tests: `Spw.o` is detected and gated; forcing it no longer crashes; conflicting pragmas warn.
4. **Line ownership as a lexer feature.**
   - Change: `LexProfile.lineOwners` generalizes `tokenize.ts:88`.
   - Change: the lexer owns the interior of a block scalar, and an info-string tag `k: |chat` becomes `ProseChunk{dialect}`. Today `|chat` degrades the file (verified).
   - Tests: existing plan-stream tests are unchanged; a chat line with an apostrophe gives 0 errors.
5. **Lowering with span maps.**
   - Change: `canonical/lower.ts` `lowerDialect() → { core, spanMap, receipt }`, reusing `SourceSpan` and `contentHash` (`range-transform.ts:30,75`).
   - Change: add `'lowered'` to `DERIVED_SPW_KINDS` (`derived-surface.ts:28`) and add a `spw lower` command.
   - Test: each chat prototype anchor maps back to its source line.
6. **Waves.**
   - Change: `canonical/wave.ts` `waveFromStream()` and `scheduleFromSpw()`, so `DreamSchedule` can be authored in `.spw`.
   - Change: `spw play <file#arc> --voice <register>` at effect ceiling l0.
   - Test: `season.spw` yields 5 groups and 16 beats.
7. **Vocabulary gates.**
   - Change: a closed evidential set in a registry, checked for values the way `plan-index.ts` checks PHASES.
   - Change: LSP completion for it.
8. **Validator reads `parse().errors`** (`spw-syntax-validate.ts:192`), so the raw samples above fail.
9. **Reserve `??`, `!!` and `**`** before any dialect claims them.

## 7. Open theory questions

- **What is a dialect?** v0.1 said composable phases. The code has one id. Should the axes return as surface lexer + lowering + vocabulary + voice, each optional?
- **Embedded regions.** Can tagged block scalars hold another dialect without breaking "one active dialect per file" (`dialect-spec.spw:31,35`)?
- **Evidentiality.** Is it a new aim in the particle lattice, or a value set under mood? How does it relate to epistemic status (settled/contested)?
- **Names.** Should dialects be named as words (`Spw.chat`), with the reused single letters demoted to aliases?
- **Metaphor boundary.** Should every pack's `breaks:` field be lint-enforced, per register-geometry's falsifier (`register-geometry.spw:26`)?
- **Chat pseudonyms.** A per-session salt keeps sessions unlinkable (privacy); a per-channel salt would let arcs span sessions. Which should the default be?
- **Graduation.** Should every play dialect follow the ocean nursery ladder ("Hold + dual-read + episode → SYNTAX_CATALOG partial", `ocean/experiments/syntax.spw`)?

Everything is in `<scratchpad>/tokens-ast/dialect-play/`:
- **Probes:** `p1-dialect.mts`, `p2-wip.mts`, `p3-outline.mts`, `p4-stream.mts`, `p5-pathq.mts`, `p6-o.mts`
- **Checkers:** `check.mts`, `dump.mts`
- **Prototypes:** `lower-chat.mts`, `wave-step.mts`
- **Samples:** `lowered/*.spw`, `raw/*.spw`

### verification

## Verification: dialects_play report

Everything below was checked against HEAD (`main`, with an unrelated local change to `scripts/analyzers/spw-cut-gate.ts`). I re-ran the probes and checked them under `…/scratchpad/tokens-ast/verify-dp/` (v1–v10). No repo files were changed.

### CORRECTED (most important first)

- **F1, "Only three flags change anything":** incomplete. Each dialect also sets `contextMode` (`high` for l/q/t: `syntax-stack.ts:60,110,161`), and `products.ts:205` passes it to the parser. The parser checks it at `grammar/expressions.ts:221` and `grammar/references.ts:418,618,663`.
  - Verified: `@dialect:Spw.t` + `x: ~./foo.spw` turns into a `PathRef` ("Desugared bare local path…"). Under `Spw.b` the same input gives "Structured parse stopped at OPERATOR "~"; surface degraded to prose."
  - So `Spw.t` does differ from `Spw.b` at parse time. The canon's `metasyntax:"highContext"` is carried by `contextMode`, not by the dead `highContext` flag.
- **F2, "five separate regexes… all hard-code `[blmxqfpt]`":** there are at least 7 sites. The report missed:
  - `packages/spw-seed/src/experimental/scan-refs.ts:8`
  - `.agents/skills/spw-commit-review/scripts/spw-syntax-review.ts:262-264`

  Also, `spw-probes.ts:541-542` hard-codes only `Spw.x` and `Spw.f`, not the whole class. It does ignore `#:dialect`, as claimed.
- **F2, extra mismatch the report missed:** canon `dialect-spec.spw:23` gives `Spw.o` `fallback:"Spw.l"`, but `detectDialect('@dialect:Spw.o')` returns `{id:'Spw.b', source:'default'}`.
- **F2 citation:** `resolveRuntimeMedium` is defined in `packages/spw-runtime/src/session/medium-matrix.ts:76`. `channels.ts:52,118` only holds the `REGIONAL_OCEAN_DIALECT` constant and the ocean allow-list. The behaviour (`allowed true`) is confirmed.
- **F3, "The editor's hover therefore reports Spw.p":** wrong mechanism.
  - Hover shows the stack only when the caret is on a dialect mark or a `^seed[` line (`display.ts:393-431`).
  - 0 of the 77 wip files have a `^seed[` line. The 5 that have a pragma already parse as `Spw.p` without a path, because the pragma wins.
  - What actually reports the path-derived `Spw.p` is the `spw/surfaceProfile` request (`spw-probes.ts:406-424`). It is invoked from `extensions/vscode-spw/src/instruments/commands.ts:129`.
  - The exact reason there are no squiggles: `handlers/analysis.ts:52` publishes parse errors only when `!pr.success`.
- **Proposal 8:** the validator already reads `output.errors` (`spw-syntax-validate.ts:194`). It fails only on `!success` (`:209`, `:227`). The fix is to fail when `errorCount > 0` there, and to make the same change to the LSP gate at `analysis.ts:52`.
- **Reduplication, "appear in 0 corpus files":**
  - `!!`: 0 files.
  - `??`: 1 file, inside strings (`.spw/caches/language-features/type-systems-and-ergonomics.spw:48,50`).
  - `**`: 33 `.spw` files (markdown bold and globs). It lexes as two adjacent `*` OPERATOR tokens 9 times (`docs/theory/spw/cognitive-laser.spw:12,23,48`; `docs/plans/spw/architecture.spw:260`).
  - Used as a frame or body head (`??[`, `!![`, `**[`): 0. The "space is free" claim holds only in that narrower sense.
- **"doubled sigils collide with the existing digraphs … `##`":** `##` is not a digraph. It lexes as two `#` operators, and `lexer/matchers/particles.ts:11` says "`##` is unoccupied in the corpus".
  - The real digraphs are `..`, `->`, `~>`, `||` and `<>` (`lexer/profiles.ts:11-36`), plus the stream delimiters `<<` and `>>`.
- **"silhouette language" citation:** it is at `em-fixity-association.spw:42` (and `:293`), not `:53`. Lines 1-11 ("not Maxwell", interpretive) are confirmed.
- **`DREAM_SCHEDULE_PLAY` citation:** it is at `canonical/dream-schedule.ts:74-86`, not `:71-83`.
- **Particle lattice:** the lexer lexes only deixis, case and mood as PARTICLE tokens. Aspect `~#` stays on the Annotation path (`lexer/matchers/particles.ts:9-12`), and `particleMix` counts aspect with a source regex.
- **VS Code snippets "cannot be conditioned on anything else":** wrong. Snippet files support glob `include`/`exclude` (VS Code user-defined snippets docs).
  - Path-hinted dialects such as `**/*.chat.spw` or `**/.agents/plans/**` can get static snippets.
  - Pragma-declared dialects still cannot.
  - I only confirmed this for user snippet files. That it also works for snippet files an extension contributes is my inference.
- **Toolbox convention:** SIL Toolbox's standard interlinear markers are `\tx`, `\mb`, `\ge` and `\ft`. `\ex`/`\gl`/`\tr` look more like the LaTeX gloss packages (gb4e/expex).
- **Inkelas & Zoll (2005):** the book exists (Cambridge Studies in Linguistics 106). Its thesis, Morphological Doubling Theory, is that reduplication is driven by identity at the morphosyntactic level. "Lexically constrained" misstates it; "morphologically conditioned" is closer.
- **Aikhenvald (2004):** the book exists. Evidential marking is obligatory in about a quarter of the world's languages, which form her grammatical category. Many other languages express information source optionally or through "evidential strategies". "Obligatory in languages that have them" should be hedged to "where evidentiality is a grammatical category".
- **Chat pseudonyms (privacy):**
  - `lower-chat.mts:15` keeps only 4 hex digits (16 bits) of the salted SHA-256. Collisions reach about 50% at roughly 300 handles.
  - The span map keeps raw mention handles (`mention:low_end_lou@20`).
  - "Pseudonymized" holds only for the `.spw` output, not for the span map.
- **Block scalars, missed point:** an untagged `raw: |` also raises a lexer error on the apostrophe in `it's` (`L3:62`), yet the AST holds a clean `ProseChunk`. This is the same lexer/AST mismatch as the verse bullets, and it supports proposal 4.

### UNVERIFIABLE / unsupported

- **"`1..6` is an inclusive span":** neither canon nor code defines this.
  - `..` is a bare CONNECTOR (`lexer/profiles.ts:28`), a path-up step (`references.ts:36,59`) and a bullet marker.
  - `range-transform.spw:86,128` uses `offset=120..340` without saying whether the endpoints are included.
  - Inclusivity is the report's own convention. The CSS fact (`grid-column: 1 / 7` has an exclusive end line) is correct.
- **"a fourth meaning of register":** the count is plausible but unestablished. Uses include runtime registers, `[reg=…]`, emit voice registers (`emit/registers.ts:8+`) and `register-geometry.spw`.
- **"Reusing letters means archived documents now misreport their own dialect":** an interpretation, not a tested behaviour.

### CONFIRMED

**Canon**
- `dialect-spec.spw`: dialects at 14-21, `Spw.o` at 23, invariants at 30-37 (31 and 35 as cited).
- `syntax-profile-stack.spw`: 27 ("resolved once…"), 161 (the b→…→t teaching order), 212 (`?[tool_disagree]`).
- `apposition.spw`: 43-47 (body taken raw), 52 ("a gloss explains where an apposition asserts"), 91 (Annotation-node invariant).
- `valence-architecture.spw:39` ("Like electron charge").
- `register-geometry.spw:26` (falsifier).
- `ocean/experiments/syntax.spw:36` (graduation ladder; the file writes `->`, not `→`).
- `flow-protocol-sigils.spw:48` (`;` means sequential, `||` means parallel).
- `%` lies in [0,1] (`operator-atlas.spw:37`, `register-bank.spw:31,53`).

**Code**
- `detect.ts`: 14-23 (the four regexes), 42 (4096-character window), 116-126 (newline collapse).
- `@dialect` beats `#:dialect` in either order: the code checks `@dialect` first, and I verified it.
- Two conflicting pragmas produce no diagnostic.
- `syntax-stack.ts`: 43-159 (every dialect has `lex:'default'`), 214-219 (path rules), 299/308 (crash).
- `resolveSurfaceProfile` and `prepareSource` both throw "reading 'lex'" for `Spw.o`.
- `products.ts:207` (`unknownAsText`), `:220` (`machineLint`).
- `tokenize.ts:88` and `plan-stream.ts:10-33` (plan-stream branch).
- `types/lex.ts:11-36` (LexProfile has no number, line or region hook).
- `profiles.ts:50-57` (prose lex profile).
- `profile.ts:105-108` and `display.ts:407` (flags only displayed).
- `server-index.ts:371` parses without a path.
- `spw-probes.ts:421-424` (`surfaceProfile` passes the path) and `:576-600` (`spw/particles`).
- `semantic-tokens.ts`: legend at 75-78, line-by-line scanner at 96-105+.
- VS Code: one language id and one grammar. There are 24 snippets and none mention a dialect.
- The IntelliJ grammar copy has 0 `dialect` rules: its repository lacks `dialect-exp`. The plugin uses the native LSP (`plugin.xml:30,40`).
- `canonical/particles.ts`: the "dialect signature" doc is at about 103-111. `#:dialect Spw.q` gives PARTICLE + Identifier with a forward binding; `@dialect:Spw.f` gives `Binding(Reference → Identifier)`.
- `channels.ts:84-91` (draft channel, effect ceiling `none`).
- `interpreter.ts:272-279` (a Stream returns flat `args`). ONF also drops separators (`normalize.ts:367-390`).
- `beat.ts:1-9` (500 ms, no tree link).
- `BeatCache` TTL is in beats (`memory-cache.ts:15`).
- `DreamSchedule` has no consumers beyond the barrel export and its test.
- `scanFlowProtocol` uses a regex to find schedules.
- `derived-surface.ts:28`, `range-transform.ts:30,75`, `catalog.ts:23-36` and `plan-index.ts:28,225` match their citations.
- `display.ts:365-430` (pragma hover shows the stack).
- `reading` is display-only.
- Missing from the checkout: `src/infra/{shaders,audio}` and `src/core`.

**Measured runs**
- wip files: 77 total; 5 declare `Spw.p` by pragma; 71 vs 3 files with errors (3092 tokenize + 44 string + 3 annotation errors); 68 token-count diffs; `success` true everywhere.
- Outline: `Spw.l` gives only `@dialect@L0`; `Spw.b` gives `@dialect` plus 3 frames. The outline builds symbols line by line (`outline.ts:110+`), which explains the loss.
- All 4 `ocean/query/*.spw` files become one COMMENT token. `spw surface` still prints `parse.ok true` and `preprocessed true`.
- Every raw-sample behaviour is as stated (apostrophe string, `ı`, `±`/`-`, `120ms`, `16px`, `#ff6600`, the capsule swallowing `next`, `??` to prose, `!!` split, `|chat` degrading to prose, `Bullet(ProseChunk)` with `bane` as MODIFIER).
- Raw samples: validator exits 0 (9 pass, 1 warning).
- Lowered samples: `--strict` passes 8/8 with 0 lexer errors; `spw resolve` finds 10/10.
- Particle bindings in `kin.spw` and `chat.spw` are as described. The placement lesson holds: inside the body, particles bind to the Annotation.
- `readBias` finds an edge in `physics.spw`.
- Stream separators come out as `[";","||",";"]`.
- `wave-step.mts` gives 5 groups and 16 beats.
- `lower-chat`: 0 errors and 5 anchors.

**Lineage**
- v0.1 is dated 2026-01-07 (`README.md:5-6`). The first commit is `a1e509c6` (2026-01-08).
- v0.1 `PHASES.md`: 16-26, 142-178, 44 (`Spw.n`), 134 (presentation never changes canonical text or hashes).
- v0.2 `PHASES.md:131`, v0.2 `index.spw:47-55`.
- v0.1 `GEOMETRY.md:13-17`, `FUNCTIONS.md:14-40`.
- v0.2 does not mention `Spw.p`.
- `PROSE_LEX_PROFILE` first appears 2026-02-26.
- `lib/spw-v0.3.0/README.md:25` claims `dialects/` was carried forward, but the directory is absent. So are `core/`, `runtime/`, `domains/`, `applications/` and `infra/`.
- Commit dates: `925e982e` 2026-07-26, `8cdaf2a9` 2026-07-23, `c855e832` 2026-09-08.

**Research**
- Leipzig Glossing Rules (Comrie, Haspelmath and Bickel; revised 2008). Rule 2 requires the example and its gloss to have the same number of hyphens, which supports the mismatch diagnostic.
- Kennedy, "Types for Units-of-Measure", CEFP 2009, LNCS 6299.
- Tobin-Hochstadt, St-Amour, Culpepper, Flatt and Felleisen, "Languages as Libraries", PLDI 2011.
- Alderson-Day and Fernyhough, *Psychological Bulletin* 141(5), 2015.
- Resnick, *Lifelong Kindergarten* (MIT Press, 2017): the spiral is imagine → create → play → share → reflect.

Sources: [Kennedy CEFP09](https://link.springer.com/chapter/10.1007/978-3-642-17685-2_8), [dblp Kennedy](https://dblp.org/pid/93/2262.html), [Leipzig Glossing Rules](https://www.eva.mpg.de/lingua/pdf/Glossing-Rules.pdf), [Inkelas & Zoll review](https://www.cambridge.org/core/journals/phonology/article/abs/sharon-inkelas-and-cheryl-zoll-2005-reduplication-doubling-in-morphology-cambridge-studies-in-linguistics-106-cambridge-cambridge-university-press-pp-xxii254/1389B21A667A3FAC28F38766CF238321), [Aikhenvald / evidentiality](https://en.wikipedia.org/wiki/Evidentiality), [Alderson-Day & Fernyhough](https://durham-repository.worktribe.com/output/1430570/inner-speech-development-cognitive-functions-phenomenology-and-neurobiology), [Resnick spiral](https://www.edweek.org/leadership/opinion-the-creative-learning-spiral-starting-with-your-imagination-in-design-thinking/2017/03), [Sam Tobin-Hochstadt](https://samth.github.io/), [VS Code snippets](https://code.visualstudio.com/docs/editing/userdefinedsnippets), [Toolbox SFM markers](https://cran.r-project.org/web/packages/interlineaR/vignettes/interlineaR.html)