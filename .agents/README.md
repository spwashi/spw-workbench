# .agents

Operational knowledge, planning artifacts, and automation for the spw-workbench.

This directory is the agent-facing counterpart to `.spw/` (canon surfaces) and `docs/` (human narrative). It stores skills, plans, workflows, and runtime state that agents and the human-in-the-loop commit gate rely on.

## Structure

```
.agents/
├── skills/           # 13 operational skills with SKILL.md, scripts, references
├── plans/            # Feature branch plans (29 active, 25 archived)
│   ├── _schema/      # Plan templates: plan.md, wip.spw, wip-template.spw
│   ├── _archive/     # Merged/completed plans
│   └── <slug>/       # Active plans: PLAN.md + wip.spw [+ <slug>.spw]
├── workflows/        # Agent coordination workflows (commit-review, validation, worktree)
├── state/            # Runtime state conventions + local cache (runtime/ is git-ignored)
└── orphaned-files.spw  # Reachability audit snapshot
```

## Skills

Each skill has a `SKILL.md` manifest and optional `scripts/` and `references/` subdirectories.

| Skill | Purpose |
|-------|---------|
| **spw-commit-review** | Human-in-the-loop commit gate — Touch ID authorization, syntax review, layer checks |
| **spw-feature-planning** | Plan features before coding — PLAN.md + wip.spw artifacts |
| **spw-fix-planning** | Triage and plan fixes for test failures / regressions |
| **spw-craft-quality** | Craft passes: naming, layering, types, containment, axis attribution |
| **spw-typescript-affordances** | Type audits, branded types, contracts |
| **spw-semantics-rigor** | Semantic correctness verification |
| **spw-css-dom-lab** | CSS/DOM experimentation harness |
| **spw-ui-containment-audit** | Scroll/overflow containment safety |
| **spw-ontology-workbench** | Ontology design and curation |
| **spw-operator-lattice** | Operator frequency and coupling analysis |
| **spw-privacy-engineering** | Privacy audits and data protection |
| **spw-math-algorithm-radar** | Algorithm analysis, complexity profiling |
| **spw-research-rigor** | Research methodology and experimental rigor |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Commit Review | `workflows/commit-review.md` | Touch ID authorization flow for all commits |
| Spw Validation | `workflows/validate-spw-syntax.md` | .spw file validation pipeline |
| Worktree Task | `workflows/worktree-task.md` | Feature branch + worktree lifecycle |

## Plans

Plans follow the schema at `plans/_schema/`:

- **`plan.md`** — Required sections: Goal (with taste note), Scope, Files, Commits, Agentic Hygiene, Dependencies, Spw Artifact
- **`wip.spw`** — Memory model: intent (hot) → stream (warm, append-only) → cache (derived) → done (cold, written at merge)
- **`wip-template.spw`** — Copy this to start a new plan

### Plan Lifecycle
1. Create `feature/<slug>` branch (optionally via worktree)
2. Write PLAN.md + wip.spw before touching source files
3. Develop with stream entries (`>>[timestamp] type — content`)
4. Fill `^["done"]` section at merge time
5. Archive to `plans/_archive/` after merge

## State

- `state/register-conventions.spw` — Versioned schema for runtime state
- `state/runtime/` — Local cache written by skill scripts (git-ignored)
- Writes are atomic (tmp + move), hot-reloadable, UTC timestamps, relative paths

## Cross-References

- **CLAUDE.md** (repo root) — Claude Code harness documentation
- **AGENTS.md** (repo root) — Repository guidelines and commit protocol
- **`.spw/`** — Canon specification surfaces
- **`.claude/commands/`** — Slash commands that invoke these skills
