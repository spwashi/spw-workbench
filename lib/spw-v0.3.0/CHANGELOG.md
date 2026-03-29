# Spw v0.3.0 Changelog

## v0.3.0 — 2026-03-26

This entry records the structural milestone that already landed in the repo. It does not claim the public release gates are closed yet.

### Already landed

- Complete all 10 core contract stubs: BOUNDARIES, CAPSULES, CONFORMANCE, CONTAINERS, INTEGRITY, LAYERS, OPERATORS, SAFETY, SEEDS, SPEC.
- Establish workspace topology with extracted seed, runtime, LSP, and CLI package boundaries.
- Introduce `packages/` and `surfaces/` spec library strata.
- Upgrade the documentation scaffold with Source Links, Migration Notes, and v0.4.0 Candidates sections.
- Archive 9 superseded v0.2.0 plans and consolidate the active planning surface.
- Document runtime extensibility seams and agent-tool decoupling.

### Still pending as public gates

- Install truth: the external site mount story is now explicit in quick-start, migration, and release-story docs; the remaining gate is final agreement with runtime, CLI, and editor behavior.
- Governance truth: surface admission and launch readiness now route through registry-backed installable and readiness metadata; the remaining gate is release-copy agreement with that registry.
- Discoverability truth: release-facing copy and extension-facing claims are now explicitly preview-scoped where needed; the remaining gate is keeping startup truth narrower than marketplace ambition.

### Release posture

- The repository is structurally ahead of the written release story.
- The changelog should stay honest about what is already true in-repo versus what is still gated.
- The last pre-tag question is no longer "did we write the gates down?" but "do those gates agree across docs, registry, CLI, and editor surfaces?"
- v0.4.0 remains the forward-staged roadmap, not the current public claim.
