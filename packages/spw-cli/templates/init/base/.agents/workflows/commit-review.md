# Spw Commit Review

This scaffold installs a portable pre-commit resolver instead of copying repo-bound review tooling directly into the target repo.

The hook looks for a compatible workbench/tool root in this order:

1. `.spw/_workbench`
2. `node_modules/spw-workbench`
3. `SPW_WORKBENCH_ROOT`
4. the runtime that executed `spw init`

When a compatible workbench root is found, the hook delegates to:

```bash
bash <workbench-root>/.agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged
```

The hook also exports:

- `SPW_REPO_ROOT_OVERRIDE` for the target repository being reviewed
- `SPW_TOOL_ROOT_OVERRIDE` for the workbench/tooling root that owns parser and review scripts

Recommended setups:

- Vendor `spw-workbench` under `.spw/_workbench` when this repo treats the workbench as infrastructure.
- Add `spw-workbench` as a local dependency when you want npm-managed interoperability.
- Set `SPW_WORKBENCH_ROOT` when you want one shared checkout to service multiple repos.
