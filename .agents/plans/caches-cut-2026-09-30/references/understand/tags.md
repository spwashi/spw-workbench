# Tags, particles and referential utility in `.spw/caches` (research only, nothing edited)

The only tag forms with referential utility are the ones the LSP annotation index reads: `#>`, `#:k #!v` on one line, `~#name:`, flush `#name` and `##>`. The caches use those forms at the two useless extremes: either every file carries the same value, or no two files share one. The review's point about `~#lens(...)` is right, and it is wider than reported: the LSP index, the Concepts tree and the wonder hover all ignore it.

**Repo state:** the repo is unchanged; `git status` shows only the existing `?? .spw/caches/`. One slip: a `cp` briefly put my scratch script at `scripts/.tmp-tally-DONOTCOMMIT.ts`. I deleted it straight away, and `git status` confirms nothing remains. All probes are under `scratchpad/understand/probe/{current,proposed,nest,valence,final}/`.

Labels used below: **(a)** canon says, **(b)** code implements, **(c)** doc-only or aspirational.

## Findings

**F1. The particle lattice as lexed.**
- (b) `matchParticle` (`packages/spw-seed/src/lexer/matchers/particles.ts:20,33,39`) lexes `#>`, `#:` and `#!` followed by a name. The name must start with `[a-zA-Z_]` and may contain `[a-zA-Z0-9_-]`.
  - Verified: `#!2026_09` shatters into OPERATOR `#`, OPERATOR `!`, NUMBER, IDENT. Numeric values cannot be moods.
  - Verified: `##>x` lexes as OPERATOR `#` followed by PARTICLE `#>x`.
- (b) `~#name: v` is an ANNOTATION token. `~#name(body)` and `~#(body)` are an APPOSITION token (`apposition.ts:41-111`) that parses to an Annotation node with an apposition label.
- (b) `particleBindings` (`canonical/particles.ts:63-79`) binds each particle run forward, to the next content item.
  - Verified: the file header stack binds to the **first frame** (`^"provenance"`), not to the file.
  - Verified: `#:depth #!x ~#lens(y)` binds to the apposition, not to the enclosing `?[]`.
- (a) Vocabulary: `#>` deixis, `#:` case, `#!` mood, `~#` aspect (`.agents/plans/directive-lattice/PLAN.md:29-33`).
- (a) Particle vs anchor glossary: `docs/theory/spw/brace-charge-crawl.spw:162-163`.
- (c) The registry `.spw/registries/directive-lattice.spw` was never written. The plan's commit 10 is still "next" (`wip.spw:14`), and `ls .spw/registries` has no such file.

**F2. What the LSP actually indexes** (`packages/spw-lsp/src/server-index.ts:1036-1215`). Verified by running `ServerIndex.openDocument` on the probes:

| Source form | Index entry |
|---|---|
| PARTICLE `>` | `anchor` |
| PARTICLE `:` | `lens` |
| PARTICLE `!` | `intent` |
| ANNOTATION `~#name` | `topic` (name only, value dropped) |
| OPERATOR `#` + flush IDENT | `topic` |
| OPERATOR `#` + PARTICLE `>` | `prompt_root` |
| **APPOSITION** | **no branch; never indexed** |

Consequences:
- Across 208 cache files the index holds 2792 entries and **0** of the 232 `~#lens(...)` appositions.
- The index is keyed by name only (`annotationsByName`, `:605-609`), so kinds merge. `#!bone`, `~#bone{}` (from `valence-architecture.spw`) and `#bone` all become one "bone" concept.
- Workspace symbol search matches the query against the name only (`:683-686`), so typing `#:claim` returns no annotations.

**F3. `#:k #!v` on one line is the only key/value form any tool reads (b).**
- Concepts tree: `braidPairs` pairs lens and intent entries on the same line (`extensions/vscode-spw/src/views/concepts-tree.ts:539-548`).
- Hover builds a "Layers:" distribution from `#:layer` plus the same-line `#!` (`handlers/display.ts:510-525`, `896-906`), with `LAYER_ORDER = grammar/semantics/pragmatics`.
- Wonder hover reads `#:depth #!x` (`display.ts:302-303`).
- `spw lint` flags `#:axis value` written without `#!` (`canonical/annotation-lint.ts:24-47`, via `cli/lint.ts:144`).

**F4. The lens gap is real and is code drift (b vs a).**
- Wonder hover reads `// lens:` only (`display.ts:304`). The inlay-hint label never shows a lens anyway, because `buildWonderHint` drops it when `bodyText` contains it (`:256`), and the lens is always taken from a body line.
- The hover regex `ANNOTATION_RE` (`display.ts:35`) reads `~#lens(` as the topic `#lens`, so it shows counts for unrelated `#:lens` particles.
- Canon already migrated the other way:
  - `apposition.spw:61`: `lens_label … becomes "~#lens(living system)"`.
  - `hash-resonance.spw:8-10`: prefer `#` and migrate away from `//`.
  - `scripts/migrations/notes-to-appositions.ts:50-53` does that rewrite.
- Outside the caches there are 482 `// lens:` vs 56 `~#lens(`. The migration is partial and the LSP only reads the majority form.
- `spw lattice` does count appositions: the caches show 232 paren cells, all named `lens`.

**F5. Measured monotony in the current caches** (seed tokenizer tally over 208 files):

| Tag | Count | Distinct values | Problem |
|---|---|---|---|
| `#:layer #!pragmatics` | 208/208 | 1 | carries no information |
| `#:cache #!…` | 208 | 118 (92 singletons) | not a canon axis; duplicates folder and `#>` |
| `#:depth #!…` | 232 | 59 (26 singletons; `philosophical` is 22%) | canon's own `#:depth` is a 5-value set: computational 91, educational 83, stylistic 79, experiential 79, mathematical 75 |
| `~#lens(…)` | 232 | 231 | canon lens set is 6 recurring values: ecological zone, molecular binding, formal structure, material grain, curated collection, living system |
| `$%[…]` handles | 469 | 469 (all singletons) | nothing binds to them |
| `~#protocol: "cache.layer/1"` | 104 files (not every file; 68 in university-education) | 1 | false claim |
| `[reg=facet]` | 516/516 | 1 | `.{}` already produces the facet product (`normalize.ts:242`) |

Also:
- `spw atlas .spw/caches` reports "440 named, 0 deep-links used" and only two anchor namespaces: `wonder` (232) and `spw` (208).
- The census reports 29 bare `#tag` "noise marks", e.g. `guard: #saved_file_truth` (`jetbrains/features.spw:85`).

**F6. Bare `#tag` has three conflicting readings.**
- (a) Runtime resonate: `hash-resonance.spw:47-52`.
- (b) LSP `topic`: `server-index.ts:1073`.
- (b) Census "noise": `spw-particle-census.ts:56-78`. Verified that it flags `primary: [#a, #b]`.
- Yet canon makes it the tag form: `.agents/plans/_schema/wip.spw:159-167` (`concept_index`, "queryable by stable tags"), and `prompts/labs/experiential.spw:87` (`lenses: [#yeast_time, #care_duty]`).
- Emit reads `lenses:` / `facets: [#x]` and `register: #x` (`cli/emit/extract.ts:19-27,63-68`), but only inside the named frames `intent`, `brief`, `title`, `job`, `house`, `style`, `subject`, `genre`, `continuity` and `emit`.

**F7. Placement semantics disagree (b).**
- The LSP attributes a tag to its enclosing `^` frame by line context. `.{}` facets and `?[]{}` add nothing to `framePath`; verified that nested `^` frames produce `curriculum>year_1>thermo_intro`.
- The seed binds the same tag to the next sibling. Verified: `#:valence #!bane` on the first line inside `^["claims"]` has `framePath [claims]` in the LSP but binds to `^["light"]` in the seed.

**F8. Valence (a vs b conflict).**
- Canon: the pentad is "charge-neutral … material quality, not moral judgment" (`valence-architecture.spw:43-44`).
  - boon: generative
  - bane: constrained, distilled
  - bone: structural
  - bonk: catalytic (pentad overlay only; not in the four-state runtime axis, `:32-37`)
  - honk: signal
- Code and a convention define it as outcome status instead: `catalog.ts:45-49` ("completed deliverable", "error state") and `autocompletion.spw:30-36`.
- Verified: `^bane["x"]{}` puts `frames.valence: ["bane"]` into ONF (`normalize.ts:102-118`), but the LSP frame index then loses the frame, because `frameNameFromTokens` expects `[` or STRING right after `^`.

**F9. CLI coverage of tags.**
- `spw graph` / `spw census`: only a regex count (`math/corpus.ts:396-398`); edges come from paths, roots and frames only (`:18`). Tag names never form edges.
- `spw measure`: blind to tags (`self-mass.ts`).
- `spw atlas`: groups anchors by the leading `[a-z]+` of the name (`atlas.ts:87-89`), resolves `~"file#anchor"`, and counts the `#>` inside `##>`. The seed and the census do **not** count `##>`; verified that `particleBindings` omits it.

## Tool-support matrix

| Construct | Parser | LSP index / Concepts tree | LSP hover / hints | CLI graph / census | CLI measure | CLI atlas / lattice | Emit |
|---|---|---|---|---|---|---|---|
| `#>name` | PARTICLE; binds forward | anchor, outline, workspace symbol | fragment definition | count only | — | namespace + dangling | — |
| `#:k #!v` (same line) | 2 PARTICLEs | lens + intent, braid pair | `#:layer` → Layers; `#:depth` → wonder | count only | — | case/mood mix | — |
| `~#k: v` | ANNOTATION | topic (name only) | co-occurrence | aspect (volatility) | — | colon cell | trait (named frames only) |
| `~#k(body)` / `~#(body)` | APPOSITION → Annotation | **not indexed** | misread as `#k` topic; lens not read | aspect (regex) | — | paren cell | — |
| flush `#name` | `#` Operation | topic | co-occurrence | census "noise" | — | — | `lenses`/`facets`/`register` |
| `#[…]` | `#` Operation + frame | — | — | content | — | — | — |
| `##>name` | `#` op + PARTICLE | prompt_root | — | not deixis | — | counted as anchor | — |
| `[reg=x]` | frame on op | — | — | — | — | — | registers (`reg`) |
| `!bone` / `^bane[…]` | MODIFIER → ONF valence | — (breaks `^` frame) | — | — | — | — | — |
| `// lens:` | COMMENT | — | wonder hover | — | — | — | — |

## Canonical examples

- A multi-axis header, `.spw/conventions/hash-resonance.spw:12-15`:
  ```
  #>spw_conventions_hash_resonance
  #:convention #!hash
  #:layer #!semantics
  #:status #!active
  ```
- A claim-status precedent, `docs/theory/spw/register-geometry.spw:20-24`:
  ```
  status: .{
  implemented = #[sigil_tokens, container_tokens, register_state_fields, runtime_traces]
  measured = #[liminality, frequency, coupling, measure_depth]
  proposed = #[tensor_reachability, reduction_geodesics, container_group_action, topological_classes]
  interpretive = #[fiber, charge, spin, resonance_language]
  ```
- Apposition degrees, `docs/theory/spw/apposition.spw:23-25,92`: `'~#name(phrase)' { … claim: "a reading that recurs, so it earns a key" }`, and "Anonymous for a one-off reading; named the moment it recurs."
- Tag index, `.agents/plans/_schema/wip.spw:162-165`: `primary: [#main_concepts]`, `surfaces: […]`, `tensions: […]`, `transfers: […]`.
- A controlled vocabulary checked by a tool: `scripts/plans/plan-index.ts:28` (`PHASES`) and `:225` (`unknown phase #…`).

## Recommendations for `.spw/caches/2026-09-30/`

1. **Header: 4–7 axis pairs, each from a closed vocabulary.**
   - Declare the vocabulary once in `2026-09-30/vocabulary.spw`.
   - Check it with a small validator on the `plan-index.ts:28/225` pattern. `spw lint` only checks form, not values.
   - Axes, with the evidence for each:

   | Axis | Values | Evidence |
   |---|---|---|
   | `#:layer` | `reference` / `pragmatics` / `creative` | canon has 16 / 556 / 67 uses; hover reads it |
   | `#:domain` | one lowercase word, equal to the anchor prefix | canon `#:domain #!publishing`; atlas `nameGroup` |
   | `#:form` | index, curriculum, field_guide, glossary, timeline, case_study, comparison, protocol, catalog, debate | new |
   | `#:level` | intro, foundation, advanced, graduate, practitioner | new |
   | `#:review` | unreviewed, spot_checked, sourced, expert_reviewed | new; for scientific integrity |
   | `#:valence` | the pentad | per F8 |
   | `#:era` | period values | optional; only for history-bearing trees |

   - Drop `#:cache` and `~#protocol: "cache.layer/1"` everywhere.
2. **Mark claims one at a time.** Use `#:claim #!established|contested|emerging|speculative|refuted|interpretive` on the line before each keyed claim.
   - `interpretive` and `speculative` line up with canon's interpretive/proposed status words.
   - Give each claim a key (`name: "…"`), not a bare string in a list.
3. **Wonder blocks.** Put `#:depth` back on canon's 5-value set, and draw `~#lens(…)` from a closed set (canon's 6, or a declared extension).
   - Also land two small LSP patches:
     - Index APPOSITION in `analyzeFromTokens`, via `appositionParts`, with an optional `value` on `AnnotationEntry`.
     - Read `~#lens\(([^)]*)\)` in `display.ts:304`.
   - Without the patches, `~#lens()` stays invisible to the LSP whatever the writers do.
4. **Concept tags.** Use `^"concepts"{ primary/transfers/tensions: [#snake_case] }`. The LSP indexes these as topics and the Concepts tree shows co-occurrence across files.
   - Rule: a concept tag must appear in at least 2 files or in a domain index.
   - Accept census "noise" hits until the census is taught to treat this form as tags (F6).
5. **Anchors and links.**
   - Anchors: `#>{domain}_{slug}`, and `#>{domain}_{slug}_q{n}` for wonder blocks.
   - The first frame after the header is what `~"file#anchor"` projects. Make it the summary or provenance frame.
   - Link with `~"./x.spw#anchor"`, which atlas and mount verify.
   - Use `##>` only on the root index, and always follow it with a `#>`.
6. **Stance.**
   - Durable facts: bare particles and plain fields.
   - `~#`: reserve for expiring data, i.e. provenance (`~#as_of`, `~#generator`). This follows "STANCE = CACHE POLICY" (`wip.spw:67`).
   - Put in-frame tags on the frame's first line, since that is what the LSP reads.
   - Nest with `^[]` wherever the breadcrumb path matters; `.{}` does not show up in it.
   - Drop the blanket `[reg=facet]`.
7. **Valence is material, not merit.**

   | Value | Use for |
   |---|---|
   | bone | index, glossary, roots |
   | boon | open questions, exercises |
   | bane | invariants, limits, contraindications |
   | bonk | transitions, paradigm shifts |
   | honk | warnings, headline takeaways |

   - A refuted claim is `#:claim #!refuted`, never "bane".
   - Use `#:valence #!x` (indexed) rather than `^bane[…]` until `frameNameFromTokens` skips MODIFIER tokens.

**Verified example.** The validator passed on 2 files, `spw lint` found nothing, atlas reports "physiology 3, 1 deep-link, 0 dangling", and `select` returns 32 Particle/Annotation nodes. The LSP index attributes the `#:claim` pairs to `claims>light` and `claims>sleep`; the `~#lens` gets no entry.

```
#>physiology_circadian
#:layer #!reference
#:domain #!physiology
#:form #!field_guide
#:level #!foundation
#:review #!unreviewed
#:valence #!bone

^"provenance"{
  ~#as_of: "2026-09-30"
  ~#generator: "gemini-3.8-flash-high"
  ~#(claims carry their own status; unmarked prose is framing, not evidence)
}

^"concepts"{
  primary: [#circadian_entrainment, #glymphatic_clearance, #glut4_translocation]
  transfers: [#chronobiology, #exercise_physiology]
}

^["claims"]{
  #:valence #!bane
  ^["sleep"]{
    #:claim #!contested
    glymphatic_n3: "Clearance peaks in slow-wave sleep; human magnitude and direction are debated."
    #:claim #!refuted
    nap_recovery: "Fragmented naps fully substitute for consolidated slow-wave sleep."
  }
}

#>physiology_circadian_q1
?["Does morning outdoor light lengthen N3 more than a hypnotic does?"]{
  #:depth #!experiential ~#lens(living system)
  #:claim #!speculative
  ~#hypothesis: "Morning light lengthens N3 relative to zolpidem."
  ~"./sleep-architecture.spw#physiology_sleep" ~#neighbor(mechanism)
}
```

This is an excerpt of `probe/final/circadian.spw`. The full file also has a `^["light"]` sub-frame and the `!probe` / `$%[…]` lines.

## Pressure points for Spw particle physics

1. **Binding direction.** Seed binds forward, the LSP binds to the enclosing frame, and authors put the first line inside a body to describe that body. The language needs a "container deixis" rule for the first run inside a body.
2. **Is `#:k #!v` one unit?** Lint already calls it an "axis declaration", and tools only pair the two by same-line adjacency. A grammatical pair node would stop name-keyed merges like `#!bone` with `~#bone{}`.
3. **The empty-aim cell.** Flush `#name` is resonate, topic and noise at once, while canon uses it as the tag form. It needs a defined status.
4. **`##`.** It is "unoccupied" (`particles.ts:11`), yet it is the prompt root (`autocompletion.spw:39,52`), and tools disagree on it. Is it a doubled-`#` stance?
5. **Numerals.** Moods cannot start with a digit, so a time value or ordinal cannot be a mood.
6. **One aim, three names.** The seed says "case", the LSP and autocompletion say "lens", and apposition canon uses "lens" for `~#lens()`. The LSP kinds should be renamed to deixis/case/mood/aspect/apposition.
7. **Valence has two definitions and two carriers.** Status (catalog) vs material (canon); modifier into ONF vs particle metadata; pentad vs four-state runtime.
8. **Bodies must recur.** Tags are only useful when some, but not all, files share a value. Both extremes (208/208 and 1/208) carry nothing, and apposition bodies need the same rule for recurrence that apposition names already have.