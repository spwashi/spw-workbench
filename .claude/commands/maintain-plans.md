Run the spw-plan-maintenance skill to sweep the plan ecology.

Read `.agents/skills/spw-plan-maintenance/SKILL.md` for the full procedure.

Start with `npm run spw:plan:index -- --check` — it names every card problem and whether `.agents/plans/index.spw` is stale.

Follow the 7-step workflow:
1. Detect staleness (rebase targets, file paths, status mismatches, open questions, card phase drift)
2. Refresh cards and caches in wip.spw files, then `npm run spw:plan:index -- --write`
3. Propagate cross-references for any new artifacts
4. Update streams where context has changed
5. Resolve open questions that have been answered
6. Verify artifact registration (`npm run lint:spw`)
7. Assess ecology health

Report what was stale and what was updated. Keep changes minimal — refresh caches and add cross-references, don't rewrite plans.

If the user provides a scope (e.g., "just the vscode plans" or "after the literate-ui commit"), narrow the sweep accordingly.
