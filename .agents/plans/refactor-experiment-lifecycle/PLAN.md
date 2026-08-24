# Plan: refactor-experiment-lifecycle

Enable **codebase-wide selection and refactoring as experiments**: revisioned selection → semantic plan as data → intermediate surfaces (JSON, Spw patch, emit brief) → hash-gated apply (worktree or workspace) → verify → git episode — without inventing a second rewrite engine.

## Goal

Selection (`query`/`select`), semantic edits (`semantic-edit.ts`), corpus rename (`spw refactor`), bias patches (`mutate --bias`), multi-file mutate, and LSP rename all exist, but they do not share a **durable experiment lifecycle**. Agents and humans cannot safely:

- freeze a multi-file selection with content hashes,
- iterate a plan without touching the tree,
- project the same plan to JSON / Spw intermediate / PR prose / editor multi-diff,
- apply in a git worktree first,
- rebase when the corpus drifts,
- record what happened with plan id in an episode commit.

**End state:** `spw.refactor.plan/1` is the spine. Front-ends (CLI, LSP, VS Code, Neovim, curiosity invitations) compile into it or apply from it. Intermediate surfaces and VCS are projections and durability layers of that spine.

**Taste note:** correctness (hash-gated apply), reversibility (worktree l1), layering (seed plan kernel; CLI I/O; git at the edge), expressiveness (Spw bias/experiment surfaces as human patch language).

The landed editor-instrument baseline previews the current one-shot `spw refactor` JSON plan from VS Code, IntelliJ/WebStorm, and Neovim without `--write`. It is a safe bridge, not a claim that `spw.refactor.plan/1`, selection hashes, rebase, or worktree apply have landed.

## Ecology

Parent: `.agents/plans/shape-syntax-ecology/PLAN.md`.  
Shares **σ intermediate grammar** with mutation-flow (`~` plan · `%` check · `*` mem/worktree · `^` seal).  
Selection dialect: **Spw.q**; machine renames: **Spw.m**; experiment memory: **Spw.p** + gen/ paths.  
Cache/selection hashes must include dialect+preprocess when l/q snippets participate.

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | Dry-run mental model: select prompts → plan mark rename → check after one edit → expect stale refuse |
| **Screenshot** | Show dual `<>` before/after or plan.json summary; ask model for blast radius; verify file list against selection hashes |
| **Learning** | Conciseness via q/l for select; full b for patch.spw human review |
| **Falsify** | Applying multi-file write without plan id; treating git line-diff as semantic plan |

## Practical use

| Concern | Hook |
|---------|------|
| Selectors | frozen corpus + SpwPattern |
| Intermediate | plan.json, patch.spw, receipt, worktree |
| Memory | gen/experiments; Spw-Plan trailer; not hot registers |
| Tests | stale hash, conflict withhold, oneshot compat |
| Expand | orthogonal (t); do not expand into selection by default |
| Abstract/reduce | plan summary strata counts |
| Autorefactor | quoted_frame etc. compile to SemanticRule via syntax-profile hints |

## Scope

### In scope

- **Selection corpus** — roots, globs, excludes, optional selector; emit `{ uri, revision?, contentHash }[]`
- **Plan document** — `spw.refactor.plan/1` with rules, edits, conflicts, effectCeiling, parent_plan, selection hash
- **CLI lifecycle** — `plan` / `check` / `apply` / `rebase` (or subcommands under `spw refactor`)
- **Envelope alignment** — plan and receipts through `spw.cli.envelope` where structured
- **Intermediate projections** — plan.json; optional `.spw` experiment/patch surface; emit brief hook
- **Apply modes** — workspace l2 (hash-gated); **worktree l1** apply without dirtying main
- **Verify hooks** — re-query, pulse health sample, mass/authority optional
- **Git integration** — worktree create/path; episode commit helper with `Spw-Plan:` trailer; no absolute paths
- **Canary / sample** — apply first N files or one root before full corpus
- Design hooks for LSP WorkspaceEdit from plan (implementation may follow editor plans)

### Out of scope

- New OperatorKinds
- Replacing pulse single-file atomic write semantics
- Full OT engine beyond plan rebase + conflict report
- Auto-commit on every pulse
- Curiosity invitation generation (compose with `curiosity-mutation-ergonomics`)
- Form mobility rule authoring (compose with `form-geometry-editor`)

## Lifecycle

```
select → plan → materialize intermediate → review → apply → verify → record
```

| Stage | Effect | Artifact |
|-------|--------|----------|
| select | l0 | selection.json |
| plan | l0 | plan.json / patch.spw |
| check | l0 | ok / conflicts / stale hashes |
| apply --worktree | **l1 worktree** | worktree tree + receipt |
| apply --workspace | l2 | working tree + receipt |
| verify | l0 | report |
| record | git | episode commit |

## Files

```text
[NEW] .agents/plans/refactor-experiment-lifecycle/PLAN.md
[NEW] .agents/plans/refactor-experiment-lifecycle/wip.spw
[NEW] .agents/plans/refactor-experiment-lifecycle/refactor-experiment-lifecycle.spw

[NEW] packages/spw-seed/src/canonical/refactor-plan.ts       plan types, hash, compose, check
[NEW] packages/spw-seed/src/canonical/refactor-plan.test.ts
[MOD] packages/spw-seed/src/canonical/semantic-edit.ts       export helpers plan needs (thin)
[MOD] packages/spw-seed/src/canonical/index.ts
[MOD] packages/spw-seed/src/index.ts

[MOD] packages/spw-cli/src/refactor.ts                       plan/check/apply/rebase subcommands
[NEW] packages/spw-cli/src/refactor-selection.ts             corpus + hashes
[NEW] packages/spw-cli/src/refactor-worktree.ts              git worktree apply helper
[MOD] packages/spw-cli/src/envelope.ts                       plan/receipt data shapes if needed
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/bias-apply.ts                     compile bias surface → rules (thin glue)

[NEW] schemas/spw-refactor-plan.v1.schema.json               [MOD?] if schemas dir pattern exists
[MOD] docs/runtime/md/pulse-mutate-beat.md                   experiment vs pulse/mutate matrix
[NEW] docs/runtime/md/refactor-experiment.md
[MOD?] .spw/conventions/cli.spw
[MOD?] .spw/gen/ — document experiments/ layout (gitignore policy)

[MOD?] packages/spw-lsp/src/handlers/editing.ts              WorkspaceEdit from plan (later)
[REF] packages/spw-seed/src/canonical/semantic-edit.ts
[REF] packages/spw-cli/src/query.ts
[REF] .agents/plans/curiosity-mutation-ergonomics/PLAN.md
```

### Craft guard

- Keep `refactor.ts` from becoming a kitchen sink — selection / worktree / plan IO as modules
- `semantic-edit.ts` stays the edit algebra; plan module owns persistence shape
- No absolute user paths in plans or commits

## Commits

1. `.[refactor] — plan refactor-experiment-lifecycle artifacts`
2. `vocab[seed] — spw.refactor.plan/1 types, hash, check`
3. `![seed] — refactor-plan tests (stale hash, conflict, compose)`
4. `#[cli] — selection corpus + plan/check from semantic rules`
5. `&[cli] — hash-gated apply workspace + receipt envelope`
6. `^[cli] — worktree apply (l1) + episode commit helper`
7. `#[cli] — bias/experiment surface → plan compile`
8. `.[docs] — refactor-experiment + pulse-mutate matrix`
9. `#[lsp]? — WorkspaceEdit from plan (optional follow-on)`

## Fuzz strategy

- Explore: plan on small fixture corpus; stale hash refuse
- Stabilize: `test:seed` + CLI dry-run on `prompts` subset
- Ship: no default multi-file write in CI; worktree tests if git available

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7178079bf27a9a062ba1b310d07296f41`
- Rebase cadence: before commit 1 on feature branch, before merge
- Hygiene split: plan-only commits separate from implementation; no `*.d.ts` noise

## Dependencies

- Hard: `semantic-edit` + existing `spw refactor` (extend, don’t replace)
- Soft: `curiosity-mutation-ergonomics` (candidates → plan)
- Soft: `form-geometry-editor` (mobility rules → edits)
- Soft: `measure-invariant-generalization` (verify after apply)
- Soft: `vscode-lsp-roadmap` / neovim (editor multi-diff later)

## Failure Modes

- **Hard:** apply with stale contentHash → refuse
- **Hard:** overlapping edits without conflict report → withhold
- **Hard:** worktree path escapes repo policy → refuse
- **Soft:** gen/ experiments accumulate junk → retention policy
- **Non-negotiable:** plan-first default; no absolute paths; effect grades

## Validation

### Hypotheses

1. Hash-gated apply prevents silent half-applies after concurrent edits
2. Worktree path raises experiment throughput without main dirtiness
3. Spw intermediate patch surface increases human review of multi-file renames
4. Same plan id appears in JSON, receipt, and git trailer

### Negative controls

- Existing `spw refactor --write` one-shot still works (compat)
- Pulse single-file atomic write unchanged
- Query selectors unchanged

### Demo

1. Select `prompts/**/*.spw` with hashes  
2. Plan mark rename → plan.json  
3. Check after touching one file → stale  
4. Replan / rebase  
5. Apply --worktree → test  
6. Apply --workspace + episode commit with Spw-Plan trailer  

## Spw Artifact

```
.agents/plans/refactor-experiment-lifecycle/refactor-experiment-lifecycle.spw
```
