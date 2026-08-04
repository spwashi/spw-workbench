# Plan: hygiene-index-consolidation

Make the workbench tell the truth about itself: clean trees, robust docs, navigable indexes, and a plan ecology that matches what main already shipped — with **checkable referentiality**, **stringless/dimensional expression goals**, and a **CLI that agents can compose** (aligned verbs, envelope-friendly JSON, Spw-native products).

## Goal

Four drifts have the same shape: a surface claims something about the workspace, and nothing keeps the claim honest. Generated `.d.ts` files pollute `git status` while `outDir` already points at a cache. Path and Writerside checks exist but do not cover fragments, archived plan refs, or plan-cache lies. Indexes route canon well and plans poorly — fifty active plans, five stranded on deleted layouts, and at least one plan (`directive-lattice`) whose cache still says "next commit 1" after its spine has landed. This plan is the maintenance pass that turns those drifts into instruments: ignore or relocate noise, harden doc/path verification, publish a plan ecology index, and consolidate the ecology so status tokens, archive state, and hot-file collisions are queryable rather than remembered.

**Documentation and referentiality** are first-class here, not a side effect of path-check. The plan carries expression exhibits and graded goals: what should remain meaningful if string payloads are erased; what should gain axes (resolution, modality, effect, identity) when a string must remain. Appendix A diagnoses language gaps; **Appendix B** and `references/documentation-referentiality.spw` state robustness grades, live vs soft forms, before/after migrations, and tool goals for commit 6+.

Taste note:
- **correctness** — caches, refs, and status tokens match repository reality
- **clarity** — one place to read plan role, urgency, and collision risk
- **disclosure** — documentation claims are resolvable or explicitly unmeasurable
- **resolution** — path → fragment → product; prefer structure over opaque strings
- **layering** — hygiene is git/tooling; docs are analyzers + exhibits; indexing is seed/CLI; consolidation is plan surfaces
- **naming** — stranded / review / needs-relocation / archive stay distinct verbs

## Scope

- **In scope**:
  - Working-tree hygiene: stop declaration emit beside sources (or ignore it), park/remove `.scratch/`, document the rule.
  - Documentation robustness and referentiality: extend `spw-path-check` and/or `writerside-check` so tilde refs, fragment targets, and archived-plan relocations stay resolvable; promote strict checks into a known ship gate; keep plan-local exhibits of preferred expressions (stringless goals, dimensional ladder, migrate examples).
  - Indexing enhancement: a plan ecology index surface; ecology-wide `spw plan` / `spw refresh` coverage; optional atlas/map reading of plan hubs and collisions; wire plan roots into discoverable indexes where they belong.
  - CLI agent alignment (Appendix C): multi-plan status/check on the `spw` binary with envelope-friendly `--json`; help honesty for `--write` ceilings; sync or checklist `conventions/cli.spw` against `COMMANDS`. Full envelope migration and `capabilities`/`review` are follow-on.
  - Plan consolidation: recompute lying caches; refresh `directive-lattice` and other land-ahead-of-cache plans; archive or relocate stranded/needs-relocation plans; record hot-file collisions and the apposition-before-beat schedule; fold completed tip work (`mass`, `authority`, `seed/lite`) into stream notes or thin retrospective entries so main is not plan-invisible.
- **Out of scope**:
  - Implementing `apposition-cache-granules`, `geometric-analysis-tooling`, or `spw-beat-diff-precipitation` feature code.
  - Large VS Code / curriculum plan rewrites (recluster assignments only).
  - Changing seed grammar, particle lattice, or LSP server-index behavior beyond what indexing/read tooling needs.
  - Implementing language products named in **Appendix A** (claim atoms, binding modality, hole contracts, organelle schema, etc.) — the appendix is diagnosis and a follow-on brief, not this plan’s commit spine.
  - Full CLI envelope migration for every verb, shipping `capabilities`/`review`, or renaming public sense verbs — see Appendix C follow-ons.
  - History rewrite or force-push of the 14-ahead main stack.

## Files

```
[NEW] .agents/plans/hygiene-index-consolidation/PLAN.md
[NEW] .agents/plans/hygiene-index-consolidation/wip.spw
[NEW] .agents/plans/hygiene-index-consolidation/hygiene-index-consolidation.spw
[NEW] .agents/plans/hygiene-index-consolidation/references/index.spw
[NEW] .agents/plans/hygiene-index-consolidation/references/documentation-referentiality.spw
[NEW] .agents/plans/hygiene-index-consolidation/references/cli-verb-alignment.spw
[NEW] .agents/plans/index.spw
[MOD] packages/spw-cli/src/commands.ts
[MOD?] packages/spw-cli/src/plan.ts
[MOD?] packages/spw-cli/src/help.ts
[MOD?] packages/spw-cli/src/mass.ts
[MOD?] packages/spw-cli/src/refresh.ts
[MOD?] .spw/conventions/cli.spw
[MOD] .gitignore
[MOD?] packages/spw-cli/tsconfig.json
[MOD?] packages/spw-runtime/tsconfig.json
[MOD?] packages/spw-lsp/tsconfig.json
[MOD?] packages/spw-seed/tsconfig.json
[MOD] scripts/analyzers/spw-path-check.ts
[MOD?] scripts/analyzers/writerside-check.ts
[MOD] packages/spw-cli/src/refresh.ts
[MOD?] packages/spw-cli/src/commands.ts
[MOD?] scripts/agent-tools.sh
[MOD] .agents/plans/directive-lattice/wip.spw
[MOD] .agents/plans/seed-roundness-grades/wip.spw
[MOD] .agents/plans/spw-cli-overhaul/wip.spw
[MOD] .agents/plans/form-geometry-editor/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[MOD] .agents/plans/apposition-cache-granules/wip.spw
[MOD] .agents/plans/spw-beat-diff-precipitation/wip.spw
[MOD] .agents/plans/geometric-analysis-tooling/wip.spw
[MOD] .agents/plans/brand-core-ids/PLAN.md
[MOD] .agents/plans/brand-core-ids/wip.spw
[MOD] .agents/plans/audit-css-tokens/wip.spw
[MOD] .agents/plans/audit-data-attributes/wip.spw
[MOD] .agents/plans/audit-ui-data-models/wip.spw
[MOD] .agents/plans/refactor-import-sprawl/wip.spw
[MOD] .agents/plans/symmetry-explorer-instrument/wip.spw
[MOD] .spw/patterns/index.spw
[MOD?] .spw/index.spw
[MOD?] package.json
[DEL] packages/spw-cli/src/**/*.d.ts          # untracked noise only, if present
[DEL] packages/spw-runtime/src/**/*.d.ts      # untracked noise only, if present
[DEL?] .scratch/                              # only if disposable local scratch
```

### Craft guard

- `spw-path-check.ts` (~340 lines) can absorb fragment/archive rules if kept single-concern; if it would pass 500, extract `path-check-resolve.ts`.
- `refresh.ts` stays small — add derivers, do not grow into a full ecology CLI.
- Do not grow `server-index.ts` (owned by apposition / beat plans).
- Plan index surface stays a routing table, not a second clustering essay — doctrine lives in the distilled artifact + `plan-ecology-clustering.spw`.
- Target <400 lines / <12 imports for any new module.

## Commits

1. `.[plans] — file hygiene-index-consolidation`
2. `#[hygiene] — stop declaration noise beside package sources; ignore .scratch`
3. `.[plans] — refresh landed-ahead caches (directive-lattice and peers)`
4. `.[plans] — consolidate stranded, needs-relocation, and schedule collisions`
5. `.[plans] — publish plan ecology index and collision map`
6. `![docs] — harden path and writerside checks for fragments and archives; align fixtures with referentiality grades g1–g2 and g5`
7. `&[cli] — ecology plan status/check on the spw binary; envelope-friendly --json; write-ceiling honesty in mass/refresh help`
8. `![hygiene] — ship gate: clean status, refresh fixpoint, lint:docs:strict, spw plan status --json smoke`

Fuzz strategy:
- Explore (1–4): `npm run lint:spw` on touched plan surfaces; `git status -sb` noise floor.
- Stabilize (5–7): `npm run lint:spw && npm run lint:docs:strict`; `npm run test:cli` if refresh/commands change.
- Ship (8): `npm run fuzz:ship` if CLI packages move; otherwise `lint` + `spw refresh .agents/plans` fixpoint + clean tree excluding intentional untracked work.

## Agentic Hygiene

- Rebase target: `main@873b266b`
- Rebase cadence: before commit 2 (after filing), before merge
- Hygiene split: **this plan is the hygiene split.** Unrelated feature drift (apposition / beat / geometry implementation) stays out of this branch. Do not start server-index edits here.
- Unrelated drift on main tip: none required for this plan; 60+ untracked `.d.ts` and `.scratch/` are exactly commit 2's subject.

## Dependencies

- **`plan-ecology-clustering`** — taxonomy and commit bar already exist; this plan *executes* consolidation against them rather than reinventing clusters.
- **`spw-plan-maintenance` skill** — operational checklist; commits 3–5 are that skill made durable and indexable.
- **`surface-identity.spw`** — already settled content_hash / shape_fingerprint / granule_key; consolidation references it, does not reopen it.
- **`apposition-cache-granules` before `spw-beat-diff-precipitation`** — schedule recorded and left open for those plans; this plan only indexes the collision.
- **`directive-lattice`** — cache refresh only; remaining particle/canon commits stay on that plan.

## Failure Modes

- **Hard**: path-check becomes so strict that historical surfaces or intentional external refs fail every ship gate. Mitigation: graded severity (error for canon/plans, warn for archival prose) and explicit allow patterns.
- **Hard**: consolidating plans by archive erases recoverable intent. Mitigation: archive only when the plan's own stream declares done, or when every predicted path is a ghost *and* no packages-era relocation is wanted.
- **Soft**: ecology index becomes a stale second status system. Mitigation: index fields that can be derived from `wip.spw` caches are marked aspect (`~#`), not durable claims; `spw refresh` owns recomputation.
- **Soft**: multi-plan status floods stdout. Mitigation: summary-by-status default; `--json` / `--slug` for detail.
- **Non-negotiable**: stream blocks remain append-only; consolidation never rewrites history inside `^["stream"]`.
- **Non-negotiable**: no absolute user paths in plan surfaces or commits.

## Validation

- **Hypotheses**:
  - After commit 2, a clean clone + `npm run build` leaves `git status` free of package-src `.d.ts` noise.
  - After commit 3, `directive-lattice` `~#next_commit` advances past commits already present on main (or status becomes `review` with remainder named).
  - After commit 5, every active plan slug appears exactly once in `.agents/plans/index.spw` under a cluster lane.
  - After commit 6, `lint:docs:strict` catches a planted broken `~"…"` and a broken fragment target in fixtures (grades g1–g2).
  - After commit 7, `spw refresh .agents/plans` is a fixpoint (second run applies zero edits).
  - `references/documentation-referentiality.spw` keeps g1-clean roots (every `@` / `~` in its roots frame resolves).
- **Negative controls**:
  - `npm run lint:spw` stays green on the full corpus.
  - Apposition / beat / geometry PLAN.md commit lists are not rewritten (stream notes only if scheduling changes).
  - Archived plans remain parseable under `_archive/`; no live tilde ref resolves to a vanished active path.
  - String-erase test is a **goal metric**, not a hard fail for hygiene commits 2–5.
- **Demo sequence**:
  1. `git status -sb` before/after commit 2.
  2. `npm run spw:plan:check -- --slug directive-lattice` before/after commit 3.
  3. `spw skim .agents/plans/index.spw` — cluster lanes visible.
  4. `spw skim …/references/documentation-referentiality.spw` — grades and ladders visible.
  5. `spw query --from .agents/plans/hygiene-index-consolidation --selector pathRefs --summary`.
  6. Plant a bad path ref; `npm run lint:docs:strict` fails; remove plant; passes.
  7. `spw refresh .agents/plans && spw refresh .agents/plans` — second run zero edits.

## Spw Artifact

- `.agents/plans/hygiene-index-consolidation/hygiene-index-consolidation.spw` — four-pillar doctrine: hygiene floor, doc robustness grades, index dimensions, consolidation verbs.
- `.agents/plans/hygiene-index-consolidation/references/documentation-referentiality.spw` — robustness grades g0–g5, live vs soft forms, stringless and dimensional goals, migrate examples, tool goals for commit 6+.
- `.agents/plans/hygiene-index-consolidation/references/cli-verb-alignment.spw` — CLI audit axes, findings F1–F8, product map, agent contract, plan slices.
- `.agents/plans/hygiene-index-consolidation/references/index.spw` — reference routing table for the plan.

Warranted because the ecology needs a durable maintenance grammar **and** checkable expression norms for documentation, not only a one-shot sweep commit.

---

## Appendix B — Documentation robustness and referentiality

Filed 2026-07-27. **Norms + tool goals** for this plan’s documentation pillar; expression exhibits live in Spw under `references/`. Complements Appendix A (language diagnosis) without implementing new grammar products.

### B.1 Premise

A path, grade, or selector that exists only inside a quoted English sentence is a **rumor**. Referentiality means tools can:

1. **Resolve** addresses (`~"…"`, `@root`, `#fragment`).  
2. **Classify** the claim (particle, bias, measure, closed token).  
3. **Grade** failure (missing file ≠ missing anchor ≠ archive drift).  
4. **Prefer** forms that survive a **string-erase test** or that attach **dimensions** when strings must remain.

### B.2 Robustness grades

| Grade | Name | Asks | Machine | This plan |
|-------|------|------|---------|-----------|
| g0 | parse clean | surface lexes/parses | `lint:spw` | assumed |
| g1 | local ref resolve | `~` / `@root` on disk | `spw-path-check` | **harden** |
| g2 | fragment resolve | `file#anchor` → deixis node | path-check + fragment resolve | **add** |
| g3 | inbound integrity | who points here; archive repoints | reference graph + audit | index / note |
| g4 | organelle shape | required products present | future schema product | **out of scope** (Appendix A) |
| g5 | Writerside topics | topic links exist | `writerside-check` | **keep / extend** |

Ship floor for this plan: **g1 + g2 + g5**; g3 indexed; g4 language follow-on.

### B.3 Prefer / avoid (summary)

**Prefer (live structure):**

```text
@examples: ~"../../../docs/examples/index.spw"
~".spw/patterns/surface-identity.spw#spw_pattern_surface_identity"
#:layer #!pragmatics
#>spw_plan_documentation_referentiality
ceiling: #effect.l0.measure
required: #[plan, wip, artifact]
%[ref.resolved, ref.dangling]
={ ~"docs/examples/spw/template-holes.spw" }
```

**Avoid (soft / anti-examples):**

```text
file: ".spw/workspace.spw"                    # bare quoted path in a freeform map
~#navigable_selector: "$~\"_\" | $@_"         # second dialect in a string
ceiling: "effect.l0.measure"                  # grade as opaque prose
// see workspace.spw for roots                # foreign comment law
"See docs/examples/index.spw for the hub."    # English-only path
```

Full tables: `references/documentation-referentiality.spw` frames `forms_live` and `forms_soft`.

### B.4 Goals — parse without strings

**Aim:** maximize claims that remain meaningful if all `STRING` / `PHRASE` payloads are erased.

| Class | Examples |
|-------|----------|
| **Already stringless** | particle headers, deixis anchors, closed `#tokens`, operator sigils, brace structure, root alias *names*, sets/streams of identifiers, `%[…]` brackets |
| **Should become stringless** | effect ceilings as tokens, status/cluster vocab as tokens, required-key sets, `#yes`/`#no`, hot/warm/cold tiers |
| **Must remain strings (for now)** | filesystem paths, human goal prose, host command lines, selector expr until native AST, multi-word titles |

**Erase test (goal metric, not ship gate for commits 2–5):** parse → drop string payloads → roots aliases, particle mix, deixis table, closed tokens, and frame labels still recoverable. Fail if only freeform maps remain.

### B.5 Goals — parse with more dimension

**Aim:** when a string remains, surround it with axes so tools know what kind of claim it is.

| Axis | Question |
|------|----------|
| resolution | file, fragment, granule, span? |
| disclosure | outline, hover, full body? |
| stability | durable, aspect, derived? |
| noise | required claim vs garnish? |
| effect | `effect.l0` … `l3`? |
| modality | authored, derived, pinned, substrate? |
| identity | content_hash, shape_fingerprint, granule_key? |

**Dimensional ladder (authoring floor):**

| Rung | Form | Example |
|------|------|---------|
| d0 | bare string | `"docs/examples/index.spw"` |
| d1 | path ref | `~"../../../docs/examples/index.spw"` |
| d2 | root alias | `@examples` after `@examples: ~"…"` |
| d3 | fragment | `~"…/surface-identity.spw#spw_pattern_surface_identity"` |
| d4 | biased provenance | `={ ~"…/template-holes.spw" }` |
| d5 | typed claim frame | product + modality + ceiling + path together |

**Authoring floor:** new plan/canon docs prefer **≥ d1**; indexes and manifests prefer **≥ d2**.

**Richer-than-today targets** (language or tool follow-ons): path+required fragment+expected product; root alias+role token; bias+consumer set without baking verb into seed; selector AST; quantity+unit channel; claim-stream atoms instead of semicolon text in `<<…>>`.

### B.6 Worked migrations

| Intent | Soft | Prefer |
|--------|------|--------|
| Point at docs hub | prose “see docs/examples/…” | `@examples: ~"…/docs/examples/index.spw"` |
| Effect ceiling | `"effect.l2.workspace"` in a sentence | `ceiling: #effect.l2.workspace` + `~#when` gloss |
| Plan status | prose inside `~#status` | token in cache; sentence in stream |
| Cross-plan link | “see apposition-cache-granules” | `@apposition: ~"…/PLAN.md"` |
| Deep nav | “search for granule_key” | fragment ref to `#spw_pattern_surface_identity` |

### B.7 Tool goals (commit 6+)

**path-check — must:** resolve `~` and `@root`; report dangling with file:line.  
**path-check — add:** fragment existence for `.spw` targets; warn live → `_archive` without repoint; optional JSON.  
**path-check — non-goal:** execute selectors embedded in strings.  
**writerside — must:** topic targets exist.  
**Fixtures:** plant bad path (and bad fragment once g2 is on); `lint:docs:strict` fails; remove; pass.

Demo queries (also in the exhibit):

```bash
npm run spw -- query --from .agents/plans/hygiene-index-consolidation --selector pathRefs --summary
npm run spw -- skim .agents/plans/hygiene-index-consolidation/references/documentation-referentiality.spw
```

### B.8 Relation to Appendix A and out of scope

Appendix A names **language products** (claim atoms, binding modality, holes, schema). Appendix B states **what documentation should do with forms that already exist**, and which tool checks this plan will harden. g4 organelle schema, claim-list grammar, and selector-as-AST remain follow-ons — not commits 2–8.

---

## Appendix A — Language gaps and design conflicts

Filed 2026-07-27 against `main@873b266b`. **Diagnosis only** — this plan does not implement grammar or feature spines. The four maintenance pillars are symptoms of the same honesty failure these notes describe: surfaces claim structure; softer encodings and second readers make the claims uncheckable.

Census snapshots in §A.2 are approximate (`.spw` tree only unless noted) and should be remeasured before any language plan reuses them.

### A.1 Design Spw is aiming for

Compressed from mount, bias-product, surface-identity, hot grades, and kernel doctrine:

| Aim | Meaning |
|-----|---------|
| Operators as semantic actors | Sigils have lifecycle: lex → parse → product → select → (optional) execute |
| Verb-polymorphic edges | Neutral structure (e.g. bias `=`); consumers choose the verb |
| Self-describing organelles | Workspace/mount surfaces declare roots, policy, and authority without host keyword tables |
| Checkable claims | Mass, authority, path refs, cache fields can be recomputed or falsified |
| Distinct identity kinds | content hash / shape fingerprint / granule key — collision semantics must not share a head noun |
| One public effect ladder | `effect.l0.measure` … `effect.l3.external` |
| Grammar ≠ semantics ≠ pragmatics | Theory notebooks are non-binding until repeated in contracts |

### A.2 Soft encodings that outcompete Spw structure

Approximate `.spw` tree counts at filing:

| Soft form | ~Count | What it replaces |
|-----------|--------|------------------|
| Bare `key: value` lines | ~2000 | Products, frames, bias, particles |
| Quoted string values (`: "…"`) | ~1800 | Selectable AST, path refs, closed tokens |
| Labeled frames `^["…"]` / `^"…"` | ~350 | (aligned when used) |
| Aspect marks `~#` | ~700 | (aligned when derived honestly) |
| Deixis `#>` | ~270 | (aligned) |
| Bias-shaped `=` forms | ~8 | Verb-polymorphic config lean — almost unused |
| `//` foreign comments | ~700+ (theory-heavy) | `#` comment / particle plane only |

**Anti-design loop:** host-familiar soft form → tools invent a second reader → authors trust the soft form → operator design never becomes the default hand.

### A.3 Language gaps (missing or thin forms)

Gaps are ranked by convenience for **self-describing configurability**. Prefer **named products on existing sigils** over new punctuation (bias pattern).

#### A.3.1 Recognition gaps (form exists; not language-true)

| Surface habit | Gap |
|---------------|-----|
| `!writes: << … ; … >>`, `&joins: …` | `;` is not a Spw token; claim lists often read as text between delimiters. Tools (`spw authority`) re-parse host-side. |
| `%mass{ lines: N, bytes: M }` | Digits were hand-probed until `spw mass`; still no general **derived quantity** product. |
| `~#open_count`, plan `^["cache"]` | Aspect *suggests* mutability; nothing declares **derived from X** vs **authored**. `spw refresh` hard-codes a few derivers. |
| `cache.spw` tiers / TTL / coupling | Doctrine without a recognized workspace product (beat/granule plans collide on one block). |
| `_` / `$slot` holes | Named in theory; **fill contracts** (default, required, effect grade) deferred (macro parameterization). |
| Wonder blocks `?[…]{ !probe … }` | Ordinary operators; no **wonder-device** product (scope, selector, release, ceiling). |
| shape fingerprint / granule key | Declared in `onf.ts` / `surface-identity.spw`; machines unimplemented. |

#### A.3.2 Expressiveness gaps (configurability wants a form)

| Need | Why | Prefer |
|------|-----|--------|
| **Claim / list atoms** | Authority, options, permission lists must be AST-true | Stream/set product with qualifier atoms (`dataset[*]`, event names) |
| **Binding modality** | Authored vs derived vs pinned vs substrate | Stance on `#` already sketches this (`~#`, bare, `$#`, `=#`); needs authoring law + machines |
| **Hole + fill contract** | Expand/mutate as configuration, not string paste | Hole product with default / required / ceiling |
| **Organelle shape schema** | Dual of `spw authority`: surface against shape, not only host against surface | Light required-key / closed-option product |
| **Guard + effect ceiling** | When config applies; how hard it may write | Surface form tying dialect/mount role/path to `effect.l*` |
| **Quantity + unit + unmeasurable** | Axes want domain+unit; mass invents `unmeasurable` in a tool | Channel/quantity product; do not invent unit lexemes inside bare numbers |
| **Defaults / override / merge** | Workspace → shelf → surface inheritance | Verb-neutral lean products; avoid a second “settings equals” |

**Do not invent glyphs for:** metadata (`#` lattice), soft preference (bias), navigation (`#>`, path refs), measurement (`%`), query (selectors). Those already exist; they need recognition and discipline.

#### A.3.3 Suggested priority if a language plan follows

1. Claim-list / permission atoms  
2. Binding modality (authored / derived / pinned / substrate)  
3. Hole + fill contract  
4. Organelle shape schema  
5. Guard + effect ceiling  
6. Quantity + unit + unmeasurable  
7. Wonder-device product (research UX; less central to workspace config)

### A.4 Design conflicts (baked-in habits that fight Spw)

#### A.4.1 Freeform maps as default structure

Most configuration is unbound `key: value` sequences. They parse loosely but force no product, consumer, modality, or checkable shape. Bias’s “one edge, many verbs” almost never appears in the corpus. New surfaces should not treat freeform maps as the config idiom.

#### A.4.2 Opaque strings as the real AST

Selectors, dialect tags, laws, and enums often live only inside quotes. Path-check, query, and geometry see them only by re-parsing English/DSL. Same failure mode as pre-apposition “meaning in comments,” one layer down.

#### A.4.3 Dual comment systems and dual “prose”

- `#` is both line-comment culture and the metadata/particle plane.  
- `//` is widespread in theory despite Spw rejecting C-family block comments.  
- “Prose” means both `#` comment lines (tolerant reflow) and barewords inside braces (fragile). That dual meaning is itself anti-design.

#### A.4.4 Parallel canons (Markdown, TypeScript, Spw)

| Surface | Failure mode |
|---------|----------------|
| `docs/**/*.md` | Claims parser/runtime law without parse or mount |
| `packages/**/*.ts` | Becomes true acceptance; `.spw` becomes illustration |
| Registries + theory + runtime | Triple-define operators with different completeness |

Workspace doctrine says exploratory theory is non-binding until contracted; practice teaches that Spw is **documentation of a TypeScript system**.

#### A.4.5 Second structural models

- Character-scan geometry beside AST brace projection (self-contradicting reports).  
- Whole-file `contentHash` invalidation where granule/shape identity is intended.  
- Regex / indent-stack editor models (partially fixed; reflex remains).  
- Unguarded host regex colorizers vs checked `seed/lite`.  

Design law: delimiter shape alone is not evaluation law — ONF coupling is. Every second model reintroduces character shape as law.

#### A.4.6 Vocabulary forks

| Family | Variants | Rule broken |
|--------|----------|-------------|
| Effect ceilings | `effect.l*`, `S0–S2`, older `E0–E2`, local “topography grades” | One public ladder |
| Identity | content hash, “semantic hash”, “ONF shape hash”, shapeFingerprint, granule key | Distinct collision semantics |
| Readings | gloss → apposition (kernel settled; mental model lags) | One parser-visible reading product |

#### A.4.7 Incomplete operator realization

- `?match` hardcoded instead of general operator specialization.  
- `#` / `.` present in maps without full runtime handling.  
- Prefix-only grammar assumptions while fixity/placement matter.  
- Runtime operator unions narrower than the lexer actor set.  

“Operators are semantic actors” requires uniform specialization and complete lifecycle; special cases teach that only some sigils are real.

#### A.4.8 Dual trees as language confusion

`src/seed` ↔ `packages/spw-seed` (and runtime peers); plans still aimed at deleted `src/ui` / `src/core`. “Where is the truth?” becomes a language-design question. Mount/path-ref stories assume a stable layout.

#### A.4.9 Host-language culture inside Spw files

`//` section essays, backtick “law paragraphs,” `[reg=…]` tails as a second register system, ritual wonder templates. Register algebra and particles become optional theater beside TS-ish annotation style.

#### A.4.10 Cache as summary written once

Plan caches, hand status tokens, hand mass, atlas snapshots: derived facts stored as authored prose. Contradicts aspect-as-policy, refresh-as-recompute, and “hit equals cold recompute.”

### A.5 How this appendix maps to this plan’s pillars

| Pillar | Language root | Maintenance response (this plan) |
|--------|---------------|----------------------------------|
| Hygiene | Undeclared derived artifacts; soft emit paths | Ignore/relocate noise; document emit rule |
| Documentation | Opaque strings + unresolved soft refs | Harden path/fragment/archive checks |
| Indexing | Second caches; freeform status | Routing table + derived aspect fields only |
| Consolidation | Hand caches; vocabulary/status prose; dual trees in plan paths | Refresh tokens, archive/relocate, schedule notes |

**Explicit non-goals of this plan:** claim-list grammar, binding-modality product, hole contracts, shape schema, wonder-device AST, shapeFingerprint, granule invalidation, server-index edits. Those belong to follow-on language or feature plans; this appendix is the shared brief.

### A.6 Follow-on plan seeds (not scheduled here)

| Working slug | Would own |
|--------------|-----------|
| `config-binding-product` | Binding modality + claim-list atoms + organelle schema |
| `apposition-cache-granules` | Granule key machines (already filed) |
| `geometric-analysis-tooling` | shapeFingerprint + AST census (already filed) |
| `spw-beat-diff-precipitation` | Shared workspace cache block + TTL (already filed; after apposition) |
| `operator-lifecycle-closeout` | `?match` generalization, runtime/lex parity, fixity |
| `canon-layout-single-tree` | Finish `src/` → `packages/` so paths stop forking truth |
| `cli-envelope-completion` | Migrate remaining `--json` verbs to envelope v1; dual-publish or retire pulse-private schema |
| `cli-capabilities-review` | Ship planned `capabilities` + `review` verbs from conventions |

### A.7 Highest-leverage “stop baking this in” (discipline now)

Usable without grammar changes; compatible with this plan’s scope:

1. Prefer `~#` / particles / bias / named frames with products over freeform maps for **new** config.  
2. Prefer path refs and closed `#tokens` over path/grade/selectors only in strings.  
3. Public surfaces: one effect ladder (`effect.l*`); map or quarantine S0/E0 slang.  
4. One structural epistemology per tool report (no char-scan next to AST counts).  
5. No new `//` in `.spw`; treat remaining comment-law as migration debt.  
6. Do not hand-edit derived cache fields this plan can refresh.  
7. Do not start feature-spine edits under this slug.

### A.8 Sources

- Session review of git history + plan ecology (main tip through `873b266b`).  
- `.spw/mount.spw` organelle configurability; `.spw/registries/bias-product.spw`; `.spw/patterns/surface-identity.spw`; `.spw/biome/ocean/algos/cache.spw`; `.spw/hot.spw`.  
- `docs/theory/spw/inline-composites.spw`, `operational-devices.spw`, `dimensional-axes.spw`.  
- Kernel/tooling: `spw mass`, `spw authority`, `spw refresh`, geometry dual epistemology, LSP whole-file hash.  
- Plans: `apposition-cache-granules`, `geometric-analysis-tooling`, `spw-beat-diff-precipitation`, `directive-lattice`, `seed-roundness-grades`, `plan-ecology-clustering`.

---

## Appendix C — CLI verb alignment, composability, Spw-nativity, agent friendliness

Filed 2026-07-27. **Audit + plan** for `@spwashi/spw-cli` and adjacent agent entrypoints. Exhibit: `references/cli-verb-alignment.spw`. Complements `spw-cli-overhaul` (envelope foundation, review) and this plan’s commit 7 (ecology-aware plan status).

### C.1 Snapshot — what exists

**Registry groups** (`packages/spw-cli/src/commands.ts`) — group is a **cost claim**:

| Group | Blurb | Verbs |
|-------|-------|-------|
| workspace | where surfaces live / reachability | init, doctor, roots, mount, tree |
| sense | measure without touching | invent, map, atlas, formula, analyze, geometry, mass, authority, taste |
| read | pull structure | query, select, skim, ls |
| shape | rewrite or project | format, expand, refactor, refresh, emit |
| effect | staged writes and cadence | pulse, mutate, beat, mem, dev |

**Effect ladder** (`.spw/hot.spw`): beat none → pulse `l0.measure` (optional `--write` → `l2.workspace`) → mutate `l1`→`l2` → dev light orchestrator.

**Envelope:** `spw.cli.envelope` v1 (`envelope.ts`) — invent/map (and partial peers) use it. Pulse keeps a **private** schemaVersion/surface. mass, authority, atlas, geometry, beat often emit **ad-hoc** `--json`.

**Outside the binary:** `scripts/analyzers/*` (path-check, census, syntax-validate), `scripts/agent-tools.sh` (`plan:*`, `vibe`, `kb`). Convention still **plans** `capabilities` and `review` but they are unshipped. `conventions/cli.spw` `public_commands` list is a **stale subset** of `COMMANDS`.

### C.2 Audit by axis

#### C.2.1 Verb alignment

| Finding | Severity | Notes |
|---------|----------|-------|
| **F1 Convention drift** | medium | Docs/convention list fewer verbs than the registry; agents reading convention under-discover. |
| **F2 Write-in-sense/shape** | medium | `mass --write`, `refresh --write` mutate workspace while group blurbs say measure-only / shape projection. Cost claim needs ceiling in the **one-line summary** and help. |
| **F8 Group blurbs honest** | low (keep) | workspace/sense/read/shape/effect is a good lattice; do not invent a sixth “agent” group — attach plan verbs to workspace/shape with ceilings. |
| Hot ladder clear | good | pulse/mutate/beat/dev differentiated and must not be aliased away. |
| Product-named sense verbs | good | mass, authority, taste, geometry name Spw products rather than generic “check”. |

**Alignment goals:**

- Verb names stay stable; aliases keep muscle memory (`inv`, `q`, `spwq`, `seq`).  
- Every `--write` path documents `effect.l*` ceiling in help summary.  
- `refresh` stays “recompute derived marks” (shape or sense — pick one story and stick; prefer **shape** as projection of truth onto the surface).  
- Plan ecology verbs should be `spw plan …` (or `spw status` / `spw check` under workspace), not only bash.

#### C.2.2 Composability

| Finding | Severity | Notes |
|---------|----------|-------|
| **F3 Envelope partial** | high | Agents need one wire contract; N JSON shapes = N parsers. |
| **F4 Flag heterogeneity** | medium | query is compositional (`--from/--where/--selector`); geometry is `--stdin`; invent is path-positional; `--json` nearly universal among measured verbs but not envelope-universal. |
| Registry + help page | good | Single `COMMANDS` list drives help groups. |
| Sense → read loop | good (documented) | invent → map → formula → analyze → query/skim examples on help. |

**Composability goals:**

1. **All new `--json` output** uses envelope v1 (`ok`, `schemaVersion`, `command`, `data`, `summary`).  
2. **Migrate** mass, authority, taste, doctor, atlas, geometry, beat, refresh to envelope (follow-on or staged in commit 7+).  
3. **Pulse:** dual-publish envelope fields or document pulse as the sole exception with a stable dual reader.  
4. **Stdin/stdout:** sense verbs that emit envelope should be pipe-friendly; avoid requiring TTY.  
5. Shared flag lexicon where possible: `--json`, `--help`, `--write` (always gated), `--from` for multi-root sense/read.

#### C.2.3 Spw-nativity

| Finding | Severity | Notes |
|---------|----------|-------|
| **F6 Orphan analyzers** | medium | path-check, census, syntax-validate not on `spw help` — agents and humans miss them. |
| query/select/skim/ls | good | Seed selectors / AST. |
| mass/authority/taste/refresh | good | Surface products + semantic edits. |
| geometry dual epistemology | known debt | Owned by geometric-analysis-tooling, not this appendix’s implement scope. |
| expand/mutate + bias | good | Verb-polymorphic bias consumers. |

**Nativity goals:**

- Prefer seed products over host regex for any new verb.  
- Bring **path-check** and **particle census** onto the registry (workspace/sense) or document them as `spw doctor` subprobes.  
- Keep **derived** artifacts (`.expanded.spw`) excluded from default walks (naming convention already).  
- Update `conventions/cli.spw` from `COMMANDS` (generate or checklist in commit 7).

#### C.2.4 Agent friendliness

| Finding | Severity | Notes |
|---------|----------|-------|
| **F5 Agent-tools split** | high | `plan:status/check/init/stream`, `vibe`, `kb` are bash; `refresh` is spw — ecology half-visible to `spw` users. |
| **F7 capabilities gap** | high | No `spw capabilities --json`; agents must scrape help or source. |
| exit.ts | good | Stable reasons without hard `process.exit` in libraries. |
| Path policy | good (convention) | Relative paths; no absolute user paths in payloads. |
| planned review | open | `spw review` for named profiles / consumer evidence. |

**Agent goals:**

| Contract | Level |
|----------|-------|
| relative paths only | must |
| stable exit codes | must |
| `--help` on every verb | must |
| `--json` opt-in | must |
| envelope v1 for agent-facing JSON | should → must for new work |
| `spw capabilities --json` | should (follow-on or late commit) |
| `spw plan status|check` (ecology) | should — **this plan commit 7** |
| no silent write | must |
| effect ceiling in help for writers | must |

### C.3 Verb × product map (nativity)

| Spw product | CLI verbs | Gap |
|-------------|-----------|-----|
| path refs / roots | query, select, mount, tree, doctor | path-check orphan |
| particles / taste | taste, analyze | census orphan |
| bias | expand, mutate, mount | — |
| `%mass` | mass | — |
| `!writes` / `&joins` | authority | — |
| geometry report | geometry | AST census plan |
| plan cache marks | refresh | plan status/check not on spw |
| effect ladder | pulse, mutate, beat | — |
| formulas / emit | formula, emit | — |
| topography | map, invent, atlas | — |
| capabilities | — | unshipped |
| review profile | — | unshipped |

### C.4 Plan — what this plan owns vs follow-on

#### Owned here (extend commit 7–8)

1. **`spw` ecology status** — multi-plan status/check (wrap agent-tools or reimplement) with `--json` envelope-friendly payload; relative paths; slug filter.  
2. **Help honesty** — mass/refresh one-liners mention write ceiling when `--write` exists.  
3. **Convention sync note** — update or generate `conventions/cli.spw` public_commands from registry (or checklist in ship gate).  
4. **Agent demo path** — document compose recipes in help or exhibit (sense → read; refresh fixpoint; plan status).

#### Follow-on plans (not commit spine here)

| Slug | Work |
|------|------|
| `cli-envelope-completion` | Migrate remaining JSON verbs to envelope v1; pulse dual-publish |
| `cli-capabilities-review` | Ship `capabilities` + `review` per convention |
| `spw-cli-overhaul` | Finish remaining overhaul commits if still open (review/next) |

#### Explicit non-goals

- Renaming invent/map/analyze for aesthetics.  
- Folding all analyzers into one mega-command.  
- Changing effect grade names.  
- Feature spines (granules, geometry AST, beat TTL).

### C.5 Proposed commit refinement (commit 7)

Was: ecology-aware plan refresh and multi-plan status.

**Refined:**

7. `&[cli] — ecology plan status/check on the spw binary; envelope-friendly --json; write-ceiling honesty in mass/refresh help`  
8. `![hygiene] — ship gate: clean status, refresh fixpoint, lint:docs:strict, spw plan status --json smoke`

### C.6 Demo sequence (agent)

```bash
spw help
spw invent .spw --json | head          # prefer envelope
spw mass prompts --json                # today ad-hoc; goal envelope
spw refresh .agents/plans --json
spw refresh .agents/plans --json       # fixpoint
# goal:
spw plan status --json
spw capabilities --json                # follow-on
```

### C.7 Sources

- `packages/spw-cli/src/commands.ts`, `envelope.ts`, `exit.ts`  
- `.spw/hot.spw`, `.spw/conventions/cli.spw`  
- `scripts/agent-tools.sh`, `scripts/analyzers/*`  
- Help flag census (invent/map/query/select/skim/geometry/mass/authority/taste/refresh/pulse/mutate)  
- Plan `spw-cli-overhaul` (envelope foundation, partial migration)
