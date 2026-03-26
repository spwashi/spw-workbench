# Plan: syntax-review-profiles

Replace generation-based `.spw` warnings in commit-review with profile-based syntax review.

## Goal

Shift commit-review away from the broken `Gen 1 / Gen 2 / Gen 3` framing and toward surface-aware syntax review. The desired end state is a hook and polling loop that still review `.spw` changes, but do so in terms of profile fit, newly introduced discouraged forms, and explicit waivers for archival or canon surfaces. Taste note: this improves clarity and correctness by making review output match the repo’s current semantics instead of an outdated migration story.

## Scope

- **In scope**: add a shared syntax review implementation; wire it into the pre-commit hook and poll-review flow; update the syntax audit output from generation labels to profile summaries; refresh commit-review skill/docs/usage strings to match the new model.
- **Out of scope**: broad `.spw` syntax normalization across the repo, parser changes, or redesigning every historical surface contract in one pass.

## Files

[NEW] .agents/skills/spw-commit-review/scripts/spw-syntax-review.ts — shared review engine for `.spw` path profiles and pattern-policy evaluation.
[MOD] .git/hooks/pre-commit — replace hardcoded generation warnings with profile review output.
[MOD] .agents/skills/spw-commit-review/scripts/poll-review.sh — run syntax review instead of optional generation hints; rename flags/help.
[MOD] .agents/skills/spw-commit-review/scripts/spw-syntax-audit.ts — report profile landscape and review candidates rather than generation buckets.
[MOD] .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh — wrapper comments/help alignment.
[MOD] .agents/skills/spw-commit-review/SKILL.md — update workflow, terminology, and self-correction guidance.
[MOD?] docs/contributing/md/common-tasks.md — only if commit-review guidance or terminology needs user-facing correction.
[MOD?] .agents/skills/spw-commit-review/scripts/layer-check.sh — only if affordance text should point to the renamed review/audit semantics.

### Craft guard

The concept-density risk is the new shared review engine. Keep profile classification, pattern counting, and text rendering separated enough that the hook and poll script can consume it without shell duplication. Do not let the pre-commit hook accumulate a second embedded policy table after the shared review script exists.

## Commits

1. `&[commit-review] — add shared syntax review profiles and wire hook/poll output`
2. `.[commit-review] — rewrite audit and skill/docs around profile-based review`

## Agentic Hygiene

- Rebase target: `main@a069f0fc6aefe285a8e0e34a2df9315a59be7dc2`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Fuzz Strategy

- Explore: `node --import tsx .agents/skills/spw-commit-review/scripts/spw-syntax-audit.ts --help`
- Stabilize: `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --no-state`
- Ship: `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged --no-state`
