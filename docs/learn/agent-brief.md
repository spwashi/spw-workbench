# Agent brief — learnability + tooling

Short contract for coding agents working this repo.

## Prefer (in order)

1. **Read** — `spw skim`, `spw invent`, `spw map`, `spw formula --catalog`
2. **Measure** — `spw pulse --check`, `spw analyze`, tests
3. **Plan** — `.agents/plans/<slug>/` before multi-file edits
4. **Mutate** — only after plan; effect ceilings `l1.memory` → explicit `l2.workspace`
5. **Commit** — human Touch ID gate; episode block; no absolute user paths

## Onboard a repository

From the consumer repository root: mount the workbench with `git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench`, install it with `npm --prefix .spw/_workbench install`, scaffold with `npm --prefix .spw/_workbench run spw:init -- ../..`, and check readiness with `npm --prefix .spw/_workbench run spw:doctor -- ../..`. Then grow once: take one move from the `^["grow"]` frame in `.spw/index.spw` (add a page, name it with `#>`, cite it from `index.spw`, or ask one question with a `!probe` in it), and confirm it with `npm --prefix .spw/_workbench run spw -- quest --check grow`, which runs `lint .spw` and `resolve --from .spw` and exits 0 when both pass. `quest --check <step> "<line>"` checks any single line the same way. Stop before any commit; leave the diff for a person to read.

To give a consumer room to play, scaffold with `--preset quest`: it adds `.spw/quest/` (forks, experiments, shelves, wonders, asks). Extend it the same way, one move at a time, and keep any request for the workbench in `.spw/quest/asks.spw` in its slot order: rank, claim, exists, gap, measured, recommendation, replaces, probe, question.

## Sense loop (corpus)

```text
invent → map → formula → analyze → query/skim → (pulse dry)
```

Docs: `docs/runtime/md/sense-loop.md`

## Form vs mutation

| Concern | Tool |
|---------|------|
| Wrap / label / reduce notation | form sequences, LSP `spw/formSequence`, snippets |
| Template fill | `spw emit expand` / holes (`#expand`) |
| Source rewrite | mutation automata / pulse / mutate |

Law: **expand ≠ mutate**.

## Editors

- Thin clients: VS Code / Neovim / IntelliJ  
- Semantic truth: `packages/spw-lsp`  
- Custom methods table: `docs/runtime/md/lsp-editor-integration.md`

## Refuse

- Claiming prose `#` comments execute as runtime Acts  
- Treating invent/map JSON as genotype source of truth  
- Force-push, wipe dumps, or `l2.workspace` without user accept  
- Absolute `/Users/...` paths in commits or episodes  
- Implementing exploits / attacking systems  

## Verify (minimum)

```bash
# Scoped to what you touched, e.g.:
npx vitest run --config vitest.seed.config.ts   # seed
npx vitest run --config vitest.lsp.config.ts    # lsp
npx vitest run --config vitest.runtime.config.ts # runtime
npm run spw -- invent docs/examples --role hub -n 3
```

## Learnability artifacts to update when shipping tools

If you add a CLI command or `spw/*` method, update **at least one** of:

- `docs/learn/cheat-sheet.md`
- `docs/learn/worked-cli.md` or `sense-loop.md`
- `docs/runtime/md/lsp-editor-integration.md` (for LSP)

…and link it from `docs/learn/index.spw`.
