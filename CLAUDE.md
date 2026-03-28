# CLAUDE.md

This is the Claude Code harness for **spw-workbench** — parser, runtime, and substrate-driven event system for the Spw language.

## Project Identity

Spw is a brace-first language where operators are semantic actors. This monorepo contains the parser kernel, runtime interpreter, LSP server, CLI, VS Code and IntelliJ extensions, versioned specification libraries, and canonicalized `.spw` surfaces.

- **Version**: 0.3.0
- **License**: MIT
- **Node**: `^20.19.0 || >=22.12.0`
- **History model**: episodes-only canon rewrite — every commit body contains an `#[episode]{}` block

## Repository Structure

```
packages/
  spw-seed/          # Parser kernel (lexer/parser/types) — portable
  spw-runtime/       # Interpreter + substrate event system
  spw-lsp/           # Language Server Protocol implementation
  spw-cli/           # CLI (`spw` binary)
extensions/
  vscode-spw/        # VS Code extension (TextMate, semantic tokens, LSP)
  intellij-spw/      # IntelliJ plugin (Gradle)
lib/
  spw-v0.2.0-alpha/  # Archival spec reference
  spw-v0.3.0/        # Current spec library (11 subsystems)
src/                 # Legacy source (being consolidated into packages/)
  seed/              # Parser source → packages/spw-seed
  runtime/           # Runtime source → packages/spw-runtime
  testing/           # Test infrastructure
.spw/                # Canon root — versioned specification surfaces, conventions, patterns
.agents/             # Agent skills, plans, workflows, state (see .agents/README.md)
docs/                # Canonicalized documentation (Writerside)
scripts/             # Build, analysis, release, and development tooling
prompts/             # Prompt templates and surfaces
```

## Tech Stack

- TypeScript ~5.9, ESM modules
- Vitest ^3.2 for testing (seed, runtime, dom configs)
- esbuild for bundling
- tsx for script execution
- Workspaces: `packages/*`, `extensions/vscode-spw`

## Key Commands

### Build & Test
```bash
npm run build                    # tsc --noEmit (type check)
npm run test:run                 # Full test suite (runtime + dom)
npm run test:seed                # Parser kernel tests
npm run test:runtime             # Runtime tests
npm run test:dom                 # DOM/UI tests
```

### Lint & Audit
```bash
npm run lint                     # lint:spw + lint:docs
npm run lint:spw                 # Parse-validate all .spw files
npm run lint:docs                # Verify .spw path references
npm run audit                    # @spw: marker audit
npm run audit:full               # Full codebase audit
npm run audit:spw:syntax         # .spw syntax validation (excludes .agents)
```

### Fuzz Profiles
```bash
npm run fuzz:types               # tsc --noEmit
npm run fuzz:stabilize           # types + runtime tests
npm run fuzz:ship                # build + full test suite
npm run fuzz:boonhonk            # Groove detector (timing/entropy)
```

### Development
```bash
npm run spw:dev                  # Development mode
npm run lsp                      # Start LSP server
npm run spw:format .spw          # Format .spw files
npm run spw:ls                   # List .spw surfaces
```

### Agentic Engineering
```bash
npm run spw:plan:init -- <slug>  # Initialize local feature plan surfaces
npm run spw:plan:stream -- --type decide --message "..." [--slug <slug>]  # Append one stream entry
npm run spw:plan:status -- [--slug <slug>]  # Read plan cache/status for the active or named plan
npm run spw:plan:check -- [--slug <slug>]   # Detect cache drift and stale plan surfaces
npm run spw:agent:kb             # List local agent reference surfaces
npm run spw:agent:kb -- --json   # Emit KB topics as JSON
npm run spw:agent:vibe -- --json # Emit branch/plan context as JSON
npm run spw:agent:test           # Run shell smoke tests for local agent tooling
npm run spw:agent:vibe           # Cheap branch/plan context summary
```

### Release
```bash
npm run bundle:release           # Full release bundle
npm run bundle:extensions        # Build VS Code + IntelliJ extensions
npm run bundle:jsdist            # JS distribution bundle
```

## Commit Conventions

### Sigils
Commit subjects use Spw operator sigils as prefixes:

| Sigil | Purpose |
|-------|---------|
| `.[scope]` | Documentation / `.spw` surface updates |
| `&[scope]` | Integrate, merge, restructure |
| `vocab[scope]` | Type / naming refactor |
| `![scope]` | Test / verify |
| `^seed[scope]` | New seed or probe |
| `#[scope]` | New spec or config |

### Episode Blocks
Commit bodies must contain exactly one `#[episode]{}` block:
```
#[episode]{ ~[scene]{ "..." } ![change]{ ... } *[verify]{ ... } }
```

Privacy enforcement: commit messages must not contain absolute user paths (`/Users/`, etc.).

Bypass for history rewrites: `SPW_EPISODE_SKIP=1`.

### Human-in-the-Loop Gate
The pre-commit hook **blocks all commits** until Touch ID biometric authorization (or interactive y/N fallback). Agents prepare commits; humans authorize.

See `.agents/workflows/commit-review.md` and `.agents/skills/spw-commit-review/SKILL.md`.

## Layer Boundaries

- `lib/spw/` must **not** import `@/` paths (enforced by pre-commit hook)
- Import flow: infra ← platform ← app ← ui (inner must not import outer)
- `packages/spw-seed/` is portable — no runtime or extension dependencies

## .spw Surface Conventions

- `.spw/index.spw` is the canon-root routing table
- Prefer current syntax: `.{}` facets, `#[]` sets, `=` bias, `[reg=...]`
- Path refs use tilde-relative form: `~"relative/path"`
- Profiles govern syntax review (historical, agent_surface, canon_surface, narrative_surface, strict_surface)
- Valence pentad: boon/bane/bone/bonk/honk describes how a component's material changes

## Agent Skills & Workflows

Agent operational knowledge lives in `.agents/`:

### Skills (`.agents/skills/`)
- **spw-commit-review** — Human-in-the-loop commit gate, polling, syntax review
- **spw-feature-planning** — Plan features before coding (PLAN.md + wip.spw)
- **spw-plan-maintenance** — Maintain plan ecology: staleness detection, cache refresh, cross-reference propagation
- **spw-fix-planning** — Triage and plan fixes for test failures / regressions
- **spw-craft-quality** — Craft passes: naming, layering, types, containment
- **spw-typescript-affordances** — Type audits, branded types, contracts
- **spw-semantics-rigor** — Semantic correctness verification
- **spw-css-dom-lab** — CSS/DOM experimentation harness
- **spw-ui-containment-audit** — Scroll/overflow containment safety
- **spw-ontology-workbench** — Ontology design and curation
- **spw-operator-lattice** — Operator frequency and coupling analysis
- **spw-privacy-engineering** — Privacy audits
- **spw-math-algorithm-radar** — Algorithm analysis, complexity profiling
- **spw-research-rigor** — Research methodology and rigor

### Workflows (`.agents/workflows/`)
- **commit-review.md** — Touch ID commit authorization flow
- **validate-spw-syntax.md** — .spw file validation pipeline
- **worktree-task.md** — Feature branch + worktree lifecycle

### Plans (`.agents/plans/`)
Feature branch plans follow the schema at `.agents/plans/_schema/`:
- `PLAN.md` — pre-flight scope (goal, files, commits, agentic hygiene)
- `wip.spw` — running development stream with memory model
- Archived plans live in `.agents/plans/_archive/`

## Craft Guards

- Flag files exceeding **600 lines** or **12 imports**
- Each file should have one reason to change (single responsibility)
- Every constant should trace to a deformation axis (timing, disclosure, stability, affect, resolution, noise)
- Named derivations over magic numbers: `var(--spw-beat)` over `500ms`

## Pre-Commit Polling

Run review checks before committing:
```bash
# Changed files (recommended default)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed

# Staged files (pre-commit)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged

# Continuous watch mode
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --watch --interval=15
```
