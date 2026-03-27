Plan a fix for failing tests or regressions before writing any code.

Follow the spw-fix-planning skill at `.agents/skills/spw-fix-planning/SKILL.md`.

Steps:
1. Collect evidence — run the failing suite, capture error messages, file:line, pass/fail counts
2. Classify each failure (stale-spec, missing-impl, regression, env, type-drift, ui-visual, ui-interaction, axis-collapse)
3. Triage priority (P0–P3)
4. Predict fix scope — files, ripple risk, confidence
5. Draft fix commits using project sigil conventions
6. Write `.agents/plans/<slug>/FIX.md` if more than 3 failures
7. Execute fixes, verify with `tsc --noEmit` + relevant tests after each commit
8. Run scoped fuzz profile matching the failure class

User input: $ARGUMENTS
