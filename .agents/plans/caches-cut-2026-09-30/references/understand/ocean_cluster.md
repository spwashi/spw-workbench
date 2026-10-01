# Ocean model and clustering: axis report for the `.spw/caches` refactor

## Findings

### 1. "Ocean" is five separate things under one name

| Layer | What it is | Status |
|---|---|---|
| A. Biome directory | An experimental "nursery" with a fixed module layout: layout, libraries, algorithms, expressions, experiments, query (`.spw/biome/ocean/index.spw:14-61`). The registry calls ocean "the reference experimental biome" and defines `modules_shape` for consumer biomes (`.spw/biome/index.spw:3-4,30-43`). | Canon. The paths are coupled into code. |
| B. Metaphor atlas | Six sub-biomes (`.spw/biome/ocean/atlas.spw:27-63`): reef (literate exhibits), pelagic ("broad reflective observation and concept clustering"), estuary, benthic (archive), tidal, seagrass. Also `electrolytes` mapping ions to operators (`:65-71`), `plant_cycles` (`:73-77`), and "physics" per library, e.g. reef = "local lattice (high adjacency)" vs pelagic = "open volume (low adjacency, long range)" (`libs.spw:16-40`). | Doc only. `grep reef\|pelagic\|benthic\|estuary` over packages/scripts finds nothing. |
| C. Stability channel and regional dialect | `'ocean'` is a `StabilityChannel` (`packages/spw-runtime/src/session/channels.ts:14-21,116-123`). `REGIONAL_OCEAN_DIALECT = 'Spw.o'` (`:51-52`). Ocean volatility is 0.8 (`packages/spw-seed/src/ir/granularity.ts:167`). Ocean is also an `IrChannelId` (`packages/spw-seed/src/ir/ref.ts:22`) and has a catalog entry `regional.ocean_o` (`packages/spw-seed/src/experimental/syntax-catalog.ts:237-242`). | Code. |
| D. Cache-tier contract | hot/warm/cold tiers of 8/64/256 beats (`.spw/biome/ocean/algos/cache.spw`). Implemented by `packages/spw-runtime/src/state/memory-cache.ts:1-16`. The LSP assigns tiers by path substring (`packages/spw-lsp/src/server-index.ts:913-921`, e.g. `rel.includes('/query/')` → hot, `/algos/`, `/style`, `/phase` → warm). | Code. |
| E. Cluster algorithm | `algos/cluster.spw:12-16` lists keys `operator_focus, loop_phase, lens_profile, biome, channel`, with the distance "weighted overlap on keys + ref intersection" and the output "cluster_id + exemplar refs + cohesion score". | Aspirational. `grep cohesion\|exemplar\|cluster_id` over packages/scripts finds no implementation. |

Some code depends on ocean paths, so renaming or retiring it has a cost:
- `@biome` is hard-coded to `.spw/biome/ocean` in `packages/spw-lsp/src/helpers.ts:123`.
- It is also set in `.spw/shelves.spw:11` and `.spw/index.spw:43`, and templated in `packages/spw-cli/src/mount.ts:436`.
- The LSP classifies subroots and planes by `.spw/biome/` (`server-index.ts:897-910,959`). `^subroot[biome]` is declared in `.spw/topology.spw:13-20`.
- `.spw/gen/index.spw:16-34` names ocean files as spec and generator owners.

Only layers B and E would be replaced by a "clustering hybrid". Layers C and D are runtime law. Layer A is a module layout that consumers mirror.

### 2. Existing clustering facilities, and what they report on `.spw/caches`

**`spw census` roles.** `populationRoleOf` (`packages/spw-seed/src/math/corpus.ts:484-497`) assigns hub, orphan, leaf, source or node. "Hub" means top-N by degree (`degreeHubs`, `:89-110`; `hubTop` defaults to 24). It is a rank, not a structural property. Result on caches: `roles leaf:165 hub:23 node:20`, `refs path=244 root=452 frames=1189 broken=0`.

**`spw graph` strands.** `buildStrands` (`corpus.ts:238-305`) returns corpus-level aggregates, not per-file cluster assignments: `shared_path_basenames`, `sigil_rhythm`, `frame_density`, `path_ref_density`, `root_shelves`. Result on caches:
- `index.spw×53, taste.spw×30` (template basenames)
- `@taste×60` (root_shelves)
- `#:4132 .:1525 ~:1493` (sigil_rhythm)

The `--compare` familiarity check does not separate topics. I ran thermodynamics against three other corpora:

| Compared with | sigil_cosine | path_overlap | frame_affinity |
|---|---|---|---|
| tiktok-live | 0.976 | 0.194 | — |
| economics | 0.977 | 0.222 | — |
| `.spw/biome/ocean` | 0.969 | — | 0.416 |

Canon agrees with this reading: a strand is a "shared vocabulary wire (basename, sigil rhythm, shelf)" for familiarity *between* corpora (`docs/theory/spw/relationship-topography.spw:42,47-56`).

**Root refs become fake graph nodes.** `corpus-scan.ts` records each `@name` as `to: raw` and never resolves it. On caches that produces 452 root edges to 180 distinct names that are not files. `^"dispatch"` produces a fake hub, `taste`, with in-degree 60, which takes one of the 24 hub slots. The LSP does resolve file-local roots (`helpers.ts:139-156` `parseRoots`), so the editor and the CLI disagree. Canon `.spw/index.spw` uses the same `^"roots"` + `^"dispatch"` pair, so caches copied a canon pattern.

**The caches graph is a pure tree.** Every one of the 174 non-index files has path in-degree exactly 1. Of the 244 path refs:
- 175 stay in the same directory.
- 51 go between a parent and a child directory.
- 18 cross directories. Seventeen of these leave caches for repo code or tooling. The only lateral link inside caches is `podcasting/topical-index.spw → language-features/index.spw`.

**Tags are too unique to cluster anything:**
- Only three particle keys are used: `#:depth` (232), `#:layer` (208) and `#:cache` (208).
- `#:layer` is always `#!pragmatics`, so it carries no information.
- `#:cache` has 118 distinct values, and 92 of them are used once.
- `~#lens(...)`: 231 distinct values in 232 uses.
- `$%[...]` handles: 469, every one used once.
- Anchor families (the atlas groups anchors by leading `[a-z]+`, `packages/spw-cli/src/atlas.ts:87-89`) come to only `wonder 232, spw 208`.

Canon, by contrast, has a closed set of six lens values that do cluster: ecological zone 78, molecular binding 76, formal structure 73, material grain 66, curated collection 64, living system 59 (counts of `// lens:`).

**`spw formula` families** (`packages/spw-seed/src/math/formula-scan.ts:127-169`) are regexes tuned to the workbench's own mathematics. On caches, `hold F2` (score 0.90) fired on linguistics formant "F2", and `field capacity` got 23 hits from ordinary prose. Its catalog vocabulary collides with domain words in the caches' prose.

**`spw form --field`.** Operator co-occurrence strands saturate: `weight: 1, n: 203`, then 201, 200 of 208 files. The per-file resonance bytecode is operator geometry, not content.

**`spw lattice`** counts apposition *names* only: lens 232, hypothesis 232, protocol 104. It does not count their values.

**`spw atlas`.** A region is the first path segment only (`atlas.ts:73-76`), so all 208 cache files fall in one region, `.spw`. It does handle `~"file#anchor"` fragments and dangling anchors (`:79-84,166-176`).

**Plan index: the best existing precedent for a hybrid.** `scripts/plans/plan-index.ts` combines:
- A primary cluster that is authored: the card's operator glyph is its lane.
- A controlled phase vocabulary.
- Computed `^["kin"]`: shared `touches` regions plus mentions, with guards against hubs (`HUB_MENTIONS`, `HUB_CITED_SHARE` at `:45-48,281-307`).
- `^["drift"]`.

Authored frames (`legend`, `doors`) are preserved, and derived frames are rewritten. The schema states the epistemics: "Authored edges are claims. The index also computes ^["kin"] … as a prompt, never as a claim" (`.agents/plans/_schema/wip.spw:107-108`). `plan-ecology-clustering.spw` adds three pieces:
- `cluster_operator_map`: glyph → lane, commit, drift, feeds (`:44-51`).
- `tag_sets`: learn, discuss, probe (`:63-67`).
- `plan_map`: glyph bucket → per-plan facet records (`:258+`).

## Tool-support matrix

Legend: ✓ = works, ✗ = not supported, ⚠ = partial or misleading. Verified on scratch corpora `.../scratchpad/understand/ocean/probe{,2,3}`.

| Construct | Parser | LSP | graph / census | atlas / resolve | lattice / formula | emit |
|---|---|---|---|---|---|---|
| `~"./x.spw"` | ✓ PathRef | ✓ link | ✓ edge (file-relative only) | ✓ / ✓ | — / `path_edge` hit | not traced |
| `~"./x.spw#anchor"` | ✓ PathRef | ✓ (`handlers/navigation.ts` uses `resolveFragment`) | ⚠ reported **broken**, and the fragment becomes a separate node (verified) | ✓ deep-link counted, bad anchor flagged / ✓ `missing-anchor` | — | — |
| `@name: ~"…"` roots | ✓ Reference + PathRef | ✓ `parseRoots` | ⚠ fake node per `@name` | atlas skips `@` | — | — |
| `~<"path">` (quoted) | Capsule, **not** a PathRef (verified) | display reads `~<…>` as the neighbor field | ✗ no edge | ✗ | — | — |
| `~<path>` (bare) | PathRef | — | ⚠ edge, but broken when root-relative (7 in ocean) | — | — | — |
| `#:k #!v` particles | ✓ Particle, bound by adjacency (`canonical/particles.ts`) | ✓ indexed separately (`#:` = "lens", `#!` = "intent") | counted as `annotationHints` only | ✓ case/mood mix per region | — | — |
| `~#lens(x)` | ✓ Annotation | ✗ `display.ts:304` reads only `// lens:` | — | aspect share | ✓ species name only | — |
| `%[x.y]{ unit: … }` | ✓ op:% + Bindings (verified) | — | not counted as a frame (`heuristicFrameCount` is `^`-only, `corpus.ts:392-394`) | — | ✗ `percent_measure` regex needs `%` followed by a letter | — |
| `$%[x.y]` | parses as a bare `$` op plus a `%[…]` op; no composite | wonder hover lists them | — | — | — | — |
| `&["c"]{ members: [...] }` | ✓ op:& + Bindings (verified) | — | not a frame; members are edges | ✓ | — | — |
| `k = v` inside `.{}` | flat op sequence, **no Binding** (verified) | — | — | — | — | — |
| `k: v` inside `.{}` | ✓ Binding | ✓ | ✓ | ✓ | ✓ | ✓ |

## Canonical examples

```
#   <glyph>["card"]{
#    phase: #<phase>
#    gist: "<one line: what this plan makes true>"
#    touches: [~"<repo-root-relative dir or file>", ...]
```
`.agents/plans/_schema/wip.spw:47-50`

```
^["kin"]{
 // computed: live plans that overlap in code or name each other, with no declared edge — a prompt to compare, not a claim
```
`.agents/plans/index.spw:260` (text emitted by `scripts/plans/plan-index.ts:374`)

```
 '?': .{lane:#public_interest_research, commit:[#question, #surface, #exhibit], drift:[#unknown_interest], feeds:[#prompt, #theory, #instrument]}
```
`.agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw:46`

```
^links[core]{
 refs: [
 ~"../../workspace.spw",
```
`.spw/biome/ocean/index.spw:90-92`

```
^metric[depth]{
 meaning: "nesting depth as graph distance from root frame"
 formula: [math, d_path]
}
```
`.spw/biome/ocean/algos/geom.spw:38-41`

```
^subroot[biome]{
 path: @biome
 ...
 cache_key_prefix: biome
```
`.spw/topology.spw:13-18`

```
  const lens = /^lens:\s*(.+)$/.exec(note)
  ...
    return { from: line, to: `${head} ~#lens(${lens[1].trim()})` }
```
`scripts/migrations/notes-to-appositions.ts:51-53`. This is the canon direction: `~#lens()` replaces `// lens:`, and the LSP has not caught up.

## Recommendations for `.spw/caches/2026-09-30/`

Build the hybrid in four layers, following the plan-index doctrine. Nothing from ocean's metaphor layer is needed.

1. **Tree (authored, one parent per file).** Directories follow the domain ontology.
   - Each `index.spw` has `^["tree"]{ name: ~"./x.spw" }`.
   - Drop `^"dispatch"`, and do not use `@name:` keys. Both create fake graph nodes; plain keys are enough.
   - Use file-relative refs only. `corpus-scan` has no consumer-root fallback, unlike `resolve.ts` since commit 2c082311.
   - Avoid the directory and file names `query/`, `expr/`, `ops/`, `algos/`, `experiments/`, `style*` and `phase*`. The LSP's ocean tier heuristic matches them as substrings.

2. **Facets (authored, closed vocabulary).**
   - A header particle stack on every surface: `#:domain #!x`, `#:method #!…`, `#:status #!settled|contested|open|retracted`, `#:archetype #!…`. Take archetype values from `.spw/surfaces/surface-archetypes.spw:14-75`; `exploratory_biome` survives there as an archetype.
   - Declare the vocabularies once in the root `^["legend"]` as `#[…]` sets.
   - Rule of thumb: each value should be used on at least 2 surfaces and no more than N/3.
   - Use a small closed lens set, as canon's six values do.
   - Name anchors `<domain>_<topic>` so the atlas groups anchors by domain.

3. **Edges (authored claims).**
   - `^["edges"]{ needs|feeds|contrasts|extends: [~"../x.spw#anchor"] }`.
   - Replace `~<"…">` with `~"path#anchor" ~#neighbor(nearest)` so the neighbor link becomes a graph edge.

4. **Computed clusters (derived; a prompt, not a claim).**
   - A generated `clusters.spw` of `&["name"]{ members basis cohesion }` rows plus `^["drift"]`.
   - Basis features: shared facet values, shared `%[…]` measure handles, co-citation, and anchor prefix.
   - Record a fingerprint the way `spw.corpus/1` products do.
   - This needs a **new** generator modeled on `plan-index.ts`.

**Measures.** Define each handle once as `%[domain.quantity]{ unit: formula: source: }`, and cite it bare as `%[…]` in wonder blocks, not `$%[…]`.

**Doors.** Add `^["doors"]` for reader questions, following `.agents/plans/index.spw:34-80`.

**Registration.** Add `@caches` in `shelves.spw` and `^subroot[caches]` in `topology.spw`.

Verified minimal example: `<scratchpad>/understand/ocean/probe2/` plus `probe3/clusters.spw`.
- `spw-syntax-validate` passed 5/5, and 1/1 for `clusters.spw`.
- `spw select --selector all --skim` confirmed the structure: `*["card"]` is op:* with Bindings, `%[…]{}` is op:% with Bindings, and each neighbor is a PathRef plus an Annotation.
- `spw resolve`: 14 ok, and 1 deliberately wrong anchor flagged `missing-anchor`.
- `spw atlas` on the correct probe: "8 deep-links used, 0 dangling".

```
#>thermo_exergy
#:domain #!thermo
#:method #!derivation
#:status #!settled

*["card"]{
 gist: "Exergy destroyed = T0 * S_gen (Gouy-Stodola)."
 as_of: "2026-09-30"
 source: "Bejan, Advanced Engineering Thermodynamics, 4th ed., ch. 3"
 up: ~"./index.spw"
}

#>exergy_balance
^["claim"]{ statement: "…" status: #settled }

^["edges"]{ feeds: [~"../econ/exergy-pricing.spw#exergy_pricing"] }

%[exergy.destroyed]{ unit: "kJ" formula: "T0 * S_gen" }

#>wonder_thermo_exergy_1
?["Where does a First-Law efficiency hide exergy destruction?"]{
  #:depth #!computational ~#lens(formal_structure)
  !probe{ "compare eta_I and eta_II for one Rankine cycle" }
  %[exergy.destroyed]
  ~"../econ/exergy-pricing.spw#exergy_pricing" ~#neighbor(nearest)
}
```

```
&["exergy"]{
 members: [~"./thermo/exergy.spw", ~"./econ/exergy-pricing.spw"]
 basis: #[shared_measure, shared_anchor_prefix]
 cohesion: 0.5
}
```

**Tool fixes needed before or during adoption:**
1. `packages/spw-cli/src/corpus-scan.ts:198-200`: strip `#fragment` before resolving, reusing the atlas's `splitTarget`. Without this, every deep link appears in `spw graph` as broken. This was verified: valid and invalid fragments are both listed.
2. Resolve `@name` against file-local roots, or leave unresolved roots out of hub ranking.
3. Add the consumer-root fallback to `corpus-scan`.
4. `heuristicFrameCount` should count frames of any operator, not only `^`.
5. Add a region-depth option to the atlas.
6. `display.ts:304` should read `~#lens()`.

## Open questions and pressure points for Spw theory

- **`#:` has three names.** It is "case" in the atlas (`atlas.ts:135`), "lens" in the LSP (`server-index.ts:1047`) and "kind" in the plan schema (`_schema/wip.spw:46`). The pair `#:k #!v` is bound only by adjacency, and no tool treats it as a key/value facet. Should the particle lattice have a pair product?
- **Anchor vs cluster.** A deixis particle makes an addressable unit (an anchor); case and mood particles give coordinates. Is a computed cluster a `&` confluence, while an authored grouping is a `#[…]` set? Nothing in the syntax separates derived frames from authored ones; today only a `// computed` comment does.
- **`$%` does not compose.** It parses as two ops, yet canon wonder blocks use it everywhere.
- **`k = v` does not bind.** Inside `.{}` it produces no Binding, although the plan index legend and relationship-topography use it.
- **Quoting `~<…>` changes semantics.** Quoted is a Capsule, bare is a PathRef. The notes-to-appositions migration adds quotes, which removes those edges from the graph.
- **Is "ocean" a lens rather than a structure?** Canon's six-value lens set already clusters wonder blocks. The caches broke it by minting 231 unique lens values.
- **Structural vs semantic clustering.** Strands, sigil cosine and resonance measure style, not topic, so semantic clusters need content features.
- **Keep or rename the `ocean` channel and `Spw.o`?** The metaphor can be retired independently of layers C and D.