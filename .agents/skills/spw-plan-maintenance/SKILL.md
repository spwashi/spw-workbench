---
name: spw-plan-maintenance
description: >
  Maintain the plan ecology after significant changes land. Detect staleness,
  refresh caches, propagate cross-references, update streams, and verify
  artifact registration. Use after new artifacts, architectural decisions,
  repo restructuring, or on request ("are the plans current?").
---

# Skill: spw-plan-maintenance

## When to Use

Use this skill **after** significant changes land — not before work begins
(that's `spw-feature-planning`). Plan maintenance is a sweep, not a creation.

Triggers:
- A new artifact (pattern, registry, convention) was committed
- An architectural decision changed (e.g., npm → submodule)
- The repo structure shifted (e.g., `src/` → `packages/`)
- A plan's commits have partially or fully landed
- User asks "are the plans current?" or "what's stale?"
- Before a release gate or governance review

---

## Instructions

### Step 1: Detect staleness

Scan the active plan directory for drift signals.

```bash
# Active-branch summary
npm run spw:plan:status

# Active-branch check
npm run spw:plan:check

# List all active plans (exclude _archive, _schema)
ls -d .agents/plans/*/PLAN.md | grep -v _archive | grep -v _schema
```

For each plan, check:

| Signal | How to detect | Severity |
|---|---|---|
| **Stale rebase target** | `~#base_ref` SHA not on current `main` ancestry | High — plan may reference vanished code |
| **Stale file paths** | Files listed in `## Files` that no longer exist | High — plan is directing work at ghosts |
| **Status mismatch** | `~#status: "planning"` but commits have landed | Medium — misleading |
| **Stream silence** | No `>>` entry in the last 3 scenes or 48h | Medium — memory loss risk |
| **Cache drift** | `next_commit` or `open_count` out of sync with history | Low — metadata error |
| **Open questions resolved** | `^["open"]` has entries whose decisions are in the stream | Low — cleanup |
| **Missing cross-references** | New artifacts not referenced in dependent plans | Medium — plans diverge from ecosystem |
| **Stale dependencies** | `## Dependencies` names archived or completed plans | Low — cleanup |

```bash
# Quick staleness probe: find plans with old base_ref SHAs
grep -r 'base_ref' .agents/plans/*/wip.spw | grep -v _archive | grep -v _schema

# Check if base SHAs are still on main
git log --oneline main | head -20
```

### Step 2: Refresh caches

For each plan whose cache is stale, update the `^["cache"]` block in `wip.spw`:

- `~#status` — does it match reality? (`planning` → `active` → `blocked` → `review` → `done`)
- `~#base_ref` — update to current `main@<sha>`
- `~#rebased_at` — set to today's date if rebase target changed
- `~#files_hot` — verify files still exist; update paths if repo restructured
- `~#next_commit` — advance past commits that have landed
- `~#open_count` — recount `^["open"]` entries
- `~#last_stream` — verify matches the latest `>>` entry timestamp
- `~#taste_debt` — update or clear if resolved

Do **not** hand-edit stream entries or done blocks — those are append-only.

### Step 3: Propagate cross-references

When a new artifact has landed, identify all plans and surfaces that should reference it.

**Artifact types and their propagation paths:**

| Artifact type | Propagation targets |
|---|---|
| New `.spw/patterns/*.spw` | patterns/index.spw, .spw/index.spw, workspace.spw, harness evals, docs/toc.spw, adjacent design docs, dependent plans |
| New `.spw/registries/*.spw` | .spw/index.spw, workspace.spw, harness evals |
| New `.spw/conventions/*.spw` | conventions/index.spw, .spw/index.spw, workspace.spw |
| New plan artifact (`<slug>.spw`) | dependent plans' `## Dependencies`, interaction contracts |
| New plan (`PLAN.md + wip.spw`) | plan-ecology-clustering if it exists, adjacent plans' dependency sections |

**Checklist for each new artifact:**
- [ ] Indexed in the parent `index.spw`
- [ ] Referenced in `.spw/index.spw` roots and dispatch
- [ ] Declared in `.spw/workspace.spw` under the appropriate frame
- [ ] Added to harness eval targets (`.spw/harness/evals/baseline-evals.spw`)
- [ ] Linked from `docs/toc.spw` if user-facing
- [ ] Cross-referenced in dependent plans and design docs

### Step 4: Update streams

When context has changed (architectural decision, repo restructure, dependency shift),
add stream entries to affected plans:

```
>>[YYYY-MM-DD HH:MM] revise — <what changed and why, referencing the trigger>
```

Use the appropriate stream type:
- `revise` — a prior decision or assumption changed
- `observe` — new context noticed (e.g., "packages/ layout is now live")
- `decide` — a new decision was made that affects this plan
- `rebase` — base reference updated

### Step 5: Resolve open questions

Check each plan's `^["open"]` block. For questions that have been answered
(by decisions in the stream, by commits that landed, or by architectural changes):

1. Log the resolution in the stream: `>>[timestamp] decide — resolved [label]: <answer>`
2. Mark the question as resolved: `# resolved: [label] — see stream YYYY-MM-DD HH:MM`
3. Update `~#open_count` in cache

### Step 6: Verify artifact registration

Run the harness eval that checks pattern/convention/registry cohesion:

```bash
npm run lint:spw          # parse-validate all .spw files
npm run lint:docs         # verify path references
```

For new artifacts, verify they parse and their index references resolve.

### Step 7: Assess ecology health

After individual plan maintenance, assess the overall ecology:

- Are plan clusters (execution-truth, curriculum, research, speculative) correctly assigned?
- Do dependency edges form a DAG (no cycles)?
- Are shared hot files identified across plans that might conflict?
- Is the release gate narrow enough — are non-blocking plans clearly marked?

If `plan-ecology-clustering` exists, verify its cluster assignments match reality.

---

## Output Contract

- Report what was stale and what was updated
- Keep changes minimal — refresh caches and add cross-references, don't rewrite plans
- Preserve stream append-only semantics — never edit or delete stream entries
- Cache updates are derived facts — recompute, don't guess
- New stream entries should reference the trigger (commit SHA, architectural decision, new artifact)

---

## Heuristics

- **Frequency**: Run after every 3-5 significant commits, or when >2 weeks have passed since last maintenance
- **Scope**: A full sweep touches 10-30 plans; prefer targeted sweeps when only one artifact landed
- **Taste**: Plan maintenance should make the ecology more truthful, not more bureaucratic. If a cross-reference adds no navigational value, skip it.
- **Depth over breadth**: It's better to deeply update 5 relevant plans than to mechanically touch 30.
- **Cache is cheap, streams are permanent**: Be aggressive about refreshing caches (they're derived), cautious about adding stream entries (they're historical record).

---

## Integration with Other Skills

| Situation | Also use |
|---|---|
| Creating a new plan | `spw-feature-planning` (creation) then this skill (registration) |
| Plan involves craft concerns | `spw-craft-quality` for the implementation; this skill for the plan surface |
| Ready to commit maintenance changes | `spw-commit-review` |
| Plan ecology needs restructuring | Read `plan-ecology-clustering` plan first |
| New artifact needs harness coverage | Add eval entry during Step 3, then verify with `npm run lint:spw` |

---

## Scripts

```bash
# Staleness probe: list all active plan base refs
grep -rh 'base_ref' .agents/plans/*/wip.spw | grep -v _archive | grep -v _schema

# File path verification: check if predicted files exist
for plan in .agents/plans/*/PLAN.md; do
  grep -oP '(?<=\[MOD\] |MOD\?\] |\[NEW\] |\[DEL\] ).*' "$plan" 2>/dev/null | while read f; do
    [ ! -e "$f" ] && echo "MISSING: $f (in $plan)"
  done
done

# Parse-validate all .spw surfaces
npm run lint:spw

# Path reference check
npm run lint:docs

# Check a named plan directly
npm run spw:plan:check -- --slug <slug>

# Agentic hygiene: cheap branch/plan context summary
npm run spw:agent:vibe
```
