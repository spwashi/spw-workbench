# Plan: syntax-profile-stack

Multi-axis **dialect + syntax profile stack**: useful dialects with examples, path/header detection, parse-time metasyntax, expanded lint, and a runway for refactor hints / autorefactors.

## Goal

Replace fragmented “profile” meanings (review-only path labels, format modes, unused dialect registry) with one **resolvable stack** shared by seed parse, commit-review, format (later), and editors. Enable Spw.l/q newline metasyntax, Spw.m machine lints, and domain dialects (f/p/t) without new OperatorKinds.

**Taste:** axes not soup; header > path > default; archive waived; portable seed.

## Landed (this branch pass)

- `packages/spw-seed/src/dialect/*` — detect, stack, preprocess, machine lint
- `parse()` autoDialect + dialect fields on ParseOutput
- Registries + theory docs with thorough examples
- Syntax-review: plan/flow/query profiles + privacy/comment patterns
- Tests: dialect + parse-dialect

## Scope remaining

- CLI `spw profile --show` / format default from stack
- LSP hover stack + code actions for discouraged forms
- Autorefactor plans via semantic-edit (quoted_frame → `^["id"]`)
- Data-driven path table from `.spw/registries` (optional load)
- Edition pin `@edition:`
- Replace destructive Spw.l/q newline preprocessing with a source-mapped gap projection that retains original coordinates and declares whether cadence or episode collapses to open.
- Carry the resolved `syntax.gap-affinity/1` capability, format-policy revision, and association product identity through stack provenance. Workspace policy may select rendering defaults; it may not silently select grammar.
- Keep parser product requests and event policies as execution/disclosure axes beside the syntax stack, never as dialect aliases.
- Keep distribution bundles as a package axis beside the stack: a lite/lexer/parser/product entry point changes shipped modules, not dialect, association, or parser-profile meaning. A `through` horizon may stop runtime work but does not promise static tree-shaking.
- **Experimental syntax catalog** (reference ids for Spw.f/φ, σ-chain, etc.) — see `shape-syntax-ecology`
- Cache keys: always include `dialect × preprocess` for l/q
- Gestalt token contract stable enough for screenshot/LLM dual-read (with AST ground truth)

## Ecology

Parent: `.agents/plans/shape-syntax-ecology/PLAN.md`  
Peers: curiosity-mutation-ergonomics, refactor-experiment-lifecycle, measure-invariant-generalization, vscode-lsp-roadmap, neovim-spw-surfaces, vscode-cognitive-surface.

Follow-on: `gap-affinity-tooling` owns source-mapped gap classes, association-aware formatting, profile migration receipts, and question-oriented parser products.

Editors consume the stack; they do not define it. A host that cannot yet show which profile won is missing a receipt, not a reason to fork dialect law into client chrome.

Dialects are **product surfaces** (ethos): b literacy · p memory · q/l address · m machine · f flow lab · x hot · t expand. Familiarity curriculum: `b → p → q/l → m → f → x → t`.

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | Open a plans `wip.spw` (path → Spw.p); `parse()` result shows dialect; flip header to `@dialect:Spw.m` and watch machine_lint warnings |
| **Screenshot** | Capture nested `^[]{ .{} }` silhouette with semantic tokens; ask an LLM for brace kinds; verify with AST — never apply vision-only edits |
| **Learning** | Write one file per dialect with the examples in `docs/theory/spw/syntax-profile-stack.spw` |
| **Falsify** | Treating path-default Spw.p as stronger than an explicit `@dialect:Spw.b` header |

## Practical use (tooling)

| Concern | Use of this plan |
|---------|------------------|
| Selectors | Spw.q preprocess + highContext |
| Refactor hints | strict/m discourages quoted_frame → code action |
| Intermediate | stack does not replace σ-chain; points at mutation-flow |
| Bundling | entry points may narrow shipped code; they do not mint performance dialects |
| Memory | p dialect + plan_surface review |
| Tests | dialect.test + parse-dialect; catalog tests next |
| Expand | t dialect; derived-surface skip |
| Reduce/abstract | m + layout format |

## Files

```
[NEW] packages/spw-seed/src/dialect/**
[MOD] packages/spw-seed/src/parser/parse.ts
[MOD] packages/spw-seed/src/parser/output.ts
[MOD] packages/spw-seed/src/types/state.ts
[MOD] packages/spw-seed/src/index.ts
[NEW] docs/theory/spw/syntax-profile-stack.spw
[NEW] .spw/registries/syntax-profile-stack.spw
[MOD] .spw/registries/dialect-spec.spw
[MOD] .agents/skills/spw-commit-review/scripts/spw-syntax-review.ts
[NEW] .agents/plans/syntax-profile-stack/PLAN.md
[NEW] .agents/plans/syntax-profile-stack/wip.spw
```

## Commits (suggested)

1. `vocab[seed] — dialect detect + surface profile stack`
2. `![seed] — parse autoDialect + tests`
3. `.[theory] — syntax-profile-stack + dialect-spec examples`
4. `#[review] — expand syntax-review profiles and patterns`

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7178079bf27a9a062ba1b310d07296f41`
- Hygiene: do not stage accidental `*.d.ts`

## Dependencies

- Soft: shape-syntax-ecology (coordination + exp catalog)
- Soft: refactor-experiment-lifecycle (autorefactor plans)
- Soft: mutation-flow-automata theory (Spw.f)
- Soft: vscode-lsp-roadmap (hover stack)
- Soft follow-on: gap-affinity-tooling (declared gap capability, source maps, format policy, and execution-product axes)

## Validation

- `vitest` dialect + parse-dialect
- `parse('^seed[@profile:Spw.l]…')` sets dialect + preprocess
- review path `.agents/plans/x` → plan_surface
