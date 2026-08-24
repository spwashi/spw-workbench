# Plan: mounted-consumer-tooling

Make the mounted-workbench contract portable enough that any consumer repository exposing `.spw/_workbench` can use the workbench's CLI, LSP, editor integrations, and review skills without being named or located in workbench canon, while replacing the active named-domain portfolio with reusable surface archetypes.

## Goal

Replace adopter-specific planning language with an abstract consumer-repository contract, then define evidence-driven audits for CLI, LSP, VS Code, IntelliJ, and NeoVim surfaces. The workbench should describe capabilities by protocol, root ownership, and observable behavior rather than by machine-local paths, named repositories, or feature-parity aspiration.

Taste note: improve **clarity**, **layering**, **portability**, and **truthfulness**. Consumer-owned `.spw/` remains authoritative; `.spw/_workbench` remains versioned infrastructure; audit output remains owned by the consumer repository.

## Maintenance evidence — 2026-08-24

A revision-aware read-only corpus probe found portable tooling gaps rather than consumer-specific grammar requirements:

- Single-file targeting is inconsistent: outline-style commands accept a positional file while query requires `--from`; the failure does not yet suggest the canonical correction.
- Some JSON outline snippets contain display ellipses, so a machine projection can lose exact source. Bounded display and recoverable data need separate fields.
- Single-source inspection cannot yet accept stdin/text, an unsaved editor buffer, a range, or an explicit resolved profile, forcing direct parser calls for embedded expressions.
- Parser success alone is not sufficient evidence for an intended expression: completeness, consumed input, expected root kind, and prose fallback need a receipt.
- A consumer mount note can drift from the mounted revision. Doctor/capabilities should compare declared and observed revisions rather than trusting prose metadata.
- Default scans must disclose mount, generated, and agent-infrastructure exclusions so a broad output cannot silently include the workbench or derived corpus.
- Multidimensional consumer projections need a state receipt: independent channels and normalized simplex weights are different geometries; thresholded expressions, color, and card order are lossy views rather than recoverable state. Cultural or genre labels remain post-hoc observations with context/evidence, not automatic consequences of a mixer coordinate.

These findings enter workbench plans as identity-free protocol evidence. The consumer corpus and repository history remain external and unchanged.

## Scope

- **In scope**: remove specific domain identifiers from active canon, code, tests, templates, plans, and skills; replace the named-domain portfolio with reusable surface archetypes; abstract mount terminology; add a portable mounted-consumer review skill; plan CLI root discovery, machine-readable doctor/capability output, and review orchestration; define LSP and editor evidence audits; align current plan caches and streams.
- **Out of scope**: rewriting Git history; implementing the planned CLI commands; changing LSP or editor runtime behavior; publishing extensions; copying consumer corpora into fixtures; rewriting archived historical plans.

## Files

```text
[NEW] .agents/plans/mounted-consumer-tooling/PLAN.md
[NEW] .agents/plans/mounted-consumer-tooling/wip.spw
[NEW] .agents/plans/mounted-consumer-tooling/mounted-consumer-tooling.spw
[NEW] .agents/skills/spw-mounted-consumer-review/SKILL.md
[MOD] .agents/skills/spw-commit-review/SKILL.md
[MOD] .agents/skills/spw-feature-planning/SKILL.md
[MOD] .spw/conventions/submodule.spw
[MOD] .spw/conventions/cli.spw
[MOD] .spw/conventions/index.spw
[NEW] .spw/tooling/editor-surface-audit.spw
[NEW] .spw/tooling/neovim-spw.spw
[MOD] .spw/tooling/comparison.spw
[MOD] .spw/tooling/vscode-spw.spw
[MOD] .spw/tooling/intellij-plugin.spw
[MOD] .spw/index.spw
[MOD] .spw/workspace.spw
[MOD] .spw/harness/evals/baseline-evals.spw
[DEL] retired named-surface registry
[NEW] .spw/surfaces/surface-archetypes.spw
[MOD] .spw/surfaces/index.spw
[MOD] docs/toc.spw
[MOD] packages/spw-cli/src/init-presets.ts
[MOD] packages/spw-cli/src/init.ts
[MOD] packages/spw-cli/templates/init/presets/installable-book/.spw/mount.spw
[MOD] src/runtime/__tests__/spw-init-portability.test.ts
[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml
[MOD] .agents/plans/spw-site-install/PLAN.md
[MOD] .agents/plans/spw-site-install/wip.spw
[MOD] .agents/plans/spw-site-install/spw-site-install.spw
[MOD] .agents/plans/absorb-spwq-cli/PLAN.md
[MOD] .agents/plans/absorb-spwq-cli/wip.spw
[MOD] .agents/plans/lsp-custom-request-completions/PLAN.md
[MOD] .agents/plans/lsp-custom-request-completions/wip.spw
[MOD] .agents/plans/vscode-plugin-performance/PLAN.md
[MOD] .agents/plans/vscode-plugin-performance/wip.spw
[MOD] .agents/plans/vscode-workspace-atlas/wip.spw
[MOD] .agents/plans/intellij-plugin-integration/PLAN.md
[MOD] .agents/plans/intellij-plugin-integration/wip.spw
[MOD] .agents/plans/intellij-lsp4ij/PLAN.md
[MOD] .agents/plans/intellij-lsp4ij/wip.spw
[MOD] .agents/plans/neovim-spw-surfaces/PLAN.md
[MOD] .agents/plans/neovim-spw-surfaces/wip.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
[MOD] .agents/plans/plan-ecology-clustering/wip.spw
[MOD] .agents/plans/ecosystem-surface-governance/wip.spw
[MOD] .agents/plans/obsidian-spw/references/obsidian-api.spw
[MOD?] active plan surfaces that reference the retired named-domain registry
```

### Craft guard

- Keep the audit contract capability-based; do not turn it into a feature checklist detached from author tasks.
- Shared semantics belong to seed/LSP contracts. Editor plans describe projection and interaction, not parallel semantic implementations.
- Use repository-relative or protocol-placeholder paths only.
- Preserve transferable surface qualities as archetypes; do not replace retired identifiers with disguised aliases or ownership claims.
- Keep the new skill concise and deterministic about authority, exclusions, provenance, and output ownership.
- No updated file should cross 600 lines because of this pass; the large plan-ecology artifact receives only registration and routing changes.

## Commits

1. `.[plans] =scope[mounted-consumer-tooling] — define portable audit and planning boundary`
2. `.[surfaces] =abstract[archetypes] — retire specific domains while preserving reusable surface qualities`
3. `.[mount,tooling] =contract[consumer-repository] — abstract mount language and editor audit axes`
4. `.[plans,cli] =prioritize[portable-observability] — align root discovery, doctor, capabilities, and review orchestration`
5. `.[plans,lsp,editors] =audit[evidence] — align LSP, VS Code, IntelliJ, and NeoVim review plans`
6. `.[skills] =review[mounted-consumer] — add portable authority and provenance workflow`
7. `![docs,plans,skills] *verify[portability] — validate identifier removal, syntax, references, plan caches, and skill metadata`

Fuzz strategy:
- Explore: `rg` for named-consumer and machine-local path leakage in changed operational surfaces.
- Stabilize: targeted `spw:plan:check`, mounted-consumer skill validation, and `.spw` syntax review.
- Ship: `npm run lint:spw`, `npm run lint:docs`, and staged commit review.

## Agentic Hygiene

- Rebase target: `main@131ac93f`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; working tree was clean at plan creation

## Dependencies

- `spw-site-install` — owns the mount and authority boundary
- `plan-ecology-clustering` — owns cross-plan priority and interaction-target grouping

## Failure Modes

- **Hard**: a consumer review scans `.spw/_workbench` as consumer-authored content or emits machine-local paths.
- **Soft**: editor matrices describe advertised capability without evidence or collapse native affordances into false parity.
- **Non-negotiable**: no specific domain, named consumer repository, private corpus, or local filesystem location remains in active portability or surface fixtures.

## Validation

- **Hypothesis**: one abstract fixture shape can describe CLI, LSP, and editor behavior across independent mounted consumers.
- **Negative control**: transferable ethos survives as archetypes without implying ownership, availability, or a predicted deployment form.
- **Demo sequence**: discover consumer root → resolve mount → inventory CLI/LSP/editor capability → run probes → write consumer-owned evidence with consumer and workbench revisions.

## Spw Artifact

`.agents/plans/mounted-consumer-tooling/mounted-consumer-tooling.spw`

The artifact records the portable vocabulary, authority boundary, audit axes, evidence contract, and plan routing shared by CLI, LSP, and editor work.
