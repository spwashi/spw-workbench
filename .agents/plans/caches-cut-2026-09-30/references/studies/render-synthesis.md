# Spw rendering and the CLI as tools for metacognition: synthesis for the 2026-09-30 cut

**Labels.**
- **(a)** canon: a repo `.spw` or doc file says it.
- **(b)** code: the source does it. Verified by running it unless marked.
- **(c)** aspirational or proposed.
- A "(c, conflicts with canon)" tag means the proposal contradicts a canon line, which is cited.

**Scope.** The parallel study covers role taxonomy, transform algebra and play dialects. This report does not repeat them.

**What I ran in this pass.** All of it is under `…/scratchpad/reading/synth/`:
- I spliced the contract amendments into a copy of the current staging contract and added two sets to the vocabulary.
  - The strict validator passes.
  - All 41 new keys bind to Literals, with 0 prose and 0 degradations.
  - The working-tree `spw-cut-gate.ts` gives 15 files, 0 failing, 0 warnings over the merged scratch cut. That cut is the current staging plus the subvoc arcs, plus a new trail and a recipe surface.
- I prototyped every proposed gate check in `gate-ext.mts`.
  - Each check fires at the correct line on a negative fixture. The existing gate catches only 2 problems in that same fixture.
  - On the scratch cut it finds real problems the current tools pass (§2.4).

**Corrections.** Every verifier correction has been applied. All line numbers refer to current files:
- `water.spw`: 153 lines
- `contract.spw`: 161 lines, 18 top-level frames
- `vocabulary.spw`: 62 lines
- `spw-cut-gate.ts`: 380 lines, working tree

---

## 1. Findings

### 1.1 What highlighting does today, and where it misleads (b unless marked)

**Path abbreviations used in this section.**
- `sem` = `packages/spw-lsp/src/handlers/semantic-tokens.ts`
- `deco` = `extensions/vscode-spw/src/surface-decorations.ts`
- `tm` = `extensions/vscode-spw/syntaxes/spw.tmLanguage.json`
- `ijtm` = the IntelliJ copy of `tm`
- `disp` = `packages/spw-lsp/src/handlers/display.ts`

1. **Four color layers, and none of them reads the parser.**
   - The layers: the TextMate grammar (`tm`, plus the drifted `ijtm`), LSP semantic tokens (a character scanner, `sem:105-412`, 9 types and 6 modifiers at `:75-78`), VS Code decorations (`deco:191-445`), and inlay hints (`disp:1203-1350`).
   - (a) `.spw/tooling/vscode-spw.spw:108` forbids "a second editor-only semantics stack". In practice there are three.
   - What the parser actually sees is shown by `spw inspect source --through tokens`, `--through structure`, and `spw inspect spacing`.
2. **Claim status is invisible in every layer.**
   - `#!settled` (water:50), `#!contested` (:94) and `#!speculative` (:148) render identically in each layer.
   - The decoration "status tiers" key on a different vocabulary, `implemented|partial|proposed|deprecated` (`deco:147-154,391-403`).
3. **Under the stock theme, roles collapse.**
   - The default theme in VS Code 1.139 is "Dark 2026", with `semanticHighlighting:true`.
   - Under TextMate, `#>`, `#:`, `#!`, `~#` and `#topic` all resolve to `entity.name.tag` (#7ee787). Operator sigils resolve to `keyword.operator` (#d4d4d4), close to the editor foreground (#BBBEBF).
   - Under semantic tokens, colors are grouped across roles:
     - `^`, `#>`, `%` and `$%[` share #C586C0.
     - `#:case`, `#topic` and path refs share #4EC9B0.
     - `#!`, `!` and `?` share #d2a8ff.
4. **Apostrophes spill.**
   - The decoration mask starts a string at any `'` outside `"…"` and `//`, and the string crosses newlines (`deco:89-109`).
     - A re-run heuristic finds about 74 files and about 3,443 lines affected. The count depends on method; the order of magnitude is stable.
     - Example: `docs/theory/spw/materials-ontology.spw:3` blanks lines 3 through 103.
   - The IntelliJ grammar opens a `'` string with no lookbehind (`ijtm:172`). `tm:176` has `(?<!\w)'`. On a probe file, `~#lens(it's …)` turned lines 18–26 into a single string.
   - (a) Canon trips this too: `valence-architecture.spw:122` (`# Each component's…`).
5. **Prose is painted as code.**
   - Digits and `#` inside `~#(…1900 to 1936…)` (water:130).
   - The handle `water.rho_ice_g_cm3` is split into `…cm` plus a numeric `3` (water:75, :151). The parser sees one IDENTIFIER.
   - `.` and digits in `#` title prose (`sem:122-125` is a no-op), e.g. contract:1 `2026 09 30`.
   - `$%[` is one unit in the editor layers but two operations in the parser.
6. **The palette implies merit, against canon.**
   - (b) `package.json:249-253`: boon is "growth, implemented state", bane "hazard, error state" (#F44747 red), bonk "conflict".
   - (a) `valence-architecture.spw:38-39` calls the valences "charge-neutral … not moral judgment". The cut's `vocabulary.spw:56` says "material quality, not merit".
7. **The palette is small and fails color-vision and contrast checks.**
   - 23 color ids collapse to 13 dark and 14 light hexes.
   - Under a deuteranopia simulation (Machado et al. 2009), anchor vs intent has ΔE76 ≈ 8, and `?` vs `%` has ≈ 4. The "about 15" threshold for confusable is my own heuristic.
   - Light-mode contrast on white: #BF8803 (valenceBone, tierWarm) is 3.12:1. #1B8F6A (phasePotential, which colors `~` and every `~#k:`) is 4.05:1. Both are below WCAG 1.4.3's 4.5:1.
8. **Some highlight settings mislead.**
   - The `~#k:` compound decoration ignores `highlightSemantics` (`deco:272,424`), although `package.json:204` says that setting controls it.
   - Depth hints and incoming-reference hints are never gated (`disp:1285-1350`).
   - The `│bent_polar` hint restates the name already on the line. That breaks the code's own rules at `disp:188-191` and `:260-261`.
   - Inlay settings arrive only through `initializationOptions` (`extension.ts:100-105`, `stdio-server.ts:198`). The server has no `didChangeConfiguration` handler, so changing them needs a restart.
   - With TextMate alone, the `^["edges"]` frame head is `markup.heading` bold. Semantic tokens override the color; whether the bold survives is **unverified**.
9. **JetBrains.**
   - In the copied grammar, 21 of 23 operator rules get a generic `keyword.operator` suffix. The copy also lacks the `$%[` and `<<|>>` rules and the `'` guard.
   - Gutter icons for `#>` and `^` have a null navigation handler, yet the tooltip still says "navigate to references" (`SpwAnnotationLineMarkerProvider.kt:28-54`).
   - There is no color settings page.
   - Spellcheck is off for `.spw` (`SpwSpellcheckingStrategy.kt:8-10`).
   - No editor has an apposition rule (`tm:341-362`, `ijtm:312-328`, `sem:248-251`).

### 1.2 Plain-text legibility today

**What carries structure in the cut (b, measured with `legibility.py` and `gate_probe.py`).**
- Indentation is exactly one space per brace depth on every code line of water, contract and vocabulary.
- 12 of 12 anchors in water sit at a boundary and are followed by the frame they name.
- Every top-level frame has a blank line before it.
- 67% of water's structural lines begin with a sigil or a closer:

| Line start | Count |
|---|---|
| `key:` | 44 |
| `}` | 25 |
| `^` | 24 |
| `#:` | 18 |
| `#>` | 12 |
| `~#` | 7 |
| `?[` | 1 |

- Anchors double as caesuras between sibling keystones.
- Particle order is fixed: case before mood.
- One claim per line gives a read-aloud unit. At 183 wpm aloud (Brysbaert 2019), water's median 13-word statement takes about 4.3 s; the 30-word maximum about 9.8 s.

**What still fails.**
- The gate probe flags L6, one prose item per line, at water:33 (three corrections on one 290-column line) and water:138 (a four-step schedule).
- water:130 is 90 columns with its indent and 88 without, so the width rule has to say whether indent counts.

**Hazards that layout cannot fix.**
- `#` has five roles: `# ` comment, `#>`/`#:`/`#!` particles, `#topic`, `#[` set, and `~#` trait or apposition.
- `$%` reads as one token but parses as two.

**Two tools misread the cut's layout (b).**
- `spw outline`/`skim`:
  - Computes depth as `floor(indent/2)`, capped at 6 (`packages/spw-cli/src/view.ts:234`).
  - Skips every `#` line (`:231`), matching only `^` frames (`:222`) and whitelisting five traits (`:269`).
  - Verified on water: it hides the wonder, every `#:claim` mood, `~#proof`, `~#door` and `cold_open`. On a trail it hides every prediction step.
  - End-truncation cuts off the `#anchor` part of a path.
- `spw format`:
  - `layout` pads `#[` sets and `#topic` as if they were trailing comments (`packages/spw-seed/src/canonical/canonicalize.ts:257-265`, against `lexer/matchers/comments.ts:55-67`) and re-indents to 2 spaces.
  - `pretty` wraps water:3 at 88 columns.
  - `--check --diff` pairs lines by index (`format.ts:394-410`), so after one wrap every later line shows as changed.
  - `spw stack` resolves the cut's format profile to `layout`, the profile that damages it.

**Tension with canon (a).**
- `representational-disclosure.spw:49,144` refuses alignment as semantic law, yet the same file uses `// ═══` banners (`:38-40`), and `apposition.spw:23-25` pads a table.
- `apposition.spw:45-47` allows apostrophes and `%` in apposition bodies. The cut bans them (`contract.spw:44,153`) only because the tools break; the fix belongs in the tools.

**The read-aloud probe is templated (a).**
- It appears 48 times in 48 files, in three variants: grain boundaries ×17, biome edges ×16, structural joints ×15. `.spw/shelves.spw:41` is one of them.
- `~#reading_feel` appears 50 times.
- (b) No code reads either one.
- (a) "Voice" in canon means operator ratio (47 files; e.g. `.spw/hot.spw:73-77`). (b) census `~#sigils` is a character histogram (`packages/spw-seed/src/math/corpus.ts:379-390`), so header moods inflate it: lesson's `"!6"` is exactly its six `#!` header moods.

### 1.3 Transformation tooling that exists (b)

| Kind | Command | What it really does (verified) | Defect that matters for metacognition |
|---|---|---|---|
| reduction | `emit pack --host brief/plain/copy/audio` | Brief keeps Title, Audience, Claim, Proof, Door; drops status, provenance, as_of, limits | Audio never speaks the claim (`emit/codecs.ts:282-290`). Continuity is checked over the whole packet (`:57-59`), so the title or door can satisfy it |
| reduction | `census`, `graph`, `density` | Corpus cards | Fragment refs counted as broken; source registry marked orphan (`corpus.ts:200`, `corpus-scan.ts:198-201,264`). Root-relative refs resolved relative to the file |
| reduction | `lattice` (alias `readings`) | Apposition spectrum | Parse-free (`apposition-scan.ts:1-7`). Counts appositions inside strings and on `#`/`//` lines (`:105-165`). Mixes the paren and colon degrees |
| reduction | `form` (`geometry`) | Brace and operator census | Counts raw characters, sentence periods included (`geometry-inspect.ts:106-122`). `--spw` prints prose (`geometry.ts:477-481`) |
| reduction | `outline` | Landmarks | See §1.2 |
| expansion | `expand` | Transcludes `={ ~"f#a" }` digests | Copies raw text without rebasing links or re-indenting (`expand.ts:94-102`). Uses `path.resolve`, which skips the consumer-root guard and `@root` (`:109`) |
| expansion | `emit expand --bind`, `snippet hydrate` | Fills slots | `renderExpandResult` merges the header with the template's first line and can swallow `#>anchor` into a comment (`template-fill.ts:326-335`). Defaults apply per occurrence (`:96-111`). `--derivative` writes `base:` relative to cwd |
| comprehension (filter only) | `select`/`query --expr` | `$%[_]`, `$^[_]` | No selection by frame name (`$^["try"]` fails; gaps at `selector-expr.ts:18-24`). No generator exists |
| transformation | `pulse`, `mutate`, `refactor` | Plan, then apply | `pulse --stdin` reports source and `changed:false` (`mutation-automata.ts:621,639`). `refactor anchor:` renames only the particle (`semantic-edit.ts:280-297`), so 3 fragment refs break |
| comparison | `delta`, `cycle`, `atlas --from/--to` | ChangeReport counts | No per-key values. `contested→emerging` goes unreported. Plain `diff` of two cards was more informative |
| projection | `pulse --ladder` | Form-ladder rungs | The `--contour` option documented in canon is rejected (`form-ladders.spw:86-92`) |

**Cards are not round-trippable (b).** A spaced `~#k:` followed by a `#tag`, a `#[…]` set or a `~"path"` parses as an Annotation with no value. Verified again: `~#among: #[ "cut" ] ~#cyclic: #no` gives 2 valueless facets. Census, delta and compose cards all emit this form. A plain-key, comma-separated card keeps all 20 values typed (`synth/root/card.spw`). The working-tree gate already bans the form inside the cut (`spw-cut-gate.ts:51`).

**Metacognitive verbs today.**
- **Plan:** `pulse`/`refactor` plan-only, and `^["next"]{command purpose cost}` (`view.ts:84-110`; (a) `cli.spw:105-109`).
  - Only `inspect source` and `inspect spacing` fill these cards in.
  - `census`, `graph`, `density` and `formula` print `<roots>` placeholders (`inventory.ts:321-326`, `map.ts:299-303`, `analyze.ts:290`, `formula.ts:351`).
- **Check:** `lint`, `resolve`, the cut gate, and `measure` verdicts (match / drift / undeclared / unmeasurable; `mass.ts:107-147`).
  - `taste --fidelity`, `fingerprint`, `emit holes`.
  - `resolve --from nope` and `lint --from nope` pass vacuously.
- **Compare:** `delta`, `cycle`, `atlas`, `format --profiles`/`--pulse`, `expand`.
- **Reflect:** `stack`, `inspect`, `lattice`.
  - The LSP `spw/cacheReflection` is rendered by VS Code (`instruments/commands.ts:160-190`) and Neovim (`extensions/neovim-spw/lua/spw/instruments.lua:115-143`), but not by JetBrains.
- **Predict:** there is no dedicated verb. A hand-written forecast card checked with `delta` or `measure` works by hand. Plan streams hold 1,322 typed entries, of which 17 are `surprise` and 0 are `forecast`/`predict`, although the schema calls surprise "the interesting part" (`.agents/plans/_schema/wip.spw:262`).

**Ethics constraint (a).** `cli.spw:117-124,138`: inspection is "local, explicit, read-only". It keeps no hidden activity log, and it "never… infers a person-level trait, or becomes an authority-facing score" (`:121`). So predictions and calibration receipts must be reader-authored cards the reader keeps.

### 1.4 Research that holds up (hedged)

None of the work below tested a sigil-first language or a CLI for reading corpora. Applying it to Spw is extrapolation.

**Highlighting**
- Sarkar (2015, *PPIG 26th workshop*, pp. 49–58):
  - n = 10, Python tasks.
  - Median completion time was 8.4 s lower with highlighting (Wilcoxon p = .047). Fewer context switches.
  - The benefit shrank with experience. Eye tracking used 7 of the 10 participants.
- Hannebauer, Hesenius & Gruhn (2018, *Empirical Software Engineering* 23(5):2795–2828):
  - 390 novices; outcome was correctness.
  - "No evidence" that highlighting helps. They say highlighting "squanders a feedback channel".
- Beelders & du Plessis (2016, *Journal of Eye Movement Research* 9(1):1–11): no significant reading differences, but readers rated color easier.
- **Net:** no correctness benefit, a possible speed benefit for novices, and a consistent preference.

**Fluency and judgments of learning (JOLs)**
- Perceptual features inflate JOLs without changing recall (Rhodes & Castel 2008, *JEP: General* 137(4):615–625).
- The mechanism is contested. Mueller, Dunlosky, Tauber & Rhodes (2014, *Journal of Memory and Language* 70:1–12) attribute the effect mainly to beliefs about memory.
- JOLs are inferences from cues (Koriat 1997, *JEP: General* 126(4):349–370).
- Hypothesis, untested for code: color may raise felt understanding without raising understanding.

**Disfluency**
- Diemand-Yauman, Oppenheimer & Vaughan (2011, *Cognition* 118(1):111–115) reported benefits.
- Meyer et al. (2015, *JEP: General* 144(2):e16–e30) pooled 17 tests of Alter et al.'s 2007 font effect on Cognitive Reflection Test problem-solving and found none. That is a replication of Alter et al., not of Diemand-Yauman, and not about learning.
- Xie, Zhou & Liu (2018, *Educational Psychology Review* 30(3):745–771): recall d = −0.01, transfer d = 0.03, JOLs d = −0.43, study time d = 0.52.
- Weissgerber, Brunmair & Rummer (2021, *EPR* 33(3):1221–1247) found the transfer null robust but the recall and moderator results doubtful; they did not target the JOL result.
- **So:** a monochrome mode is justified as a confidence and calibration cue and as a vehicle for generation. It is not justified as "harder therefore better".

**Generation, pretesting, fading**
- Generation effect: Slamecka & Graf (1978, *JEP: Human Learning and Memory* 4(6):592–604). Bertsch et al. (2007, *Memory & Cognition* 35(2):201–210) report d ≈ 0.40 across 86 studies.
- Pretesting and failed retrieval: Kornell, Hays & Bjork (2009, *JEP: LMC* 35(4):989–998); Richland, Kornell & Kao (2009, *JEP: Applied* 15(3):243–257); Pan & Carpenter (2023, *EPR* 35:97).
- Feedback timing is mixed: Hays, Kornell & Bjork (2013, *JEP: LMC* 39(1):290–296) against Kornell (2014, *JEP: LMC* 40(1):106–114).
- Guessing corpus statistics before a census is an analogy (c).
- Scaffolding and fading: Wood, Bruner & Ross (1976, *Journal of Child Psychology and Psychiatry* 17:89–100); Renkl, Atkinson, Maier & Staley (2002, *Journal of Experimental Education* 70:293–315).
- Expertise reversal: Kalyuga, Ayres, Chandler & Sweller (2003, *Educational Psychologist* 38(1):23–31). This argues for per-reader, fadable aids.

**Monitoring and calibration**
- Monitoring and control: Flavell (1979, *American Psychologist* 34(10):906–911); Nelson & Narens (1990, *Psychology of Learning and Motivation* 26:125–173). Calling CLI mutation tools "control" is an analogy (c).
- Delayed JOLs are more accurate: Nelson & Dunlosky (1991, *Psychological Science* 2(4):267–270; Crossref lists 267–271). That study used paired associates.
- Delayed keywords and summaries improve metacomprehension; immediate ones do not: Thiede, Anderson & Therriault (2003, *Journal of Educational Psychology* 95(1):66–73). So a breath line should be written after a delay.
- Calibration methods: Lichtenstein, Fischhoff & Phillips (1982, in *Judgment under Uncertainty*, pp. 306–334); Brier (1950, *Monthly Weather Review* 78(1):1–3). One prediction is an anecdote.
- Illusion of explanatory depth: Rozenblit & Keil (2002, *Cognitive Science* 26(5):521–562). This supports "explain before expanding", not "predict".

**Think-aloud and inner speech**
- Protocol analysis: Ericsson & Simon (1993, *Protocol Analysis*, MIT Press).
- Fox, Ericsson & Best (2011, *Psychological Bulletin* 137(2):316–344): plain verbalization is non-reactive on accuracy but slower; asking people to explain changes performance. A "say it" prompt and an "explain why" prompt are therefore different interventions.
- Self-explanation: Chi et al. (1989, *Cognitive Science* 13(2):145–182) is correlational; Chi, de Leeuw, Chiu & LaVancher (1994, *Cognitive Science* 18(3):439–477) is causal.
- Production effect (saying aloud aids memory):
  - Strongest in mixed lists: MacLeod et al. (2010, *JEP: LMC* 36(3):671–685).
  - Smaller between subjects: Fawcett (2013, *Acta Psychologica* 142(1):1–5).
  - Own recorded voice falls in between: Forrin & MacLeod (2018, *Memory* 26(4):574–579).
- Inner voices are personal:
  - 80.7% of 570 respondents report an inner reading voice with accent, pitch and tone (Vilhauer 2017, *Scandinavian Journal of Psychology* 58:269–274).
  - Inner speech carries regional accent (Filik & Barber 2011, *PLoS ONE* 6(10):e25782).
  - Review: Alderson-Day & Fernyhough (2015, *Psychological Bulletin* 141(5):931–965).
- Suppressing inner speech costs comprehension: Rayner et al. (2016, *Psychological Science in the Public Interest* 17(1):4–34).
- Unit size: one new idea per intonation unit (Chafe 1994, *Discourse, Consciousness, and Time*, University of Chicago Press). Memory span tracks spoken duration (Baddeley, Thomson & Buchanan 1975, *JVLVB* 14(6):575–589). A one-breath line is a heuristic.
- Dehé (2014, *Parentheticals in Spoken English*, CUP) challenges the default assumption that parentheticals are phrased apart. So reading `~#(…)` as a paused aside is plausible, not established.

**Reading conventions and accessibility**
- Beacons and discourse rules: Brooks (1983, *IJMMS* 18:543–554); Wiedenbeck (1986, *IJMMS* 25:697–709); Soloway & Ehrlich (1984, *IEEE TSE* 10:595–609). Layout conventions that a gate can check plausibly carry expert reading.
- Color-vision deficiency affects about 8% of men and 0.4% of women of European descent (Birch 2012, *JOSA A* 29(3):313–320). WCAG 2.1 SC 1.4.1 and 1.4.3 apply.
- Simulation method: Machado, Oliveira & Fernandes (2009, *IEEE TVCG* 15(6):1291–1298).

**Command-line interfaces**
- People rarely choose the same name for the same function (Furnas et al. 1987, *CACM* 30(11):964–971).
- Speakers converge on shared names through repeated use: Clark & Wilkes-Gibbs (1986, *Cognition* 22(1):1–39); Brennan & Clark (1996, *JEP: LMC* 22(6):1482–1493).
- Error messages: Molich & Nielsen (1990, *CACM* 33(3):338–348); Marceau, Fisler & Krishnamurthi (2011, SIGCSE, pp. 499–504); Becker et al. (2019, ITiCSE-WGR, pp. 177–210).
- Response-time thresholds:
  - About 1 s keeps the flow of thought: Card, Robertson & Mackinlay (1991, CHI, pp. 181–186); Nielsen (1993, *Usability Engineering*).
  - Miller (1968, AFIPS FJCC) gave about 0.1 s and about 2 s.
- Conventions: GNU Coding Standards §4.8; clig.dev; no-color.org.

---

## 2. Contract amendments for `.spw/caches/2026-09-30/contract.spw`

### 2.1 New frames (c)

Insert these before `^["hazards"]` (current `:145`). Each rule is one line of Spw-safe strings. Verified: strict validator 1/1 pass, 0 prose, 41/41 keys bind to Literals, and the contract grows from 161 to 219 lines. Cited grounds: `apposition.spw:23-25,92`, `flow-protocol-sigils.spw:33,48`, `cli.spw:49,100,117-124`, `form-ladders.spw:96`, `operational-field.spw:46-50`, `shelves.spw:33,41`.

```
^["legibility"]{
 indent: "one space per nesting level; every code line sits at its brace depth"
 left_edge: "a structural line starts with its sigil, its key, or a closer, so the first five columns read as the outline"
 particles: "#:case then #!mood, one pair per line; a wonder first line may add one ~#lens(phrase)"
 anchors: "an anchor line follows a blank line, an opener, or a closer, and the next line is the frame or binding it names"
 cadence: "one blank line before every top-level frame or its anchor; no blank lines inside a keystone frame"
 claim_length: "a statement, claim, or hypothesis stays at or under 35 words, about 12 seconds read aloud"
 arrays: "a set, list, or schedule of prose items puts one item per line; closed sets of bare words stay on one line"
 width: "code outside strings stays within 88 columns, not counting indent; strings are never wrapped"
 ascii: "no apostrophe, dash, or non-ASCII character outside double-quoted strings, including apposition bodies, until the editor grammars stop spilling on them"
 color: "no meaning depends on color; status, valence, anchors, and links stay legible in print from glyphs and position"
}

^["voice"]{
 say_line: "a surface with an ^emit card carries cold_open: one spoken sentence a reader can say in one breath"
 anchor: "the cold_open sentence itself contains every continuity phrase after the bar; the audio packet check passes when the title or door carries it"
 length: "a cold_open stays at or under 25 words; one new idea per spoken phrase is a heuristic, not a measured optimum"
 loss: "a say line drops numbers, sources, and limits; the claim frame keeps them, and a say line never adds a fact the frame lacks"
 per_claim: "a keystone may carry one ~#say(phrase), the author reading of the claim in spoken words; emit ignores it"
 probe: "a read-aloud wonder names one surface and asks for one pause; no probe string repeats across files"
}

^["marginalia"]{
 anonymous: "a one-off reading is an anonymous apposition ~#(phrase) on its own line inside the frame it reads"
 promotion: "the moment a reading recurs it is named ~#name(phrase), and the name joins the reading set in vocabulary.spw"
 code_not_comment: "readings are appositions, never # lines; # prose leaves the tree and no tool can count it"
 home: "personal readings live in a reader root outside the cut, declared as an external root; the cut ships this convention and no personal readings"
 direction: "a reading points into the cut with a path ref to an anchor; the cut never links to a reading"
 dated: "a reading frame carries of, as_of, and its own #:claim #!status, so a later reading supersedes it without deleting it"
 standing: "a reading may rank and disclose only; it never changes a claim status, and no tool scores the reader"
}

^["arcs"]{
 frame: "an arc is an ^[arc] frame in trails/arcs holding clock, archetype, steps, counts, limit, and an exit"
 clock: "every arc names one clock from vocabulary.spw; arc clocks never reuse a system clock name such as beat, pulse, or epoch"
 steps: "steps are one << a ; b >> schedule of short spoken labels; the order is part of the arc"
 predict: "a prediction step is written ?{ question } ~<prediction> so the guess is written down before the check"
 counts: "each arc names what a tool can count and what it cannot; counted output never stands in for quality or understanding"
 exit: "an arc hands off through a feeds edge to the next arc; nesting lives in the tree, not in edges"
 archetype: "an arc cites its archetype in .spw/surfaces/surface-archetypes.spw with a root-relative link"
 trail: "a trail is a ^[trail] frame whose stops schedule alternates anchor links and prediction steps"
 metaphor: "the flow schedule is a memory aid beside an observable mapping; the runtime does not run it as a learning loop"
 people: "arcs with audiences, classrooms, or families never rank, score, or log a person; a guess is evidence of a guess"
}

^["recipes"]{
 law: "every expansion, comprehension, reduction, or transformation names its command, what it keeps, what it drops, and the check that follows"
 card: "reduce a surface with spw emit pack and --host brief; it keeps title, audience, claim, proof, and door and drops status, provenance, as_of, and limits"
 index: "expand an index with spw expand; digests keep their source-relative links, so run spw resolve on any copied digest"
 wonder: "fill a template with spw emit expand and --bind; open _ holes stay open for the reader and spw emit holes counts them"
 outline: "orient with spw outline; it hides anchors, particles, door, cold_open, and ?[ ] wonders, so read those by eye"
 rename: "rename an anchor with spw refactor only beside a search for path refs to it; refactor renames the particle alone"
 compare: "compare revisions with spw delta; it reports labels and counts, not status changes, so read claim moods by eye"
 commands: "recipes use canonical command names only, never aliases, and never a placeholder such as <roots>"
}
```

Append these two keys to `^["gate"]` (current `:156-161`):

```
 voice: "the structure gate checks cold_open length, digits, and continuity phrases; the audio emit check reads the whole packet only"
 readings: "npm run spw -- lattice .spw/caches/2026-09-30 lists appositions; it also counts appositions quoted in strings or written on # lines"
```

**Design notes.**
- `width` excludes indent, which resolves the water:130 ambiguity.
- `ascii` carries its own expiry. Canon `apposition.spw:45-47` allows these characters; the rule is a workaround for the tool defects in §1.1.4.
- The `%` step of the flow schedule is **not** written as "forecast". That mapping is (c) only. `docs/learn/index.spw:60` `measure_first` is about effect levels, and canon's one forecast surface writes a forecast as `?<next>` (`.spw/applications/symmetry/symmetry-forecast-projection-sound.spw:6,11`). Prediction is therefore expressed as the act-consequence pair `?{…} ~<prediction>` (`composition-forms.spw:38-44`), which both `inspect compose` and the AST recognize.

### 2.2 Vocabulary additions (c)

Single-line sets, which the gate's `readVocabulary` (`spw-cut-gate.ts:143-154`) already reads.

```
 clock: #[ turn, minute, hour, day, week ]
 transform: #[ expansion, comprehension, reduction, transformation, comparison ]
 reading: #[ lens, neighbor, say, confidence ]
```

- `clock` and `transform` go in `^["statements"]`; `reading` goes in `^["lenses"]`.
- `season` is deliberately not a clock value, because `season` is already an axis (`vocabulary.spw:37`).

### 2.3 Gate checks to add to `scripts/analyzers/spw-cut-gate.ts`

All of these are checkable. The prototype is `synth/gate-ext.mts` (96 lines), and each check fired on `synth/neg/cut/bad.spw`.

| Id | Rule | How | Level |
|---|---|---|---|
| L1 | Indent equals string-aware brace depth (`{ [ ( <<`) | Line scan with strings and apposition bodies blanked (`legib/gate_probe.py`) | fail |
| L2 | `#>` preceded by a blank, opener or closer, and followed by a frame or binding | Line scan | fail |
| L3 | Blank line, anchor or particle before each top-level frame | Line scan | warn |
| L4 | Particle line matches `^\s*#:[a-z_]+ #!\S+( ~#[a-z_]+\([^)]*\))?$` | Regex | fail |
| L5 | Statement, claim or hypothesis is 35 words or fewer | Regex on string | fail |
| L6 | At most one prose string of 6 or more words per line; closed bare-word sets exempt | Line scan | warn until water:33 and :138 are fixed |
| L7 | Outside strings, 88 columns or fewer, excluding indent | Line scan | warn |
| L8 | No `'` or non-ASCII outside `"…"`, including apposition bodies | Generalizes `:262-264` from a `#`-line warning to a code-wide failure | fail |
| V1 | An `^"emit"` card has `cold_open:` | Frame body | warn until backfilled |
| V2 | `cold_open` is 25 words or fewer | Frame body | fail |
| V3 | `cold_open` contains every `continuity` phrase after the `\|` | Frame body | fail |
| V4 | No digits in `cold_open` or in `~#say(…)` bodies | Frame body plus AST Annotation | fail |
| V5 | No `!probe{ "…" }` string repeats across files | Corpus pass | fail |
| M1 | An anonymous apposition body recurring 2 or more times gets the warning "name it" | AST Annotation `apposition.anonymous`. Reads the tree, so strings and `#` lines never count | warn |
| M2 | A named apposition name is in `reading` | AST | fail |
| M3 | `~#…(` on a `# ` line gets "invisible to the tree" | Line scan | warn |
| M4 | A relative link never climbs out of the cut (write root-relative instead), and no link targets a `readings/` root | AST PathRef | fail |
| A1 | `^["arc"]` has clock, archetype, steps, counts and limit | Frame body | fail |
| A2 | The clock is in `clock` and is not a system clock (beat, pulse, epoch; `operational-field.spw:46-50`) | Frame body | fail |
| A3 | `steps:` is a `<< >>` schedule | Frame body | fail |
| A4 | The arc's file has a `feeds` edge | Frame body | warn |
| A5 | In `stops:`, every `?` entry is followed by a `~` entry | AST Stream `sequence.expressions`. The pair is two entries joined by a null separator | fail |
| R1 | Any `command:`, `~#command:` or `~#run:` string names a canonical command (not an alias) and has no `<placeholder>` | Imports `COMMANDS` from `packages/spw-cli/src/commands.ts` | fail |
| R2 | Recipe `kind` is in `transform` | Frame body | fail |

**Gate fixes that the prototype turned up (b, verified).**
1. **AST findings report one line too late.** The gate adds 1 to span lines that are already 1-based (`spw-cut-gate.ts:200,208,211,320`). On a probe, an unresolved ref on line 20 is reported as `:21`, and a lens on line 25 as `:26`.
2. **An anchor inside `#[ ]` disappears silently.** `a: #[ #>meta_inside ]` produces no particle binding, so the "binds nothing (inside a set/facet…)" check at `:201` never fires, although `contract.spw:61` forbids the placement. Fix: scan the code-only text for `#>` tokens absent from `particleBindings`.
3. **`--emit` ignores the cut's consumer root.** It spawns with `cwd: REPO` (`:354`), so it fails on any scratch cut ("Path is outside the consumer root"; 11 of 13 files failing). Fix: run in-process, or with `cwd` set to the cut's consumer root.
4. **Add `--host audio --strict-continuity`** to `--emit` once V1 is satisfied. Keep V3, because the audio check passes on the title or door (§2.4).

### 2.4 What the checks find in current content (b, verified)

- **`vocabulary.spw` fails the cut's own publishing gate.** `emit pack --host brief --strict-continuity --strict-positive` exits 2: "missing anchors: closed sets", because the claim says "a closed set".
- **`contract.spw` fails audio** with "missing anchors: sourced; addressable" (exit 2). Brief passes.
- **V3 catches what the audio gate misses.** `trails/index.spw` and `trails/readings.spw` exit 0 under audio because their `~#door` carries "handoff" and "overlay". Their `cold_open` lines carry neither, so V3 fails both.
- **V4:** the merged water sketch's `~#say(cold water sinks until about 4 C, …)` fails, because the number belongs in the claim.
- **L6:** water:33 and water:138.
- **Subvoc arc sketches** use `^["order"]` plus `^["door"]` and mix `feeds` (which actually encodes nesting) with `hands_off`. Rewritten to `^["arc"]` with exit through `feeds` only, as in `synth/root/cut/trails/arcs/lesson.spw`, they pass A1 through A5 and the existing gate.

---

## 3. Planned surfaces for the cut

Paths are relative to `.spw/caches/2026-09-30/`. Every surface follows the existing header, emit, provenance and edges contract, and every research claim links a `#>src_` anchor.

| Path | Anchor | Form / layer | Purpose and contents | Status |
|---|---|---|---|---|
| `spw/index.spw` | `#>meta_spw` | index / semantics | `^["tree"]` routing to reading/ and transformations/ | (c) |
| `spw/reading/index.spw` | `#>meta_reading` | index / semantics | Tree for legibility, practice, highlighting, voice | (c) |
| `spw/reading/legibility.spw` | `#>meta_reading_legibility` | field_guide / semantics | The left edge as a score; the line-start counts; anchors as caesuras; the five roles of `#`; read-aloud budgets (Brysbaert); the `cold_open` loss rule. Keystones carry claim statuses | (c) |
| `spw/reading/highlighting.spw` | `#>meta_reading_highlighting` | comparison / reference | Construct-by-layer matrix (§1.1) with `as_of` plus VS Code 1.139 and the extension version (currency rule, `contract.spw:80`); "never color-only" list; palette, color-vision and contrast table. Claims: Hannebauer #!settled for novice correctness; Sarkar speed #!emerging; color inflating confidence #!speculative | (c) |
| `spw/reading/practice.spw` | `#>meta_reading_practice` | protocol / pragmatics | Exercises E1–E9 below, each with a command and a research status, plus the settings presets (§5.4) | (c) |
| `spw/reading/voice.spw` | `#>meta_reading_voice` | field_guide / pragmatics | Say lines; spoken names for sigils (reader vocabulary, `operators.spw:27-44`); the "say" versus "explain" distinction (Fox et al.); one instrumented read-aloud probe replacing the 48 templated copies | (c) |
| `spw/transformations/index.spw` | `#>meta_transformations` | index / semantics | Tree | (c) |
| `spw/transformations/recipes.spw` | `#>meta_recipes` | protocol / pragmatics | One nested `^["recipes"]` frame per surface kind (card, index, wonder, registry, arc, trail), each with `kind`, `command`, `keeps`, `drops`, `check`. Sample `synth/root/cut/spw/transformations/water.spw`: gate pass, brief and audio exit 0, R1 and R2 pass, commands re-run | sample (b) |
| `spw/transformations/calibration.spw` | `#>meta_calibration` | protocol / pragmatics | Predict then check by hand: write a blank card, run `spw census`, compare with plain `diff`. Lists which instruments are untrustworthy until fixed (census fragments, lattice strings, outline). Ethics (`cli.spw:117-124`). The census analogy marked #!speculative | (c) |
| `spw/transformations/comprehensions.spw` | `#>meta_comprehensions` | probe_battery / creative | The Llull wheel (lens × claim × era) as a by-hand recipe; cells leave `~#hypothesis: "_"` open. Ladder rungs are **not** difficulty levels (`form-ladders.spw:80-81`); tunable complexity goes through grain (`representational-disclosure.spw:111-116`) | (c) |
| `trails/index.spw` | `#>trails_index` | index / pragmatics | `^["tree"]` plus a `^["bundle"]` handoff digest of the closing rungs. Links in bundled frames are root-relative until `expand` rebases them | sketch (b) |
| `trails/arcs/{wonder,lesson,live,day,season,family}.spw` | `#>arc_<name>` | trail / pragmatics | One `^["arc"]` each. Clocks: wonder `turn`, lesson `minute`, live `minute`, day `hour`, season `week`, family `turn`. Archetypes from `surface-archetypes.spw`. The season fills only the owner's endpoints (2026-10-01 to 2027-01-04) and leaves movement boundaries as `_`. The live arc refuses to rank chatters. The family arc lets the youngest speak first | lesson rewritten and verified; the rest are sketches |
| `trails/water-density.spw` | `#>trail_water_density` | trail / pragmatics | Five stops alternating anchors and `?{…} ~<prediction>` | sample (b): gate, A5 and audio all pass |
| `readings/protocol.spw` | `#>meta_readings_protocol` | protocol / pragmatics | The overlay convention: an external `@readings` root; a `^["reading"]{ of, as_of, #:claim #!status, held, ~#say(…), ~#(…) }` shape; promotion by recurrence; one-way links; no personal readings in the cut | (b): the subvoc overlay resolved 6/6 cross-root |
| `registries/sources/meta.spw` | `#>src_meta` plus one `#>src_<author>_<year>` per §1.4 work | bibliography / reference | Required by `contract.spw:78`; the gate fails sourced surfaces without it | (c) |

---

## 4. CLI ergonomics and talkability

### 4.1 Ranked changes (c, each grounded in a (b) defect)

Ranked by noticeable payoff per unit of effort. Effort: S is under 2 hours, M is about half a day, L is more.

| # | Change | Where | Test | Effort | Move |
|---|---|---|---|---|---|
| 1 | Strip `#fragment` before `known.has` and `fs.access`. Count anchored refs as file edges, add `anchored: N`, verify anchors as `resolve` does. Resolve root-relative refs from the consumer root | `spw-seed/src/math/corpus.ts:196-209` `analyzeTopography`; `spw-cli/src/corpus-scan.ts:198-201,260-271` `scanCorpus` | Fixture `a→~"./b.spw#x"` gives `broken=0` and b is not an orphan. On the cut, census and resolve agree; `registries/sources/matter.spw` (cited 17 times) has `in > 0`; hubs are counted once | S | check |
| 2 | Emit cards whose values survive parsing: plain keys with commas for tag, set and path values; numbers as atoms, not `"24"` | `view.ts:119` `metaBlock`/`facet.str`; `emitHeader` | Parse census, graph and delta cards: no valueless Annotation. `synth/root/card.spw` is the target shape | M | predict/check |
| 3 | Fill in next steps via `emitRecommendations({command,purpose,cost})` with `shellArg(roots)` | `inventory.ts:321-326`, `map.ts:299-303`, `analyze.ts:290`, `formula.ts:351` | `census cut` next card contains `spw graph cut`, no `<` | S | plan |
| 4 | Show anchors, `#:claim #!mood`, `?[` wonders, `~#door` and `cold_open` in the outline. Take depth from brace depth, not indent. Truncate in the middle so `#anchor` survives. Add `--arc` (questions, schedules, say lines, doors) | `view.ts:222,231,234,269,292-309` `skimOutline` | Water outline lists :146 wonder and 10 claim moods; `limits` at depth 4; the trail shows predictions | S/M | reflect |
| 5 | One fatal handler: a single `spw <name>:` prefix and exit 2 on usage errors | `scripts/spw.ts:5-8`; `inventory.ts:221-224`; `map.ts:189-192`; `geometry.ts:315-318`; `analyze.ts:152`; `commands.ts:123` | Table-driven over `COMMANDS`: `--zz` gives exit 2 and stderr starting `spw <spec.name>:` | S | — |
| 6 | No vacuous passes: a missing root gives "nothing to check" and exit 3 | `resolve.ts:47-60,224`; `lint.ts:160` | `resolve --from nope` exits 3 with empty stdout | S | check |
| 7 | `census --blank` writes the product card with `_` holes (emit's "bare `_`"). `--against <card>` reports each facet with `measure` verdicts (match / drift / undeclared / unmeasurable). Output is reader-owned and never stored | `inventory.ts:217` runner; reuse `mass.ts:107-147` verdicts | A filled guess for `cut`: files match, links drift +8, broken matches once #1 lands | M | **predict** |
| 8 | `delta --facets`: align two cards by frame path and key and print `links: 26 → 25`. `--moods` keys particle bindings by `#>` anchor. Call it `--moods`, not `--readings`, which is already the lattice alias | `delta.ts`; seed `canonical/particles.ts` `particleBindings` | Before/after pair reports `water_hydrophobic #!contested → #!emerging` | M | compare |
| 9 | `expand`: rebase relative links to the host file, re-indent to host depth, accept `@root` and `path#anchor`, apply the consumer-root guard. Fix the first-line swallow in `renderExpandResult` | `expand.ts:94-102,109`; `emit/template-fill.ts:326-335` | Digest copied beside the index resolves 100%; `#>${anchor}` template keeps its anchor | S/M | compare |
| 10 | Canonical names in help titles, headers, JSON `command` and error prefixes; did-you-mean suggests canonical names only | `run.ts:26,41,45`; `skim.ts:16,38,54,100`; `profile.ts:46,54-59,175`; `geometry.ts:159,411,529`; seed `geometry-inspect.ts:215`; `mass.ts:234-257` | Per spec: help line 1 and `--json .command` equal `spec.name` | M | talk |
| 11 | `spw --version`/`version` (from `package.json`, retiring `envelope.ts:52-55`); `spw help <cmd>`; an unknown command prints a 2-line stderr hint, not 106 lines on stdout | `run.ts:13-37` | Exit 0; `help census` output equals `census --help` | S | talk |
| 12 | Accept `path#anchor` wherever a file is accepted. On a directory, print a hint and exit 2. `cite` must never print a raw ENOENT | `skim.ts:28-35`, select, fingerprint, `cite` | `outline f.spw#a` shows only that frame; `fingerprint cut` exits 2 with a hint | M | talk |
| 13 | `lattice` reads the tree: skip strings and `#`/`//` lines, report paren and colon separately, add `--recur` (anonymous bodies sharing a `mask`) | `apposition-scan.ts:1-7,36,94,105-165` | `contract.spw` paren count goes 3 → 0; the vault's repeated reading is listed | M | reflect |
| 14 | Separate identity: rename `~#fingerprint` to `memo_key`; add `content` (sha of sorted paths and bytes); add a `--line` one-sentence summary per collate command; move `under`/`memo` facets off stdout | `inventory.ts`, `corpus-memo.ts:8` | `cp -R` plus `touch` leave `content` unchanged; `--line` is ASCII and at most 100 columns | M | share |
| 15 | `pulse --stdin` reports `plannedSource` and `wouldChange` | `mutation-automata.ts:621,639` (fields at `:562,640`) | Same buffer: disk and stdin give the same edit count | S | plan |
| 16 | `refactor anchor:` also rewrites `~"…#old"` refs | `semantic-edit.ts:280-297` `renameParticle` | 3 refs rewritten on the cut | M | — |
| 17 | `format`: drop `-w` for width (it means `--write` in `pulse.ts:244`); print a write receipt; fix "0 need."; `--check --diff` uses `diffLines`; `layout` stops treating `#[`/`#topic` as comments; honor a declared indent unit | `format.ts:153,394-410,509-510,611`; `canonicalize.ts:257-265` | Water unchanged under `layout`; one wrap gives a one-hunk diff | S/M | compare |
| 18 | JSON hygiene: no trailing text under `--json`; an error envelope on flag errors | `mass.ts:253,257`; arg parsing | `measure --json \| jq .` parses | M | — |
| 19 | Honor `NO_COLOR` and `!isTTY`; truncate to terminal width; `SPW_ASCII=1` glyph fallback | `init.ts:12-14`; `view.ts:126-136,293-294`; `scripts/analyzers/spw-syntax-validate.ts:229-267` (prints ANSI even with `NO_COLOR=1`, re-seen this pass) | Snapshots with `NO_COLOR=1` and `columns=60` | S | — |
| 20 | Audio speaks the claim; `--host breath [--words 20 --wpm 150 --compare <card>]`. A delayed prompt is recommended (Thiede et al.) | `emit/codecs.ts:276-300` (claim at `:282-290`); `EMIT_HOSTS` at `emit/types.ts:21-31`; dispatch at `codecs.ts:10` | Water audio 2/2 continuity without `cold_open` | S/M | say |
| 21 | Replace `--stamp` with `--cut` in examples | `commands.ts:528`; `inspect.ts:270`; canon `cli-command-surface.spw:157` | Parse every root-help example with its command's parser | S | — |
| 22 | Teach canonical names: npm scripts for the 12 canonical commands that lack one; docs; canon `cli.spw:12` adds fingerprint, lint and resolve; `:14` adds `fp`. Note `spw:lint` would collide with `lint:spw` | `package.json:102-121`; `docs/runtime/md/sense-loop.md:14-18`; `docs/learn/worked-cli.md:16-77`; `CLAUDE.md:82-103` | Every canon command has a script; a grep finds no alias taught as the primary name | S | talk |
| 23 | `spw tour [root]` prints the canon schedule `<< ~ ; ? ; % ; ! ; * ; ^ >>` with filled commands and questions; runs nothing unless `--run`; ends at `^` with "write a `^["reading"]{}` in your own root" | New command, collate group | Golden output; never writes | M | first run |
| 24 | Lazy `import()` per command and an esbuild-bundled bin | `commands.ts:1-48` | Idle `-h` is already 0.47–0.50 s and the import graph about 0.22 s, so this is low priority | M | — |

### 4.2 Error-message rewrites (b before, c after)

| Case | Before | After |
|---|---|---|
| Path outside the root | `spw: Path is outside the consumer root: ../x.spw` | `spw outline: ../x.spw is outside this workspace (consumer root: .)` followed by `spw reads only under the folder that holds .spw/. Run it from that workspace or declare a root in .spw/workspace.spw; spw roots lists them.` |
| Unknown flag (exit 1) | `spw census: unknown flag --jsn` | `spw census: unknown flag --jsn. Did you mean --json? (spw census --help)`, exit 2 |
| Renamed flag | `spw-pulse: unknown option "--stamp"` | `spw pulse: --stamp is now --cut (banks a stencil for spw mutate --from)` |
| Directory given | `spw skim: cannot read cut` / `spw fingerprint: EISDIR…` (exit 3) | `spw outline: cut is a directory; outline reads one file. Try: spw tree cut` |
| Anchor given | `spw cite`: raw `ENOENT … '<tmp>/…#…'` with **no prefix**, exit 1 | `spw cite: cut/matter/water.spw#water_density_max names an anchor; pass the file, or bundle the anchor with ={ ~"…#water_density_max" }` |
| Nothing checked | `all citations resolve` (total 0, exit 0) | `spw resolve: nothing to check; nope does not exist`, exit 3 |
| Query positional | `spw query: unexpected argument cut` | `spw query: roots follow --from. spw query --from cut …` |
| Unknown command | 2 lines plus 106 lines on stdout | `spw: unknown command "tour". Did you mean form, mount, tree? (spw help lists all)` |
| Double prefix | `spw: spw doctor: unknown option --wat` | `spw doctor: unknown option --wat (spw doctor --help)` |
| Format summary | `spw-format: 1 file(s) scanned, 0 need.` | `spw format: 1 file checked, 0 would change` |

Two existing messages are worth copying elsewhere:
- `expand` on a missing anchor lists the anchors that exist.
- `doctor` pairs each `fail:` with a `fix:` command.

### 4.3 Naming, homonyms and flag consistency (b)

**Homonyms.**
- **cut** has three meanings: the dated reference cut, `pulse --cut`, and `delta`'s "Compare two cuts" (`commands.ts:227`).
- **expand** has two: `spw expand` (transclusion) and `spw emit expand`, which its own help calls "Fill". Proposal (c): rename the latter `emit fill`.
- **hub** gets five different counts:
  - census `roles hub:4`
  - census `^["hubs"]` with 8 entries, 4 of them anchors
  - graph `~#hubs: 12`, which includes fragment pseudo-nodes (`map.ts:242`)
  - density `hubs=14`
  - atlas: 5 load-bearing files
- **lens** has four meanings:
  - the LSP `#:` kind
  - `~#lens()`
  - `// lens:`
  - emit's `lenses:`
- **readings** is both a `lattice` alias and the overlay concept.
- **surface**, **measure** and **read** are also overloaded.
- (c) Add a `^["homonyms"]` frame to `.spw/conventions/cli.spw` that gives each word one owner, following `cli-command-surface.spw:161`: "Do not invent a second metaphor for the same product."

**Flags.**
- Row cap is spelled `--limit/-n/--top/--hubs`, all one flag in graph (`map.ts:98`).
- Roots are positional in some commands, `--from` in `query`, and `--root` in others.
- `--depth` has three meanings, `--profile` four.
- `-w` means width in `format` and write in `pulse`.
- `--json` appears on 35 of 40 commands; there are at least 6 JSON shapes. (a) `cli.spw:101`'s envelope law covers only new products.
- `census cut -n` silently accepts the missing value.

**Talkability.**
- Root help already pairs each command with a question ("what is present?"; `commands.ts:509-517`). That is the best talkability asset in the CLI, and the learning docs teach the alias spine (invent/map/analyze/skim) instead.
- No canon line says how "spw" is pronounced.
- Commands that read as sentences: census, graph, outline, tree, lint, resolve, expand. Weak: density, form, stack. Commands that need the metaphor law (`cli.spw:45-51`): lattice, taste, pulse, beat, cite, atlas. `ls` collides with Unix.

### 4.4 Shareable outputs (c, format verified)

`synth/root/card.spw` is the target: one comment line naming the command, date and content id; one frame per line; plain keys with commas; `path` values that are also valid inputs; a `^["limits"]` frame; a filled `^["next"]` step.
- It parses with all 20 values typed.
- The `~#k: #tag` variant loses 2 of its values.
- Paste it in chat inside a ```spw fence, so it stays plain-text-first (`shelves.spw:33`).

---

## 5. Rendering

### 5.1 Plain-text rules (for authors; enforced by §2.3)

- The left edge is the outline.
- Anchors sit at boundaries.
- Case before mood.
- One prose item per line, at most 35 words.
- 88 columns outside strings.
- ASCII outside strings.
- No meaning carried by color alone; status, valence, anchors, nesting and links must be recoverable from glyph and position (WCAG 1.4.1; `shelves.spw:33`).

### 5.2 Terminal rules (for the CLI; c, grounded in b)

1. One card per product, as canon requires: "Disclosure never renames identity" and one card per disclosure (`representational-disclosure.spw:45,147`). Today stderr `^["census"]` and stdout `^["corpus"]` restate the same facts under different keys and id lengths.
2. Every card states what it cannot see in a `limits` frame. Example: census roles are by degree, and the formula scores are heuristics.
3. Every bounded view states what it omitted (`cli.spw:100`). Outline and brief currently omit silently.
4. Width-aware truncation that preserves `#anchor`; `NO_COLOR`/`isTTY`; an ASCII glyph fallback.
5. Default to a compact card (about 9 lines against 95 today). The long card goes behind `--full`.
6. Cards must stay deterministic across runs: no timestamp or memo facets on stdout.

### 5.3 Editor rules (c)

- **Color carries sigil family only**, in five or six muted families: `^`; `?!`; `~@` and paths; `%$`; `=`; `#`.
- **Particle aim is shown by typography:** `#>` bold with a ruler, `#:` regular, `#!` italic.
- **Strings, including `?["…"]` questions and apposition bodies, use the default foreground** as one prose scope. Prose is the voice channel.
- **Claim status only in an opt-in axis mode**, as glyph inlays (● settled, ◐ contested, ○ speculative, × refuted) or a lightness ramp, never red and green.
- **Valence only in valence mode**, with a palette that carries no good/bad connotation.
- **Color as feedback:** highlight where the reader's predicted role differs from the parser's (Hannebauer et al.'s "feedback channel").

### 5.4 Practice modes: what exists and what to add

The presets are scratch JSON at `synth/presets/*.json`. Each is valid JSON using real setting and color ids from `package.json:154-205,230-253`. I did **not** load them in VS Code.

| Mode | Today (b) | Caveat (verified) | Add (c) |
|---|---|---|---|
| full | `full.json` | — | — |
| shape-only (weight, italic, rulers) | `shape-only.json`: all 23 `spw.*` colors set to #BBBEBF; semantic tokens off for `[spw]` | TextMate colors remain | A TextMate neutralizer, or `spw.reading.mode: shape` |
| one axis: particles | `one-axis-particles.json`: only `highlightAnnotations` on | `~#k:` and `=exp` compounds stay colored (`deco:272,424-425`); `!` inside `#!` colors with operators | Gate compounds behind `highlightCompounds` |
| peek | `peek.json`: hints `offUnlessPressed` (Ctrl+Alt) | Inlay settings need a server restart | `didChangeConfiguration` |
| bare | `bare.json` | Depth and incoming-reference hints are ungated (`disp:1285-1350`); TextMate colors remain. Fully bare means Language Mode set to Plain Text, which also drops the LSP | Gate those hints; "Spw: Toggle Bare Reading" command |
| one axis: claim status | none | Status cannot be targeted, because semantic tokens carry no status modifier | Parser-driven tokens with status modifiers (§6.1) |
| reveal (cursor line or mismatches only) | none | — | `spw.reading.mode: reveal` |
| JetBrains | LSP toggle (`SpwLspConfigurable.kt:28`), TextMate bundle page, gutter settings | No color page; grammar drift | Generate `ijtm` from `tm` |
| terminal | already monochrome, except `init` | `spw-syntax-validate` prints ANSI | `NO_COLOR` |

**Exercises for `spw/reading/practice.spw`.** "Today" means runnable now.

| # | Exercise | Instrument | Basis | Status |
|---|---|---|---|---|
| E1 | Read 10 lines uncolored, write the role of each token, then reveal | `spw read --lines a-b`, then `spw inspect source --stdin --through tokens` | Generation, pretesting | today |
| E2 | One-axis day | Particles preset | Fading, expertise reversal | today |
| E3 | Claim-status axis | Needs §6.1 | Calibration | (c) |
| E4 | Shape-only week, then monochrome | Presets | Fluency, which lowers JOLs without lowering learning | today |
| E5 | Write a census forecast card, run census, compare. Predict again the next day | `diff` today; `census --against` later | Delayed JOLs; transfer to census is (c) | after fix #1 |
| E6 | One line per expected digest, then `spw expand` | — | Explain before expanding | today; note the D1 defects |
| E7 | Read aloud for about 30 s (about 90 words), mark pauses, write `~#(…)`, name it when it recurs | `spw lattice` | Say versus explain; production effect, hedged | after fix #13 |
| E8 | Rate 50–100% that a source supports the statement as worded, open the registry, compute a Brier score | Registries | Calibration | by hand |
| E9 | Predict which rule changes what, then check | `spw format f --profiles canonical,layout,pretty`, then `--pulse` | Attribution | today |

**Cross-frame grain ladder.** Each grain hides something:

| Grain | Tool | Hides |
|---|---|---|
| point | `inspect --through tokens` | — |
| line window | `read --around N` | — |
| card | `emit brief` | status |
| outline | `outline` | particles and wonders |
| surface | `cat` | — |
| digest | `expand` | unrebased links |
| corpus | `census`/`graph`/`lattice` | — |

---

## 6. Tooling beyond the CLI, ranked (c)

1. **Parser-driven semantic tokens.**
   - Build them from `parse().tokens`, replacing the scanner at `sem:105-412`.
   - This fixes apposition bodies, handle splits, `#` prose punctuation, `~#(` and `$%` in one place.
   - Add legend modifiers for particle aim and claim status, which enables E3 and the reveal mode. The token taxonomy itself belongs to the parallel study.
2. **Decoration repair.**
   - Stop the `'` mask at newlines and mask `# ` lines and apposition bodies (`deco:89-109`).
   - Gate the `~#k:` compounds (`deco:272,424`).
   - Map the status tiers to the cut's claim set or retire them (`deco:147-154,391-403`).
   - Make the valence descriptions neutral and fix contrast: #BF8803 is 3.12:1 and #1B8F6A is 4.05:1 (`package.json:249-253`).
3. **LSP apposition awareness.**
   - Index APPOSITION tokens (`server-index.ts:1165-1213`).
   - The wonder summary should read `~#lens(…)` and `~"…" ~#neighbor(…)` (`display.ts:302-308`).
   - Let the wonder hover win over form geometry (`display.ts:544-548` versus `:628-654`).
   - Fix `ANNOTATION_RE` matching `#lens` inside `~#lens(` (`display.ts:35`).
   - Keep the `'lens'` AnnotationKind for `#:` until it is renamed "case", and relax `isAnnotationKind` (`extensions/vscode-spw/src/lsp/custom-requests.ts:288-312`) first.
4. **Live settings.** Add a `workspace/didChangeConfiguration` handler (`stdio-server.ts:413-479`). Gate the depth and incoming hints. Drop the hint that restates the line.
5. **Fragment-aware hover.** At `display.ts:960-982`, reuse `fragmentRange` from `navigation.ts:63-107` so hover previews the anchored node. That makes hover the in-editor version of `expand`.
6. **`spw.reading.mode` setting.** Wire it to the existing `reading` axis (`packages/spw-seed/src/dialect/types.ts:54`), which today is display-only (`profile.ts:99`, `disp:430`). Add commands that switch between the §5.4 presets. (a) `vscode-spw.spw:111`: "Reading profiles change disclosure, not parse or reconcile truth."
7. **JetBrains parity.**
   - Generate `ijtm` from `tm` at build time.
   - Spellcheck strings and apposition bodies (`SpwSpellcheckingStrategy.kt:8-10`).
   - Render `cacheReflection`.
   - Make gutter icons navigate.
   - Open only real cards in Spw mode: `form --spw` prose is currently highlighted as Spw (`SpwCliRunner.kt:92-97`).
   - Show stderr's next card.
8. **Editor instruments print the equivalent CLI command.** Affects `instruments/commands.ts:105-150`. Palette names would match CLI names ("Probe & Measure Census" is not census). Fix the alias titles: "Spw surface stack" (`:134-136`); JetBrains `SpwCliInvocation.kt:34`.
9. **One wonder scaffold generated by `spw snippet emit`.**
   - Sources today: `canonical/snippet.ts:98-108`, `snippets/spw.json:46-57`, and a JetBrains live template that does not exist yet.
   - The scaffold carries `~#lens(…)`, `#:claim #!speculative`, a `~"…" ~#neighbor(nearest)` line, and the 9 cut depths.
   - The VS Code pick list lacks 4 of the 9 depths.
10. **Plan tooling.** Add a `forecast` stream type to `spw:plan:stream` and the schema (`_schema/wip.spw:262`), so a `surprise` can cite the forecast it missed. Keep the episode block at canon's three beats, `~[scene] ![change] *[verify]`; `^[affords]` appears in only 5 of the last 200 commits and is not canon.

---

## 7. Theory questions for the designer

1. **Which channel carries readings?** (a) `hash-resonance.spw:8` prefers `#` for marginalia, but `#` prose leaves the AST, while appositions are countable. Should the cut rule (readings are appositions, never `#` lines) become canon?
2. **Apposition bodies:** fix the tools to allow `'` and `%`, as `apposition.spw:45-47` permits, or amend canon to the cut's ASCII-only rule?
3. **Indent unit:** keep one space (the cut is 100% consistent) and fix `outline` and `format`, or move to two spaces? Either way, should `indent` become a declared contract key?
4. **Say lines:** is `~#say` a sanctioned named reading? Should the author's `cold_open` and a reader's `~#say` be compared by a tool? Should the reading-name set (`lens, neighbor, say, confidence`) be closed across canon or per cut?
5. **Where does a prediction live?** As the act-consequence pair `?{…} ~<prediction>` (used here), as `?<next>` (`symmetry-forecast-projection-sound.spw:6,11`), or as `%` in the flow schedule? Is the schedule `<< ~ ; ? ; % ; ! ; * ; ^ >>` only a memory aid (`cli.spw:49`), or should a learning loop be runtime-checkable?
6. **Tunable complexity:** given that ladder rungs are "not developmental stage" (`form-ladders.spw:80-81`), is grain (`representational-disclosure.spw:111-116`) the sanctioned complexity dial? Should personas be `@(reader)` scopes, given the body attaches to the Expression, not the `@`?
7. **Valence:** canon says charge-neutral (`valence-architecture.spw:38-39`), while code (`VALENCE_PARTICLES`, `package.json:249-253`) says bane is "hazard/error". Which wins, and what palette expresses "material quality, not merit"?
8. **Claim status:** glyphs, spoken names, or both? Should status ever be colored?
9. **Card format:** CLI cards use `~#k: v` datums (`apposition.spw:25`), which detach tag, set and path values. Change the parser so a datum keeps its value, or change the card format to plain keys?
10. **Reader roots:** declare them in the tracked `.spw/workspace.spw`, or in an untracked local manifest? Should corpus walks (`fs-walk.ts:13-24`) skip reader roots by default?
11. **The 48 templated read-aloud probes:** retire them, or replace them with one instrumented probe per surface (V5)?
12. **Vocabulary:**
    - add `domain: practice` for reading and arc surfaces, or keep `meta`;
    - give `celebration` its own season value;
    - make `hands_off` a relation, or route all handoffs through `feeds`, as proposed here;
    - choose arc clocks (`turn … week`) that never reuse system clock names.
13. **Pronunciation and homonyms:** how is "spw" said? Which word owns cut, expand, hub, lens, surface, measure and read?
14. **Calibration memory:** receipts stay local (`cli.spw:117-124`). Should there be an opt-in, consumer-owned ledger, like `atlas --save`'s `.spw/gen/atlas-history.jsonl`? Real calibration needs many judgments (Lichtenstein et al. 1982).

---

**Files.** All under `<scratchpad>/reading/synth/`. I wrote nothing in the repo.
- Contract amendment source: `amend-contract.spw`.
- Amended contract and vocabulary: `root/cut/contract.spw`, `root/cut/vocabulary.spw`.
- Sample surfaces:
  - `root/cut/trails/arcs/lesson.spw`
  - `root/cut/trails/water-density.spw`
  - `root/cut/spw/transformations/water.spw`
- Gate prototype: `gate-ext.mts`.
- Negative fixtures: `neg/cut/bad.spw`, `neg2/cut/lines.spw`, which shows the off-by-one and the silent anchor in a set.
- Shareable card: `root/card.spw` (values attached) and `root/card-tilde.spw` (values detach).
- VS Code presets: `presets/{full,shape-only,one-axis-particles,peek,bare}.json`.
- AST probes: `pb.mts`, `stream-dump.mts`.
- Earlier evidence: `reading/{tm,theme,legib,xform,subvoc,subvoc-vault,cli-ergo,cli-ergo2,verify,verify-hl,verify-xform,verify-cli}/`.