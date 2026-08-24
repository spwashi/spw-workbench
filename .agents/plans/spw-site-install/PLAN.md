# Plan: spw-site-install

Define and implement the submodule-based installation model for `.spw` in consumer repositories. Each consumer owns its `.spw/` surface; the workbench lives at `.spw/_workbench` as infrastructure, providing parser, runtime, LSP, CLI, spec library, and review instruments.

## Goal

Independent repositories need a clear path to integrate Spw without becoming consumers of an npm registry or disclosing their identity to workbench canon. Each consumer has its own `.spw/` canon surface and mounts the workbench only as language and review infrastructure.
This is the ecological anchor for the current planning wave: once the boundary at `.spw/_workbench` is real, governance, CLI observability, LSP diagnostics, and editor startup can mature without collapsing consumer identity into the workbench.

Five concrete outcomes:

1. **`git submodule add` at `.spw/_workbench`**: a consumer gains parser, runtime, LSP, CLI, and spec access through one mount. The `_` prefix signals infrastructure, not content.
2. **Mount protocol**: `.spw/mount.spw` declares engaged workbench surfaces, tracked version, and resolution paths.
3. **Independent authority**: consumer-owned `.spw/index.spw`, `.spw/workspace.spw`, and conventions are not copies of workbench canon.
4. **Repo-local review loop**: a model reads consumer-owned `.spw/` as authority and mounted surfaces as instruments; evidence stays consumer-owned and records both revisions.
5. **Observable tooling**: roots, doctor, capabilities, and review commands make CLI, LSP, and editor audits reproducible.

Taste note: improve **clarity** and **layering**. The site owns its surfaces. The workbench provides the tools. The boundary is the `_` prefix.

## Scope

- **In scope**:
  - Submodule setup: `git submodule add <workbench-url> .spw/_workbench`
  - `spw init` command: scaffold `.spw/` with mount.spw, index.spw, workspace.spw (resolving CLI from `.spw/_workbench/`)
  - Mount protocol: `.spw/mount.spw` declares workbench version, engaged surfaces, resolution paths
  - Engagement model: how a site selects which spec subsystems, conventions, and patterns to adopt
  - Exchange model: how a site contributes surfaces back (canon extensions, dialect registrations)
  - CLI resolution: `spw` commands resolve from `.spw/_workbench/packages/spw-cli/`
  - LSP resolution: editor finds LSP server at `.spw/_workbench/packages/spw-lsp/`
  - Editor auto-detection: extension discovers `.spw/_workbench` and starts LSP from that path
  - Health check: `spw doctor` verifies submodule present, parser loadable, LSP reachable
  - Init templates: minimal consumer-local surfaces (not workbench copies)
  - CLAUDE.md fragment: what a site's harness should say about .spw
  - Repo-local model review contract: discovery order, authority boundary, evidence/provenance fields, output location, and upstream exchange gate
  - Review fixture: exercise the contract against generated identity-free consumer repositories without copying external canon into the workbench
  - CLI observability: plan relative root discovery, machine-readable health/capability snapshots, and review orchestration

- **Out of scope**: npm package publishing (npm remains an option but not the primary path), workbench internal architecture, LSP server implementation, diagnostic station codes (runtime-dx-foundation), automatic upstream publication of site findings, or treating private site material as workbench fixtures.

## Consumer-readable compatibility contract

A mounted consumer must not need a repository name, private migration story, or scalar release guess to determine whether the workbench fits. `mount.spw`, `spw capabilities --json`, and `spw doctor --json` should disclose a compatibility vector:

- exact consumer and workbench revisions;
- language edition and syntax/profile stack;
- parser/AST, canonical product, runtime, and CLI envelope schemas;
- supported output forms and progressive-event protocol;
- engaged capabilities with `implemented`, `measured`, `proposed`, or `interpretive` status;
- retention/privacy policy for generated evidence and the human-gated exchange boundary.

`v0.4` may later name a language compatibility gate, but it must not imply that package layout, runtime protocol, editor projection, or every consumer profile advanced at the same pace. Consumers compare the dimensions they actually depend on.

## Files

```text
[MOD] packages/spw-cli/src/init.ts
[MOD] packages/spw-cli/src/doctor.ts
[MOD] packages/spw-cli/templates/init/base/.spw/mount.spw
[NEW] packages/spw-runtime/src/site-install.ts
[MOD] packages/spw-runtime/src/index.ts
[MOD] packages/spw-lsp/src/helpers.ts
[MOD] packages/spw-lsp/src/server-index.ts
[NEW] docs/runtime/md/site-install-guide.md
[NEW] docs/runtime/md/mount-protocol.md
[NEW] .spw/conventions/submodule.spw
[NEW] .agents/plans/spw-site-install/spw-site-install.spw
[MOD] src/runtime/__tests__/spw-init-portability.test.ts
[MOD] src/runtime/__tests__/spw-site-doctor.test.ts
[NEW] src/runtime/__tests__/spw-site-install.test.ts
```

### Craft guard

- `packages/spw-cli/src/init.ts` should be under 300 lines — scaffold logic only.
- Templates are static `.spw` with placeholder comments — no template engine dependency.
- `spw init` must work offline (no network calls; submodule add is a separate git step).
- Mount protocol uses tilde-relative paths: `~"_workbench/lib/spw-v0.3.0/"`.
- Do not bundle workbench-internal surfaces (`.agents/`, `prompts/`, test fixtures) into site resolution paths.
- The `_` prefix convention must be respected: `.spw/_workbench` is never enumerated as a content surface.

## Commits

Commits 1-3 establish the shared boundary and mount contract. After that, CLI init, CLI resolution, editor detection, health checks, and documentation can run as parallel lanes against the same submodule model.

The submodule convention, mount resolver, portable init/doctor surfaces, and plan artifact have landed on `main`, though not always under the original commit numbering. The next coherent implementation slice is the repo-local review contract; remaining CLI/editor/docs items should be reconciled against that contract rather than replayed mechanically.

### Submodule Convention
1. `#[submodule] — define .spw/_workbench submodule convention and _-prefix semantics`
2. `.[conventions] — add .spw/conventions/submodule.spw documenting the engagement model`

### Mount Protocol
3. `#[mount] — formalize mount.spw protocol: version tracking, surface engagement, resolution paths`
4. `&[mount] — implement mount resolution in spw-runtime: read mount.spw, resolve spec paths through _workbench`
5. `![mount] — verify mount resolution finds spec library, parser, and runtime from submodule path`

### CLI Init
6. `&[cli-init] — implement spw init: scaffold .spw/ with mount, index, workspace (resolve CLI from _workbench)`
7. `&[templates] — create mount.spw template with submodule connection and version pin`
8. `&[templates] — create index.spw and workspace.spw templates for consumer-local canon`
9. `&[templates] — create CLAUDE.md fragment for .spw-enabled consumer repositories`
10. `![cli-init] — verify spw init creates correct .spw/ structure alongside existing _workbench submodule`

### CLI Resolution
11. `&[cli] — add submodule-aware path resolution: spw commands find packages via .spw/_workbench/`
12. `![cli] — verify spw commands work when invoked from a consumer repository with _workbench mounted`

### Editor Integration
13. `&[vscode] — add .spw/_workbench detection: extension finds LSP server from submodule path`
14. `![vscode] — verify extension activates correctly in a consumer repository with only .spw/_workbench`

### Health Check
15. `&[cli-doctor] — implement spw doctor: verify submodule present, parser loadable, LSP reachable`
16. `![cli-doctor] — verify spw doctor output is actionable for each failure mode`

### Engagement & Exchange
17. `#[engagement] — define engagement protocol: how a site selects spec subsystems and conventions`
18. `#[exchange] — define exchange protocol: how a site contributes surfaces back to the ecosystem`

### Documentation
19. `.[docs] — write site-install guide: submodule setup, init, mount, editor, health check`
20. `.[docs] — write mount protocol reference`
21. `.[plans] — write spw-site-install.spw artifact formalizing the submodule integration model`

### Repo-local Review
22. `#[site-review] — define mounted-workbench discovery, authority, provenance, and output contract`
23. `&[site-review] — expose a portable review entrypoint to repo-local models`
24. `![consumer-review] — verify identity-free reviews remain consumer-owned and revision-aware`
25. `&[cli,consumer] — expose roots, doctor, capabilities, and review orchestration contracts`
26. `![cli,consumer] — verify relative-path output and distinct failure states in generated fixtures`

Fuzz strategy:
- Explore: `npm run test:seed` (ensure templates parse)
- Stabilize: `npm run fuzz:types && npm run test:run`
- Ship: `npm run fuzz:ship`

## Agentic Hygiene

- Rebase target: `main@5ed7abce` (2026-03-28)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- `absorb-spwq-cli` — CLI command taxonomy must be settled (spw init, spw doctor placement)
- `runtime-dx-foundation` — diagnostic station model for spw doctor
- `ecosystem-surface-governance` — launch ladder determines which surfaces are engageable, and installability requires one repo-local review without authority leakage across the mount boundary
- Landed standalone LSP entrypoint — mount resolution must continue to work without repository-specific bootstrap code
- `vscode-lsp-integration` — extension startup and thin-client expectations should align with submodule-relative LSP discovery
- Archived release evidence — future release narratives must describe this install model truthfully rather than defaulting to npm-publish language
- `cli-sense-reorientation` — progressive human, Spw, JSON, and event output should disclose one stable product rather than fork meaning by format
- `cli-benchmarking-infra` — installability claims need revision-aware time-to-first-output, completion, memory, and failure evidence from identity-free consumer shapes

## Spw Artifact

`.agents/plans/spw-site-install/spw-site-install.spw`

The artifact should formalize the submodule convention, mount protocol, selective engagement, explicit exchange gate, observable CLI contract, and boundary invariant: the consumer owns `.spw/`; the workbench owns `.spw/_workbench/`.
