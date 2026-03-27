Create a feature branch and worktree for a bounded agent task.

Follow the worktree-task workflow at `.agents/workflows/worktree-task.md`.

Steps:
1. Choose a `<slug>` from user input (lowercase, hyphenated, ≤5 words)
2. Create the branch and worktree:
   ```bash
   git worktree add ../wt-<slug> -b feature/<slug>
   ```
3. Rebase on origin/main for hygiene
4. Use `/plan` to create `.agents/plans/<slug>/PLAN.md` and `wip.spw`
5. Commit plan artifacts before touching source files

Naming conventions:
- Branch: `feature/<slug>`
- Worktree: `../wt-<slug>`
- Plan: `.agents/plans/<slug>/`

After merge, archive with:
```bash
git tag archive/feature/<slug> feature/<slug>
git worktree remove ../wt-<slug>
git branch -d feature/<slug>
```

User input: $ARGUMENTS
