# Plan: directive-lattice

Unify the `#` directive family into one structured token lattice —
`⟨stance⟩#⟨aim⟩name` — making `#>` anchors addressable nodes and fragments
(`~"file#anchor"`) resolvable references.

## Goal

The `#` operator's modified forms are one combinatoric family the grammar only
partially recognizes: `#!` and `##` lex clean, `~#` has a bespoke matcher, but
`#:` (×1051) and `#>` (×593) **fall to Prose** — a `#` op plus an unspanned
ProseChunk. That prose fallback is what blocks fragment addressing: there is no
`#>anchor` node for `~"file#anchor"` to resolve to.

This plan lexes the whole family as one DIRECTIVE token with two slots —
**stance** (prefix: which modality enters the metadata plane; `~` defer, `$`
substrate, `=` config…) and **aim** (postfix: what the mark does; `>` points,
`:` classifies, `!` asserts) — and binds each directive to the expression that
follows it. The anchor→node binding becomes the corpus's index/export table:
enhanced indexing, discoverable referential patterns, and a new structured-
relationship encoding, per the stated aim. Fragment resolution then rides on
top: mount verifies `#anchor` deep-links, expand projects anchored regions.

Wild usage (`$#e`, `=#p`) shows authors already composing stances — the lattice
legitimizes existing practice. In the Spw ethos, the deliverable is a construct
that invites wonder: the lattice makes "what would `%#` mean?" an askable
question with a structural answer.

**Naming decision (2026-07-23)**: **linguistic particles** — family
`particle ⟨stance⟩#⟨aim⟩name`; `#>` **deixis** (points at the node that
follows), `#:` **case** (classifies its bearer's role), `#!` **mood** (asserts
pragmatic force), `~#` **aspect** (deferred state-in-time). Sigils unchanged;
code, types, and canon adopt the vocabulary.

**File patterns (user aim)**: recurring particle *stacks* are themselves
recognizable semantics — e.g. the header stack (deixis + case/mood pair)
opening nearly every canonical file. A census commit discovers such stacks
corpus-wide and names them in the registry; refactors apply only where a
recognized pattern adds nuance, decided per-pattern with the user.

**Taste note**: expressiveness + naming. Four special cases and a prose
fallback become one legible combinatoric system; concept renames adopt the
particle vocabulary — **sigils and surface syntax do not change**.

**Deformation axis**: disclosure (what the metadata plane reveals and to whom)
and resolution (fragments dial reference granularity from file to node).

## Scope

- **In scope**:
  - DIRECTIVE token family in the lexer (stance/aim/name, spans).
  - Grammar: directives attach to the following expression (anchored-node
    relation); no more prose fallback for `#:`/`#>` lines.
  - Normalize: directive regs/products; concept-vocabulary renames per the
    naming decision.
  - Query: select directives by aim/name; `anchors` preset.
  - Fragment keystone: `~"file#anchor"` resolves to the anchored node's span;
    `BiasTarget.fragment` carried; mount dangling-fragment detection; expand
    fragment-region projection.
  - Corpus roundtrip gate: all 344 files parse and canonicalize byte-stable.
  - Canon: directive-lattice registry surface; naming conventions updated.

- **Out of scope**:
  - Any surface-syntax change (sigils stay exactly as written).
  - Macro parameterization (frame-binding holes) — next branch, rides on
    fragments.
  - The pending user stash reconciliation (`grok-working-tree-…` on main).

## Files

```
[MOD] packages/spw-seed/src/lexer/matchers/identifiers.ts   # or new directives.ts matcher
[MOD] packages/spw-seed/src/lexer/tokenize.ts               # register matcher
[MOD] packages/spw-seed/src/types/token.ts                  # DIRECTIVE token type
[MOD] packages/spw-seed/src/grammar/expressions.ts          # directive→following-node binding
[MOD] packages/spw-seed/src/types/ast/nodes.ts              # DirectiveNode
[MOD] packages/spw-seed/src/normalize.ts                    # directive regs
[MOD] packages/spw-seed/src/query/{types,match,presets}.ts  # aim/name selectors, ANCHORS
[MOD] packages/spw-seed/src/canonical/read-bias.ts          # BiasTarget.fragment
[NEW] packages/spw-seed/src/canonical/resolve-fragment.ts   # anchor → node span
[MOD] packages/spw-seed/src/canonical/canonicalize.ts       # directive-aware (no reflow change)
[MOD] packages/spw-cli/src/bias-edges.ts                    # fragment-aware resolveTilde
[MOD] packages/spw-cli/src/mount.ts                         # dangling-fragment detection
[MOD] packages/spw-cli/src/expand.ts                        # fragment-region projection
[NEW] src/seed/__tests__/directive-lattice.test.ts
[NEW] src/seed/__tests__/resolve-fragment.test.ts
[NEW] .spw/registries/directive-lattice.spw
[MOD] .spw/conventions/naming.spw                           # lattice vocabulary
```

### Craft guard

- Lexer matcher stays single-purpose; new `resolve-fragment.ts` <150 lines.
- `canonicalize.ts` and `format` must not change output for any corpus file —
  the roundtrip gate is the hard wall.
- Regex consumers (`math/corpus.ts`, emit codecs) re-pointed, not duplicated.

## Commits

```
1.  .[plans] =stage[directive-lattice] — plan artifacts
2.  ^seed[lexer] — PARTICLE token family ⟨stance⟩#⟨aim⟩name
3.  &[seed-grammar] — particle nodes bind to the following expression
4.  vocab[seed] — normalize particle regs; adopt deixis/case/mood/aspect
5.  &[seed-query] — particle selectors (aim/name); deixis (anchors) preset
6.  ^seed[fragment] — resolve ~"file#anchor" → deixis-anchored node span
7.  &[cli] — mount verifies fragments; expand projects anchored regions
8.  ![seed] — corpus roundtrip gate + particle + fragment coverage
9.  ^seed[census] — particle-stack pattern discovery across the corpus
10. .[canon] — particle-lattice registry; naming conventions; pattern refactors (user-gated)
```

### Fuzz strategy

- Explore: `fuzz:types` per commit; parse-all after 2 and 3.
- Stabilize: `fuzz:stabilize` after 3 (grammar) and 6 (fragments).
- Ship gate: `test:seed` + `test:cli` + `lint:spw` (344/344) + canonicalize
  byte-stability sweep before merge.

## Agentic Hygiene

- Rebase target: `main@bb1ffe65`.
- Rebase cadence: before commit 2, before merge.
- Hygiene split: none. Standing note: user stash
  `grok-working-tree-before-reconciliation-merge-2026-07-21` overlaps
  (`.spw/index.spw`, seed index) — reconciliation happens at their merge, not
  in this branch.

## Dependencies

none (bias-resolution-product already merged to main).

## Failure Modes

- **Hard**: a corpus file parses differently (or fails) once `#:`/`#>` stop
  falling to prose. Guard: parse-all + byte-stable canonicalize sweep in the
  gate; grammar change is additive (directives were unmodeled, not modeled
  differently).
- **Soft**: tools that regexed `#>` (corpus counters, emit) drift from the
  token family — re-point them to the DIRECTIVE token in commit 4/5.
- **Non-negotiable**: no surface syntax changes; renames are concept-level
  (types, function names, docs) only.

## Validation

- **Hypotheses**: every `#:`/`#>` line in the corpus becomes a spanned
  DIRECTIVE node; zero parse or roundtrip regressions.
- **Negative controls**: `#!`, `##`, `~#` behavior unchanged; bias edge suite
  (7 + 10 tests) stays green.
- **Demo**: `spw select .spw/canon-mount.spw --selector anchors` lists anchor
  nodes with spans; `spw mount resolve` flags a dangling `#fragment`; `spw
  expand` projects a single anchored region.

## Spw Artifact

`.spw/registries/directive-lattice.spw` (commit 9): the stance×aim lattice,
occupied cells (with corpus counts), open cells as wonder probes, and the
naming decision.
