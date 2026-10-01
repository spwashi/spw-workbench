# Spw theory vs. the caches corpus: canon, code, and the pressure points for the 2026-09-30 refactor

I only read the repo. All probe files are in my own scratch folder: `<scratchpad>/understand/theory-axis/` (the verified example) and `.../understand/probe/thermo/` (negative probes). The CLI refuses paths outside the consumer root, so I ran it through `.../understand/spw.sh`, a wrapper that calls `node --import tsx packages/spw-cli/src/main.ts` with cwd set to the scratch folder. Other agents share `understand/`. `understand/rec/optics/` is not mine.

Tags used below: **(a)** canon says, **(b)** code implements, **(c)** aspirational or doc-only.

## Findings

**F1. The operator names are not consistent across the repo.**

| sigil | operators.spw:29-41 (a) | type-affinities.ts:19-31 / register-bank.spw:11-24 (b) | geometry-inspect.ts:55-68 (b) | form-ladders.ts (b) | runtime behaviour, operators.spw:46-59 |
|---|---|---|---|---|---|
| `~` | potential | Potential | potential / path | Potential | deferred wrapper |
| `#` | vibration | Resonance | annotation / resonance | Resonance :407 | reduce args and resonate a register |
| `.` | ground | **Subject** | ground / facet | Ground :427 | property path access |
| `&` | **subject** | Confluence | confluence / merge | Confluence :307 | register confluence |
| `^` | ascension | Integration | integrate / frame | Integration | integrated wrapper |
| `$` | substrate | Substrate | **select / address** (:66) | Substrate :487 | materialize register metadata |
| `=` | configuration | **Set** | config / bias | Configuration :527 | write first arg to a register |
| `@` `?` `!` `*` `%` `<>` | perspective, wonder, action, value, measure, coupling | same | same | same | — |

- "Subject" means `&` in operators.spw but `.` in the code.
- `$` is "select" only in geometry-inspect.ts.
- operators.spw:44 says these names are "reader vocabulary, not a runtime behavior table".
- design-research.spw:329 ("maintain 8 operator limit") and :9 (`@spec: ~"../lib/spw-v0.1.0-alpha"`) are stale. There are 13 OperatorKinds (register-geometry.spw:32).

**F2. The valence pentad disagrees with itself: canon, catalog code and runtime types say different things.**
- (a) valence-architecture.spw:38-39 and :115: the five valences are "charge-neutral… material quality, not moral judgment".
  - boon = generative (:42)
  - bane = "useful constraint, orbital boundary" (:53)
  - bone = ground state (:62)
  - bonk = "precipitative, catalytic… phase-change" (:69-71)
  - honk = "declarative — demands attention without judgment" (:80)
- (a) Runtime quality is four-state BBBH and bonk is only an overlay (valence-architecture.spw:30-35; register-geometry.spw:37, :58).
- (b) The code contradicts both points:
  - `VALENCE_PARTICLES` (catalog.ts:43-49) and autocompletion.spw:30-36 define bane = "hazard / error" and bonk = "Boundary collision, interruption".
  - `RuntimeValence = ModifierKind` (runtime types.ts:41; seed token.ts:20) has five values including bonk.
  - No BBBH type exists in `packages/`, `src/` or `scripts/` (grep for bbbh returns nothing).
  - The canon's own falsifier arguably fires: "If runtime types add bonk to the base quality axis, this bridge note must change" (valence-architecture.spw:34).
- Valence words are lexed as MODIFIER tokens (matchers/modifiers.ts:18). They are not particles, even though autocompletion.spw:30 calls them "valence_particles".

**F3. Particle lattice: the canon names four aims, the lexer makes three of them tokens.**
- (a) directive-lattice PLAN.md:29-33: `⟨stance⟩#⟨aim⟩name`, where `#>` = deixis, `#:` = case, `#!` = mood, `~#` = aspect.
- (b) The lexer makes PARTICLE tokens only for `>`, `:` and `!` (matchers/particles.ts:19-20). `~#` stays ANNOTATION (token.ts:62).
- (b) A particle run binds to the next non-mark node (canonical/particles.ts:24-79). `#>name` is what `~"file#name"` resolves to (particles.ts:10-11; resolve-fragment.ts:23-30). This matches your glossary: the particle is the word, the anchor is the bookmark it leaves.
- (a vs b) The same things go by different names:
  - `#:` is "case" in particles.ts, but "lens" in LSP display.ts:39 and :1041 and semantic-tokens.ts:216.
  - `##>` is listed as a prompt root (autocompletion.spw:39; display.ts:35), but the PLAN (:29-33) says `##` is unoccupied and it does not lex as a particle.
  - `particleMix` counts every `~#` as **aspect = "volatility — content expires"** (particles.ts:111-113, :125-129). That includes appositions, which apposition.spw calls readings, not deferred state.
- `.spw/registries/directive-lattice.spw` (PLAN commit 10) does not exist yet.

**F4. The lens has four incompatible spellings, and each tool reads a different one.**
- (a) apposition.spw:21-26 and :59-68 make `~#lens(x)` the replacement for 397 `// lens:` comments.
- (b) The parser makes it an Annotation with an `apposition` field (references.ts:519-555). `spw lattice` counts it.
- (b) The LSP wonder hint reads only `// lens:` from the `#:depth` line (display.ts:302-304). The apposition is invisible there.
- (b) Emit reads a third form, `lenses: [#x]` (extract.ts:25, :65-69).
- Corpus split outside caches: 254 files use `~#lens(`, 262 use `// lens:`. Canon lens values are a six-item rotation: "ecological zone" ×78, "molecular binding" ×74, and so on.

**F5. Metric handles (`$%[…]`) do not bind to anything.**
- (b) Verified parse: `$%[density.ops]` becomes a bare `$` Operation followed by a sibling `%[density.ops]` Operation, not `$` applied to `%`.
- (b) Handles are only regex-counted: probe-measure.ts:74-83 and display.ts:306-307. Neither binds them to a register or a measure family.
- (a/b) The canonical bound form is a family, `%name{ key: v }`, registered via `^["family"]{…}` (measure-context.spw:30-63; `BUILTIN_FAMILIES` mass/density/authority in measure-protocol.ts:232-260; loader at :441-470). `spw measure` only reconciles `%mass` with `@self` (verified: "no surfaces declare @self with a %mass facet").
- (a) Measure axiom: "%X returns a scalar ∈ [0,1]" (wonder-calculus.spw:46-50). Counts are not measures unless normalized.
- (a) Honest-metric form: `%name { interprets, considers, surfaces, run }`, where "subjective may rank and disclose only" (operational-field.spw:65-72, used at :100-107).
- The corpus fails in opposite directions:
  - caches: 469 distinct handles, each used exactly once.
  - canon: `register.bank_size, register.active_bindings` is pasted into 56 files regardless of topic.

**F6. Linking: fragment refs resolve in `spw resolve` and the LSP, but `spw graph` reports them broken.**
- (b) `~"file#anchor"` is a PathRef.
  - `spw resolve --warn` checks it and gives a `missing-anchor` verdict (verified: `total=6 ok=5 missing_anchor=1`).
  - The LSP navigates to the anchor (navigation.ts:63-69), and its reference graph strips the fragment (reference-graph.ts:126-133).
- (b) `spw graph` and `spw census` do not strip the fragment (corpus-scan.ts:193-208). Every fragment target becomes its own node and is reported in `brokenTargets`. Verified on my corpus: resolve says 6/6 ok, graph says 3 broken, which are exactly the valid fragment targets.
- (b) `@name` roots become bare-name nodes ("entropy", "information"). So caches' `^"dispatch"{ x: @x }` adds a second, name-only edge for the same target (33 files). The pattern was copied from `.spw/index.spw:14` and `:54`.
- (a vs b) inline-composites.spw:52-58 documents `~<role>"path"` as an implemented tagged pathref, and references.ts:262-398 has the branch. But it **never yields a PathRef**: verified at top level, as a binding value and inside lists; it becomes `~<tag>` plus a loose string. This also affects canon, e.g. valence-architecture.spw:133.
- `~<"path">` (the canon wonder "neighbor" form) is not a PathRef either. `~<./x.spw>` is.
- The caches currently contain 0 fragment refs out of 245 path refs.

**F7. By the canon's own definition, `.spw/caches` is not a cache.**
- (a) cache-field.spw:29-30: "There is no single cache — only retention planes with different clocks… A hit must return the same answer as a cold recompute." Planes are defined at :37-83.
- (b) `cache.layer/1` names exactly four planes (cache-layer.ts:8-15; editor-instruments.spw:17-21 and :59): editor_probe_cache, lsp_session_reflection, runtime_cache, corpus_memo.
- (a) The plan schema defines `^["cache"]` as "Derived facts. Recomputed, not hand-edited" (_schema/wip.spw:28-30).
- caches/index.spw:11-12 claims "derived… reflect underlying surfaces" plus `cache.layer/1`. The files have no clock, key, source or recompute path.
- Only the jetbrains and vscode `cache-layer.spw` notes are legitimately *about* the protocol.
- `.spw/index.spw` does not route to caches at all.

**F8. The metaphor boundary.**
- (a) cli.spw:45-51: manufacturing, print, photoelectronics and field language "may aid memory only beside an observable mapping and a stated limit". Counterexample at :50.
- The same rule appears elsewhere:
  - register-geometry.spw:26: a term without domain, map, observable, invariant and counterexample "remains an analogy".
  - operator-atlas.spw:17: an entry must name "the domain where the reading breaks".
  - type-affinities.ts:11-16: analogies belong in "explicit, revisioned semantics profiles".
- "dual-read" is retired from public copy (cli.spw:41, :130). autocompletion.spw:45-49 and representational-disclosure.spw:44-49 still use it.

**F9. Registers and probes.**
- "Register" means three things: the runtime register bank (register-bank.spw), ONF `[reg=facet|set…]` (operators.spw:96-101), and emit voice registers (`spw emit registers` → `#voice_*`).
- (b) At runtime, `?` returns its second argument when the first is truthy, and the register bank records `?` as promote/liminality 0→3 (register-bank.spw:31-36).
- Canonical probe forms are `!probe{ =id[p_hold] }` (flow-protocol-sigils.spw:58-62; snippet.ts:98-110). `!probe{ "prose" }` also works, but nothing executes either form. The LSP only shows the string as a tooltip (display.ts:305).

**F10. Other parser, emit and canon facts that affect the refactor.**
- (b) `k = v` inside `.{}` parses as sibling Identifier / `=` / Literal. `k: v` gives a Binding node. Verified both.
- (b) Emit flattens every `key: "v"` into last-write-wins slots. Verified: two claim facets both named `text` collided.
- (b) Emit's `INCLUDE_PATH` regex misses `[~"…"]` and captures the *tag* from `~<tag>` (extract.ts:22-23).
- (c) lib/spw-v0.3.0/README.md lists 9 strata, but only `architecture/`, `packages/` and `surfaces/` exist on disk. `architecture/index.spw:1` is titled "v0.2.0".

## Tool-support matrix

✓ works · ✗ absent or wrong · ~ partial

| construct | parser | LSP | CLI graph/census | CLI measure / lattice / resolve | emit |
|---|---|---|---|---|---|
| `#>anchor` | ✓ PARTICLE | ✓ symbols, fragment nav | ✗ fragment = broken node | ✓ lint dup-anchors | ✗ (`anchors` means style anchors) |
| `#:k #!v` stack | ✓ binds next node | ~ labels `#:` "lens" | sigil histogram only | particle-census script | ✗ |
| `~"f.spw#a"` | ✓ PathRef | ✓ nav + graph strips `#` | ✗ broken targets | ✓ resolve `missing-anchor` | ~ misses when not preceded by whitespace |
| `~<tag>"f"` | ✗ not a PathRef | ✗ | ✗ | ✗ | ✗ captures tag |
| `~<"f">` | ✗ | ~ neighbor regex (display.ts:308) | ✗ | ✗ | ~ |
| `@n: ~"f"` + dispatch | ✓ | ✓ | ~ bare-name nodes | ✓ | ~ |
| `~#lens(x)` | ✓ Annotation+apposition | ~ colored, hint ✗ | — | ✓ lattice; census calls it "aspect" | ✗ |
| `// lens: x` | ✗ dropped | ✓ hint | — | ✗ | ✗ |
| `$%[a.b]` | ~ `$` + `%[]` siblings | ✓ counted | — | ✗ unbound | ✗ |
| `%family{k: v}` | ✓ `op:%:density` | — | — | ~ only `%mass`+`@self` reconciled | ✗ |
| `as_of:` / `provenance:` | ✓ Binding | — | — | ✗ | ~ slot |

## Canonical examples

Wonder snippet, snippet.ts:103-108:
```
'#>${id=wonder_id}', '?["${question=What holds?}"]{', '  #:depth #!${depth=computational}',
'  !probe{ =id[${probe=p1}] }', '  $%[${metric=Hold}]', '}',
```
Honest metric, operational-field.spw:100-106:
```
?["Which public surface still confuses request epoch with session beat?"]{
  interprets: objective
  considers: #[request_epoch, session_beat]
  surfaces: #[lsp, cli, card]
  run: "grep public activity and hot-session APIs"
```
Plan card and edge convention, `_schema/wip.spw:45-47, 98-107`: `#>plan_<slug_id>` is the "fragment target"; `^["edges"]` lists `needs/feeds/shares/supersedes` with `~"../<slug>/wip.spw"`; "Authored edges are claims… kin… as a prompt, never as a claim."

Apposition degrees, apposition.spw:23-25: `'~#(phrase)'` anonymous; `'~#name(phrase)'` "a reading that recurs, so it earns a key"; `'~#name: value'` datum.

Status vocabulary, operational-field.spw:93-98: `implemented · measured · proposed · interpretive`.

## Recommendations for the caches refactor

1. **Header.** Use `#>slug` + `#:topic #!<domain>` + `#:status #!<epistemic>`. Drop `#:cache …`, `#:layer #!pragmatics` and `~#protocol: "cache.layer/1"`. Files *about* cache planes cite `~"…/cache-layer.ts"` as their subject.
2. **Card.** Add `^["card"]{ gist, as_of, provenance: .{origin: #generated, model: "…", review: #unreviewed}, entry }`, mirroring the plan-schema v2 card. Use `:` (Binding nodes), not `=`.
3. **Links.**
   - Keep one `^["roots"]` and drop `^"dispatch"`.
   - Put typed relations in `^["edges"]{ grounds|refines|analog|contrasts|cites|supersedes: [~"path.spw#anchor"] }`. Use plain `~"…#anchor"` only; avoid `~<tag>"…"` and `~<"…">`.
   - Run `spw resolve --warn` as the gate.
   - The graph needs a one-line fix before it will count these correctly: strip the fragment at corpus-scan.ts:196-201, as the LSP does.
4. **Claims.** Write each claim as a particle stack: `#>claim_id` + `#:claim #!settled|contested|refuted|open`, bound to `claim_id: "…"`, with `~#source(…)` and `~#counter(…)` appositions. Each claim then becomes addressable as `~"file#claim_id"`. Keep claim keys unique per file (emit collision).
5. **Lens.** Write `~#lens(…)` on its own line after `#:depth`; the depth stack binds to it (verified). Never write `// lens:`. The LSP change at display.ts:304 is a tool change, not the writers' job.
6. **Metrics.** Do not mint `$%[novel.handle]`. Use a registered family (`%density{ops, depth, frames}`; proposed status). Or declare new families in one registry surface (`^["family"]{ id, operator: "%", identifier, plane, scope, keys: #[…], scheme, algorithm }`) and cite them as `$%[family.key]`. For subjective questions, use the `interprets/considers/surfaces/run` landmarks.
7. **Nesting and analogy.** Nest frames to depth 3 or more where the ontology is real; binding holds at depth 3 (verified). The style guide's daily-write budget is ≤3 (styles.spw:95-96). Every cross-domain wonder should state where the analogy breaks (operator-atlas.spw:17).

**Verified minimal example.** File: `theory-axis/physics/thermodynamics/entropy.spw`.
- `spw-syntax-validate.ts --strict`: 3/3 pass.
- `spw select … --selector all -q`: every field is a Binding, 3 PathRefs, 3 Annotations; particle bindings are exactly as intended (`#!settled → second_law: …`).
- `spw resolve --warn`: `ok=6`.
- `spw lint`: 0 findings.
- `spw lattice`: `named=3`.
- `spw graph`: 3 false "broken" targets (see F6).
```
#>entropy
#:topic #!thermodynamics
#:status #!interpretive

^["card"]{
 gist: "Entropy is a state function; its statistical reading counts microstates."
 as_of: "2026-09-30"
 provenance: .{ origin: #generated, model: "gemini-3.8-flash-high", review: #unreviewed }
 entry: ~"./index.spw#thermodynamics"
}
^["edges"]{
 grounds: [~"./index.spw#thermodynamics"]
 analog: [~"../../information/shannon.spw#shannon_entropy"]
}
^["claims"]{
 ^["classical"]{
  #>second_law
  #:claim #!settled
  second_law: "The entropy of an isolated system does not decrease."
  ~#source(Clausius 1865)
 }
 ^["statistical"]{
  #>disorder_gloss
  #:claim #!contested
  disorder_gloss: "Entropy measures disorder."
  ~#counter(it counts accessible microstates; visual order can rise as entropy rises)
 }
}
#>wonder_entropy_shannon
?["Where does the Shannon analogy stop being an identity?"]{
  #:depth #!computational
  ~#lens(information theory)
  ~"../../information/shannon.spw#shannon_entropy"
  !probe{ "list operations defined on both; the first missing one marks the break." }
  %density{ ops: 0, depth: 0, frames: 0 }
}
```

## Corrections to `.spw/caches/language-features/spw-resonance.spw`

- **:16, operator alphabet.** It omits `#`, `.` and `<>`. `@` is perspective, not "observer". `=` is configuration, which at runtime writes a register; it is not "constraint". `$` is substrate (materialize register metadata); "select" appears only in geometry-inspect.ts:66.
- **:22-23, valence.** Valences are not "emotional charge"; they are charge-neutral material quality.
  - bane is useful constraint, not danger.
  - bonk is catalytic phase-change and, per canon, not on the runtime quality axis.
  - boon is generative, not "verified".
  - A Rust `Result` framing is exactly what canon refuses (":44 not merely 'success'").
  - The file's wording matches catalog.ts:43-49, so the conflict originates in the repo (F2).
- **:28, "homoiconicity".** `^["x"]{}` is an integrate act plus a frame and a body. There is no quote/eval, and macro parameterization is out of scope (directive-lattice PLAN.md:65).
- **:34, probes and registers.** `$%[…]` does not talk to the register bank; it is regex-counted only. `!probe` bodies are not executed. The bank is session retention, not persistent (cache-field.spw:37-70).
- **:40, dual-read.** "Dual-read" is retired. "Spw card" names a CLI output form. The round-trip is not lossless: `//` comments are dropped from the AST (verified).
- **:56, "fixed semantic physics across dialects".** Contradicts operators.spw:44 and :89 (dialect gate), register-geometry.spw:23 (charge, spin and resonance are interpretive), and type-affinities.ts:11-16.
- **:57, DAG invariant.** Unfounded; the graph reports cycles as normal output.
- **:58, "wonder blocks require depth, lens, metrics".** No lint enforces this, and the canonical snippet has no lens.
- **:66, metric handles.** Invented and unbound, and a count violates the %X ∈ [0,1] axiom.

## Open questions for you

1. **Lens.** Should `lens` be reserved for the `~#lens()` apposition, with `#:` called "case" everywhere, including the LSP? Should emit's `lenses: [#…]` migrate to the apposition?
2. **Aspect vs. apposition.** Is apposition a fifth aim (apposition.spw:33 lists it in the lattice), or should `particleMix` stop counting `~#name(…)` as volatile aspect?
3. **Epistemic status.** Is mood (`#!`) the right aim for settled/contested/refuted? That would make grammatical mood work as epistemic modality. Or do you want a separate `#:claim` case vocabulary, registered the way plan phases are?
4. **Metric binding.** Should `$%[x]` parse as `$`(`%[x]`), i.e. a handle to a measure declaration, with lint flagging handles no family declares? Does that also retire the 56-file `register.bank_size` boilerplate?
5. **Typed edges.** Frame-keyed edge kinds, medial capsule `a<analog>b` (inline-composites.spw:23-47), or a fixed `~<tag>"…"`? Is there a stance cell in the lattice for "points-at-with-role"?
6. **Time and provenance.** Is `as_of` a clock? operational-field.spw:50 says "never share names across clocks". Is `caches/2026-09-30/` really a *cut* (the `spw delta` noun)? Should generated authored content have its own provenance class, separate from "derived surface" (naming.spw:23-29)?
7. **Naming.** Keep the word "caches" for a non-cache, or rename the directory to a noun that doesn't collide with cache-field?
8. **Valence and operator names.** Which source wins, valence-architecture or catalog.ts, and does bonk join the runtime quality axis? Which canonical names win for `.`, `&`, `$` and `=`?
9. **Wonder canon.** The canon's own 563 wonder blocks rotate five depths × six lenses. Is that generator part of canon, or corpus noise the refactor should not imitate?
10. **Analogy discipline.** Should every cross-domain surface carry a required "breaks" frame, making register-geometry's falsifier a lint rule?