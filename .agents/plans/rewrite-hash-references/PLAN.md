# Plan: rewrite-hash-references

Refresh plan-artifact commit references after the published history rewrite.

## Goal

The desired end state is that plan artifacts on rewritten `main` point at commit
hashes that still resolve on rewritten `main`, instead of dangling references
that only exist on the pre-rewrite backup branch. This improves correctness and
operator trust: a recorded `main@<sha>` should still be actionable after a
history surgery, especially in active plan surfaces. The taste note is clarity
and correctness.

## Scope

- **In scope**: update plan-artifact references that were intended to follow
  `main`, including `PLAN.md` rebase targets, `wip.spw` base refs, and nearby
  stream notes that explicitly cite rewritten `main` commits.
- **Out of scope**: provenance hashes that intentionally refer to other
  branches, remotes, tags, archived upstream commits, or external lore history;
  broader narrative/doc cleanup outside plan artifacts.

## Files

Predicted files:

```text
[NEW] .agents/plans/rewrite-hash-references/PLAN.md
[NEW] .agents/plans/rewrite-hash-references/wip.spw
[MOD] .agents/plans/**/PLAN.md
[MOD] .agents/plans/**/wip.spw
```

### Craft guard

No file should approach the line or import guardrails. The main risk is semantic
drift: replacing hashes that should remain historical provenance. Keep edits
limited to plan surfaces whose references are explicitly framed as `main`.

## Commits

1. .[history-rewrite] — refresh plan-artifact `main` hash references after rewrite

## Agentic Hygiene

- Rebase target: `main@a2e49bd0527d`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none
