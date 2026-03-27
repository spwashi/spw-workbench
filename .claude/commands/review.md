Run the commit review polling loop to check code health before committing.

Reference: `.agents/skills/spw-commit-review/SKILL.md`

Run the appropriate poll scope based on context:

```bash
# Default: check changed files
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed

# Pre-commit: check staged files
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged
```

Interpret results:
- `⛔` errors — layer violations, parser failures — fix before committing
- `⚠` warnings — golden snapshots, discouraged syntax — acknowledge or fix
- `○` advisories — historical forms waived by profile — informational
- `✓` clean — no active syntax mismatch

If the user specified "staged" or is about to commit, use `--scope=staged`. Otherwise default to `--scope=changed`.

User input: $ARGUMENTS
