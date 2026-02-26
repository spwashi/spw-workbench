---
description: create a feature branch + worktree for an agent task, with hand-off and archiving conventions
---

# Worktree Task Workflow

Use this when an agent is about to begin a bounded, reviewable unit of work.
The goal is: one branch, one worktree, one PLAN.md + wip.spw, one human review gate.

## Naming Conventions

- **Branch**: `feature/<slug>` (e.g. `feature/split-prism-view`)
- **Worktree dir**: `../wt-<slug>` (sibling of the main repo dir)
- **Plan dir**: `.agents/plans/<slug>/` (contains PLAN.md + wip.spw)
- **Archive ref**: `archive/feature/<slug>` (after merge, before worktree removal)
- **Schema reference**: `.agents/plans/_schema/` (plan.md, wip.spw, wip-template.spw)

## Steps

### 1. Create the branch and worktree

```bash
SLUG=<task-slug>
git worktree add ../wt-$SLUG -b feature/$SLUG
```

### 2. Agentic hygiene: rebase + isolate drift

Before writing PLAN.md or source changes, enforce branch hygiene.

```bash
cd ../wt-$SLUG
git fetch origin
git rebase origin/main
```

If this is a pre-existing feature branch (not freshly created), isolate unrelated drift:

```bash
git diff --name-only origin/main...HEAD -- . ':(exclude).agents/plans/'
```

If unrelated deltas exist, move them to a dedicated hygiene branch before implementation:

```bash
git switch -c feature/$SLUG-agentic-hygiene
# commit hygiene-only refactors here, merge separately
```

### 3. Plan (use `spw-feature-planning` skill)

Create `.agents/plans/<slug>/` with PLAN.md and wip.spw.
Follow the schemas in `.agents/plans/_schema/`.

- PLAN.md — scope, files, commits, taste note
- wip.spw — intent, initial commits, cache
- Optional: `<slug>.spw` distilled artifact

Commit to the feature branch **before touching source files**:
```bash
cd ../wt-$SLUG
git add .agents/plans/$SLUG/
git commit -m ".[plans] &[$SLUG] — initial scope and commit outline"
```

### 4. Develop

The agent works exclusively inside `../wt-$SLUG`.
All commits pass through the commit-review hook (Touch ID gate).

During work:
- Append `>>` entries to `wip.spw ^["stream"]`
- Update `^["cache"]` as state changes
- Log taste observations: `>>[timestamp] taste — <observation>`

### 5. Review

When done, the agent prepares a diff for human review:
```bash
git diff main...feature/$SLUG -- . ':(exclude).agents/plans/'
```

Fill in `wip.spw ^["done"]` section before the final merge commit.
Human authorizes via Touch ID.

Before merge, rebase again to minimize integration noise:
```bash
git fetch origin
git rebase origin/main
```

### 6. Archive

After the feature branch is merged to main:
```bash
# Tag the branch tip as an archive ref
git tag archive/feature/$SLUG feature/$SLUG

# Remove the worktree
git worktree remove ../wt-$SLUG

# Delete the local branch (the archive tag preserves the tip)
git branch -d feature/$SLUG
```

Write a CHANGELOG craft entry sourced from `wip.spw ^["intent"]` + `^["done"]`.

## Multi-agent Parallelism

Multiple agents can work simultaneously — each needs:
- Its own branch, worktree, and plan dir
- Unique slug
- Dependencies documented in PLAN.md `## Dependencies` and wip.spw `^["open"]`
