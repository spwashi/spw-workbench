# Repository Guidelines (Rewrite Canon)

## Intent
This repo is the canon rewrite: episodes-only history, curated surfaces, promptable exhibits.

Principles:
- Spw is the evolution force.
- Boonhonk is the field of wonder.
- Prefer exhibits, claims, and instruments over refactor churn.

## Structure (seed)
- `src/seed/` is the .spw kernel (lexer/parser/types). Keep it portable.
- `lib/spw-v0.3.0/` is the spec library path (v0.2.0-alpha retained as archival reference).
- `docs/` is the canon narrative surface.

## Commit Protocol
- Commit bodies include exactly one `#[episode]{ ... }` block.
- The pre-commit gate requires human authorization.
