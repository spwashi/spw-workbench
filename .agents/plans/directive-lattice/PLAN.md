# Plan: directive-lattice

**Current direction — 2026-10-19:** three particle aims and fragment addressing are implemented. Public names were settled on 2026-10-12 as **anchor/lens/focus**; implementation names remain deixis/case/mood pending `aim_names`. The next registry must distinguish token counts, attachments and interpretation. The `~#` stance name remains open. See the checkpoint below and `wip.spw` for current work; the original rationale and scope follow for provenance.

Unify the `#` directive family into one structured token lattice — `⟨stance⟩#⟨aim⟩name` — making `#>` anchors addressable nodes and fragments (`~"file#anchor"`) resolvable references.

## Goal

The `#` operator's modified forms are one combinatoric family the grammar only partially recognizes: `#!` and `##` lex clean, `~#` has a bespoke matcher, but `#:` (×1051) and `#>` (×593) **fall to Prose** — a `#` op plus an unspanned ProseChunk. That prose fallback is what blocks fragment addressing: there is no `#>anchor` node for `~"file#anchor"` to resolve to.

This plan lexes the whole family as one DIRECTIVE token with two slots — **stance** (prefix: which modality enters the metadata plane; `~` defer, `$` substrate, `=` config…) and **aim** (postfix: what the mark does; `>` points, `:` classifies, `!` asserts) — and binds each directive to the expression that follows it. The anchor→node binding becomes the corpus's index/export table: enhanced indexing, discoverable referential patterns, and a new structured-relationship encoding, per the stated aim. Fragment resolution then rides on top: mount verifies `#anchor` deep-links, expand projects anchored regions.

Wild usage (`$#e`, `=#p`) shows authors already composing stances — the lattice legitimizes existing practice. In the Spw ethos, the deliverable is a construct that invites wonder: the lattice makes "what would `%#` mean?" an askable question with a structural answer.

**Naming decision (2026-07-23, aims renamed 2026-10-12)**: **linguistic particles** — family `particle ⟨stance⟩#⟨aim⟩name`. The 2026-07-23 decision borrowed grammatical names for the aims (deixis, case, mood, aspect); those remain the code identifiers until `aim_names` lands. On 2026-10-12 the creator renamed the aims by what a reader does with each mark: `#>` **anchor** (points at the node that follows), `#:` **lens** (classifies its bearer's role), `#!` **focus** (asserts pragmatic force); `~#` (deferred state-in-time) is a stance whose name is still open (`?[stance_name]`). Sigils unchanged; code, types, and canon adopt the vocabulary.

**File patterns (user aim)**: recurring particle *stacks* are themselves recognizable semantics — e.g. the header stack (an anchor plus a lens/focus pair) opening nearly every canonical file. A census commit discovers such stacks corpus-wide and names them in the registry; refactors apply only where a recognized pattern adds nuance, decided per-pattern with the user.

**Taste note**: expressiveness + naming. Four special cases and a prose fallback become one legible combinatoric system; concept renames adopt the particle vocabulary — **sigils and surface syntax do not change**.

**Deformation axis**: disclosure (what the metadata plane reveals and to whom) and resolution (fragments dial reference granularity from file to node).

## Scope

- **In scope**:
  - DIRECTIVE token family in the lexer (stance/aim/name, spans).
  - Grammar: directives attach to the following expression (anchored-node relation); no more prose fallback for `#:`/`#>` lines.
  - Normalize: directive regs/products; concept-vocabulary renames per the naming decision.
  - Query: select directives by aim/name; `anchors` preset.
  - Fragment keystone: `~"file#anchor"` resolves to the anchored node's span; `BiasTarget.fragment` carried; mount dangling-fragment detection; expand fragment-region projection.
  - Corpus roundtrip gate: all 344 files parse and canonicalize byte-stable.
  - Canon: directive-lattice registry surface; naming conventions updated.

- **Out of scope**:
  - Any surface-syntax change (sigils stay exactly as written).
  - Macro parameterization (frame-binding holes) — next branch, rides on fragments.
  - The pending user stash reconciliation (`grok-working-tree-…` on main).

## Files

```
[NEW] packages/spw-seed/src/lexer/matchers/particles.ts     # landed in 8cdaf2a9 (planned as identifiers.ts or a new directives.ts)
[MOD] packages/spw-seed/src/lexer/tokenize.ts               # register matcher
[MOD] packages/spw-seed/src/types/token.ts                  # DIRECTIVE token type
[MOD] packages/spw-seed/src/grammar/expressions.ts          # directive→following-node binding
[MOD] packages/spw-seed/src/types/ast/nodes.ts              # DirectiveNode
[NEW] packages/spw-seed/src/canonical/particles.ts          # particleBindings, deixisTable, particleMix (25ca2e29)
[MOD] packages/spw-seed/src/normalize.ts                    # directive regs
[MOD] packages/spw-seed/src/query/{types,match,presets}.ts  # aim/name selectors, ANCHORS
[MOD] packages/spw-seed/src/canonical/read-bias.ts          # BiasTarget.fragment
[NEW] packages/spw-seed/src/canonical/resolve-fragment.ts   # anchor → node span
[MOD] packages/spw-seed/src/canonical/canonicalize.ts       # directive-aware (no reflow change)
[MOD] packages/spw-cli/src/bias-edges.ts                    # fragment-aware resolveTilde
[MOD] packages/spw-cli/src/mount.ts                         # dangling-fragment detection
[MOD] packages/spw-cli/src/expand.ts                        # fragment-region projection
[NEW] src/seed/__tests__/particle-lexer.test.ts             # landed (planned as directive-lattice.test.ts); grammar half in particle-grammar.test.ts
[NEW] src/seed/__tests__/resolve-fragment.test.ts
[NEW] .spw/registries/directive-lattice.spw
[MOD] .spw/conventions/naming.spw                           # lattice vocabulary
```

### Craft guard

- Lexer matcher stays single-purpose; new `resolve-fragment.ts` <150 lines.
- `canonicalize.ts` and `format` must not change output for any corpus file — the roundtrip gate is the hard wall.
- Regex consumers (`math/corpus.ts`, emit codecs) re-pointed, not duplicated.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

### Fuzz strategy

- Explore: `fuzz:types` per commit; parse-all after particle_token_family and bind_particle_nodes.
- Stabilize: `fuzz:stabilize` after bind_particle_nodes (grammar) and resolve_fragment (fragments).
- Ship gate: `test:seed` + `test:cli` + `lint:spw` (344/344) + canonicalize byte-stability sweep before merge.

## Agentic Hygiene

- Rebase target: `main@bb1ffe65`.
- Rebase cadence: before particle_token_family, before merge.
- Hygiene split: none. Standing note (2026-07-23): user stash `grok-working-tree-before-reconciliation-merge-2026-07-21` overlapped (`.spw/index.spw`, seed index); its payload was archived on `feature/grok-lsp-reconciliation` (stream 2026-07-23 03:40) and the stash is no longer listed.

## Dependencies

none (bias-resolution-product already merged to main).

## Failure Modes

- **Hard**: a corpus file parses differently (or fails) once `#:`/`#>` stop falling to prose. Guard: parse-all + byte-stable canonicalize sweep in the gate; grammar change is additive (directives were unmodeled, not modeled differently).
- **Soft**: tools that regexed `#>` (corpus counters, emit) drift from the token family — re-point them to the DIRECTIVE token in particle_vocabulary or particle_selectors.
- **Non-negotiable**: no surface syntax changes; renames are concept-level (types, function names, docs) only.

## Validation

- **Hypotheses**: every `#:`/`#>` line in the corpus becomes a spanned DIRECTIVE node; zero parse or roundtrip regressions.
- **Negative controls**: `#!`, `##`, `~#` behavior unchanged; bias edge suite (7 + 10 tests) stays green.
- **Demo**: `spw select .spw/canon-mount.spw --selector anchors` lists anchor nodes with spans; `spw mount resolve` flags a dangling `#fragment`; `spw expand` projects a single anchored region.

## Spw Artifact

`.spw/registries/directive-lattice.spw` (lattice_registry): the stance×aim lattice, occupied cells (with corpus counts), open cells as wonder probes, and the naming decision.

## Particle design checkpoint — 2026-10-19

The original rationale describes the pre-implementation problem. Current `ParticleNode` and the lexer already recognize three aims: `#>` anchor, `#:` lens and `#!` focus (code: deixis, case, mood); `~#` remains ANNOTATION, and apposition has its own token path. A prefix such as `$#>item` lexes as an operator plus a particle, not one token carrying a stance field. Keep the full stance-by-aim lattice a design space rather than implying every cell is an implemented construct.

Seven small probes are recorded in `../naming-profile-convention-align/language-design-review.spw`. Two distinguish notation from useful behavior: a quoted `~#status` yields `aspect=1` despite being STRING, and `#>tail` yields `deixis=1` with a null binding. The next registry should separate recognized token count, derived attachment, bound/unbound anchors, duplicate names and any interpretive usefulness claim. Counts alone establish neither volatility nor navigability.

A particle construct record should state bearer/attachment, scope, duplicate policy, payload and effect boundary. Keep existing first-wins anchor behavior visible while considering duplicate diagnostics; do not silently change fragment resolution. Extend the family only when an actual example needs a missing distinction, including a malformed or quoted negative control. Name the general family particles; retain directive-lattice as the existing plan address until a migration is justified.

The owner-facing pressures on the lattice (four named aims against three lexed tokens, forward binding, one aim with three names) are collected in `.spw/caches/tree/spw/theory/particle-lattice.spw`; `.spw/caches/tree/spw/glossary/particles.spw` is the reader's glossary. Both were written on 2026-10-03, before the aim names were settled, and still say deixis, case and mood.
