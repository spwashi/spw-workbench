# Plan Staleness Checklist

Quick reference for identifying stale plans during a maintenance sweep.

## Per-Plan Checks

### Cache (`^["cache"]` in wip.spw)

- [ ] `~#status` matches reality (planning/active/blocked/review/done)
- [ ] `~#base_ref` SHA is on current `main` ancestry
- [ ] `~#rebased_at` is recent (within last week for active plans)
- [ ] `~#files_hot` paths exist in the repo
- [ ] `~#next_commit` is past all landed commits
- [ ] `~#open_count` matches actual `^["open"]` entry count
- [ ] `~#last_stream` matches the latest `>>` timestamp
- [ ] `~#taste_debt` is still relevant (not resolved by subsequent work)

### PLAN.md

- [ ] `## Files` paths exist (especially after `src/` → `packages/` migrations)
- [ ] `## Dependencies` names plans that still exist (not archived)
- [ ] `## Commits` sequence reflects current state (landed commits noted)
- [ ] `## Agentic Hygiene` rebase target is reachable from current main
- [ ] Craft guard concerns still apply (file sizes, import counts may have changed)

### wip.spw

- [ ] `^["open"]` has no silently-resolved questions
- [ ] `^["commits"]` matches PLAN.md commit sequence
- [ ] `^["stream"]` has recent entries if the plan is active
- [ ] `^["roots"]` references exist and are current
- [ ] `^["development"]` lane and ladder assignments match ecology clustering

### Cross-references

- [ ] New artifacts since last maintenance are referenced where relevant
- [ ] Dependency edges are consistent in both directions (A depends on B → B knows A consumes it)
- [ ] Shared hot files are noted in `^["parallel_work"]` when plans overlap

## Ecology-Level Checks

- [ ] No plan claims `active` without recent stream activity (>2 weeks stale)
- [ ] Release-blocking plans are distinguishable from curriculum/research/speculative
- [ ] Plan-ecology-clustering assignments match actual plan content
- [ ] No circular dependencies in the plan DAG
- [ ] Archived plans are in `_archive/`, not sitting inactive in the main directory
