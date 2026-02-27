# Plan: audit-ui-data-models

## Goal

Conduct a forensic, curricular audit of UI component clusters to uncover implicit **developer knowledge** and formalize it into rigorous, mathematical data models. Crucial business logic, spatial topologies, and state transitions are currently hidden within `if/else` UI rendering blocks. This masterclass will extract that ad-hoc state, model it as explicit "Spw-ethos" algebras (branded unions, discriminated state machines, total functions), and push those models down into the `domain` or `algebraic` layers.

This acts as the "brains" complementing the "brawn" of two parallel plans:
- **`audit-css-tokens`**: Ensures the visual aesthetics are strictly codified.
- **`audit-data-attributes`**: Ensures the DOM state synchronization is predictable.
- **This Plan**: Ensures the *internal* algebraic memory model driving those tokens and attributes is linguistically pristine.

**Taste Note:** Actively develops **taste in data modeling** by moving from primitive obsessions (`boolean`, `string`) to rigorous type algebras (`Valence`, `GeologyIntent`). Improves **correctness** (making illegal UI states unrepresentable) and **expressiveness** by creating a vocabulary the entire app can share.

## Scope

- **In scope**: A deep 5-phase curricular audit: Foundational Algebras, Settings/Atmosphere Formalization, Topological Keyboard Domains, Visual Calculus Parameters, and Workspace Integrations. Scanning `src/ui/elements/` for primitive obsessions and replacing them.
- **Out of scope**: Changing the visual layout or behavior of the application. The user should not notice a difference; the compiler and the architects will.

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/audit-ui-data-models-agentic-hygiene` before implementation commits

## Files

Predicted file changes:
```
[NEW] src/core/models/valence-algebra.ts
[NEW] src/core/models/topology-intents.ts
[NEW] src/core/models/visual-calculus.ts
[NEW] src/core/models/workspace-machines.ts
[MOD] src/ui/elements/settings-panel/**/*.ts
[MOD] src/ui/elements/kbd/**/*.ts
[MOD] src/ui/elements/shader-inspector/**/*.ts
[MOD] src/ui/elements/editor/**/*.ts
```

### Craft guard

- We will aggressively police **concept count** per file. If a UI component defines its own complex data interface, that interface will be extracted to the `models` layer.
- Types must utilize `spw-typescript-affordances` (e.g., `satisfies`, narrow string literals, dependent types) to ensure absolute compilation safety.

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `&[models] — baseline: establish the directory for pure algebraic UI models`
2. `vocab[models] — define rigorous Valence and InteractionMode branded unions`
3. `vocab[models] — define the standard Spw StateMachine interface signature`
4. `&[ui/settings] — audit: extract implicit 'Atmosphere' and 'Mode' strings from Settings Panel`
5. `&[models] — define the AtmosphereAlgebra for theme and mode transitions`
6. `&[ui/settings] — refactor Settings Panel to consume formal Atmosphere models`
7. `![ui/settings] — write exhaustive unit tests for Atmosphere state transitions`
8. `&[ui/kbd] — audit: extract geometric and traversal intents from Keyboard mappings`
9. `vocab[models] — define GeologyIntent for spatial AST movement (Up, Down, Enter, Exit)`
10. `&[ui/kbd] — refactor Keyboard event translators to emit pure GeologyIntents`
11. `&[ui/kbd] — audit: extract Vim-style composed actions (Operator + Motion)`
12. `vocab[models] — define the ComposedActionAlgebra for keyboard chords`
13. `&[ui/kbd] — refactor Vim helper functions to use the new ComposedActionAlgebra`
14. `![ui/kbd] — verify structural pattern matching for all spatial keyboard inputs`
15. `&[ui/shaders] — audit: extract visual parameters from Shader Inspector`
16. `vocab[models] — define rigorous ShaderParameterAST models (Bloom, Grain, Displacement)`
17. `&[ui/shaders] — refactor Shader Inspector UI controls to dispatch AST updates`
18. `&[models] — map ShaderParameterAST explicitly back to the CSS/Valence token systems`
19. `![ui/shaders] — verify uniform generation from pure AST structures`
20. `&[ui/editor] — audit: extract Workspace state (Idle, Editing, Command Palette) into pure models`
21. `vocab[models] — define the WorkspaceStateMachine discriminated union`
22. `&[ui/editor] — refactor workspace controllers to transition via explicit state machine ticks`
23. `&[models] — build the integration tying WorkspaceMode to Atmosphere and Keyboard contexts`
24. `![ui/editor] — verify illegal UI states are mathematically unrepresentable at compile time`
25. `.[docs] — construct the UI Algebra Visualizer panel for the workbench`
26. `.[docs] — write the curriculum: "Developing Taste in UI Data Algebras"`

## Dependencies

- **`audit-css-tokens`**: Best executed in parallel or slightly overlapping.
- **`audit-data-attributes`**: The formalized state machines from this branch will directly drive the DOM attributes updated in that branch.

## Spw Artifact

```
.agent/plans/audit-ui-data-models/audit-ui-data-models.spw
```
A formal Spw record defining the exact mapping between component visual clusters and their abstract algebraic representations.
