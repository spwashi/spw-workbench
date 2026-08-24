# Plan: cli-sense-reorientation

Reorient the Spw CLI sense/read loop around **functional composition**, **shared intermediate IRs**, **generalized measure**, **dense serialization dialects (Spw.l / Spw.x)**, and **stream management** (`*` as crystallize/materialize)—without collapsing effect grades or status discipline.

## Goal

Today’s verbs grew by accretion (`invent`, `mass`, `profile`, `map`, `atlas`, `geometry`…). They work, but:

- names don’t match product language (invent ≠ inventory; mass ≢ all measurement; profile ≠ perf and ≠ full surface card)
- outputs don’t share one IR, so agents and humans relearn every command
- globs and multi-file streams are uneven
- live / dense serialization (Spw.l, Spw.x) isn’t a first-class pipeline story
- intermediate structures exist in runtime (precipitates, beat cache) and seed (parse, ONF) but aren’t named as a **composition spine**

**End state:** a small set of composable verbs over explicit IRs; aliases preserve old names for one era; `measure` generalizes mass; `census` (or `roster`) replaces invent; `surface` composes identity+form+ego-graph; streams of files/events are first-class subjects.

**Taste:** abstract navigation, functional composition, honest density, dialect-aware serialization.

### Progressive protocol checkpoint — 2026-08-24

`codex/gap-affinity-tooling` now supplies the first representative producer: `spw.progressive-product/1` records product id, revision, IR kind, sequence, stage, requested-field completeness, elapsed time, explicit omissions, and deferred depths. `spw inspect source` exposes `source.tokens/1`, `source.structure/1`, and `source.trace/1` as human, Spw, JSON, or live NDJSON projections. The token record leaves before grammar work, giving benchmarking infrastructure a real time-to-first-useful-output boundary.

This proves the shared protocol at one source boundary; it does not make envelope v2 universal, rename CLI verbs, or implement the wider IR catalog. The next adoption step should use the same record shape in one non-parser producer before considering it a general CLI law.

## Intermediate data structures (named spine)

These are the “bytes between stages”—not always on disk, always conceptually addressable.

| IR | Produced by | Consumed by | Notes |
|----|-------------|-------------|--------|
| **PreprocessIR** | dialect preprocess (l/q newlineAsSpace) | parse | key includes dialect |
| **LexIR** | lexer (token stream + spans) | parse, CLI describe, partial relex | incremental; dialect-keyed |
| **ParseIR** | `parse()` | geometry, query, semantic-edit, LSP | ast, tokens, dialect, expRefs, warnings |
| **OnfIR** | normalize (AST→ONF) | interpret, σ-chain, hash | densest structural precipitate |
| **StackIR** | `resolveSurfaceProfile` | surface, format, review, hover | multi-axis stack |
| **IdentityIR** | surface compose / stack+media | KB, LSP, multi-surface cards | full \| composite \| partial |
| **FormIR** | geometry inspect (AST-first target) | surface, lessons, fingerprints | pairs, depth, ops, method |
| **GraphIR** | map/atlas edge extract | surface ego, map, atlas | nodes, edges, degrees, **bias weights** |
| **AttentionIR** | crawl planner / atlas / LSP focus | CacheIR promotion, graph crawl | salience map over SelectionIR |
| **BiasIR** | `readBias` / `=[axis]` edges | graph ranking, measure schemes, crawl | axis + poles + sign |
| **MeasureIR** | measure/mass/authority/host metrics | surface thrift, CI, stabilize | verdicts + schemes |
| **ProbeIR** | wonder probes / `!probe` / exp used | exploration, resonance seed | id + claim + metrics |
| **ResonanceIR** | `detectResonances` | cache coupling, KB links, explore | value-echo, phase-sync, … |
| **SelectionIR** | glob + optional selector | refactor, measure multi, census | uri + contentHash[] |
| **PlanIR** | refactor/curiosity/φ lower | apply, receipt | spw.refactor.plan/1 etc. |
| **StreamIR** | `<<…>>` live or file batches | pulse stdin, beat, * crystallize | ordered items + cursor |
| **PrecipitateIR** | runtime stages (parse→normalize→interpret) | mem, state.spw, projection | already in pipeline/stages |
| **CacheIR** | BeatCache entries | LSP/runtime hot paths | tier, bornBeat, key incl. dialect + **attention** |
| **AlgoIR** | Spw.x algorithmic models | opt cache, bench, native solvers | graph/search/opt as Spw terms |
| **OptCacheIR** | memo / DP / crawl memo in Spw.x | measure, graph path, crystallize | keyed by AlgoIR + SelectionIR |
| **EnvelopeIR** | CLI json | agents, tests, KB export | spw.cli.envelope v2 |
| **KbIR** | census+graph+measure+exp join | agent kb, doctor, mount consumers | portable knowledge slice |

**Law:** each stage names its IR in `--json`; human text is a view of the same IR.

### Runtime / preprocessing placement

```
source bytes
  → PreprocessIR     (dialect metasyntax)
  → LexIR            (tokens + spans; re-lex windows)
  → ParseIR          (seed)
  → OnfIR*           (normalize σ)
  → PrecipitateIR*   (runtime stepped run, optional)
  → BiasIR / FormIR / GraphIR   (structural products)
  → AttentionIR      (what the crawl/agent looks at)
  → CacheIR          (beat-tiered; promotion by attention+hits)
  → StreamIR         (live / batch)
  → * crystallize    (materialize window → value / surface / host)
  → AlgoIR / OptCacheIR   (Spw.x native opt, optional)
  → EnvelopeIR / KbIR     (agent/export views)
```

\* Precipitates and ONF already exist; sense CLI should **cite** them, not reimplement. Resonance lives on Substrate event logs after A-line.

---

## Intermediate structure theory (expanded)

This section is the **theory of the spine**: how lexing, parsing, caching, and projection compose under ergonomics, bias, attention, and Spw-native algorithms. Visual metaphor series (S as **shape lattice**—dual melt, organic growth, ember spiral, ethereal curl, scientific plate, torch smoke) is used only as **gestalt anchors**, not as implementation requirements.

### Shape-lattice gestalt (imagination anchors)

| Image motif | Structural reading | Spine mapping |
|-------------|-------------------|---------------|
| Dual candles / melt | dual liminality; hot+cold co-present; composite identity dripping into one field | StackIR dual axes; StreamIR residue; IdentityIR composite |
| Organic pedestal organism | emergent grammar; multi-material media; drip trails = partial crystallize | FormIR+GraphIR growth; PrecipitateIR drip; KB “living” slice |
| Ember S on scratched plate | operational heat trail on substrate; spiral attractors | AttentionIR crawl path; CacheIR hot trail; BiasIR curve |
| Ethereal fractal S | pure recursive form; soft focus | FormIR fingerprint; geometry ladder; partial parse windows |
| SPW shape-lattice plate | S as public identity; orbital bodies; horizon | GraphIR ego+hubs; EnvelopeIR “plate”; IdentityIR full card |
| Torch S into night sky | effect grade rising; signal from fire; measure as light | ProbeIR → ResonanceIR; crystallize smoke; Spw.x live trail |

**Law of the S:** intermediate structure is not a straight pipeline only—it is a **spiral attractor**: re-entry (re-parse, re-crawl, re-measure) thickens CacheIR and reshapes AttentionIR the way heat thickens an S-trail.

---

### 1. Lexing / parsing as ergonomic substrates

| Stage | IR | Ergonomic job | Manual optimization hooks |
|-------|-----|---------------|---------------------------|
| Preprocess | PreprocessIR | dialect metasyntax cheap before lex | dialect lock; skip when `@dialect` stable |
| Lex | LexIR | spans for CLI describe, partial relex, window skim | relex only dirty ranges; token-type histograms |
| Parse | ParseIR | AST + expRefs + warnings | incremental parse; dialect-keyed cache key |
| Normalize | OnfIR | densest comparable structure | hash ONF for identity; skip interpret if only structure needed |

**Script design (agent + human):**

```text
# Prefer named IR handoff over re-parse
spw ir parse file.spw --json > /tmp/p.json
spw geometry --from-parse /tmp/p.json
spw measure density --from-parse /tmp/p.json
```

**CLI description enhancements (syntactically useful):**

| Enhancement | Parser/runtime need | CLI surface |
|-------------|---------------------|-------------|
| Token/span cite in errors | LexIR stable spans | `spw surface --describe-error` |
| Partial identity of broken files | error-tolerant ParseIR slice | `surface health`, `geometry --partial` |
| Dialect-aware help snippets | exp catalog + dialect stack | `exp show` embeds in `surface exp` |
| Operator/brace “what is this glyph?” | grammar tables + FormIR | `geometry ops --teach` |
| Selection explain | SelectionIR + selector AST | `select --explain` |
| Envelope as Spw.l | serial dialect | `… --l` for dense agent packs |

**Manual optimizations (documented knobs, not magic):**

| Knob | Effect | Risk |
|------|--------|------|
| `--method scan` vs `ast` | FormIR cheap vs honest | scan lies about structure |
| `--dialect D` lock | skip detect | wrong dialect → wrong PreprocessIR |
| `--from-parse` / contentHash reuse | skip seed | stale AST if file moved under you |
| `--depth N` ego | bound GraphIR | incomplete neighborhood |
| Cache tier pin `hot` | keep working set | memory pressure |
| Attention seed (path list) | bias crawl | tunnel vision |

---

### 2. Graph biases and crawl topography

GraphIR is not neutral topology. **Edges carry product kinds** (path, root, anchor, couple) and can inherit **BiasIR** weights from `=[axis]` edges and operational schemes.

| Bias source | Effect on GraphIR | Effect on crawl |
|-------------|-------------------|-----------------|
| pathRef degree | hub ranking | hubs visited first |
| `=[axis]` bias edges | directed preference poles | prefer pole targets in ego expansion |
| authority / !writes | danger heat | optional demote or flag |
| review profile (canon vs agent) | trust weight | cold-tier canon, hot agent drafts |
| dialect (Spw.x vs Spw.b) | density prior | dense live edges crawl cheaper in x |
| measure drift | “stale” heat | recrawl / remeasure priority |
| resonance strength | soft couple edges | explore non-declared links |

**Graph bias options (naming for flags / Spw.x):**

```text
--bias degree|path|authority|resonance|profile|dialect|uniform
--bias-axis <axis>          # honor =[axis] poles
--rank hub|betweenness|heat
--direction out|in|both
```

**Default rec:** `degree` for census/graph hubs; `resonance` only when Substrate log present; `uniform` for falsification baselines.

---

### 3. Projection effects through cache crawls

**Projection** here: any view (CLI text, LSP hover, atlas HTML, cognitive laser block) is a **lossy function** of IRs. Crawling the corpus to fill CacheIR is not free of attention—it **writes** AttentionIR.

```text
SelectionIR seed
  → AttentionIR (salience: path weight, recency, user focus, probe heat)
  → crawl order π
  → for each uri in π:
        hit CacheIR? → project view
        miss → Lex/Parse → products → set CacheIR(tier from attention)
  → projection view V = f(CacheIR, AttentionIR, BiasIR)
```

| Effect | Description | Mitigation / embrace |
|--------|-------------|----------------------|
| **Hot-path tunnel** | repeated CLI on same files promotes hot; rest never enters cache | `--cold-sweep`, atlas full pass, bench cold start |
| **Order dependence** | first files in glob set attention prior | stable sort by path; disclose crawl order in `--json` |
| **Projection lock-in** | human reads only Envelope text; never sees BiasIR | `--json` + `ir dump` |
| **Tier fiction** | cold entries look “absent” in warm-only views | stats: `bench cache`, CacheIR stats in doctor |
| **Attention topography** | spiral S of access on disk graph | export AttentionIR heatmap; optional Spw.x trail |
| **Operational bias** | measure/refactor scripts only touch thrift paths | explicit `--bias uniform` for audits |

**Attentional topography (named fields):**

| Field | Source | Use |
|-------|--------|-----|
| focusUri | LSP / last surface | hot seed |
| probeHeat | open `!probe` / wonder | exploration budget |
| editRecency | host mtime / git | warm promote |
| hubPull | GraphIR degree | crawl gravity |
| schemePull | undeclared mass / drift | measure priority |
| resonancePull | ResonanceIR strength | novel link follow |

**Law:** every sense command that multi-files is a **cache crawl with an attention prior**. Document the prior; never pretend uniform.

---

### 4. Substrates, biases, resonance, probes, measurements (maneuver kit)

Compose runtime primitives into **exploration / caching / maneuver** verbs rather than only batch sense.

| Primitive | Already | Novel maneuver |
|-----------|---------|----------------|
| **Substrate** | event log, bind/emit/drain | CLI `stream follow` as substrate drain; multi-surface substrate for corpus |
| **Bias** | `readBias`, `=[axis]` | rank graph/census; scheme-weighted measure; crawl poles |
| **Resonance** | value-echo, phase-sync, frequency-lock, implicit-couple | soft edges in GraphIR; KB “you might couple”; cache co-promote keys |
| **Probe** | wonder `!probe`, exp probes | `spw probe run|list|heat`; AttentionIR seed from open probes |
| **Measure** | mass family → MeasureIR | multi-family; feed OptCacheIR; gate crystallize |
| **Precipitate** | stage outputs | CLI cite stage; compare AST vs ONF vs Value |
| **BeatCache** | hot/warm/cold | attention-weighted TTL; resonance co-tier; Spw.x opt memo |

**Maneuver recipes:**

```bash
# Explore: follow resonance, not only pathRefs
spw graph <globs> --bias resonance --json

# Cache: pin attention to probes + hubs
spw census hubs prompts/** -n 20 | spw cache pin --from-envelope -

# Maneuver: measure only drift-hot
spw measure drift '**/*.spw' --strict
spw measure mass --missing --glob '**/*.spw'

# Novel: crystallize substrate window into measure card
spw stream follow --stdin --dialect Spw.x | spw crystallize --into measure
```

**Proposed sense-adjacent verbs (soft, later):**

| Verb | Role |
|------|------|
| `probe` | list/run/heat wonder probes → ProbeIR |
| `resonate` / `resonance` | run detectResonances on mem/substrate → ResonanceIR |
| `cache` | stats, pin, sweep, export CacheIR (not CPU profile) |
| `attend` | set/show AttentionIR seed for next multi-file cmd |
| `ir` | dump named IR (late) |

---

### 5. Complex, composite, and partial identities

Modern media and emergent grammar need **IdentityIR** richer than “one path + one stack.”

| Kind | Definition | CLI / product |
|------|------------|---------------|
| **Full identity** | uri + contentHash + StackIR + Form fingerprint + ego summary | `surface show` |
| **Composite identity** | ordered/set of surfaces or media slices acting as one unit (book, plan pack, multi-file episode) | `surface --compose a.spw,b.spw` / SelectionIR seal |
| **Partial identity** | recoverable slice under error, window, or dialect-unknown | `surface health`, parse with warnings, LexIR-only card |
| **Projected identity** | view-specific (hover card ≠ atlas node ≠ KbIR row) | Envelope views; disclose projection |
| **Emergent identity** | cluster from resonance + form fingerprint + shared frames | `census clusters` / graph components + resonance |

**Media / grammar discovery:**

| Concern | IR support | Exploration |
|---------|------------|-------------|
| Multi-file “work” as one | Composite IdentityIR | crystallize SelectionIR → sealed card |
| Glyph / dialect emergence | exp used + FormIR ops + dialect hist | `exp used --glob` + `census dialects` |
| Partial parse media (live buffers) | LexIR + partial ParseIR | Spw.x stream frames with incomplete AST |
| Cross-host identity (mount) | contentHash + mount roots | doctor + KbIR portable |
| Shape-lattice public face | Form fingerprint + Graph ego | surface plate (visual #5 ethos) |

**Stack axes remain** (dialect × review × format × …); IdentityIR **wraps** StackIR rather than replacing it.

```text
IdentityIR =
  { kind: full|composite|partial|projected|emergent
  , parts: SelectionIR | uri[]
  , stack?: StackIR
  , form?: FormIR summary
  , graph?: ego
  , measure?: thrift slice
  , attention?: focus weight
  , completeness: 0..1
  }
```

---

### 6. Knowledge base utility

Sense outputs should **feed** agent KB and mount consumers without a separate ad-hoc scrape.

| KbIR field | Source IR | Use |
|------------|-----------|-----|
| surfaces[] | census + surface cards | inventory |
| edges[] | GraphIR | navigation |
| measures[] | MeasureIR | CI / thrift |
| expIndex | exp catalog + used | experimental literacy |
| probes[] | ProbeIR | open questions |
| resonances[] | ResonanceIR | soft knowledge |
| attention | AttentionIR snapshot | “what we last cared about” |
| cacheStats | CacheIR | readiness / thrash |
| envelopeMeta | dialect, beat, scheme | provenance |

**CLI toward KB:**

```bash
spw kb build <roots> --json           # join census+graph+measure+exp
spw kb slice --topic X                # filter KbIR
spw census … --json | spw kb ingest - # pipe
spw doctor --kb                       # readiness includes KbIR freshness
```

**Rec:** `kb` is a **composer** over IRs (like surface is a card composer), not a second corpus truth.

Align with `.agents/kb` and `spw:agent:kb`—export shapes should match what agents already list.

---

### 7. Spw-native algorithmic modeling & optimization caching (Spw.x)

Spw.x is the **hot dense** dialect for live + effect-aware serial. Extend it as the home for **algorithms as Spw terms** and **OptCacheIR**.

**AlgoIR sketch (Spw.x):**

```text
@dialect:Spw.x
^["algo"]{ =id[shortest_path] , kind: graph , on: GraphIR
  , params: .{ depth: 3 , bias: degree }
  , cost: %{beats}: 4 , %{nodes}: 120 }
^["opt"]{ =id[memo_path] , algo: ~shortest_path
  , key: #{ a: ~"a.spw" , b: ~"b.spw" , bias: degree }
  , hit: #yes , tier: hot , bornBeat: 42 }
*{ =id[window] }   // crystallize last algo/opt events
```

| Algorithm family | Inputs | Cached as | CLI |
|------------------|--------|-----------|-----|
| graph path / k-path | GraphIR | OptCacheIR | `graph path` |
| hub / betweenness approx | GraphIR | OptCacheIR | `graph hubs` |
| form fingerprint | FormIR | CacheIR | `geometry fingerprint` |
| measure reconcile | MeasureIR | OptCacheIR by scheme | `measure mass` |
| resonance detect | Substrate log | ResonanceIR + cache | `resonate` |
| selection resolve | glob+selector | SelectionIR | multi-file sense |
| crystallize window | StreamIR | sealed IdentityIR | `crystallize` |

**Optimization laws:**

1. **Key includes bias + dialect + contentHash** — wrong key → silent wrong answer.  
2. **Tier by attention** — path queries on focusUri stay hot.  
3. **Disclose hits in Envelope** — `cache: { hit, tier, key }` for agents.  
4. **Ceilings in Spw.x** — algo cost budgets (`%{beats}`, `%{nodes}`) before thrash.  
5. **Manual override** — `--no-cache`, `--recompute`, `--bias uniform` always available.

**Parser/runtime enhancements that make this real:**

| Enhancement | Layer | Why |
|-------------|-------|-----|
| Stable LexIR export | seed | partial + CLI teach |
| ParseIR contentHash key | seed | cache correctness |
| BiasIR on GraphIR edges | seed/runtime | crawl + rank |
| AttentionIR in multi-file CLI | cli | honest topography |
| Substrate log → ResonanceIR CLI | runtime+cli | novel edges |
| OptCacheIR in BeatCache or sibling | runtime | algo memo |
| Spw.x algo/opt frames in catalog | exp | literacy |
| Envelope v2 `ir` + `cache` blocks | cli | agent composition |
| KbIR join command | cli | knowledge utility |
| IdentityIR composite/partial | cli+lsp | media + broken buffers |

---

### 8. Unified crawl–project–cache loop (script template)

```text
attend(seed) → SelectionIR
  → bias(rank) → GraphIR order
  → for uri:
       CacheIR.get(parseKey)?
         Y → ParseIR
         N → Preprocess→Lex→Parse → CacheIR.set(tier=f(attention))
       derive FormIR / MeasureIR / ego as needed (each cacheable)
  → project Envelope | surface card | KbIR row
  → optional: resonance, algo, crystallize
  → update AttentionIR from what was actually shown
```

**Ergonomics checklist for every multi-file verb:**

- [ ] Stable selection order disclosed  
- [ ] Bias default named  
- [ ] Cache hit rate in `--json`  
- [ ] Partial identity if parse fails  
- [ ] Scheme/dialect in key  
- [ ] Escape hatches: `--no-cache`, `--bias uniform`, `--depth`  

---

### 9. Theory → delivery mapping

| Theory chunk | Phase add-on |
|--------------|--------------|
| LexIR + describe / partial | P2–P4 |
| BiasIR on graph + flags | P3–P4 |
| AttentionIR + crawl disclosure | P3 |
| IdentityIR composite/partial | P3 surface |
| Resonance/probe CLI | P5–P6 |
| Cache stats / pin | P6 |
| AlgoIR + OptCacheIR Spw.x | P6–P7 |
| KbIR build/ingest | P6 |
| Envelope cache+ir blocks | P2 |

## Spw.l / Spw.x as dense serialization formats

| Dialect | Serialization ethos | Use |
|---------|---------------------|-----|
| **Spw.l** | **Dense, cold, line-collapsed** — high info per glyph; newline≈space | logs, probe batches, selector packs, ND-style records as Spw terms |
| **Spw.x** | **Dense, hot, effect-aware** — same compactness + ceilings/locks/measure | live telemetry frames, HMR events, register snapshots as Spw |
| **Spw.b** | **Sparse, legible** — teaching and canon | human documents |
| **Spw.m** | **Skeleton, hashable** | CI, packages |
| **Spw.q** | **Address only** | selection language, not full docs |

**Dense record sketch (l/x):**

```text
@dialect:Spw.l
^["e"]{ t: 1.2e3 , k: "write" , $: ~"mod.spw" , %[bytes]: 120 }
^["e"]{ t: 1.2e3 , k: "parse" , ok: #yes , d: Spw.b }
```

**Live stream sketch (x):**

```text
@dialect:Spw.x
<<
  ^["tick"]{ beat: 42 , tier: hot }
  ^["reg"]{ $: "focus" , ! : measure }
  *{ =id[window] }    // crystallize last N events → sealed buffer
>>
```

**Generalization:** serialization format = dialect + IR schema; not a new file extension unless derived (`*.stream.spw`, `*.events.spw` optional).

## Verb redistribution

### Sense (measure without write)

| New primary | Role | Aliases (compat) | Replaces / absorbs |
|-------------|------|------------------|--------------------|
| **`surface`** | one-file card: stack+form+ego | `profile` | profile as default lens |
| **`stack`** | identity only | (subset) | thin profile |
| **`census`** | multi-file inventory/roles | `invent`, `inventory`, `inv` | invent |
| **`geometry`** | deep form | `geom` | keep |
| **`graph`** | corpus/ego topology | `map`, `topo` | map primary→graph optional dual name |
| **`atlas`** | observatory + HTML + trend | keep | keep |
| **`measure`** | general metrics + schemes | `mass` as family/alias | mass generalized |
| **`authority`** | claim vs observe | keep | keep under measure family later |
| **`exp`** | syntax catalog | `experimental` | keep |
| **`analyze` / `formula`** | keep or fold under measure later | | soft |

### Read

| Verb | Role |
|------|------|
| **query / select / skim / ls** | keep; selection feeds SelectionIR |
| **stream** (new, soft) | read/follow StreamIR from files or stdin |

### Shape / effect

| Verb | Role |
|------|------|
| format, expand, refactor, emit | keep |
| pulse, mutate, beat, mem | keep; stdin StreamIR |
| **`*` crystallize** (conceptual + later CLI) | fold stream window → sealed IR / file / host |

### Performance (separate forever)

| Verb | Role |
|------|------|
| **`bench`** | timed tool performance |
| never `profile` for CPU | avoids collision |

## Naming matrix (options)

Recommended picks are marked **(rec)**. Keep old names as aliases for ≥1 release.
Each family lists: **primaries** (choose one), **short aliases**, **subcommand trees**, **flag packs**, **alternate CLI shapes**.

### Identity / one-file card

| Candidate primary | Sense | Pros | Cons | Aliases |
|-------------------|--------|------|------|---------|
| **`surface` (rec)** | full card: stack+form+ego | matches repo language; not “perf” | slightly abstract | `profile` (compat; doc as stack lens) |
| `stack` | identity axes only | precise dialect×review×format | incomplete “what is this file?” | `profile` |
| `card` | human report | friendly | not in corpus | — |
| `face` | presentation of unit | short, on-brand with surface | vague | — |
| `who` | playful | memorable | not serious CLI | — |
| `inspect` | general | familiar git/k8s | collides geometry inspect | — |
| `describe` | k8s-like | clear | long | — |
| `id` / `identity` | stack only | precise | too thin as primary | stack |
| `portrait` | rich card | evocative | long, soft | surface |
| `sheet` | fact sheet | practical | spreadsheet connotation | card |
| `dossier` | full file brief | thorough | heavy | surface |
| `lens` | view-of-file | matches “lens” in profile docs | soft primary | — |
| `scan` | light pass | short | collides security scan | — |

**Short alias table (surface family)**

| Alias | Resolves to |
|-------|-------------|
| `profile` | `surface stack` (compat) *or* `surface` with stack-first default |
| `sf` | `surface` (optional ultra-short; only if help lists) |
| `st` | `stack` |

**Subcommands / lenses for `surface`**

```bash
spw surface <path>                      # default: stack + form summary + ego
spw surface <path> show                 # same as default
spw surface <path> stack                # StackIR only (today’s profile)
spw surface <path> form                 # FormIR summary (geometry lite)
spw surface <path> graph | ego          # GraphIR neighborhood
spw surface <path> thrift | mass        # MeasureIR mass family if @self
spw surface <path> exp                  # cited =exp ids + catalog join
spw surface <path> outline | frames     # skim-like frame list
spw surface <path> dialect              # dialect axis only
spw surface <path> review               # review/profile axis only
spw surface <path> format               # format/presentation axis only
spw surface <path> health               # parse ok + warning counts
spw surface <path> all | --full         # every lens
spw surface <path> dump <ir>            # dump named IR slice: stack|form|graph|…
spw surface <path> --json|--md|--text|--l|--x
spw surface --glob 'prompts/**/*.spw' --only stack
spw surface <path> --compare other.spw  # delta stack/form/graph
spw surface <path> --diff-base HEAD~1   # optional git-ish compare
```

**Flags**

| Flag | Meaning |
|------|---------|
| `--only <lens>` | stack\|form\|graph\|thrift\|exp\|outline\|dialect\|review\|format\|health |
| `--lenses a,b,c` | multi-lens without subcommand |
| `--glob` / positional | SelectionIR multi |
| `--json` / `--md` / `--text` | Envelope views |
| `--l` / `--x` / `--dialect D` | dense serial view or force dialect |
| `--method ast\|scan` | form method disclosure |
| `--depth <n>` | ego hop depth |
| `--no-lessons` | omit interpretive lessons |
| `--compare <path>` | delta vs another surface |
| `--quiet` / `-q` | verdict line only |

**Alternate shapes (pick one style in docs; implement both where cheap)**

```bash
# verb-noun (rec)
spw surface form file.spw
# flag-lens
spw surface file.spw --only form
# pipe IR
spw surface file.spw --json | spw measure --from-envelope -
```

---

### Population / multi-file inventory

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`census` (rec)** | count + classify population | statistical, serious | slightly academic | invent, inventory, inv |
| `roster` | ordered list of units | clear listing | weak on metrics | invent |
| `inventory` | stock list | plain English | long | invent, inv |
| `index` | build/query index | powerful | collides LSP index | — |
| `survey` | light pass | onboarding | vague | — |
| `catalog` | enumerated units | clear | collides exp catalog | — |
| `population` | demo-graphic | precise | long | census |
| `roll` / `rollcall` | list present units | playful | soft | roster |
| `ls-corpus` | list | familiar | ugly | — |
| `stat` / `stats` | unix-y aggregates | short | collides analyze | — |
| `manifest` | shipping list | release-ish | confuses package manifest | — |
| `audit` | full pass | serious | collides privacy audit | — |
| `tally` | count-first | short | weak roles | census summary |
| `ledger` | recorded units | Spw-ish | confuses account ledger | — |

**Short aliases**

| Alias | Resolves |
|-------|----------|
| `invent` | `census` |
| `inventory` / `inv` | `census` |
| `cen` | `census` (optional) |

**Subcommands for `census`**

```bash
spw census <globs...>                     # default table: lines, refs, frames, roles
spw census list <globs...>                # same
spw census summary <globs...>             # aggregates only (totals, role counts)
spw census hubs <globs...> -n 12          # high out-degree
spw census leaves <globs...>              # low degree
spw census orphans <globs...>             # no edges
spw census bridges <globs...>             # high betweenness / dual-role
spw census adrift <globs...>              # unrooted / no pathRefs
spw census roles <globs...>               # hub|bridge|leaf|adrift breakdown
spw census paths <globs...>               # path-ref density ranking
spw census dialects <globs...>            # dialect histogram
spw census profiles <globs...>            # review-profile histogram
spw census frames <globs...>              # frame-label histogram
spw census size <globs...>                # lines/bytes ranking only
spw census stale <globs...>               # optional: git-mtime / undeclared mass
spw census export <globs...> --format csv|json|md|l
spw census --sort degree|lines|refs|frames|path -n 30
spw census --role hub|bridge|leaf|adrift
spw census --min-lines N --max-lines N
spw census --compare <other-root>         # shared vs novel paths
spw census --since <git-ref>              # files changed since
spw census --exclude '!**/.agents/**'
```

---

### Measurement

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`measure` (rec)** | any metric under scheme | generalizable; matches `%` | broad | mass, thrift |
| `mass` | thrift only | shipped | too narrow as primary | → `measure mass` |
| `thrift` | file-physics | on-brand | not authority | mass |
| `gauge` | read instruments | Spw-ish | soft | measure |
| `meter` | instrument | short | hardware connotation | measure |
| `assay` | lab test | precise | niche | measure |
| `check` | verify claims | CI-friendly | collides pulse --check | verify |
| `verify` | claims vs world | clear | overlaps doctor | check |
| `metric` / `metrics` | numbers | precise | noun not verb | measure |
| `score` | single score | simple | hides scheme | — |
| `reconcile` | declare→observe | matches mass story | long for daily | measure --write path |
| `observe` | host observe only | valence | incomplete without claim | — |
| `declare` | print declared only | teaching | incomplete | — |

**Short aliases**

| Alias | Resolves |
|-------|----------|
| `mass` | `measure mass` (or full measure if no sub) |
| `m` | `measure` (optional; high collision) |
| `thrift` | `measure thrift` |

**Subcommands for `measure`**

```bash
spw measure <paths|globs>                   # all families present
spw measure mass <paths|globs>              # lines/bytes thrift (today’s mass)
spw measure thrift <paths|globs>            # alias mass family
spw measure size <paths|globs>              # size-only view
spw measure authority <paths|globs>         # !writes / &joins / !reads
spw measure density <paths|globs>           # ops/depth/frames
spw measure health <paths|globs>            # parse ok, warnings
spw measure drift <paths|globs>             # aggregate drift verdicts
spw measure claim <paths|globs>             # claim-protocol when wired
spw measure scheme <paths|globs>            # list schemes in use
spw measure families                        # list family ids (no files)
spw measure schemes                         # list EvalScheme ids
spw measure hits <paths|globs> --selector … # analyze fold option
spw measure formula <paths|globs>           # formula fold option
spw measure taste <paths|globs>             # taste fold option
spw measure diff --from A --to B            # metric delta across revs
spw measure report <paths|globs> --md       # human CI report
spw measure --family mass|authority|density|health|drift|all
spw measure --scheme exact|band|tol|ratio|…
spw measure --write                         # exact+drift mass digits only
spw measure --missing                       # undeclared measurable keys
spw measure --strict                        # fail CI on any fail/drift
spw measure --stdin --dialect Spw.l
spw measure --json|--md|--text
```

**Family naming options**

| Family id | Also call | What |
|-----------|-----------|------|
| `mass` | thrift, size, bulk | lines, bytes, tokens |
| `authority` | access, caps, rights | writes/joins/reads |
| `density` | form-density, compact | op%, depth, frames |
| `health` | parse, sanity | parse ok, warnings |
| `drift` | stale, delta | claim vs observe drift |
| `scheme` | eval | schemes present |
| `hits` | selectors | selector hit density |
| `formula` | patterns | formula catalog hits |
| `taste` | vocab | taste/fidelity |

**Verdict naming (output vocabulary)**

| Verdict | Also | Use |
|---------|------|-----|
| `pass` | ok, green | within scheme |
| `fail` | red | outside scheme |
| `drift` | warn, amber | outside band/tol but not hard fail |
| `missing` | undeclared | no claim to reconcile |
| `skip` | n/a | family not applicable |

---

### Topology / graphs

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`graph` (rec dual)** | abstract navigation | math/CS clear | users know `map` | map, topo |
| **`map` (rec keep)** | topography | already taught | less abstract | graph, topo |
| `topo` | topology | short | niche | map |
| `net` / `network` | edges | short | toyish | graph |
| `deps` | dependencies | npm-like | misses anchors | — |
| `web` | soft mesh | — | vague | — |
| `lattice` | Spw lattice | on-brand | overclaims math | — |
| `mesh` | connectivity | soft | vague | — |
| `links` | edge list | clear | weak hubs story | edges |
| `refgraph` | pathRefs only | precise | long | graph |
| `constellation` | hubs as stars | evocative | long | atlas-ish |
| `nav` | abstract navigate | short | soft | graph |

**Short aliases**

| Alias | Resolves |
|-------|----------|
| `map` | `graph` (or dual equal) |
| `topo` | `graph` |
| `g` | `graph` (optional) |

**Subcommands for `graph` / `map`**

```bash
spw graph <globs...>                        # default: hubs + orphans + cycles summary
spw graph show <globs...>
spw graph hubs <globs...> -n 12
spw graph orphans <globs...>
spw graph leaves <globs...>
spw graph cycles <globs...>
spw graph components <globs...>             # connected components
spw graph bridges <globs...>                # cut edges / bridge nodes
spw graph ego <file.spw> --depth 1|2|3
spw graph neighbors <file.spw>              # depth-1 only
spw graph path <a.spw> <b.spw>              # shortest ref path
spw graph paths <a.spw> <b.spw> --k 5       # k shortest (optional)
spw graph edges <globs...> --type path|root|anchor|couple|all
spw graph nodes <globs...>                  # node table (degree, role)
spw graph degree <globs...>                 # degree distribution
spw graph matrix <globs...>                 # adjacency summary (small only)
spw graph export <globs...> --format dot|json|md|l
spw graph --compare <other-root>
spw graph --direction out|in|both
spw graph --min-degree N
spw map … / spw topo …                      # aliases
```

**`atlas` stays separate** (observatory product):

```bash
spw atlas [roots]
spw atlas summary | html | trend | advice | save | diff | show
spw atlas graph [roots]                     # optional thin wrap → graph
spw atlas census [roots]                    # optional thin wrap → census
spw atlas --from <ref> [--to <ref>]
spw atlas --html [path]
spw atlas --json|--md
```

**Atlas vs graph decision**

| Need | Use |
|------|-----|
| Interactive / HTML / trend / advice | `atlas` |
| Scriptable topology / ego / path | `graph` |
| Population table without edges | `census` |

---

### Form / geometry

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`geometry` (rec keep)** | form lessons | shipped | long | geom, form |
| `form` | brace/op form | matches FormIR | soft | geometry, geom |
| `shape` | gestalt | shape-literacy | vague | geometry |
| `structure` | AST | clear | dry | — |
| `brace` | brace focus | precise | incomplete ops | geometry pairs |
| `ops` | operator focus | precise | incomplete braces | geometry ops |
| `morph` | form change | Spw-ish | confuses mutate | — |
| `layout` | spatial form | — | collides CSS layout | — |
| `fingerprint` | form hash | useful sub | not full report | geometry fingerprint |
| `gestalt` | whole form | on-brand theory | long | geometry |

**Short aliases**

| Alias | Resolves |
|-------|----------|
| `geom` | `geometry` |
| `form` | `geometry` (optional) |
| `shape` | `geometry` (optional) |

**Subcommands for `geometry`**

```bash
spw geometry <file>
spw geometry show <file>
spw geometry pairs <file>                   # brace kinds
spw geometry braces <file>                  # alias pairs
spw geometry ops <file>                     # operator table
spw geometry depth <file>                   # depth profile
spw geometry lessons <file>                 # interpretive lessons
spw geometry fingerprint <file>             # stable form hash
spw geometry ladder <file>                  # form-geometry ladder steps
spw geometry mobility <file>                # mobility probes (if wired)
spw geometry compare a.spw b.spw            # form delta
spw geometry --method ast|scan|auto
spw geometry --stdin
spw geometry --json|--md|--text
spw geom … / spw form …
```

---

### Experimental catalog

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`exp` (rec keep)** | experimental ids | short | cryptic | experimental, catalog |
| `catalog` | registry | clear | collides census catalog option | exp |
| `xref` | cross-ref ids | — | obscure | — |
| `syntax` | syntax catalog | clear | broad | exp |
| `experimental` | full word | honest | long | exp |
| `registry` | formal | clear | long | exp |
| `features` | feature flags feel | familiar | wrong metaphor | — |
| `hooks` | hook-indexed | precise subset | incomplete | exp list --hook |

**Subcommands for `exp`**

```bash
spw exp list [--status stable|trial|draft|…] [--dialect …] [--hook …]
spw exp show <id>
spw exp used <file.spw>
spw exp used --glob '**/*.spw'              # citation frequency
spw exp search <substr>
spw exp related <id>                        # same hook/family
spw exp missing <file.spw>                  # surface uses unknown ids
spw exp export --format json|md|l
spw exp --json
spw experimental … / spw catalog …          # aliases
```

---

### Streams + crystallize

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`stream` (rec new)** | StreamIR follow/batch | clear | new | events, follow, feed |
| **`crystallize` (rec new)** | `*` fold | matches operator | long | freeze, seal, materialize |
| `fold` | reduce stream | FP | collides form-fold | crystallize |
| `seal` | ^ seal | short | git confusion | crystallize |
| `materialize` | * | precise | long | crystallize |
| `freeze` | snapshot | clear | cold connotation | crystallize |
| `collapse` | fold window | matches CA | negative tone | crystallize |
| `capture` | take window | clear | soft | crystallize |
| `snap` / `snapshot` | sealed frame | short | collides atlas save | crystallize |
| `events` | event stream | clear | noun | stream |
| `follow` | tail -f style | familiar | incomplete alone | stream follow |
| `feed` | continuous | short | soft | stream |
| `pipe` | stdin/out | unix | vague | stream |
| `*` as CLI token | pure op | pure Spw | shell expansion hell | **never** unquoted `*` |

**Subcommands**

```bash
spw stream read <file.spw>                  # <<>> or ND-Spw.l records
spw stream follow --stdin [--dialect Spw.x]
spw stream batch --glob 'logs/**/*.spw'
spw stream window --last 50 [--from-stream id]
spw stream cat <files...>                   # concatenate streams
spw stream filter --kind tick|reg|e
spw stream head -n 20 / spw stream tail -n 20
spw stream stats                            # counts by kind
spw stream export --format l|x|json

spw crystallize --stdin --window 50 --out snap.spw
spw crystallize --from-stream <id> --op fold|seal|snapshot|aggregate
spw crystallize --window 50 --into measure  # fold → MeasureIR
spw crystallize --window 50 --into surface  # fold → surface card
spw crystallize --json
spw stream crystallize …                    # nested alt (if no top-level)

# pipes
spw stream follow --stdin | spw crystallize --window 20
spw stream batch --glob '…' | spw measure --stdin --dialect Spw.l
```

**`*` naming in help copy**

| Term in docs | Meaning |
|--------------|---------|
| shell `**` | path glob (SelectionIR) |
| Spw `*` | crystallize / collapse intermediate |
| CLI `crystallize` | verb that implements stream fold |
| never bare `spw *` | shell expands; use word form |

**Where crystallize lives (open choice)**

| Option | CLI | Pros | Cons |
|--------|-----|------|------|
| **A top-level (rec)** | `spw crystallize` | matches `*` importance | one more verb |
| B nested | `spw stream crystallize` | fewer top-level | hides `*` |
| C flag | `spw stream --crystallize` | few verbs | not composable |

---

### Performance

| Candidate | Sense | Pros | Cons | Aliases |
|-----------|--------|------|------|---------|
| **`bench` (rec)** | timed scenarios | clear | — | perf |
| `perf` | broader telemetry | short | vague | bench |
| `time` | unix-y | familiar | weak product | — |
| `speed` | informal | — | soft | — |
| `timing` | noun | — | soft | — |
| `profile` | CPU profile | industry | **FORBIDDEN** (stack collision) | — |
| `load` | load test | — | confuses file load | — |
| `stress` | stress test | — | heavy | — |
| `budget` | enforce budgets | CI | incomplete alone | bench --budget |

**Subcommands for `bench`**

```bash
spw bench parse <globs> [--dialect …] [--iterations n]
spw bench query --from … --selector …
spw bench pulse <file> [--pulse-profile layout_canonical]
spw bench surface <file>
spw bench measure <globs>
spw bench graph <globs>
spw bench census <globs>
spw bench lsp-hover <file>                  # optional later
spw bench all --suite smoke|full
spw bench --budget ms=… --fail-over
spw bench --warmup n --iterations n
spw bench --json|--md
spw perf …                                  # alias
```

**Note:** pulse mutation profiles stay `--pulse-profile` / internal names—not CLI `profile`.

---

### Analysis / formulas (optional fold)

| Keep top-level | Fold under measure | Fold under census | Fold under graph |
|----------------|--------------------|-------------------|------------------|
| `analyze` | `measure hits` / `measure selectors` | — | — |
| `formula` | `measure formula` | — | — |
| `taste` | `measure taste` | — | — |
| `authority` | `measure authority` | — | — |
| — | — | `census frames` | — |
| — | — | — | `graph degree` |

**Subcommand options if kept top-level**

```bash
spw analyze <globs> [--selector …] [--top n] [--json]
spw analyze density <globs>                 # hit density table
spw analyze compare a b

spw formula list
spw formula scan <globs> [--family field]
spw formula show <name>

spw taste <globs> [--json]
spw authority <globs>                       # until measure authority ships
```

**Recommended:** keep top-level one era; help text says “measure family”; fold when MeasureIR is real.

---

### Read group (navigation)

| Verb | Extra names | Subcommands / options |
|------|-------------|------------------------|
| `query` | `q` optional | `--glob`, `--stdin`, `--format json\|table\|skim`, `--explain` |
| `select` | `sel` | `select show`, `--explain` (which IR matched), `--json` |
| `skim` | `outline` alias? | `skim outline`, `skim window --lines a-b`, `skim head -n`, `--json` |
| `ls` | `seq` compat | `ls --ports`, `ls --depth`, liminal sequence keep |
| `tree` | keep | `tree --depth`, `tree --spw-only` |
| `roots` | keep | `roots list` |
| `doctor` | `ready`? | keep mounted readiness |
| `stream` | see streams | first-class read of StreamIR |

**skim naming options:** `outline`, `toc`, `preview`, `peek`, `window`—rec keep `skim`, add `skim outline`.

---

### IR dump / debug (optional sense-adjacent)

For agents and tests that want the spine without a product metaphor:

| Candidate | Sense | Rec |
|-----------|--------|-----|
| `ir` | dump named IR | optional late |
| `dump` | generic dump | soft |
| `debug ir` | nested | if debug group grows |

```bash
spw ir parse <file>
spw ir stack <file>
spw ir form <file>
spw ir graph --ego <file>
spw ir measure <file> --family mass
spw ir selection --glob '…'
spw ir envelope --from-cmd 'surface file.spw'
```

**Rec:** delay until Envelope v2; prefer `--json` on product verbs first.

---

### Shape / effect group (naming touch-ups only)

| Verb | Keep? | Alt names | Subcommand options |
|------|-------|-----------|-------------------|
| `format` | yes | `fmt` | `format check`, `format write`, `--dialect`, `--stack` |
| `expand` | yes | — | `expand show` |
| `refactor` | yes | `rf`? | plan / apply / dry-run already |
| `emit` | yes | `pack`? | keep packs |
| `pulse` | yes | — | plan / write / check |
| `mutate` | yes | — | keep multi-file |
| `beat` | yes | `tick`? | keep pure cadence |
| `mem` | yes | `memory` | list / dump / load |
| `crystallize` | new | see streams | fold stream |

---

## Short-name collision board

| Short | Claimed by | Conflict risk | Rec |
|-------|------------|---------------|-----|
| `m` | measure? map? mass? | **high** | avoid bare `m` |
| `g` | graph, geom | medium | optional graph only |
| `s` | surface, stack, stream, skim | **high** | avoid |
| `c` | census, crystallize | medium | avoid |
| `p` | profile, pulse, perf | **high** | avoid; profile retires |
| `inv` | invent/inventory | low | → census |
| `geom` | geometry | low | keep |
| `topo` | graph | low | keep |
| `perf` | bench | low | alias only |
| `exp` | experimental | low | keep |

**Policy:** prefer full verbs in docs; short aliases only when unique and listed in `--help`.

---

## Recommended primary map (summary)

| Old | **Primary (rec)** | Important aliases | Subcommand style |
|-----|-------------------|-------------------|------------------|
| invent | **census** | invent, inventory, inv, roster? | list, summary, hubs, leaves, orphans, bridges, roles, dialects, export |
| mass | **measure** | mass → `measure mass`, thrift, gauge? | mass, thrift, authority, density, health, drift, claim, scheme, diff, report |
| profile | **surface** | profile→stack lens; **stack** thin; card? | show, stack, form, graph, thrift, exp, outline, dialect, review, health, dump |
| map | **graph** *or keep map* | map, topo, graph, net? | show, hubs, orphans, cycles, ego, path, edges, nodes, export |
| atlas | **atlas** | — | summary, html, trend, advice, save, diff, graph?, census? |
| geometry | **geometry** | geom, form, shape | show, pairs, ops, depth, lessons, fingerprint, ladder, compare |
| exp | **exp** | experimental, catalog, syntax? | list, show, used, search, related, missing, export |
| analyze | keep *or* measure hits | — | density, compare |
| formula | keep *or* measure formula | — | list, scan, show |
| (new) | **stream** | events, feed, follow | read, follow, batch, window, cat, filter, stats |
| (new) | **crystallize** | fold, seal, snap, materialize | window, op, into, out; *or* stream crystallize |
| (new) | **bench** | perf, time | parse, query, pulse, surface, measure, all |
| (late) | **ir** | dump | parse, stack, form, graph, measure, selection |

**Dual-primary option:** ship `graph` and `map` as equals for one release, then prefer `graph` in docs.

**Open renames to decide before P0 code**

| Decision | Options | Rec |
|----------|---------|-----|
| Population verb | census / roster / inventory | **census** |
| Identity card | surface / card / portrait | **surface** |
| Topology primary | graph / map / dual | **dual one release** |
| Crystallize locus | top-level / under stream / flag | **top-level** |
| Measure fold timing | now / after MeasureIR | **after IR** |
| Ultra-short aliases | none / unique only | **unique only** |

---

## Subcommand patterns (composition)

Prefer **verb noun** over flag soup:

```bash
# Good
spw measure mass prompts/**
spw surface form file.spw
spw graph ego file.spw
spw census hubs prompts/** -n 12
spw geometry pairs file.spw
spw exp used file.spw

# Also good: shared flags
spw measure prompts/** --family mass --scheme band --json
spw surface file.spw --lenses stack,form --md

# Avoid growing forever
spw invent --only-hubs --with-geometry --stack --also-mass …
```

**Three composition styles (all supported long-term)**

| Style | Example | Best for |
|-------|---------|----------|
| Subcommand | `spw measure mass x` | humans, discoverability |
| Flag family | `spw measure x --family mass` | scripts, CI |
| Pipe IR | `spw census x --json \| jq …` | agents |

Shared option grammar:

```text
<verb> [subcommand] <SelectionIR…>
  [--json|--md|--text|--l|--x]
  [--dialect D] [--scheme S] [--family F]
  [--glob G] [--stdin] [--from-list path] [--selection path]
  [--compare path|ref] [--strict] [--quiet]
```

SelectionIR tokens:

```text
path.spw
'glob/**'
--stdin
--from-list files.txt
--selection sel.json
--envelope env.json          # late: prior command output
```

**Recipe book (common agent loops)**

```bash
# 1) What is this file?
spw surface path.spw
spw surface path.spw stack
spw geometry path.spw --method ast

# 2) What lives under prompts?
spw census prompts/** --sort degree -n 30
spw census roles prompts/**

# 3) How is thrift / authority?
spw measure mass path.spw
spw measure authority path.spw
spw measure path.spw --family all --json

# 4) Who points where?
spw graph ego path.spw --depth 2
spw graph hubs prompts/** -n 12
spw graph path a.spw b.spw

# 5) Dense log → fold → measure
spw stream batch --glob 'logs/**/*.spw' --dialect Spw.l \
  | spw crystallize --window 100 --into measure --json

# 6) Perf gate
spw bench parse 'packages/**/*.spw' --budget ms=500 --json
```

---

## Example help (reoriented root)

```text
Sense — inspect without write:
  surface       One-file card (stack · form · graph · thrift · exp)
  stack         Identity stack only (dialect × review × format)
  census        Multi-file population, roles, hubs
  geometry      Deep brace/operator form of a surface
  graph         Reference topology (hubs, cycles, ego)   [alias: map, topo]
  atlas         Workspace observatory (html, trend, advice)
  measure       Metrics under schemes (mass, authority, density, …)
  exp           Experimental syntax catalog
  analyze       Selector hit densities
  formula       Formula catalog + pattern scan
  taste         Taste / vocabulary fidelity

Read — pull structure:
  query  select  skim  ls  tree  roots  stream

Shape — rewrite / project:
  format  expand  refactor  refresh  emit  crystallize

Effect — cadence & apply:
  pulse  mutate  beat  mem  dev

Perf (not sense identity):
  bench

Compat aliases (era-1):
  invent → census
  inventory / inv → census
  mass → measure mass (or measure)
  profile → surface stack
  map / topo → graph
  geom / form → geometry
  experimental / catalog → exp
  perf → bench
```

**Per-verb help sketch (`spw measure --help`)**

```text
spw measure [family] <paths|globs> [options]

Families:
  mass|thrift   lines/bytes thrift (default if only mass claims)
  authority     writes/joins/reads
  density       ops/depth/frames
  health        parse + warnings
  drift         claim/observe drift
  claim         claim protocol
  scheme        schemes in use
  (all)         every applicable family

Options:
  --family F        same as subcommand family
  --scheme S        exact|band|tol|…
  --write           write exact digits (mass; gated)
  --missing         list undeclared keys
  --strict          non-zero exit on fail/drift
  --stdin           StreamIR / dense l records
  --dialect D
  --json|--md|--text
  --compare REF
```

**Per-verb help sketch (`spw surface --help`)**

```text
spw surface [lens] <path|glob> [options]

Lenses:
  show          stack + form summary + ego (default)
  stack         identity axes only
  form          FormIR summary
  graph|ego     neighborhood
  thrift|mass   mass family if present
  exp           experimental citations
  outline       frames
  dialect|review|format|health
  all           every lens
  dump <ir>     raw IR slice

Options:
  --only lens | --lenses a,b
  --method ast|scan
  --depth N
  --compare path
  --json|--md|--text
```

---

## Globs and stream management

### Glob / SelectionIR everywhere sense runs multi-file

```bash
spw census 'packages/**/*.spw' '!.spw/gen/**'
spw measure '**/*.spw' --family mass
spw surface --glob '.agents/plans/**/*.spw' --only stack
spw graph 'prompts/**' --hubs 12
```

Shared: `SelectionIR` from glob + ignore + optional selector + contentHash.

### Streams of data

| Stream kind | Source | Dialect | Crystallize `*` |
|-------------|--------|---------|-----------------|
| File batch | glob | b/m/p | `*` → table/census card |
| Event log | stdin / mem | **l** dense | `*` → window aggregate |
| Live ticks | beat / HMR | **x** | `*` → sealed snapshot / precipitate |
| Plan stream | wip `>>` | **p** | `*` → episode summary (human) |

**Operator `*` (crystallize)** in this product story:

| Context | Meaning |
|---------|---------|
| Flow CA | materialize intermediate buffer (l1) |
| Stream pipeline | fold last N events → value / surface |
| Serialization | densify stream → sealed record |
| Not | glob star in shell (shell owns `**`) |

CLI sketch (future):

```bash
spw stream follow --stdin --dialect Spw.x | spw crystallize --window 50 --out snap.spw
# or
spw measure --stdin --dialect Spw.l   # dense records as measure subjects
```

## Functional composition & abstract navigation

### Composition spine

```text
SelectionIR
  → map (GraphIR) | census (table) | measure (MeasureIR) | surface* (cards)
ParseIR
  → geometry (FormIR) | select/query | pulse plan
StreamIR
  → crystallize (*) | precipitate | emit
StackIR
  → format | review | hover
```

### Abstract navigation verbs (mental model)

| Navigate | Verb family |
|----------|-------------|
| **Who/what is this?** | surface / stack |
| **What shape?** | geometry |
| **Who connects?** | graph / atlas |
| **What population?** | census |
| **What measures?** | measure |
| **What experimental syntax?** | exp |
| **What content outline?** | skim |
| **Where in liminal sequence?** | ls |
| **How does it change under plan?** | pulse / refactor |
| **How fast?** | bench |

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **P0** | Aliases: `measure`→mass runner, `census`→invent, `surface`/`stack`→profile; help reorientation |
| **P1** | Shared SelectionIR (glob+hash) for measure, census, surface multi |
| **P2** | Envelope v2 + human/json/md views of same IR |
| **P3** | `surface` composite card (stack+form summary+ego) |
| **P4** | Geometry AST-first FormIR |
| **P5** | StreamIR + stdin dense l/x + crystallize sketch |
| **P6** | Runtime: document precipitate/cache IR in stack; optional `.events.spw` derived kind |

## Files (implementation)

```
[NEW] .agents/plans/cli-sense-reorientation/PLAN.md
[NEW] .agents/plans/cli-sense-reorientation/wip.spw
[NEW] .agents/plans/cli-sense-reorientation/cli-sense-reorientation.spw
[MOD] packages/spw-cli/src/commands.ts          aliases + help copy
[MOD] packages/spw-cli/src/mass.ts → measure.ts # or thin wrapper
[MOD] packages/spw-cli/src/inventory.ts         census name
[MOD] packages/spw-cli/src/profile.ts           surface/stack aliases
[NEW] packages/spw-seed/src/ir/                 SelectionIR types (later)
[MOD] docs/theory/spw/syntax-profile-stack.spw
[MOD] .agents/plans/measure-invariant-generalization/PLAN.md
[MOD] .agents/plans/shape-syntax-ecology/PLAN.md
```

## Commits

1. `.[plans] — cli-sense-reorientation intermediate IR + verb map`
2. `vocab[cli] — census/measure/surface aliases; help reorientation`
3. `#[cli] — SelectionIR globs for measure+census`
4. `&[cli] — surface composite report`
5. `.[docs] — l/x dense serialization + * crystallize`

## Dependencies

- syntax-profile-stack, measure-invariant, refactor-experiment, shape-syntax-ecology
- geometry-analysis (FormIR honesty)
- beat-diff-precipitation (stream/precipitate runtime)

## Failure Modes

- Rename without aliases → script break  
- `*` in CLI confused with shell glob → document crystallize vs `**`  
- Spw.x dense live without effect ceilings → data loss / thrash  
- One mega-command that reimplements atlas  

## Imagination / play

| Mode | Play |
|------|------|
| IDE | `spw surface` card vs `geometry` deep vs `census` folder |
| Screenshot | dense Spw.l event lines; dual-read as log format |
| Learning | rewrite sense loop in new verbs; keep old aliases |
| Falsify | invent/mass remaining as only documented names |

## Spw Artifact

`.agents/plans/cli-sense-reorientation/cli-sense-reorientation.spw`
