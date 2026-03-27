Plan a feature before writing any code.

Follow the spw-feature-planning skill at `.agents/skills/spw-feature-planning/SKILL.md`.

Use the plan schema at `.agents/plans/_schema/plan.md` and wip template at `.agents/plans/_schema/wip-template.spw`.

Steps:
1. Understand the task scope from user input
2. Choose a `<slug>` (lowercase, hyphenated, ≤5 words)
3. Record agentic hygiene baseline (base SHA, rebase state)
4. Create `.agents/plans/<slug>/wip.spw` from the template
5. Predict affected files with change types ([NEW], [MOD], [DEL], [MOD?])
6. Draft commit sequence using project sigil conventions
7. Assess design taste (naming, layering, containment, axis attribution)
8. Write `.agents/plans/<slug>/PLAN.md` following the schema
9. Commit plan artifacts before touching source files

User input: $ARGUMENTS
