# Plan: citation-navigation

Design a workbench atlas for constructs, evidence, and collaborative inquiry. The directory name is retained so earlier links remain valid.

## Goal

Make a novel Spw codebase imaginable through structural movement, authored relationships, evidence trails, and resumable inquiry. Preserve the useful existing editor features while auditing whether their architecture and information organization support those journeys. Taste: legibility, semantic correctness, and continuity between human and agent sessions.

## Scope

- **Design in scope**: construct navigation, question-led information architecture, LSP/plugin responsibility audit, reading trails, evidence provenance, and model-independent consultation parcels.
- **Current work**: plan-local design and evidence documents. Consultations are prepared for the human to take into other sessions; none have been dispatched.
- **Implementation selection**: audit first, then choose one end-to-end journey. Citation freshness remains a candidate within the larger design.
- **Out of scope**: automatic agent dispatch, grammar invention, source rewrite before evidence, consumer site changes, mount updates, plugin publishing.
- Entry: `workbench-atlas.spw`; choose a parcel in `consultation.spw` rather than reading the entire collection.
- **Named-root anchors (p8, 2026-10-13)**: the owner chose the ref form `@tree#src_x` in `syntax-hardware-alignment`, and it is routed here together with refs outside strings. This is not grammar invention, because the form already parses; the work is reading it.
  - The parser reader keeps it.
  - `spw resolve`, the cut gate, and the LSP find its file through the root declared in `.spw/workspace.spw` and that directory's anchor index.
  - The editors color it as one citation.
  - The regex fallback and graph scanners stop reading refs inside strings and comments.
  - First consumer: `.spw/caches` (`@tree`, `@journal`). Its tree migration runs in `caches-living-tree` after these commits land.

## Files

The original citation slice below is conditional; audit findings choose the implementation rather than treating this list as an instruction to patch.

- [NEW] .agents/plans/citation-navigation/workbench-atlas.spw — architecture, journeys, relation semantics, and delivery gates.
- [NEW] .agents/plans/citation-navigation/consultation.spw — four independent consultation parcels and integration contract.
- [NEW] .agents/plans/citation-navigation/evidence-cache.spw — source observations, hypotheses, probe results, and invalidation.

- [MOD] packages/spw-lsp/src/handlers/navigation.ts — prefer current target buffers for fragment resolution.
- [NEW] packages/spw-lsp/src/handlers/citation.ts — inspect one parser-extracted citation with explicit resolution evidence.
- [MOD] packages/spw-lsp/src/__tests__/fragment-navigation.test.ts — URI-specific buffers and moved/deleted anchors.
- [NEW] packages/spw-lsp/src/__tests__/citation.test.ts — classifications, consumer ownership, missing targets.
- [MOD?] packages/spw-lsp/src/stdio-server.ts — register request after examining the existing dispatch seam.
- [MOD?] packages/spw-lsp/src/workspace-protocol.ts — typed request/response if this is the correct protocol owner.
- [MOD?] packages/spw-cli/src/resolve.ts — reuse existing citation semantics; preserve its public output contract.
- [MOD?] packages/spw-cli/src/resolve.test.ts — shared cross-surface examples.
- [MOD] extensions/vscode-spw/src/lsp/custom-requests.ts — typed citation inspection.
- [MOD] extensions/vscode-spw/src/commands.ts — inspect current citation and offer navigation.
- [MOD] extensions/vscode-spw/package.json — command registration.
- [MOD?] extensions/neovim-spw/lua/spw/navigation.lua — request-backed inspection with explicit fallback.
- [MOD?] extensions/neovim-spw/lua/spw/commands.lua — command entry.
- [MOD?] extensions/intellij-spw/README.md — verified native LSP boundary and limitations.
- [NEW] .agents/plans/citation-navigation/PLAN.md
- [NEW] .agents/plans/citation-navigation/wip.spw
- [NEW] .agents/plans/citation-navigation/citation-navigation.spw — proposed navigation contract and verification probes.

Named-root anchors (p8) and refs outside strings:
- [MOD] packages/spw-lsp/src/spw-selector.ts — keep a root with a bare fragment as a rootRef; step-3 regex fallback only for a source the parser rejects
- [MOD] packages/spw-seed/src (selectPathRefs or its root-ref sibling) — the same reading in the seed, so CLI and LSP agree
- [MOD] packages/spw-cli/src/resolve.ts — a named_root basis: workspace root, then that directory's anchor index for a bare fragment
- [MOD] packages/spw-lsp/src/handlers/{navigation,analysis,display}.ts — go-to, diagnostics naming the searched root, hover, anchor completion
- [MOD] packages/spw-cli/src/corpus-scan.ts — graph and census edges from the parse, not from text inside strings
- [MOD] scripts/analyzers/spw-cut-gate.ts — resolve @tree and @journal refs and keep per-layer anchor uniqueness
- [MOD] extensions/vscode-spw/syntaxes/spw.tmLanguage.json, extensions/intellij-spw lexer — one citation scope for @root#anchor
- [MOD] tests beside each: fixtures for both forms, a root that is a file, a missing anchor, and a root path quoted inside a string

### Craft guard

Display is already 1461 lines and the Concepts tree 750: audit responsibilities before adding more behavior; size alone does not justify extraction. Navigation is already 465 lines; extract citation inspection instead of expanding its responsibilities. Protocol is 348 lines. Keep new modules below 400 lines and 12 imports; inspect client command size before adding behavior. Disclosure is on demand; no timing or affect constants are introduced.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

The rows come from the Mounted-consumer asks table in the vscode-lsp-roadmap plan. The file-scoped alias binder stays a question (`?[alias_binder]`) until the language contract states binding rules.

## Agentic Hygiene

- Rebase target: main@462f6478a78a42be6d2197a7329ab1826b40a7f6.
- New isolated branch: codex/citation-navigation; clean main baseline.
- Rebase cadence: check before first commit and before merge; no existing feature history to rebase.
- Hygiene split: none. The human waived planning for the bounded parser repair and authorized integration; the broader atlas remains a design proposal.

## Dependencies

None. Existing CLI resolve already classifies citations; re-check current implementations before promoting older consumer findings to defects.

## Failure Modes

- Unsaved target changes make disk-derived line addresses stale.
- Missing anchors must be distinguished from missing files, while preserving useful file navigation.
- Client fallback must not imply the server inspected a target.
- Consumer scans exclude mounted infrastructure; explicit references into infrastructure remain navigable.
- No consumer identifiers, excerpts, or machine-local paths enter portable implementation fixtures.

## Validation

- Observed by code inspection: fragmentRange reads disk directly; definition and documentLinks both use it. Existing tests only exercise disk-backed targets.
- Existing CLI resolve and parser classifyCitation are implemented, so the historical request for citation classification is not treated as wholly unimplemented.
- Explore: targeted navigation and citation fixtures, including unsaved moves/deletions and quoted prose negative controls.
- Stabilize: LSP and CLI suites, typed client checks, mounted-root exclusion and explicit mount navigation controls.
- Ship: relevant package builds and editor smoke checks; report configured, invoked, observed, and tested separately.
- Fuzz strategy: use bounded malformed citation cases in the targeted suites; repository fuzz scripts are broad wrappers, so do not invent unsupported scope flags.
- Baseline: 15 existing tests pass across outline and fragment-navigation suites; this is not proof of proposed atlas behavior. Exact invocation is retained in evidence-cache.spw.

## Spw Artifact

- `workbench-atlas.spw`: primary design entry; four reader questions, structural and semantic movements, architecture, journeys, and evaluation.
- `consultation.spw`: portable invitations, output contract, disagreement handling, and integration order.
- `evidence-cache.spw`: revisable source observations and actual test results.
- `citation-navigation.spw`: retained detailed candidate slice; its first-slice priority is superseded by the atlas audit gates.
- `wip.spw`: append-only development stream and current routing.

Consultation findings may change the design substantially. No proposal is marked implemented, and no live plugin evaluation has occurred.

## Landed slice

The separately authorized plan-stream lexer repair connects Spw.p to lossless line handling. It preserves punctuation and ordinary stream delimiters; all 777 seed tests, seed typechecking, and targeted lint pass. Atlas, citation freshness, and editor redesign remain proposed.
