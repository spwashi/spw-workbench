# Plan: spw-site-install

Define and implement the submodule-based installation model for `.spw` in external site codebases. Each site repo owns its `.spw/` surface; the workbench lives at `.spw/_workbench` as infrastructure, providing parser, runtime, LSP, CLI, and spec library.

## Goal

External codebases (factshift.com, boon.land, lore.land) need a clear path to integrate Spw without becoming consumers of an npm registry. The model is engagement and exchange between independent repositories — each site has its own identity, its own `.spw/` canon surface, and a submodule relationship to the workbench that provides the language engine.
This is the ecological anchor for the current planning wave: once the boundary at `.spw/_workbench` is real, governance, diagnostics, CLI naming, editor startup, and release narrative can each mature in parallel without collapsing site identity into the workbench.

Three concrete outcomes:

1. **`git submodule add` at `.spw/_workbench`**: a site repo gains parser, runtime, LSP, CLI, and spec library access through a single submodule. The `_` prefix signals infrastructure, not content.
2. **Mount protocol**: each site's `.spw/mount.spw` declares which workbench surfaces it engages with, what spec version it tracks, and how resolution paths flow from site content through the workbench engine.
3. **Independent identity**: a site's `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/conventions/` are its own — not copies of the workbench's canon. The workbench is the engine; the site is the author.
4. **Repo-local review loop**: a model working from the site root reads site-owned `.spw/` as authority and mounted `_workbench` surfaces as instruments. Its findings remain site-owned, record the pinned workbench revision, and cross the boundary upstream only through explicit human-selected exchange.

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
  - Init templates: minimal site-local surfaces (not workbench copies)
  - CLAUDE.md fragment: what a site's harness should say about .spw
  - Repo-local model review contract: discovery order, authority boundary, evidence/provenance fields, output location, and upstream exchange gate
  - Review fixture: exercise the contract against `spwashi.com` and `lore.land` without copying their canon into the workbench

- **Out of scope**: npm package publishing (npm remains an option but not the primary path), workbench internal architecture, LSP server implementation, diagnostic station codes (runtime-dx-foundation), automatic upstream publication of site findings, or treating private site material as workbench fixtures.

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
8. `&[templates] — create index.spw and workspace.spw templates for site-local canon`
9. `&[templates] — create CLAUDE.md fragment for .spw-enabled site codebases`
10. `![cli-init] — verify spw init creates correct .spw/ structure alongside existing _workbench submodule`

### CLI Resolution
11. `&[cli] — add submodule-aware path resolution: spw commands find packages via .spw/_workbench/`
12. `![cli] — verify spw commands work when invoked from a site repo with _workbench submodule`

### Editor Integration
13. `&[vscode] — add .spw/_workbench detection: extension finds LSP server from submodule path`
14. `![vscode] — verify extension activates correctly in a site repo with only .spw/_workbench`

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
24. `![site-review] — verify spwashi.com and lore.land reviews remain site-owned and revision-aware`

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
- `ecosystem-surface-governance` — launch ladder determines which surfaces are engageable
- `lsp-lore-upstream-bridge` — LSP entry point must support submodule-relative resolution
- `vscode-lsp-integration` — extension startup and thin-client expectations should align with submodule-relative LSP discovery
- `v030-release-prep` — release narrative should describe this install model truthfully rather than defaulting to npm-publish language
- `ecosystem-surface-governance` — installability should require one successful repo-local review without authority leakage across the mount boundary

## Spw Artifact

`.agents/plans/spw-site-install/spw-site-install.spw`

The artifact should formalize: the submodule convention (`_` prefix = infrastructure), the mount protocol (version, engagement, resolution), the engagement model (which surfaces a site selects), the exchange model (how sites contribute back), and the boundary invariant (site owns .spw/; workbench owns .spw/_workbench/).
