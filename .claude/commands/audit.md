Run codebase audits. Choose the appropriate audit based on user input or run the full audit.

Available audits:
- `npm run audit` — all @spw: markers (debt, async, types, ui)
- `npm run audit:full` — comprehensive codebase audit
- `npm run audit:spw:syntax` — .spw syntax validation
- `npm run audit:debt` — technical debt markers
- `npm run audit:types` — type-related markers
- `npm run lint:spw` — parse-validate all .spw files
- `npm run lint:docs` — verify .spw path references
- `npm run fuzz:ship` — build + full test suite (ship gate)

If the user specifies a target (e.g., "types", "syntax", "debt", "full"), run that specific audit. Otherwise run `npm run audit:full`.

Report findings concisely: count of issues by category, and actionable items.

User input: $ARGUMENTS
