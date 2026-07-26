# Plan: seed-roundness-grades

Close the gap between code and docs on effect-grade naming, and bring several partially-implemented Spw parser/canonical concepts (n-range, label differentials, range-address/span-transform, indexing configurability) to full roundness.

## Goal

`packages/spw-seed/src/canonical/differential.ts` already defines `EffectGrade` as `effect.l0.measure` → `effect.l3.external`, but the living docs (`docs/theory/spw/*.spw` and neighbors) still describe the same concept as `S0`–`S3` shorthand. The former E0–E2 axis has since been resolved as non-ordinal evidence provenance owned by `spw-q-stabilization`. Separately, several AST concepts are only partially round: `NRangeNode` and `BodyNode` are real, parsed AST types, but `differential.ts`'s label/rule-conflict handling, the range-address/span-transform described in `docs/theory/spw/range-transform.spw`, and query-engine indexing configurability are all either incomplete or undocumented as code.

**Taste note**: this plan is about *naming consistency and correctness* — retiring stale shorthand now that the code has already moved on, and finishing partial implementations rather than letting "conceptual" markers (e.g. `form-ladders.ts:379`'s multi-arm fold) linger indefinitely without a decision either way.

The user's original request also named four genuinely new grammar features (named params, multi-arm selects, stream folds, new operator products) and an AST-level promotion of `membrane` (currently a descriptive-layer-only concept). None of these have any AST, lexer, or grammar presence today. They are **deliberately out of scope for this branch** — see `## Scope` and `^["open"]` in `wip.spw`.

## Scope

- **In scope**:
  - Rename `S0`–`S3` shorthand to `effect.l0.measure`…`effect.l3.external` across the **living** spec surface only (docs/theory, docs/design, docs/audits, `.spw/conventions`, `prompts/`, `spw-semantics-rigor` SKILL.md).
  - Harden `differential.ts`'s label/rule-conflict handling for overlapping `SourceEdit`s ("label differential management").
  - Implement the range-address + span-transform described in `docs/theory/spw/range-transform.spw` as real code (currently spec-only).
  - Close roundness gaps in `NRangeNode` parsing (e.g. the empty-n-range special case already flagged in `normalize.ts:371`).
  - Add configurable indexing handles to the query engine (`query/selector-expr.ts` / `query/match.ts`), with the perf/impl tradeoff documented alongside the existing effect-grade docs.
- **Out of scope** (tracked as open questions, not attempted here):
  - Migrating the former `E0`–`E2` axis; this is now owned by `spw-q-stabilization` as evidence basis/domain/role/provenance.
  - Promoting `membrane` from its current descriptive-layer-only role (`form-ladders.ts`, `form-geometry.ts`, `form-sequence.ts`) to a first-class AST node coupled with `BodyNode` — needs a design decision (`?[membrane-body-shape]`).
  - Net-new grammar: named params, multi-arm selects (`fold ?(a,b,c)` is explicitly tagged `stage: 'conceptual'` in `form-ladders.ts:379`, i.e. documented-but-unbuilt), stream folds, and "new operator products" — each is a from-scratch lexer→grammar→AST design, not a roundness pass, and deserves its own plan once scoped concretely (`?[operator-products-scope]`).
  - Any code scaffolding for "temporal/subtree linguistics" runtime readiness beyond a docs note — depth undecided (`?[temporal-subtree-depth]`).
  - Editing S0-S3/E0-E2 text inside **historical** `.agents/plans/*/{wip.spw,PLAN.md,*.spw}` artifacts (form-geometry-editor, operational-topography, vscode-register-explorer, spw-garden-geometry, lsp-custom-request-completions, vscode-authoring-probe-loop, vscode-lsp-roadmap) — these are timestamped records of what was actually written at decision time; renaming them retroactively falsifies episode history the same way editing a merged commit body would.

## Files

```
[MOD] docs/theory/spw/operational-topography.spw   — S0/S1/S2 definitions → effect.l0-l3
[MOD] docs/theory/spw/range-transform.spw           — S0-S2 refs → effect.l*; add real implementation pointer once commit 3 lands
[MOD] docs/theory/spw/coupling-constructors.spw     — S1-S3 refs
[MOD] docs/theory/spw/dimensional-axes.spw          — S0-S2 refs (leave E0-E2 in place, unresolved)
[MOD] docs/theory/spw/form-geometry.spw             — S1 refs
[MOD] docs/theory/spw/operational-devices.spw       — S0-S3 refs (leave E0-E2 in place)
[MOD] docs/theory/spw/operational-transform.spw     — S0/S1 refs
[MOD] docs/design/md/goals.md                       — S-grade refs (verify content before editing)
[MOD] docs/audits/md/ux-dimensions-audit-2026-02-15.md — S-grade refs (verify content before editing)
[MOD] .spw/conventions/file-physics.spw             — S-grade refs
[MOD] prompts/domains/publishing/propagate.spw       — S-grade refs
[MOD] prompts/domains/publishing/templates/style.spw — S-grade refs
[MOD] prompts/script-ecology.spw                     — S-grade refs
[MOD] .agents/skills/spw-semantics-rigor/SKILL.md   — S-grade refs
[MOD] packages/spw-seed/src/canonical/differential.ts — label/rule-conflict handling for overlapping SourceEdits
[NEW] packages/spw-seed/src/canonical/differential.test.ts — tests for the above (none exist today)
[NEW?] packages/spw-seed/src/canonical/range-address.ts — real range-address/span-transform impl (name TBD; may live in an existing file instead — decide during commit 3)
[MOD] packages/spw-seed/src/normalize.ts             — close empty-n-range gap flagged at line 371
[MOD?] packages/spw-seed/src/grammar/containers.ts    — only if NRange grammar itself needs a fix, not just normalize
[MOD] packages/spw-seed/src/query/selector-expr.ts    — indexing configurability handle
[MOD?] packages/spw-seed/src/query/match.ts           — only if index consumption needs to move here too
[MOD] docs/theory/spw/operational-topography.spw     — document the indexing perf/impl tradeoff (same file as above; one section added)
```

### Craft guard

`differential.ts` is currently 296 lines with a focused single responsibility (source differentials); adding label-conflict handling should stay well under 400. `range-address.ts` is new — keep it to one concern (address resolution + span transform), not a dumping ground for other range-transform doc content. No file in this plan is near the 600-line/12-import guard today; re-check after commit 3 and 5 land since those are the only two touching genuinely new logic.

## Commits

```
1. .[theory,prompts] — rename S0-S3 shorthand to effect.l0.measure..l3.external across living docs only
2. ^seed[differential] — explicit label/ruleId conflict handling for overlapping SourceEdit differentials; tests
3. ^seed[range-transform] — implement range-address + span-transform per docs/theory/spw/range-transform.spw; tests
4. ^seed[n-range] — close NRangeNode parser/normalize gaps (empty n-range, source spans); tests
5. #[query] — configurable indexing handles on the query engine; document perf tradeoff
6. .[plans] — close seed-roundness-grades; retrospective + follow-up plan slugs for track B
```

The canonical running version lives in `wip.spw`.

**Fuzz strategy**:
- Explore loop: `npm run fuzz:explore --target=seed` while iterating on commits 2-5 (if `fuzz:explore` script exists; else `npm run test:seed -- --watch`)
- Stabilize loop: `npm run fuzz:stabilize` before each commit lands (types + runtime tests)
- Ship gate: `npm run fuzz:ship` before commit 6

## Agentic Hygiene

- Rebase target: `main@d852b1aa`
- Rebase cadence: before commit 1 (already clean at plan time; re-check before merge if this branch runs long)
- Hygiene split: none — working tree was clean at plan time, no unrelated drift detected
- Staged directly on `main`, matching recent plan convention (`bab81e15 .[plans] =stage[form-geometry-editor]`) rather than a dedicated `feature/*` branch, since no branch divergence exists to isolate

## Dependencies

None. This plan is self-contained; track B (deferred net-new grammar + membrane/epistemic-grade renaming) will become one or more follow-up plans once the open questions in `wip.spw` are resolved with the user.

## Failure Modes

- **Hard**: An incomplete S0-S3 grep sweep leaves stale references in a doc this plan claims to have finished — mitigated by the grep-verify validation step per commit, not just at the end.
- **Hard**: Changing `SourceEdit`/`NRangeNode` shape breaks `canonicalize`/`mutation-automata` consumers that already depend on today's shape — mitigated by running `test:seed` after every commit in commits 2-4, not just at the end.
- **Soft**: `range-address.ts`'s exact location/name may need to change once the range-transform doc's actual algebra is worked out in commit 3 — acceptable, flagged `[NEW?]` above.
- **Non-negotiable**: `EFFECT_GRADE_ORDER`'s numeric ordering (0/1/2/3) must not change during the rename — it's a pure text/doc substitution, no behavior change.
- **Non-negotiable**: no edits to historical `.agents/plans/*` artifacts under this plan.

## Validation

- **Hypotheses**: `grep -rl "\bS0\b\|\bS1\b\|\bS2\b\|\bS3\b"` across the living-doc file list above returns zero hits after commit 1 (E0-E2 hits in the same files are expected to remain — different, unresolved axis).
- **Negative controls**: `npm run test:seed` passes unchanged after commits 2-4; no behavior change bundled into commit 1.
- **Demo sequence**: `spw query --from docs/theory --expr '$~"S0"'` (or equivalent skim/select) returns no hits in the renamed files post-commit-1.

## Spw Artifact

`.agents/plans/seed-roundness-grades/seed-roundness-grades.spw` — distills the two-track split (roundness-on-existing-AST vs. net-new-grammar) and the effect-grade/epistemic-grade naming state, since this is a recurring point of confusion (two parallel grade axes, one renamed in code and not docs, one not renamed anywhere) worth preserving beyond this branch's procedural memory.
