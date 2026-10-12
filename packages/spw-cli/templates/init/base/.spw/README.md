# Spw Workspace

This `.spw` tree is consumer-owned. `_workbench` is mounted infrastructure: use its machinery, but exclude it from the consumer corpus unless infrastructure is the explicit subject.

## Orient

```bash
npm --prefix .spw/_workbench run spw -- doctor ../..
npm --prefix .spw/_workbench run spw -- roots
npm --prefix .spw/_workbench run spw -- tree @spw --depth 3
npm --prefix .spw/_workbench run spw -- select .spw/index.spw --selector navigable --summary
```

## Grow

`index.spw` ends with a `^["grow"]` frame. Take one move at a time, from the repository root:

1. Add `.spw/notes.spw` holding one line you already keep.
2. Put `#>notes` on its first line.
3. Cite it from `index.spw`: add `@notes: ~"./notes.spw"` to `^"roots"`.
4. Ask one question in it: `?["…"]{ !probe{ "…" } }`.

Verify after each move:

```bash
npm --prefix .spw/_workbench run spw -- lint .spw
npm --prefix .spw/_workbench run spw -- resolve --from .spw
```

`lint` checks annotations and `#>` names; `resolve` checks that every citation reaches its file. Both exit 0 when the tree is sound. `npm --prefix .spw/_workbench run spw -- quest` walks the same moves one line at a time.

Stop before any commit, read the diff.

## Model Prompt

Read this file, `index.spw`, `workspace.spw`, and `mount.spw`. Treat `_workbench` as mounted infrastructure and use `_workbench/.agents/skills/spw-mounted-consumer-review/SKILL.md` as the review protocol. Review one bounded question against consumer-owned files, record both repository revisions, and write portable evidence under `.spw/audits/`.

Working references:

- `_workbench/docs/runtime/md/mounted-workbench.md`
- `_workbench/.spw/conventions/submodule.spw`
- `_workbench/.agents/skills/spw-mounted-consumer-review/SKILL.md`
