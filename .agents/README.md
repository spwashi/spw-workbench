# .agents

Operational knowledge, planning artifacts, and automation for the spw-workbench.

This directory is the agent-facing counterpart to `.spw/` (canon surfaces) and `docs/` (human narrative). It stores skills, plans, workflows, and runtime state that agents and the human-in-the-loop commit gate rely on.

## Structure

```
.agents/
├── skills/           # 14 operational skills with SKILL.md, scripts, references
├── plans/            # Feature branch plans (~74 live, ~32 archived)
│   ├── index.spw     # Flat routing table — derived from every plan's card
│   ├── _schema/      # Plan templates: plan.md, wip.spw, wip-template.spw
│   ├── _archive/     # Merged/completed plans
│   └── <slug>/       # Live plans: PLAN.md + wip.spw [+ <slug>.spw]
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
| **spw-plan-maintenance** | Maintain the plan ecology — detect staleness, refresh caches, propagate cross-references |
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
| Multi-Agent | `workflows/multi-agent.spw` | Parallel agent coordination: dispatch, lanes, sync, river cycle |

## Plans

Start at **`plans/index.spw`** — one flat file over the nested plan directories:
rows grouped by phase and lane glyph, a map from code regions to plans, computed
kin, drift, and *doors* (routes for a first visit, a returning collaborator, an
agent resuming, someone arriving from code, a language designer, a host
maintainer, a mounted consumer, a wanderer, and the ecology's steward).

```bash
npm run spw:plan:index                    # glance: phase · glyph · slug · stream age · gist
npm run spw:plan:index -- --touch <path>  # which plans touch this file or directory?
npm run spw:plan:index -- --wander        # one resting plan and one of its open questions
npm run spw:plan:index -- --check         # card problems or a stale index → exit 1
npm run spw:plan:index -- --write         # refresh the derived frames of index.spw
```

Plans follow the schema at `plans/_schema/`:

- **`plan.md`** — Required sections: Goal (with taste note), Scope, Files, Commits, Agentic Hygiene, Dependencies, Spw Artifact
- **`wip.spw`** — Opens with a **card** whose operator is the lane glyph (`!` execution · `@` projection · `?` research · `~` curriculum · `^` principal · `.` recovery) and whose bindings are `phase`, `gist`, `touches`, `entry`, `next`; optional `^["edges"]` follow. Memory model: glance (card) → intent (hot) → stream (warm, append-only) → cache (derived) → done (cold, written at merge)
- **`wip-template.spw`** — `npm run spw:plan:init -- <slug>` copies it

### Plan Lifecycle
1. Create `feature/<slug>` branch (optionally via worktree)
2. Write PLAN.md + wip.spw (card first) before touching source files; `npm run spw:plan:index -- --write`
3. Develop with stream entries (`>>[timestamp] type — content`); move `card.phase` as the plan moves
4. Fill `^["done"]` section at merge time; set `phase: #done`
5. Archive to `plans/_archive/` after merge (index `^["done"]` lists the candidates)

## State

- `state/register-conventions.spw` — Versioned schema for runtime state
- `state/runtime/` — Local cache written by skill scripts (git-ignored)
- Writes are atomic (tmp + move), hot-reloadable, UTC timestamps, relative paths

## Cross-References

- **CLAUDE.md** (repo root) — Claude Code harness documentation
- **AGENTS.md** (repo root) — Repository guidelines and commit protocol
- **`.spw/`** — Canon specification surfaces
- **`.claude/commands/`** — Slash commands that invoke these skills
