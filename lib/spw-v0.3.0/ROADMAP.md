# Spw v0.3.0 Roadmap

## Current: v0.3.0 (March 2026)

**Theme**: monorepo workspace and structural decoupling

Shipped:
- Complete core and runtime contract stubs
- Package boundary documentation (seed, runtime, LSP, CLI)
- Surface/plugin protocol documentation
- Plan archive and triage
- Version bump and release bundle

## Next: v0.4.0 (April 2026)

**Theme candidates**: runtime extensibility and surface maturity

### Package extraction
- [ ] `spw-seed` publishes independently (own `package.json`, own test suite)
- [ ] `spw-runtime` publishes independently
- [ ] Cross-package import direction enforced by lint rule
- [ ] `spw-lsp` and `spw-cli` consume seed/runtime as workspace dependencies

### Runtime
- [ ] Register bank extensibility seams (custom register types)
- [ ] Pipeline stage hooks (before/after parse, normalize, interpret)
- [ ] Runtime telemetry as first-class substrate events
- [ ] Cache-IR exploration for repeated parse patterns

### Surfaces and plugins
- [ ] First concrete plugin implementation (changelog or taxonomy)
- [ ] Plugin discovery integrated with workspace index
- [ ] `.spw` surface for delta tracking and changelog generation

### Documentation architecture
- [ ] `.spw` index surfaces for `packages/` and `surfaces/` strata
- [ ] Contract stubs upgraded from v0.3.0 → v0.4.0 scaffold
- [ ] Lint check for v0.3.0 contract scaffold (Source Links, Migration Notes, v0.4.0 Candidates)

### Editor extensions
- [ ] VS Code extension published to marketplace
- [ ] IntelliJ plugin published to JetBrains marketplace
- [ ] Neovim plugin installable via lazy.nvim / packer

### Quality
- [ ] Curriculum plans (HTML/CSS, SVG, terminal/logic) revived or explicitly deferred
- [ ] Audit plans (CSS tokens, data attributes, UI models) absorbed into skills or archived
- [ ] Fuzz profile system stabilized for CI integration

## Future: v0.5.0+ (May 2026+)

**Theme candidates**:
- Live surfaces: web components bound to `$%[metrics]`
- Collaborative editing: CRDT or git-sync for shared `.spw` state
- Computational plugins: probes that write results back to `.spw` files
