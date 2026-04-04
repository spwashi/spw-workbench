# Plan: commit-gate-redesign

Redesign the human-in-the-loop commit gate around informed authorization, shared review logic, and trustworthy agent attribution.

## Goal

The current pre-commit gate works, but it collapses review execution, summary rendering, commit policy, and authorization into a single shell script. This redesign should split those concerns, make the human authorize a clearly summarized artifact, and bring the polling and hook surfaces onto one shared review engine. The end state is a commit ceremony that is easier to trust, easier to extend, and easier for both humans and agents to understand.

Taste note:
- clarity / layering / trust / correctness

## Scope

- **In scope:** shared review runner extraction, commit subject and `#[episode]{}` validation, diffstat and file-category summary, improved Touch ID prompt context, inspect-before-authorize interaction, agent attribution hardening, and workflow/docs alignment.
- **Out of scope:** changing the repo’s core commit policy, removing Touch ID authorization, changing syntax-review semantics, or introducing remote/networked audit logging.

## Files

[MOD] `.git/hooks/pre-commit` — shrink into orchestration around review + authorization
[NEW] `scripts/commit-review/run-review.sh` — shared review engine for hook and polling surfaces
[NEW] `scripts/commit-review/render-review.sh` — terminal summary renderer for commit review
[NEW] `scripts/commit-review/authorize-commit.sh` — Touch ID / interactive authorization boundary
[MOD] `.agents/skills/spw-commit-review/scripts/poll-review.sh` — reuse shared review logic and align summaries
[MOD?] `scripts/touchid-authorize.swift` — accept richer prompt copy or explicit mode metadata
[MOD] `.agents/skills/spw-commit-review/SKILL.md` — describe the new interaction flow and machine-readable outputs
[MOD] `.agents/workflows/commit-review.md` — document the staged summary → authorization ceremony
[NEW?] `scripts/commit-review/lib/agent-context.sh` — centralize agent detection if shell reuse stays cleaner than inlining

Craft guard:
- Keep the hook small and single-purpose; most logic should move to `scripts/commit-review/`.
- No shell file should exceed 600 lines; prefer one responsibility per script.
- Avoid duplicating review categories or report formatting between hook and poll paths.

## Commits

1. `.[plans] — add commit-gate redesign plan surfaces`
2. `&[commit-review] — extract shared review runner and commit-message validation`
3. `&[commit-review] — add summary renderer and informed authorization flow`
4. `&[commit-review] — unify poll-review with shared engine and harden agent attribution`
5. `.[docs] — update commit-review skill and workflow documentation`

## Agentic Hygiene

- Rebase target: `main@f04cad6826118457ec72474a59a240125b3750a6`
- Rebase cadence: before commit 2, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/commit-gate-redesign/commit-gate-redesign.spw` only if the branch earns a distilled artifact.
