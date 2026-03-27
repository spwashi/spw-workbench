Stage and commit changes following project commit conventions.

Reference: `.agents/workflows/commit-review.md` and `.agents/skills/spw-commit-review/SKILL.md`

## Conventions

Commit subjects use Spw sigil prefixes:
- `.[scope]` — documentation / .spw surface updates
- `&[scope]` — integrate, merge, restructure
- `vocab[scope]` — type / naming refactor
- `![scope]` — test / verify
- `^seed[scope]` — new seed or probe
- `#[scope]` — new spec or config

Commit bodies must include exactly one `#[episode]{}` block:
```
#[episode]{ ~[scene]{ "context" } ![change]{ description } *[verify]{ what was checked } }
```

## Steps

1. Run `git status` and `git diff --stat` to understand changes
2. Review recent `git log --oneline -5` for message style continuity
3. Choose the appropriate sigil based on the nature of the changes
4. Stage specific files (prefer explicit `git add <files>` over `git add -A`)
5. Craft the commit message with sigil prefix and episode block
6. Run `git commit` — the pre-commit hook will prompt for Touch ID authorization
7. Verify with `git status` after commit

## Guards
- Never commit files containing secrets (.env, credentials)
- No absolute user paths (`/Users/`, etc.) in commit messages
- Privacy enforcement is automatic via the commit-msg hook

User input: $ARGUMENTS
