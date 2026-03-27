# Repository Guidelines (Rewrite Canon)

## Intent

This repo is the canon rewrite: episodes-only history, curated surfaces, promptable exhibits.

Principles:
- Spw is the evolution force.
- Boonhonk is the field of wonder.
- Prefer exhibits, claims, and instruments over refactor churn.

## Structure

### Packages (monorepo)
- `packages/spw-seed/` — parser kernel (lexer/parser/types). Keep it portable.
- `packages/spw-runtime/` — interpreter and substrate-driven event system.
- `packages/spw-lsp/` — Language Server Protocol implementation.
- `packages/spw-cli/` — CLI (`spw` binary).

### Legacy source (consolidating into packages/)
- `src/seed/` → `packages/spw-seed/`
- `src/runtime/` → `packages/spw-runtime/`

### Specification & documentation
- `lib/spw-v0.3.0/` — current spec library (v0.2.0-alpha retained as archival reference).
- `.spw/` — canon-root specification surfaces, conventions, patterns.
- `docs/` — canon narrative surface (Writerside).

### Extensions
- `extensions/vscode-spw/` — VS Code extension (TextMate, semantic tokens, LSP).
- `extensions/intellij-spw/` — IntelliJ plugin (Gradle).

### Agent infrastructure
- `.agents/` — skills, plans, workflows, runtime state. See `.agents/README.md`.
- `.claude/` — Claude Code harness: settings, slash commands. See `CLAUDE.md`.

## Commit Protocol

- Commit subjects use Spw sigil prefixes (see `CLAUDE.md` for the full table).
- Commit bodies include exactly one `#[episode]{ ... }` block.
- The pre-commit gate requires human Touch ID authorization.
- Privacy: no absolute user paths in commit messages.

## Agent Workflow

- Plan before coding: `.agents/plans/_schema/` for templates.
- Use feature branches with worktrees for bounded tasks.
- All commits pass through the human-in-the-loop gate.
- See `.agents/workflows/` for coordination flows.
