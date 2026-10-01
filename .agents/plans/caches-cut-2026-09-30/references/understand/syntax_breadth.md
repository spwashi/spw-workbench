# Syntax breadth for the `.spw/caches` refactor: parse catalog, degradation hazards, and nine verified skeletons

## Findings

**F1. Why `.spw/caches/vscode/decorations.spw:100` degrades.** Lines 101–105 use the valence words as binding keys (`boon: .{…}`, `bane:`, `bone:`, `bonk:`, `honk:`). The lexer takes those five words as `MODIFIER`, not `IDENTIFIER`.
- In `expressionImpl`, the word becomes a charge (`expressions.ts:667-700`).
- `chargeEndsExpression` treats `COLON` as the end of the expression (`:646`), so there is no head term.
- A binding needs `headTerm && COLON` (`:896`), so the `:` is left over. The body's sequence stalls on it, the `{}` never closes, and the whole `^["valence_badges"]` operation backtracks.
- The seed parser reports the stall at the start of the top-level expression (`seed.ts:88`), which is why the warning points at `^` on line 100 and not at `boon` on line 101.
- The whole file then falls back to prose. The probe tree shows `ProseChunk("bane: ")` and similar.
- I reproduced it in scratch: `^"x"{ boon: "growth" }` and `bone: 1` degrade, while `growth:` and `honk_level:` parse. It is the only degraded file among the 208 caches.

**F2. The validator does not show lexer errors.** `spw-syntax-validate.ts:209` copies `output.success`, and it only prints files where that is false (`:227`). Lexer errors are "recoverable", so success stays true. The scratch files with `-3`, `2026-09-30`, a bare `→`, a bare `é`, and unterminated strings all print ✓, even though `parse().errors` is non-empty. I scanned the caches with `parse().errors`: 0 of 208 have lexer errors, so the current writers quote everything. The refactor needs a gate that reads `parse().errors`, not just this validator.

**F3. `~#k: @ref` and `~#k: ~"path"` lose their value.**
- After the colon, the annotation parser calls `choice(pathRefNode, referenceNode, literalNode)` without skipping whitespace (`references.ts:593-605`). `literalNode` skips whitespace itself; the other two don't.
- Result: `~#source: ~"x"` gives a valueless `Annotation(source)` plus a sibling `PathRef`.
- These forms attach correctly: `~#k:~"x"` (tight), `~#k ~"x"` (space, no colon), and `~#k: "string"`.
- Sites affected: 223 outside the caches (for example `.spw/workspace.spw:78`) and 18 in the caches (for example `jetbrains/cache-layer.spw:12`).
- `~#k: #tag` and `~#k: [..]` don't attach either. The list attaches to the expression as a postfix frame instead.

**F4. The tagged path form `~<tag>"path"` never works.**
- The parser first checks whether the `<…>` interior is a path (`references.ts:304`). An identifier tag isn't path-shaped, so it fails right there and never reaches the tag-plus-string branch.
- The result is `~` with a capsule subject, and the string becomes a detached `Literal`.
- `lib/spw-v0.3.0/architecture/index.spw:12-15` (`.. ~<layout-md>"../LAYOUT.md"`) therefore produces no `PathRef` nodes. `spw select --selector pathRefs` lists only lines 6–8.
- No test covers this form.

**F5. Two constructs silently swallow the next line.**
- **Medial capsule.** The right arm of `a<ch>b` has no same-line guard (`expressions.ts:849-863`). `freeze: 2<weeks>` followed by `train: << … >>` on the next line takes `train` as its right arm. The same happens with `?<a, b>` followed by `#topic`.
- **Binding with no value on its line.** A binding whose value is empty on its line takes the next line. `url: https://…` becomes `https:` plus a `//` comment, so the value turns into the next line's `next: 1`.

Both parse as "OK". My scratch checker `archcheck.ts` catches both.

**F6. Constructs that look compound but aren't.**
- **`$%[a, b]`** is two sibling expressions, `Operation($)` and `Operation(% frame)`. In `bundle: $%[…]` the binding's value is just `$`. The LSP (`semantic-tokens.ts:141`), the LSP hover regex (`display.ts:306`) and runtime `probe-measure.ts:73` all treat `$%[` as one token. Only the parser disagrees.
- **`=>`** separates sequence steps (`SEQUENCE_SEPARATOR_TYPES`, `expressions.ts:1026`). `arr: a => b` binds only `a`.
- **`.{a=1}`** is a flat list: `Identifier(a)`, `Operation(=)`, `Literal(1)`. No binding is formed, which matters because `operators.spw:47` writes its table this way.
- **`[reg=facet]`** is two frame parameters: `Identifier(reg)` and `Operation(= label=facet)`.
- **`a <> b`** comes out as `a`, then `<>` with `b` as a fake modifier. The prefix form `<>[a, b]` parses cleanly.
- **Comparisons inside frames** degrade the whole file: `?[x >= 3]{}` and `[n != 0]`. The frame content rule (`containers.ts:66`) has no condition branch, even though `FrameNode` declares `ConditionNode`.
- **`...tail`** gives a `Spread` with `tail` detached. `...@tail` captures.
- **Postfix `data~` and `x!`** come out as sibling nodes, not postfix operations.
- **`##title` and `##>root`** are `#` operations carrying the text as a line payload, not particles.
- Container `openLabel` and `closeLabel` exist in `nodes.ts:231-245` but the grammar never sets them.

**F7. Only the tight bias forms produce edges.** `readBias` needs a body on the `=` operation itself (`read-bias.ts:102-106`). The documented example `=[resolve] ~"a.spw" { … }` (`flow-protocol-sigils.spw:66`) splits into `=[resolve]` and a separate path expression, so readBias returns null. The forms in `.spw/registries/bias-product.spw` do produce edges, and so does `=~"a.spw"[axis]{ ~"b.spw#frag" ; … }`. That form carries an anchor, an axis, ranked targets, fragments, and a sign (`=bane` inverts it). I checked this with readBias and `--selector bias`.

**F8. Numbers are integers or decimals only** (`literals.ts:95`). Everything else splits:
- `120ms` becomes a number plus a stray identifier.
- `1e6`, `50%` and `1.2.3` split.
- `-3` and dates raise lexer errors.
- `3/4` becomes a path chain.

Two forms work: year ranges `2003..2013` (an `Expression(..)` of two numbers) and unit capsules such as `48<hours>`, but the capsule is only safe before `,` or a closer (see F5).

**F9. How particles attach.** A run of particle lines binds to the next node that has a boundary (`canonical/particles.ts:40-78`). This works inside bodies too: `#:claim #!settled` just before `!["…"]{}` binds to that claim. In the current wonder blocks, `#:depth #!computational ~#lens(x)` binds the particles to the apposition (an `Annotation`), not to the probe. `#:dialect Spw.b` is `Particle(:dialect)` plus a sibling `Identifier(Spw.b)`. Dialect detection is regex-based (`dialect/detect.ts:17`).

**F10. Depth and scale.** A 24-level `.{}` nest parses fine, and so does a mixed 7-level `^ ^ ^[] .{} #[] .{} ?[]{} <<>>` nest. Nesting depth is not a problem.

## Construct catalog (all verified in `…/scratchpad/understand/syntax/`)

| construct | example | structural? | node | canon source |
|---|---|---|---|---|
| hash prose | `# Title — a/b {c}` | yes (comment) | dropped | `comments.ts:55`; `hash-resonance.spw:66-75` |
| slash comment | `a: 1 // note` | yes (comment) | dropped | discouraged: `hash-resonance.spw:8,119` |
| deixis / case / mood | `#>id` `#:layer` `#!sem` | yes | `Particle(aim,name)` | `lexer/matchers/particles.ts:20` |
| dialect pragma | `#:dialect Spw.b`, `@dialect:Spw.f` | yes | Particle + Identifier / Binding | `detect.ts:13-17` |
| seed header | `^seed[N v:0.1 @profile:Spw.b]` | yes | `Operation(^ label=seed frame)` | `flow-protocol-sigils.spw:15` |
| frame, string subject | `^"x"{}` | yes | `Operation(^ subj=Literal body)` | `expressions.ts:346` |
| frame, bracket | `^["x"]{}` `^[x]{}` `^["a","b"]{}` | yes | `Operation(^ frame body)` | same |
| frame, label | `^x["y"]{}` `^x{}` | yes | `Operation(^ label=x …)` | adjacency rule in `expressions.ts` |
| facet | `.{ a: 1, b: "t" }` | yes | `Operation(. body)` | `operators.spw:98` |
| facet with `=` | `.{a=1}` | flat (F6) | Identifier, Op(=), Literal | `operators.spw:47` |
| register | `}[reg=facet]` | 2 params | Frame: Identifier, Op(= label) | caches passim |
| set | `#[a, b]`, `#[a ; b]`, multi-line | yes | `Operation(# frame)` | `containers.ts:54-64` |
| list | `[1, 2]`, multi-line | yes | `Frame` | — |
| topic tag | `#topic` | yes | `Operation(# label=topic)` | `hash-resonance.spw:48` |
| bias | `=~"a"[ax]{ ~"b" ; ~"c" }`, `=@o{@n}`, `=[d]{x y}` | yes + readBias edge | `Operation(= subj frame body)` | `bias-product.spw` "forms" |
| bias, spaced | `=[ax] ~"a" {…}` | parses, but no edge | two expressions | `flow-protocol-sigils.spw:66` |
| schedule | `<< ~ ; ? ; % >>`, `<< a \|\| b >>`, `<<a,b>>@sink` | yes | `Stream(seps)` | `flow-protocol-sigils.spw:48` |
| chains | `a -> b`, `a ~> b`, `1..5`, `a \| b`, `a / b`, `a + b` | yes | `Expression(connectors)` | `profiles.ts:27-44` |
| `=>` | `a => b` | yes, but splits steps | `Sequence` separator | `expressions.ts:1026` |
| coupling, prefix | `<>[a, b]` | yes | `Operation(<> frame)` | `operators.spw:41,59` |
| coupling, infix | `a <> b` | mangled | `a` + `Op(<> mods=b)` | — |
| medial capsule | `bagel<scent>coffee`, `120<ms>,` | yes (F5 hazard) | `Capsule(medial)` | `nodes.ts` CapsuleNode |
| probe | `?["q"]{ !probe{ =id[p] } }` | yes | Op(?) ⊃ Op(! label=probe) ⊃ Op(= label=id) | `flow-protocol-sigils.spw:58-61` |
| probe scope | `?(scope: a, b)` | yes | `Operation(? subj=Scope)` | `expressions.ts` `?` branch |
| `?` key | `?[q]: "…"` | yes | `Binding(key=Operation)` | `flow-protocol-sigils.spw:90` |
| match | `?match[s]{ "a" => x  _ => y }` | yes | `Match/MatchArm/Wildcard` | `grammar/match.ts` |
| trait | `~#k: "v"`, `~#k:@r`, `~#k ~"p"` | yes | `Annotation(val)` | `references.ts:561` |
| trait, spaced colon ref | `~#k: @r`, `~#k: ~"p"` | value detaches | Annotation + sibling | F3 |
| apposition | `~#(…)`, `~#lens(a, b's 50% →)` | yes, raw body | `Annotation(apposition)` | `apposition.ts:1-12` |
| valence | `!boon{}`, `x: boon.honk` | yes | ModifierChain | `modifiers.ts` |
| valence key | `boon: 1` | **degrades** | Prose | F1 |
| strings | `"…"`, `'…'`, `` `…` ``, `k: \|` block | yes | Literal / Literal(PHRASE) / ProseChunk | `block-scalar.ts:1-8` |
| multi-line `"` | `"a⏎b"` | lexer error, hidden | — | `literals.ts` |
| numbers | `12`, `12.5`, `1990..2026` | yes | Literal / Expression(..) | `literals.ts:95` |
| units, dates, negatives | `120ms`, `2026-09-30`, `-3`, `50%` | split or lexer error | — | F8 |
| references | `@a.b`, `@docs/x`, `@_l[f]{}`, `@(o)` | yes | Reference / Operation | `references.ts:188` |
| path refs | `~"./x.spw#anchor"`, `~<../x.spw>` | yes | `PathRef` | `references.ts:262` |
| tagged path ref | `~<tag>"p"`, `~<"p">` | **not a PathRef** | Op(~ Capsule) + Literal | F4 |
| measure | `%[a.b]`, `%mass{ lines: 1 }` | yes | `Operation(% frame/label body)` | `self-mass.ts:1-20` |
| `$%` bundle | `$%[a, b]` | two siblings | Op($) + Op(%) | F6 |
| comparison in frame | `?[x >= 3]{}` | **degrades** | Prose | F6 |
| bullets | `.. text`, `.. ~"p"` | yes | `Bullet(ProseChunk / Expression)` | `bullets.ts` |
| hole, spread, n-range | `_`, `...@t`, `(( 1..5 ))`, `(())` | yes | Wildcard / Spread / NRange | `nodes.ts` |
| double hash | `##title`, `##>root` | yes | `Op(# payload)` | `hash-resonance.spw:77` |
| non-ASCII key | `café:` | lexer error, hidden | truncated to `caf` | `identifiers.ts` |

## Tool-support matrix

| construct | parser (AST) | LSP | CLI graph | measure / census | emit |
|---|---|---|---|---|---|
| `^"x"{}` / `^["x"]{}` | yes | frame symbol (`server-index.ts:1086-1110`) | — | counted by `heuristicFrameCount` (`corpus.ts:392`) | `sliceNamedFrame` (`extract.ts:228-232`) |
| `^x[..]{}` / `^x{}` | yes | not indexed | — | not counted | not sliced |
| `#> #: #!` | Particle, bindings | semantic tokens; `#:` is called "lens" (`display.ts:1041`) | — | `annotationHints` regex | — |
| `~#k: "v"` | yes | `~#trait` token | — | — | read as trait (`STRING_ASSIGN` in `extract.ts`) |
| `~#lens(…)` | apposition | hover hint misses it; it reads `// lens:` (`display.ts:304`) | — | — | — |
| `~"p#frag"` | PathRef | path token | edge, but `file#frag` becomes its own node that doesn't merge with the file (checked in scratch `gt/`) | pathRef density | include |
| `@k: ~"p"` | Binding | variable | path edge **and** a root edge for `k` (noise) | root_shelves | include |
| `=~"a"[ax]{…}` | readBias edge | `=` config token | not an edge (`corpus-scan.ts:191-230` reads only PATH_REFS and REFERENCES) | — | — |
| `$%[…]` / `%[…]` | split / Operation | `$%[` keyword; hint metrics regex | — | runtime `probe-measure.ts:73-93` regex | — |
| `%mass{}` + `@self` | yes | — | — | `spw measure` reconciles against the file | — |
| `~#`-annotations in `spw select` | — | — | — | `--selector annotations` means `#` operations only (`presets.ts:59`), so there is no selector for `~#` | — |

The pattern: only the seed parser is AST-true. The LSP, emit, census and runtime probe-measure all use regex over the text, and each covers its own subset of the syntax.

## Canonical examples (verbatim)

- **Particle header stack** — `.spw/conventions/index.spw:5-7`:
  - `#>spw_conventions_index`
  - `#:convention #!scale`
- **Roots as bindings** — `flow-protocol-sigils.spw:17-18`:
  - `^["roots"]{`
  - ` @impl: ~"../../../packages/spw-seed/src/canonical/flow-protocol.ts"`
- **Schedule** — `flow-protocol-sigils.spw:102`: `<< ~ ; ? ; % ; ! ; * ; ^ >>`
- **Probe with id** — `flow-protocol-sigils.spw:101`: `!probe{ =id[p_sched_teach] }`
- **Open questions as `?` keys** — `flow-protocol-sigils.spw:90`: `?[role_collision]: "When is !{ procedure vs probe without !probe label?"`
- **Apposition** — `.spw/conventions/index.spw:41`: `#:depth #!experiential ~#lens(formal structure)`
- **Bias forms** — `.spw/registries/bias-product.spw` "forms": `anchored: \`=@old{ @new }\``, `signed: \`=bane@old{ @new }\``
- **Mass facet** — `self-mass.ts` doc comment: `%mass{ lines: 2315, bytes: 69219 }` under `@self: ~"…"`
- **Hazard examples:** `decorations.spw:101` (`boon: .{…}`), `lib/spw-v0.3.0/architecture/index.spw:12` (tagged path ref), `.spw/workspace.spw:78` (detached `~#source: ~"…"`).

## Recommendations for `.spw/caches/2026-09-30/`

**Syntax rules for writers (all verified):**

1. **Links.**
   - Put a `#>anchor` on every citable node.
   - Link as `@role: ~"./file.spw#anchor"` (a Binding with a PathRef value). Never use `~#role: ~"…"`, `~<tag>"…"` or `~<"…">`.
   - Always write the file name, even for a same-file link: `~"#x"` has its hash at index 0 and is classed as malformed (`resolve-citation.ts:22`).
2. **Typed or ranked relations.** Use the tight bias form `=~"./a.spw#x"[requires]{ ~"./b.spw#y" ; ~"./c.spw#z" }`, and `=bane…` for the inverse direction. This is the only relation readBias reports with an axis and a rank.
3. **Status and provenance.** Put particles directly above the claim, e.g. `#:claim #!contested` above `!["…"]{ evidence: ~"…#src", confidence: 0.4 }`. Write `as_of: "2026-09-30"` as a string.
4. **Lens.** Write `~#lens(…)` on its own line inside the body, not after particles on the same line. Note that the LSP hint regex needs a fix before it sees this form.
5. **Metrics.**
   - Use `%[handle]` for single handles, or `%name{ key: number }` facets. Don't use `$%` until the parser treats it as one unit.
   - Handles must be keys declared in a metrics registry file that the surface links with `@metrics: ~"./metrics.spw#…"`.
6. **Quantities.** Use `.{ n: 6, unit: "weeks" }`, or `N<unit>` only when a `,` or a closer follows on the same line. Year spans are `2003..2013`. Everything else numeric goes in a string.
7. **Banned in bare text:** valence words as keys, apostrophes, `→`/`—`/non-ASCII, URLs, dates, negatives, and comparisons inside `[…]`. Quote them.
8. **Gate.** Run `archcheck.ts` (it reads `parse().errors`, particle bindings, readBias, and the cross-line detectors) plus the validator.

**Minimal verified example** (`arch/a6-claim-ledger.spw`, trimmed version verified separately): OK in the validator, 0 prose rows in `select --selector all`, particles bound as intended.
```
#>payout_claims
#:cache #!ledger
^["ledger"]{
  as_of: "2026-09-30"
  #>claim_rpm_band
  #:claim #!contested
  !["Typical RPM falls in a narrow band across niches"]{
    evidence: ~"./sources.spw#src_survey"
    counter: ~"./a6-claim-ledger.spw#claim_rev_share"
    ~#(self-reported survey; niche variance is large)
  }
}
```

## Script architectures

All nine files are under `…/scratchpad/understand/arch/`. Every one is OK in the validator, has 0 prose rows in `spw select`, and reports no cross-line swallowing in `archcheck`.

1. **Timeline ladder** (`a1`) — `order: << h264 ; hevc ; av1 >>`, rungs as `#>rung_x` + `.{ years: 2003..2013, status: #[settled] }`, and a supersedes edge `=~"…#rung_hevc"[supersedes]{ ~"…#rung_h264" }`. Maximum nesting depth 5.
2. **Prerequisite DAG** (`a2`):
   ```
   ^["edges"]{
     =~"./a2-prerequisite-dag.spw#derivative"[requires]{ ~"./a2-prerequisite-dag.spw#limits" ; ~"./algebra.spw#functions" }
     =bane~"./a2-prerequisite-dag.spw#limits"[requires]{ ~"./a2-prerequisite-dag.spw#derivative" }
   }
   ```
   readBias returns a ranked forward edge and an inverse edge.
3. **Comparison matrix** (`a3`) — `axes: #[latency, ordering]`; rows are `#>row_x` + nested cell facets `.{ cell: "low", status: #[contested] }`; plus `contrast: <>[tcp, quic]`.
4. **Protocol state machine** (`a4`) — `states: #[…]`, transitions `open: closed -> syn_sent -> established`, and `dispatch: ?match[event]{ "syn_ack" => established  _ => closed }`.
5. **Cadence schedule** (`a5`) — `train: << plan ; build || docs || tests ; gate ; ship >>`, `gate: .{ checks: #[ ci_green ; changelog ; signoff ], timeout: 48<hours> }`.
6. **Claim ledger** (`a6`) — as in the example above.
7. **Glossary lattice** (`a7`) — `#>term_x` + `.{ gloss, broader: #[…], narrower: #[…], see: ~"…#anchor" }`.
8. **Case dossier** (`a8`) — `@source: ~"…#src"`, `window: 2016..2016`, `events: << … >>`, particle-marked findings, and `open: .{ ?[scope]: "…" }`.
9. **Probe battery** (`a9`) — `?["q"]{ !probe{ =id[p_x] }  ?(scope: player, cdn)  %[startup_ms, abandon_rate] }` under `@metrics: ~"./metrics.spw#…"`.

## Open questions for Spw theory

- **Valence words vs. keys.** Should the pentad words stay reserved lexemes? Keying by them is natural, as `decorations.spw` shows. One option is to let the grammar read a charge followed by `:` as a key.
- **`~#k:` vs `@k:`.** Which one is the typed link? The whitespace bug has kept 223 canon traits from ever binding their values. Fixing it (one `skipWhitespace`) would silently change what those files mean.
- **Particle arguments.** `#:dialect Spw.b` and `#:status #!partial` show case and mood carrying no value. Particles bind forward (to the next node), while traits bind to their own value. The planned particle-lattice rework should decide whether `#:k value` should exist.
- **Compound sigils.** `$%`, `##>`, `?<>` and `=>` are compounds to the tools and the canon, but not to the parser. Should the lexer own a list of compounds?
- **Coupling.** `<>` exists only as a prefix operator. Should `a <> b` be the coupling relation?
- **Same-line law.** The medial capsule, empty bindings and inline `# ` notes each apply a different line rule. One law for all three would remove the silent swallowing in F5.
- **Graph identity.** Should `file#anchor` merge into its file node while keeping the anchor as a sub-node?
- **Bias edges in the graph.** Bias edges are ranked and signed, which makes them the strongest linking device, but the graph never reads them. If they are meant to be the typed linking device, the graph needs to read them.

Scratch tools and corpora (the repo is unchanged):
- `<scratchpad>/understand/probe.ts`
- `<scratchpad>/understand/archcheck.ts`
- `<scratchpad>/understand/lexscan.ts`
- `<scratchpad>/understand/syntax/`
- `<scratchpad>/understand/arch/`