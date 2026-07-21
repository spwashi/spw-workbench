# Spw Workspace

This `.spw` tree is consumer-owned. `_workbench` is mounted infrastructure: use its machinery, but exclude it from the consumer corpus unless infrastructure is the explicit subject.

## Orient

```bash
npm --prefix .spw/_workbench run spw -- doctor ../..
npm --prefix .spw/_workbench run spw -- roots
npm --prefix .spw/_workbench run spw -- tree @spw --depth 3
npm --prefix .spw/_workbench run spw -- select .spw/index.spw --selector navigable --summary
```

## Model Prompt

Read this file, `index.spw`, `workspace.spw`, and `mount.spw`. Treat `_workbench` as mounted infrastructure and use `_workbench/.agents/skills/spw-mounted-consumer-review/SKILL.md` as the review protocol. Review one bounded question against consumer-owned files, record both repository revisions, and write portable evidence under `.spw/audits/`.

Working references:

- `_workbench/docs/runtime/md/mounted-workbench.md`
- `_workbench/.spw/conventions/submodule.spw`
- `_workbench/.agents/skills/spw-mounted-consumer-review/SKILL.md`
