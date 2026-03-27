Run a craft quality pass on the specified scope.

Follow the spw-craft-quality skill at `.agents/skills/spw-craft-quality/SKILL.md` and use the checklist at `.agents/skills/spw-craft-quality/references/craft-checklist.md`.

Steps:
1. Identify the smallest scope that pays off (from user input or recent changes)
2. Run `npm run audit` to see existing markers in scope
3. Check the craft dimensions:
   - **Naming clarity** — do names reveal intent and fit existing vocabulary?
   - **File size** — target <400 lines, flag >600
   - **Import hygiene** — no file should import >12 distinct modules
   - **Layer discipline** — imports flow inward only
   - **Concept count** — each file has one reason to change
   - **Containment** — who owns width/height/scroll?
   - **Axis attribution** — can a reader identify which deformation axis shaped each constant?
4. Make focused changes that remove root causes
5. Run verification: `bash .agents/skills/spw-craft-quality/scripts/craft-check.sh`

User input: $ARGUMENTS
