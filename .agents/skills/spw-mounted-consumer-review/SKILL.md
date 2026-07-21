---
name: spw-mounted-consumer-review
description: Review an independent repository that mounts this workbench at .spw/_workbench. Use for repository-local CLI, LSP, editor, canon, or plan audits that must preserve consumer authority, exclude mounted infrastructure from the consumer corpus, and produce portable revision-aware evidence.
---

# Spw Mounted Consumer Review

## Purpose

Run workbench instruments from an independent consumer repository without absorbing its identity, predicting its deployment form, or confusing mounted infrastructure with consumer-authored canon.

## Authority Boundary

- The caller is the consumer repository root.
- Consumer-owned `.spw/index.spw`, `.spw/workspace.spw`, `.spw/mount.spw`, conventions, claims, and plans are authoritative for that repository.
- `.spw/_workbench` is pinned tooling infrastructure.
- Exclude `.spw/_workbench/**` from the consumer corpus unless the task explicitly audits the mount itself.
- Keep reports in the consumer repository. Upstream workbench changes require explicit human selection and commit authorization.

## Workflow

1. Enumerate ancestor mount candidates; do not stop at the nearest `.spw/mount.spw`, because a mounted workbench may contain its own canonical manifest.
2. Prefer the outer candidate whose consumer-owned `.spw/_workbench` contains the infrastructure checkout and whose mount contract points at that checkout. Record ambiguity instead of silently choosing infrastructure authority.
3. If a legacy consumer has a mounted gitlink but no consumer-owned mount manifest, classify discovery as legacy/partial and require an explicit consumer root until compatibility tooling exists.
4. Resolve `.spw/_workbench` and verify that it is readable tooling infrastructure rather than copied consumer content.
5. Read consumer authority surfaces before workbench documentation.
6. Choose a bounded audit target: CLI, LSP, one editor integration, canon, plans, or a repo-local evidence sample.
7. Run deterministic probes from the consumer root, passing explicit roots, limits, profiles, and equivalence modes whenever supported.
8. Classify every capability as advertised, configured, invoked, observed, or tested. Do not collapse those states into a single support claim.
9. Record commands, tool versions, failures, verdicts, and both repository revisions using relative paths and generic labels.
10. Separate consumer findings from portable workbench improvements. Do not upstream private corpus excerpts or consumer identifiers.

## Review Contract

A complete review records:

- consumer revision and mounted-workbench revision;
- audit scope and exclusions;
- exact reproducible commands;
- capability evidence states;
- expected and observed root ownership;
- actionable failures with relative paths;
- a consumer-local disposition for each finding;
- optional identity-free upstream questions selected by a human.

For agent-facing samples, also record:

- query/profile hash or exact arguments;
- relative source spans and content hashes when available;
- exact, approximate, and counterexample tiers;
- byte/file/node/result/time budgets;
- excluded paths and why they were excluded;
- which fields are deterministic facts, recomputable scores, or interpretations.

## Required References

- `.spw/conventions/submodule.spw`
- `.spw/tooling/editor-surface-audit.spw` for LSP or editor reviews
- `.agents/skills/spw-commit-review/SKILL.md` before any commit workflow

## Validation

Before finishing, verify that:

- the consumer corpus excludes `.spw/_workbench/**`;
- no specific domain, consumer identifier, or machine-local path appears in workbench changes;
- both revisions are present in consumer-owned evidence;
- observed behavior is distinguished from advertised capability;
- proposed upstream changes are abstract, portable, and human-selected.
