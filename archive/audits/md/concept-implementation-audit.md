# Concept Implementation Audit

Date: 2026-02-15
Scope: repository-wide concept maturity review (runtime formalization, semantic UI contract, authoring, keyboard)

## Purpose
This document identifies concepts that are already present in architecture/docs but only partially implemented in code, and ranks them by implementation leverage.
The priority queue is leverage-ranked; the execution order below is dependency-adjusted.

## CSS Audit Alignment (2026-02-15)

Repository classname audit snapshot:
- CSS selector inventory (refined): `963` unique class selectors, `698` non-`spw-*` (`72.5%`).
- Namespace concentration: `spw` remains the largest prefix family, but a large long tail of un-namespaced families remains (`geology-*`, `flow-*`, `context-*`, `panel-*`, `register-*`, etc.).
- Highest drift files (unique-selector density):
  - `src/features/keyboard/geology/components/keybinding-geology.css` (`137/137` non-`spw-*`)
  - `src/styles/geology-subsystems.css` (`54/54` non-`spw-*`)
  - `src/styles/layout.css` (`79/95` non-`spw-*`)

Evidence of contract drift and collision risk:
- Canonical naming contract is documented as `.spw-{domain}-{component}` in `docs/patterns.spw:26`.
- App-level guidance reinforces namespacing in `src/style.css:10`.
- Collision-prone, unscoped selectors are duplicated across imported files:
  - `.context-toggle-btn` in `src/styles/layout.css:327` and `src/features/keyboard/geology/components/keybinding-geology.css:537`
  - `.register-entry` in `src/styles/geology-subsystems.css:89` and `src/features/keyboard/geology/components/keybinding-geology.css:1903`
  - `.target-row` in `src/styles/geology-subsystems.css:191` and `src/features/keyboard/geology/components/keybinding-geology.css:2032`
- These style sheets are both globally imported in sequence (`src/styles/index.css:81` then `src/styles/index.css:82`), so behavior can be order/specificity dependent.
- Compatibility aliases are intentionally present in `src/styles/compat.css:67`, so not all non-`spw-*` selectors are defects; alias use needs explicit lifecycle ownership.

Mitigations applied (in-progress):
- Scoped context panel selectors under the canonical anchor `.spw-panel-context` to prevent global leakage from generic class/data selectors:
  - `src/styles/layout.css`
  - `src/features/keyboard/geology/components/keybinding-geology.css`
  - `src/styles/geology-subsystems.css`
- Began converging toggle visuals on ARIA state (`[aria-checked="true"]`) with `.active` retained as a compatibility class during migration.

## Priority Queue (Leverage Ranking)

### 1) CSS classname contract convergence (highest leverage for UI consistency)
Status: Partial (contract documented, implementation fragmented)

Evidence:
- Naming contract and token namespace direction exist in `docs/patterns.spw:26`.
- Practical guidance to keep selectors namespaced is present in `src/style.css:10`.
- Current stylesheet inventory shows `72.5%` non-`spw-*` selectors, with dense drift in geology/context styles.
- Duplicate unscoped selectors (`.context-toggle-btn`, `.register-entry`, `.target-row`) are defined in multiple globally imported files.

What is missing:
- A canonical class taxonomy with explicit status (`canonical`, `compat`, `deprecated`) per selector family.
- Scope-safe geology/context naming that does not rely on generic selectors shared with global layout.
- Automated checks for duplicate unscoped selectors and new non-`spw-*` growth outside compatibility zones.

Implementation target:
- Introduce a class contract registry and migration map (canonical `spw-*` + explicit legacy aliases).
- Migrate geology/context selectors to scoped canonical names with dual-selector compatibility during transition.
- Add CI checks for selector drift/collision and phase out legacy aliases by subsystem.

---

### 2) Semantic trajectory runtime
Status: Partial (design-heavy, runtime-light)

Evidence:
- `RUNTIME-TRAJECTORY-MODEL.md` defines `SemanticTrajectory`, `TransitionStep`, register semantics, and deterministic hashing, but this model is not fully reflected in runtime execution.
- `src/runtime/index.ts:145` still labels goals/pipeline exports as "stubs for experiments".

What is missing:
- Per-step transition capture (state_before/state_after + operator metadata)
- Unified trajectory object persisted per execution
- Deterministic `trajectory_hash` exposure

Implementation target:
- Add trajectory types + recorder path in interpreter execution flow.

---

### 3) Unified trace spine (lex -> parse -> semantic -> flow -> runtime)
Status: Partial

Evidence:
- A lifecycle trace system exists in `src/infra/lifecycle/trace.ts:119`.
- Parser tracing is currently a separate parser-local model (`buildTrace`) in `src/seed/parser/trace.ts:58`, re-exported from `src/seed/parser/index.ts:20`.
- Runtime lexing currently emits stage events and parse events in `src/runtime/pipeline/lex.ts:17`, not a unified lifecycle trace event stream.

What is missing:
- End-to-end deterministic event stream through all major phases
- Tight coupling of trace stream to lifecycle/timing and inspector consumers

Implementation target:
- Emit trace events from parser/runtime and use them as the single source for timing/lifecycle + inspector step views.

---

### 4) Golden determinism fixtures and snapshot expectations
Status: Scaffold-only

Evidence:
- `src/seed/__tests__/snapshots/phase-4-golden/expected-outputs.json:3`
- Placeholder expectations at:
  - `src/seed/__tests__/snapshots/phase-4-golden/expected-outputs.json:10`

What is missing:
- Real expected token/AST/flow fixtures
- Real hash baselines for determinism checks

Implementation target:
- Replace TODO placeholders with generated baselines from current parser/runtime.

---

### 5) Structured authoring scaffolding (behavioral completion)
Status: Partial

Evidence:
- Scaffolding is rendered as labels only in `src/app/components/authoring-editor.ts:546`.
- Content layer supports block updates (`updateBlock`) in `src/publishing/authoring/content-manager.ts:175`, but scaffolding UI is not wired to it.

What is missing:
- Per-block editable inputs
- Block content lifecycle integration (outline, metrics, diagnostics)

Implementation target:
- Wire scaffold blocks to `ContentManager.updateBlock(...)` and persist/display block data.

---

### 6) Vim operator semantics (d/y/c)
Status: Partial/stubbed

Evidence:
- Placeholder/TODO implementations in `src/features/keyboard/vim/vim-operators.ts`:
  - `:60`
  - `:63`
  - `:126`
  - `:135`

What is missing:
- AST-aware desugar/change transforms
- True semantic yank payloads (beyond JSON-like fallback)
- Full operator-motion integration in runtime behavior

Implementation target:
- Implement operator transforms against AST node kinds and integrate motion pipelines.

---

### 7) Semantic cross-highlighting (geology <-> flow)
Status: Partial

Evidence:
- TODO and fallback "highlight all" behavior in:
  - `src/app/components/cross-highlighting.ts:124`
  - `src/app/components/cross-highlighting.ts:158`

What is missing:
- Semantic matching rules from node/binding type to target visual entities

Implementation target:
- Introduce typed mapping layer and targeted highlight resolution.

---

### 8) Data-attribute semantic contract completeness
Status: Partial

Evidence:
- A typed attribute registry already exists in `src/core/conventions/data-attributes.ts:30`.
- State manager emits rich per-region data attributes in `src/infra/state/state.ts:542`.
- Runtime attribute stamping is still largely hand-authored in projection paths, so parity with the contract is not automatically enforced.

What is missing:
- Strict parity checks between typed attribute contracts and emitted DOM attributes
- Automated validation/test gates to prevent contract drift

Implementation target:
- Use the existing typed registry as the source of truth and enforce contract parity in state-to-DOM projection/tests.

---

### 9) Onboarding telemetry depth
Status: Partial

Evidence:
- Placeholder metrics in `src/features/onboarding/persistence.ts`:
  - `:63` usedFeatures TODO
  - `:64` parseCount TODO
  - `:65` sessionTime TODO

What is missing:
- Real feature usage, parse frequency, and session duration tracking

Implementation target:
- Instrument onboarding analytics from existing app/parse/interaction events.

## Suggested Execution Order (Dependency-Adjusted)
1. CSS classname contract convergence
2. Semantic trajectory runtime
3. Unified trace spine
4. Golden determinism fixtures
5. Vim operator semantics
6. Semantic cross-highlighting
7. Structured authoring scaffolding
8. Data-attribute contract completion
9. Onboarding telemetry depth

## Why this order
- Item 1 stabilizes the semantic UI contract and reduces CSS regression noise before deeper feature work.
- Items 2-4 establish deterministic runtime infrastructure and testability.
- Items 5-7 then deliver user-visible semantic behavior on top of that foundation.
- Items 8-9 harden observability and product feedback loops.
