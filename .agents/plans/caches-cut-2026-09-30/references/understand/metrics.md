## Axis report: metric handles (`$%[...]`) and probes

Scratch prototype, all verified: `<scratchpad>/understand/proto/2026-09-30/{quantities.spw,sources.spw,materials/water.spw}`. Helper scripts in the same `understand/` dir: `resolve.mts`, `wonder.mts`, `loader.mts`, `interp.mts`, `tree.mts`.

### Findings

**F1. `$%[...]` has three competing readings, and none of them is settled.**
- (a) Canon, register bank. `$` is Substrate: "materialize (name)→RegisterMeta, meta only". `%` is Measure: "(name,scale?)→[0,1] normalized". The invariant is `"% always [0,1]"` (`.spw/registries/register-bank.spw:22-23,30-31,53`).
- (a) Form ladders list `$%[m]` as "substrate measurement point idiom" and `$%[metric]` as "measurement point on substrate". Both are marked `'conceptual'` (`packages/spw-seed/src/canonical/form-ladders.ts:499,517`).
- (b) The completion catalog labels it "register state query" (`canonical/catalog.ts:119`).
- (b) In Spw.q, `$` opens the query envelope (`query/selector-expr.ts:8-13`), so `$%[_]` means "`%` operations that carry a frame". Verified: `spw query --from .spw/caches --expr '$%[_]' --count` gives `total=232 files=202`.
- (a) Flow protocol: `measure: "$%[…] / %[…]"` (`docs/theory/spw/flow-protocol-sigils.spw:39`).

**F2. The parser does not fuse `$%`.** `$%[a.b, c]` parses as two sibling Acts: a nullary `$` and a `%` with a frame. Each frame item is an `Identifier` with `segments:["a","b"], qualified:true`. The `$` binds nothing. Inside a binding, `k: $%[x]` leaves the value as only `$`, and `%[x]` escapes as a sibling. `k: %[x]` binds correctly (both verified via `tree.mts`).

**F3. Runtime (b).**
- The interpreter's `%` case measures only `frames.value` (`interpreter/interpreter.ts:247-254`), which is the first arm. `$%[zeta.b, alpha.a, mid.c]` registers only `zeta.b`; writing separate `$%[..]` lines registers each (verified).
- `RegisterBank.measure` clamps to [0,1] (`state/register-bank.ts:596-604`). A world value like 4.184 therefore cannot be a runtime `%` register.
- `!probe{ =id[p_hold] }` creates a register cell named `p_hold`. Every `=k[v]` and `#!v` also creates a register named `v` (verified: keys `p_x, sim, simulate, lake.f, water.cp`).

**F4. LSP (b). Everything is regex over raw text.**
- **Hover glossary.** It covers 16 names (`file.frame_count`, `file.annotation_density`, `file.brace_depth_max`, `cache.tier`, `cache.hit_ms`, `cache.hit_ratio`, `registry.entry_count`, `registry.referrer_count`, `harness.run_count`, `harness.pass_rate`, `runtime.stage`, `runtime.latency_ms`, `lsp.request_count`, `lsp.avg_response_ms`, `phase.index`, `phase.duration_ms`) in `handlers/display.ts:686-708`. Any other name shows "Runtime-bindable metric: X".
- **Live hover values.** They come only from `.spw/state/observable.spw`, loaded by the regex `(?:\.\.\s*)?%\[([^\]]+)\]\s+(.+)` and keyed `frame.key` (`context.ts:102-131`). It reloads on save (`stdio-server.ts:449`).
- **Wonder parse** (`display.ts:275-315`):
  - it looks at most 12 lines after `?[` (`:284`);
  - lens is read only from `// lens:` on the `#:depth` line (`:304`);
  - the probe is shown only if a string comes first, `!probe\{\s*"` (`:305`), so the canonical `!probe{ =id[..] }` shows no probe (verified on `flow-protocol-sigils.spw`);
  - metrics are every `$%[` in the window, split on commas (`:306`).
- **`registerSnapshot`** (`spw-probes.ts:259-313`) turns each `$%[` into phase 2. Its phase-3 overlay reads `observableState.registers` (`:292-293`), but the loader only produces flat keys, so the overlay never fires (dead code).
- **Semantic tokens** mark `$%[` as keyword+definition (`semantic-tokens.ts:143-148`).
- **No navigation.** The ServerIndex indexes only `# #: #! #> ##>` (`server-index.ts:31`), so handles have no definition or references.

**F5. Runtime probe scan** (`session/probe-measure.ts:47-98`).
- It separates `metric` (`$%[`) from `measure_facet` (bare `%[`).
- It also counts matches inside strings: regex finds 233 cache sites, the AST finds 232. The extra one is inside a string at `.spw/caches/language-features/spw-resonance.spw:34`.
- It truncates the probe body at 120 characters (`:69`).
- It is exposed only through LSP `spw/probeMeasure` and `HotRuntimeSession.inspect` (`hot-session.ts:295`). No CLI prints it.

**F6. The measure protocol (seed) is real but half-wired.**
- **Reconcile works (b).** `reconcileMetric` supports the exact, tol, band and ratio schemes (`canonical/measure-protocol.ts:285-352`). Verified: a claim of 0.92 against a registry value of 0.9167 with `rel=0.001` gives `drift`, and 0.917 gives `match`.
- **Loader bug (b).** `loadMeasureContextFromSpw` reads nothing from Spw source. `frameLabel` (`:549-565`) checks `Literal|Identifier|Expression`, but frame items are wrapped in `Parameter` nodes. Verified: with an empty base it loads 0 families and 0 algorithms from `.spw/registries/measure-context.spw`, and the `mass` note is still the TS bootstrap text.
- **Vacuous test.** The test at `measure-protocol.test.ts:58-70` passes only because every entry it asserts is already in the TS bootstrap.
- **Canon claim is aspirational (c) in effect.** "Spw definition surfaces override/extend" (`:418`; `measure-context.spw:24`) does not happen today.
- **Only `%mass` has a reader** (`self-mass.ts`) and a CLI (`spw measure`).

**F7. Handle populations.**
- **Canon, outside caches:** 280 files, 180 distinct handles, 1149 uses. They are dominated by template boilerplate: `op.distribution` ×100, `register.bank_size` ×95, `register.active_bindings` ×95, `runtime.stage` ×74.
- **Caches:** 202 of 208 files, 232 AST sites, 469 distinct handles, and every one is used exactly once. They sit under 307 namespaces, 237 of which hold a single handle, and 138 of the 469 have a unit suffix.
- **Overlap** with the LSP glossary is only `file.brace_depth_max` and `cache.tier`.

**F8. Links and addressing (b).**
- Census treats `~"x.spw#anchor"` as a broken target, because it resolves the path with the fragment still attached (`packages/spw-cli/src/corpus-scan.ts:196-200`). Verified: a registry cited with fragments gets in-degree 0 and 3 broken targets.
- LSP navigation resolves fragments only through deixis `#>` anchors (`navigation.ts:63-80`, `canonical/resolve-fragment.ts:24`).
- Particle names are limited to `[a-zA-Z0-9_-]`, with no `.` (`lexer/matchers/particles.ts:39`). You therefore cannot give each dotted handle its own anchor; use one anchor per namespace.

**F9. Emit (b).** `emit` lifts line-level `key: "string"` pairs into flat slots where the last write wins (`emit/extract.ts:16-17`). Registry cells collide: the verified `emit fields` output was `unit: "1"` taken from the last cell. `includes` keeps `~"…#frag"` verbatim, which is the bundling edge. `$%[..]` is ignored.

**F10. Self-reference.** A `.spw` file with `@self` pointing at itself plus `%mass` reconciles, but when the digit count changes it needs two `--write` passes. Verified: declared 7, measured 67, then 68 after rewrite, then match.

### Metrics the tools actually emit (water cache file)

| Tool | Metric names emitted |
|---|---|
| `spw measure` | nothing (no `@self`/`%mass`) |
| `spw surface --json` | only `parse.warningCount` (no numbers otherwise) |
| `spw census --json` rows | `lines, pathRefs, rootRefs, frames, annotations, sigilTop, role, inDegree, outDegree` |
| `spw census --json` signals | `sigils{12}, pathRefCount, rootRefCount, frameCount, annotationHints, lineCount` |
| `spw census --json` topography | `hubs, orphans, brokenTargets, layers, cyclic`; strands `shared_path_basenames, sigil_rhythm, frame_density, path_ref_density, root_shelves` |
| `spw form --json` | `braces.kinds.{scope,frame,body,capsule,stream,nrange}, coupleOps, medials, shells, operators[].{count,percent}, nesting.{maxDepth,openBalance,deepLines}` |
| `spw form --resonance` | `opCounts, opVector, flowRoles.{probe,measure,…}, unitCount, scheduleCount, biasAxisCount`, resonances `op-cooccur/depth-band` |
| `spw inspect static` | `depth, nestLen, cells, named` |
| `spw inspect session` | nest skeleton (the only thing close to a "nesting rhythm") |
| `spw analyze` | per selector: `hits, files, per100ln` |
| `spw:particle-census` | `deixis, case, mood, aspect` |
| `spw formula` scan | text hits only; false positive "capacity" matched inside a string |

Heuristic sources: frames are counted by `/^\s*\^\[?"/gm` and annotations by `#:x|#!x|#>` (`seed/src/math/corpus.ts:392-398`).

The tools disagree on strings. Geometry counts `%` and `*` inside strings (`%`=2, `*`=6), while census strips strings (`%`=1, `*`=0).

### Tool-support matrix

| Construct | Parser | LSP | census/graph | measure | emit | runtime |
|---|---|---|---|---|---|---|
| `$%[h,..]` in `?[]` | two Acts | hover/inlay/snapshot (regex, 12-line window) | sigil chars only | ✗ | ✗ | first arm only, clamped |
| `reads: %[h]` | bound | ✗ | ✗ | ✗ | ✗ | `measure_facet` |
| `%ns.key{…}` cell | qualified label | ✗ | `$%{_}` query ✓ (label filter ✗) | ✗ | slots collide | binds keys as registers |
| `^["family"]{}` | ✓ | ✗ | frame count | ✗ | slots | loader broken (F6) |
| `!probe{ "…" …}` | ✓ | probe shown | `flowRoles.probe` | ✗ | ✗ | counted |
| `!probe{ =id[..] }` | ✓ | not shown | ✓ | ✗ | ✗ | creates register |
| `~"f#anchor"` | PathRef | go-to-def (deixis) | broken target | ✗ | include | — |
| `@self`+`%mass` | ✓ | ✗ | ✗ | ✓ reconcile/`--write` | ✗ | — |

### Canonical examples (verbatim)

`docs/theory/spw/flow-protocol-sigils.spw:59-62`:
```
  ?["Does it hold?"]{
    !probe{ =id[p_hold] }
    $%[Hold, thrift]
  }
```

`.spw/shelves.spw:37-42`:
```
?["What is the felt rhythm of reading Shelves?"]{
  #:depth #!experiential // lens: material grain
  $%[line.operator_density, brace.nesting_rhythm] => ~#reading_feel
  ~#structure: "roots → shelf_policy → orientation" // frame flow
  !probe{ "read aloud for 30 seconds; where do you pause? pauses mark grain boundaries." }
}
```

Select-then-measure, `lib/spw-v0.3.0/architecture/theory-bridge.spw:189`:
```
$#mathematical@workspace => %[reference.count, depth.downstream]
```

Comparative form, `.spw/agents.spw:43`:
```
$%[op.distribution]@here vs $%[op.distribution]@agents
```

Family registry, `.spw/registries/measure-context.spw:30-42`: `^["family"]{ id: mass operator: "%" identifier: mass plane: thrift … keys: #[lines, bytes] scheme: exact … }`.

### Recommendations for `caches/2026-09-30/`

**1. Reflexive handles.** Use only these names; each maps to one exact extractor.

| Handle | Extractor field |
|---|---|
| `file.lines` | census `lines` |
| `file.frame_count` | census `frames` (glossary) |
| `file.annotation_density` | census `annotations/lines` (glossary) |
| `file.brace_depth_max` | form `nesting.maxDepth` (glossary) |
| `form.deep_lines` | form `nesting.deepLines` |
| `form.brace_frame`, `form.brace_body` | form `braces.kinds.frame` / `braces.kinds.body` |
| `op.distribution` | census `sigils` (string-stripped) |
| `graph.in_degree`, `graph.out_degree`, `graph.path_refs` | census `inDegree` / `outDegree` / `pathRefs` |
| `particle.deixis`, `particle.case`, `particle.mood`, `particle.aspect` | particle census |
| `probe.wonder_count` | `spw query --expr '$?[_]' --count` |
| `probe.metric_sites` | `spw query --expr '$%[_]' --count` |

Retire `brace.nesting_rhythm`, `register.*` and `runtime.*` in caches: nothing computes them for a static file.

**2. World handles.** Write them as `namespace.quantity_unit`, and give each exactly one cell in `quantities.spw`. Group cells under one `#>namespace` anchor, because particle names cannot contain dots. Verified parse, and the resolver reports 7 of 7 resolved:

```
^["family"]{
 id: water
 operator: "%"
 identifier: water
 plane: world
 scope: corpus
 keys: #[cp_j_per_g_k, rho_ice_g_cm3, t_rho_max_c]
 scheme: tol
 algorithm: world.registry_lookup
 form: scalar
}
#>water
^"water"{
 %water.rho_ice_g_cm3{
  value: 0.9167
  unit: "g/cm^3"
  at: "ice Ih, 0 C, 101.325 kPa"
  scheme: tol
  rel: 0.001
  src: ~"./sources.spw#crc_handbook"
  as_of: "2026-09-30"
  status: #!settled
 }
}
```

- **Status vocabulary** (mood particle as the value): `#!settled | #!estimate | #!contested | #!model | #!superseded | #!open`. Model outputs have no `value`.
- **Scheme fields** mirror `EvalScheme` (`abs`, `rel`, `lo`, `hi`). This answers the open question `?[scheme_grammar]` in `measure-context.spw:174`.
- **Citing files** declare `@quantities: ~"../quantities.spw#water"` in `^["roots"]`. This is an emit include and the LSP will jump to it.
- **Facts** carry `reads: %[water.rho_ice_g_cm3]`. Do not write `$%` inside a binding (F2).

**3. Probes (verified form).** Put the string first so hover shows it, keep it at most 60 characters, and follow it with the typed fields:

```
#>wonder_water_ice_sink
?["If ice sank, would lakes freeze from the bottom up?"]{
  #:depth #!physical // lens: counterfactual density
  ~#hypothesis: "With rho_ice above rho_liquid, winter ice sinks below the summer thermocline and accumulates."
  !probe{ "1-D lake column, ice 5 percent denser, 100 winters" =id[p_water_ice_sink] =kind[sim] =yields[lake.bottom_ice_fraction] }
  $%[water.rho_ice_g_cm3, water.t_rho_max_c]
}
```

Checks run on this form:
- **Validator:** 3 of 3 files pass.
- **Select:** `spw select --selector all` shows `Binding reads`, `op:=:id`, `op:=:yields`, and `op:%` frames.
- **LSP wonder replay:** depth=physical, lens found, probe shown, 2 metrics.
- **Runtime scan:** `probes=2 wonder=2 metrics=3`, with the fact's `reads:` classified as `measure_facet`.

Rules for writers:
- `$%[...]` inputs must resolve to a cell.
- `=yields[...]` outputs must be registered with `#!model` or `#!open`.
- `=id` is `p_<file-slug>_<topic>` and globally unique, since it becomes a register.
- Put at most 3 handles in one `$%[...]`.
- The whole block is at most 12 lines.
- Write "percent", not `%`, inside prose.
- `=kind` is one of `thought | lookup | calc | sim | census | lit`. A `census` probe must name only reflexive handles, which makes it runnable today.

**4. Small tooling fixes (flag to the owner; not writer work).**
- Unwrap `Parameter` in `frameLabel` and add a registry-only test.
- Strip `#fragment` in `corpus-scan.ts:198`.
- Have the LSP hover read `%ns.key{value,unit,status}` cells from the registries.
- Evaluate every arm of `%[..]` in the interpreter.
- Point the `registerSnapshot` overlay at flat keys.
- Add a label filter to Spw.q (`$%water{_}` currently fails to parse).

### Open questions and pressure points for Spw theory

- **Is `$%` a digraph?** The lexer fuses `<>` but not `$%`, so the `$` is semantically empty in the AST. Either fuse `$%` like `<>` or drop `$` from canon and let context (`reads:`, `=yields`) carry direction.
- **Normalized versus dimensional.** "`%` always [0,1]" fits runtime registers but not world quantities. Measure-protocol `DeclaredMetric` holds raw numbers. Is `world` a perceptive plane, or is it a separate Act?
- **Anchors versus handles.** Handles are qualified identifiers, but `#>` particles cannot carry dots, and `sourceDeclaresAnchor` (`resolve-citation.ts:76-87`) accepts `^"x"{` but not `%x{`. Should `%ns.key{}` be self-anchoring (a measure cell as deixis)? This sits naturally in the upcoming particle-lattice revisit.
- **Mood as evidential.** `status: #!settled` works as an epistemic mood, but the runtime creates a register for every `#!v` and `=k[v]`. Is that register traffic a feature (aggregation by frequency) or a leak?
- **Reflexive measurement perturbs its subject** (self-mass needs 2 passes). Canon should state a fixed-point law for self-describing surfaces.
- **String leakage.** Regex-based tools (LSP, runtime, geometry, formula) count content inside strings; the AST-based ones (census, query) do not. The metric plane needs one source of truth.