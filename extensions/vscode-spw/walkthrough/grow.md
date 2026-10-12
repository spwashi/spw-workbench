**Try**

```sh
spw lint .spw && spw resolve --from .spw
```

**Reads.** In a repository with the workbench mounted, the same moves become files the tools can check.

**Notice.** Nothing here commits. Read the diff, then decide.

**Grow.** Add one page, name it, cite it from .spw/index.spw, and ask one question in it.

**In this workspace.** When `.spw/_workbench` is present, the step's button opens a terminal at the workspace with these commands typed in. Press Enter to run them:

```sh
npm --prefix .spw/_workbench run spw -- lint .spw && npm --prefix .spw/_workbench run spw -- resolve --from .spw
```

Without a mounted workbench, start with the [quick start](https://github.com/spwashi/spw-workbench/blob/main/docs/runtime/md/quick-start.md) or [spw.quest/install](https://spw.quest/install).
