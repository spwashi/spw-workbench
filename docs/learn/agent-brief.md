# Agent brief — learnability + tooling

Short contract for coding agents working this repo.

## Prefer (in order)

1. **Read** — `spw skim`, `spw invent`, `spw map`, `spw formula --catalog`
2. **Measure** — `spw pulse --check`, `spw analyze`, tests
3. **Plan** — `.agents/plans/<slug>/` before multi-file edits
4. **Mutate** — only after plan; effect ceilings `l1.memory` → explicit `l2.workspace`
5. **Commit** — human Touch ID gate; episode block; no absolute user paths

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
