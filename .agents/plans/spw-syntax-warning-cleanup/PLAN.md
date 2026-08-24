# Plan: spw-syntax-warning-cleanup

Eliminate source-corpus syntax warnings by repairing parser ownership where the canon establishes a stable form and revising isolated stale spellings where it does not.

## Goal

`npm run lint:spw -- --strict` should pass without suppressing prose-degradation evidence. The parser should recognize file-level dialect authority, sigil binding keys, and the established indented `key: |` block-scalar form while preserving explicit prose fallback for genuinely mixed or malformed documents.

Taste note: improve correctness and readability together—structured-looking source must produce structure, while prose should stay visibly prose rather than being accidentally tokenized as a partial program.

## Scope

- **In scope**: header-scoped dialect detection; `#name:` / `?name:` binding lookahead; indentation-bounded block scalars; warning-by-warning corpus normalization; machine-frame spelling; derived-session exclusion; a documented syntax-boundary census; focused parser tests and strict corpus verification.
- **Out of scope**: inventing unrelated syntax, removing prose fallback, changing operator semantics, interpreting Markdown as structured Spw, or rewriting archival version libraries beyond the precise warning site.

## Files

```text
[NEW] .agents/plans/spw-syntax-warning-cleanup/FIX.md
[NEW] .agents/plans/spw-syntax-warning-cleanup/PLAN.md
[NEW] .agents/plans/spw-syntax-warning-cleanup/wip.spw

[MOD] packages/spw-seed/src/dialect/detect.ts
[MOD] packages/spw-seed/src/dialect/dialect.test.ts
[NEW] packages/spw-seed/src/grammar/block-scalar.ts
[NEW] packages/spw-seed/src/grammar/block-scalar.test.ts
[MOD] packages/spw-seed/src/grammar/expressions.ts
[MOD] packages/spw-seed/src/grammar/separators.test.ts
[MOD] packages/spw-seed/src/types/ast/nodes.ts
[NEW] packages/spw-seed/src/derived-surface.test.ts
[MOD?] scripts/analyzers/spw-syntax-validate.ts
[MOD] scripts/spw-lib.sh
[MOD?] warning-bearing `.spw` surfaces named by the strict validator
[MOD] docs/runtime/md/spacing-and-progressive-inspection.md
[MOD] .agents/plans/gap-affinity-tooling/{PLAN.md,wip.spw}
[MOD] .agents/plans/shape-syntax-ecology/{PLAN.md,wip.spw}
```

### Craft guard

- `expressions.ts` is already about 900 lines; block-scalar scanning belongs in a new single-purpose grammar module and adds only routing to the term choice.
- The new parser stays below 200 lines and below 8 imports.
- Reuse `ProseChunkNode` as the value term so normalizers and query tooling retain a known leaf type; do not introduce an AST variant without a consumer need.
- Indentation determines the scalar boundary. The parser must stop before a sibling key or enclosing close and must never consume beyond its body.

## Commits

1. `.[plans] — classify Spw syntax warning roots`
2. `![spw-seed] — constrain dialect and binding lookahead`
3. `&[spw-seed] — parse indentation-bounded block scalars`
4. `![spw-seed] — keep operator suffixes on their line`
5. `.[spw-corpus] — align active surfaces with parser contracts`
6. `.[spw-corpus] — distinguish prose from structured conventions`
7. `.[spw-exhibits] — separate notation from execution`
8. `.[docs,plans] — record syntax-boundary opportunities`
9. `![spw-lint] — prove a warning-free source corpus`

## Agentic Hygiene

- Rebase target: `main@f01a1d4ce5f654cd874b5ccfcdf1a6692a5ab3f3`
- Rebase cadence: before commit 1 and before merge
- Hygiene split: none; the branch was created clean from main. Parser repairs begun under `FIX.md` precede the block-scalar sub-feature plan; no block-scalar source was written before this plan.

## Dependencies

- Existing prose-degradation diagnostics in `packages/spw-seed/src/grammar/seed.ts`.
- Existing `ProseChunkNode` normalization and source-span infrastructure.

## Failure Modes

- **Hard**: a scalar consumes a sibling frame, key, or enclosing brace.
- **Hard**: an indented example changes the file dialect.
- **Soft**: a stale surface is quoted but loses meaningful operator spelling in its example.
- **Non-negotiable**: warning removal may not come from globally suppressing `prose-degradation`.

## Validation

- **Hypotheses**: all committed source surfaces parse without warnings; block scalar text and span remain stable; zero-warning validation excludes only declared derived planes; notation examples remain recognizable without acquiring runtime authority.
- **Negative controls**: explicit column-zero pragmas still win; `^seed` profiles still win over path defaults; inline prose and malformed expressions still degrade visibly; standard parsers and normalizers retain behavior.
- **Demo sequence**: parse a canonical frame containing two `key: |` values followed by a sibling key and frame; inspect the AST; run strict corpus lint.

## Fuzz Strategy

- Explore: focused dialect, binding, and block-scalar unit tests with empty lines, comments, nested-looking text, sibling keys, and closing delimiters.
- Stabilize: `npm run test:seed`, `npm run fuzz:stabilize`.
- Ship: `npm run lint:spw -- --strict`, `npm run build`, full relevant tests, and strict staged commit review.

## Spw Artifact

None beyond `wip.spw`; the parser contract is most truthfully expressed by the grammar, focused tests, and warning-free corpus.
