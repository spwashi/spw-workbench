# Plan: naming-profile-convention-align

Audit and align **language feature naming**, **profile families**, and **constants/conventions** so older designs stay legible and develop **alongside** new ones (CLI modes, surface identity, particles, effect ladder) rather than forking head nouns.

## Goal

Spw already has several correct but **parallel naming systems** that all use the word *profile*, several **effect/grade ladders**, and **convention surfaces that are not all indexed**. New work (cli-mode-overhaul modes, surface-identity collision nouns, particle vocabulary, free CLI rename) will make the fork worse unless there is one **hygiene pass**: inventory every family, assign ownership, ban shared head nouns across inverted semantics, refresh stale convention indexes, and add a small **alignment gate** so new constants register against the living map.

This plan does **not** invent a new language. It makes the existing one **one mind**: dialect geometry, format profiles, mutation profiles, fractal/emit profiles, form-geometry profiles, syntax-review profiles, effect.l* ceilings, identity kinds, and derived-surface kinds all **named distinctly**, **indexed**, and **cross-referenced** so old and new designs co-evolve.

Taste note:
- **naming** — collision semantics must not share a head noun (extends surface-identity)
- **clarity** — “profile” always has a family qualifier in public docs and CLI help
- **correctness** — conventions index lists every live convention; dead names deprecated with pointer
- **layering** — grammar dialects ≠ mutation profiles ≠ format profiles ≠ CLI modes

## Scope

- **In scope**:
  - Census of naming families (language features, profiles, constants, conventions, patterns, registries).  
  - Profile hygiene: qualify every `profile` use (`dialect_profile`, `format_profile`, `mutation_profile`, `emit_profile`, …) in help, conventions, and key public docs; optional TypeScript type renames where cheap.  
  - Constants audit: effect.l* only in public surfaces; quarantine S0/E0/orchestrator slang; map to effect.l* or mark historical.  
  - Convention hygiene: add missing roots to `conventions/index.spw` (file-physics, hash-resonance, styles, hot?); sync `cli.spw` / `naming.spw` with COMMANDS and derived kinds after cli-mode work.  
  - Language feature naming table: particle, apposition, bias, path_ref, granule_key, shape_fingerprint, content_hash, mode (CLI), precipitate, … with owner surface and status (canon | experimental | deprecated).  
  - Alignment mechanism: `.spw/patterns/naming-alignment.spw` (or extend surface-identity + conventions) + optional `spw taste` / lint check for forbidden head-noun collisions in public strings.  
  - Co-development rule: new plans that introduce a public name must update the alignment map in the same PR/commit series.  
  - Link older plans (seed-roundness-grades, cli-mode-overhaul, hygiene appendices) into the map rather than rewriting their history.

- **Out of scope**:
  - Implementing CLI mode lattice or flow-cache (cli-mode-overhaul owns that).  
  - Full rename of MUTATION_PROFILES keys in source if it breaks fixtures mid-flight — prefer **qualified docs first**, code rename as a later commit.  
  - Rewriting all theory `//` comments or freeform maps.  
  - Grammar changes to particle/bias syntax.

## Files

```
[NEW] .agents/plans/naming-profile-convention-align/PLAN.md
[NEW] .agents/plans/naming-profile-convention-align/wip.spw
[NEW] .agents/plans/naming-profile-convention-align/naming-profile-convention-align.spw
[NEW] .agents/plans/naming-profile-convention-align/naming-census.spw
[NEW] .spw/patterns/naming-alignment.spw
[MOD] .spw/patterns/index.spw
[MOD] .spw/conventions/index.spw
[MOD] .spw/conventions/naming.spw
[MOD] .spw/conventions/cli.spw
[MOD?] .spw/conventions/styles.spw
[MOD?] .spw/hot.spw
[MOD] .spw/patterns/surface-identity.spw
[MOD] .spw/registries/dialect-spec.spw
[MOD?] packages/spw-seed/src/canonical/mutation-automata.ts   # profile type aliases / comments
[MOD?] packages/spw-seed/src/canonical/canonicalize.ts       # FormatProfile naming
[MOD?] packages/spw-cli/src/format.ts
[MOD?] packages/spw-cli/src/pulse.ts
[MOD?] packages/spw-cli/src/emit/fractal.ts
[MOD] docs/runtime/md/pulse-mutate-beat.md
[MOD?] prompts/sagas/profiles.spw
[MOD?] package.json scripts comments only if needed
```

### Craft guard

- Naming-alignment surface is a **map**, not an essay — tables and roots.  
- Do not grow mutation-automata or canonicalize for renames beyond type aliases / exports.  
- Prefer one new pattern file over scattering glossary frames into every plan.

## Commits

1. `.[plans] — file naming-profile-convention-align with naming census`  
2. `.[spw] — naming-alignment pattern: families, head-noun bans, co-development rule`  
3. `![spw] — freeze census: profile families, language features, constants, convention coverage gaps`  
4. `vocab[conventions] — index file-physics, hash-resonance, styles; refresh naming + cli from living registry`  
5. `vocab[profile] — qualify profile families in help and public docs (format vs mutation vs dialect vs emit)`  
6. `vocab[constants] — public effect.l* only; historical grade map; orchestrator marked non-ladder`  
7. `vocab[identity] — cross-link surface-identity + CLI modes + derived kinds in alignment map`  
8. `![hygiene] — alignment checklist gate for new public names; taste/lint hook optional`  
9. `.[plans] — point seed-roundness, cli-mode-overhaul, hygiene appendices at alignment map`  
10. `![docs] — pulse-mutate-beat + dialect-spec + naming convention co-read smoke`

Fuzz strategy:
- Explore: `lint:spw` on new/edited `.spw` surfaces.  
- Stabilize: `lint:docs` on path refs in alignment map.  
- Ship: `lint:spw` + optional `spw taste` if wired; no full fuzz:ship required unless TS renames touch seed.

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7` (refresh at branch cut)  
- Rebase cadence: before commit 2, before merge  
- Hygiene split: none required for pure vocab; if concurrent with cli-mode-overhaul, **land alignment map first** so mode/profile renames register into it.  
- No server-index edits.

## Dependencies

- **`surface-identity.spw`** — head-noun / collision law; this plan generalizes the method beyond three identity kinds.  
- **`cli-mode-overhaul`** — introduces CLI *modes*; must register under alignment as distinct from *profiles*.  
- **`hygiene-index-consolidation`** — docs/referentiality + CLI appendix; cross-link, do not duplicate full audits.  
- **`seed-roundness-grades`** — grade rename debt; constants commit absorbs public ladder rule.  
- **`dialect-spec.spw`** — owner of Spw.b/l/m/x geometry “profiles”.  
- **`plan-ecology-clustering`** — optional: cluster this plan under principal-engineering / governance.

## Failure Modes

- **Hard**: renaming mutation profile ids without updating fixtures → pulse/mutate red. Mitigation: docs-first qualification; code rename behind alias map.  
- **Hard**: alignment map becomes a second lying cache. Mitigation: derived counts optional; durable fields are family names and owners only.  
- **Soft**: over-qualifying every internal variable. Mitigation: public surfaces + CLI help + conventions only in first pass.  
- **Non-negotiable**: do not collapse dialect Spw.m with mutation layout_canonical under one “profile” id space.  
- **Non-negotiable**: `hash` stays content identity; fingerprint/key/mode stay distinct.

## Validation

- **Hypotheses**:
  - At least four distinct profile families appear in the tree under the bare word `profile` (census confirms).  
  - `conventions/index.spw` omits ≥3 live convention files (file-physics, hash-resonance, styles).  
  - After commit 5, `spw format --help` and `spw pulse --help` never say bare “profile” without a family qualifier.  
- **Negative controls**:
  - Dialect markers Spw.b/l/m/x unchanged.  
  - MUTATION_PROFILES rule behavior unchanged unless alias commit explicitly tests.  
  - lint:spw green on touched surfaces.  
- **Demo sequence**:
  1. `spw skim .spw/patterns/naming-alignment.spw`  
  2. Grep bare `profile` in CLI help before/after  
  3. `spw format --help` / `spw pulse --help` family wording  
  4. conventions/index lists all files under conventions/  

## Spw Artifact

- `naming-profile-convention-align.spw` — doctrine + co-development rule.  
- `naming-census.spw` — living inventory of families and drift findings.  
- `.spw/patterns/naming-alignment.spw` — durable repo pattern (registered in patterns/index).

---

## Appendix N — Naming families (initial census)

### N.1 Language features (public nouns)

| Feature | Owner surface / code | Status | Notes |
|---------|----------------------|--------|-------|
| particle (deixis/case/mood/aspect) | directive-lattice, lexer | canon | not “directive” in new prose |
| apposition | gloss→apposition | canon | readings, not comments |
| bias edge | bias-product.spw | canon | verb-polymorphic `=` |
| path_ref / fragment | path-check, resolveFragment | canon | |
| content_hash | surface-identity, range-transform | canon | collision = failure |
| shape_fingerprint | geometric plan / onf | declared | not “shape hash” |
| granule_key | apposition-cache plan | declared | |
| effect.l0–l3 | hot.spw, pulse | canon public | |
| CLI mode | cli-mode-overhaul | planned | ≠ profile |
| precipitate | runtime precipitates.spw | canon concept | CLI emit planned |
| derived kind | derived-surface.ts | partial | only `expanded` |

### N.2 Profile families (must not share bare “profile” in help)

| Family | Examples | Code / surface | Qualifier |
|--------|----------|----------------|-----------|
| **dialect geometry** | Spw.b, Spw.l, Spw.m, Spw.x, Spw.o/q/t | dialect-spec.spw, `@profile:Spw.*` | `dialect` / `@profile` seed only |
| **format profile** | pretty, layout, prose, canonical, wide, equiv | format.ts, resolveFormatProfile | `format_profile` |
| **mutation profile** | layout_canonical, measure_only, equiv_scripts | MUTATION_PROFILES | `mutation_profile` |
| **emit / fractal profile** | pe_style_lock, fractal_merge, … | emit/fractal.ts, prompts/sagas/profiles.spw | `emit_profile` |
| **form-geometry profile** | FORM_GEOMETRY_PROFILE, FORM_LADDER_PROFILE | pulse form modes | `form_profile` |
| **syntax-review profile** | historical, agent_surface, canon_surface, … | commit-review / Agents.md | `review_profile` |
| **lens profile** | harness memory-surface | harness | `lens_profile` |

**Hygiene rule:** public CLI/docs say `mutation profile layout_canonical`, never “the profile” when multiple families are in scope.

### N.3 Constants / ladders

| Ladder | Public? | Action |
|--------|---------|--------|
| effect.l0.measure … l3.external | yes | sole public effect ladder |
| S0–S2 (topography / form-geometry plans) | no (plan-local) | map or deprecate in public docs |
| E0–E2 (seed-roundness era) | no | historical only |
| #orchestrator (dev ceiling) | gray | name as non-ladder role, not effect.l* |
| valence pentad boon/bane/… | yes | unchanged |

### N.4 Conventions coverage gap

| File under conventions/ | In index.spw roots? |
|-------------------------|---------------------|
| selection, naming, cli, submodule, packaging | yes |
| file-physics, hash-resonance, styles | **no** |
| hot.spw lives at .spw/hot not conventions/ | cross-link from cli/naming alignment |

### N.5 Co-development rule

When a plan or PR introduces a **public** name (CLI flag family, profile id, effect slug, identity kind, derived kind, particle aim):

1. Add a row to `naming-alignment.spw` (or census) with owner + status.  
2. If the head noun already exists with **different collision semantics**, choose a new head noun or qualify.  
3. Update the owning convention/registry in the **same series** as the implementation.  
4. Older designs: add `~#aligns_with` / `@alignment` root rather than silent rewrite of history.

---

## Relation to other plans

| Plan | Relation |
|------|----------|
| surface-identity | Method parent for collision-aware naming |
| cli-mode-overhaul | Registers *mode* family; free rename registers here |
| hygiene-index-consolidation | Docs grades + CLI appendix; naming gate complements docs g1–g5 |
| seed-roundness-grades | Effect/grade public ladder owned by constants commit here |
| spw-cli-overhaul | Envelope only; profile wording in help is this plan |
