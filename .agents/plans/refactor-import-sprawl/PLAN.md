# Plan: refactor-import-sprawl

## Goal

Consolidate the file and folder sprawl in `src/platform/bootstrap` and elevate it into a rigorous curricular exercise traversing the application's topological module architecture. Currently, `bootstrap` acts as a dumping ground for UI layout wiring, feature-specific setups (audio, editor, settings), and actual application initialization. This masterclass will extract UI and feature wiring to their appropriate domains (`app` and `features`), leaving `bootstrap` focused purely on deterministic `init` boot sequences.

**Taste Note:** Improves **layering** (strictly enforcing the Directed Acyclic Graph: infra ← platform ← app ← ui), **naming** (clarifying initialization vs wiring), and actively develops **taste in dependency injection** by transforming a simple file move into a study of module boundaries.

## Scope

- **In scope**: A deep 5-phase curricular audit: Architectural Tooling, App Layer Orchestration, Feature Boundary Wiring, Platform Boot Sequencing, and DI Verification. Moving files out of `src/platform/bootstrap` to `src/app/layout`, `src/features`, and `src/platform/bootstrap/init/`. Updating import paths across the codebase and formalizing the module DAG.
- **Out of scope**: Refactoring the internal logic of the extracted files, unless explicitly required to decouple them from `bootstrap` or fix circular dependencies. Modifying `src/ui/elements` internals.

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/refactor-import-sprawl-agentic-hygiene` before implementation commits

## Files

Predicted file movements:

```
[MOD] src/platform/bootstrap/init.ts
[NEW] src/platform/bootstrap/init/init-prism.ts (Moved from src/platform/bootstrap/init-prism.ts)
[NEW] src/platform/bootstrap/init/init-sidebar.ts (Moved from src/platform/bootstrap/init-sidebar.ts)
[NEW] src/platform/bootstrap/init/init-worker.ts (Moved from src/platform/bootstrap/init-worker.ts)

[NEW] src/app/layout/dock-overlay.ts (Moved from src/platform/bootstrap/dock-overlay.ts)
[NEW] src/app/layout/drawer.ts (Moved from src/platform/bootstrap/drawer.ts)
[NEW] src/app/layout/panel-docking.ts (Moved from src/platform/bootstrap/panel-docking.ts)
[NEW] src/app/layout/panel-layout.ts (Moved from src/platform/bootstrap/panel-layout.ts)

[NEW] src/features/audio/audio-wiring.ts (Moved from src/platform/bootstrap/audio.ts)
[NEW] src/features/editor/authoring-wiring.ts (Moved from src/platform/bootstrap/authoring.ts)
[NEW] src/features/editor/editor-wiring.ts (Moved from src/platform/bootstrap/editor.ts)
[NEW] src/features/inspector/inspector-wiring.ts (Moved from src/platform/bootstrap/inspector.ts)
[NEW] src/features/onboarding/onboarding-wiring.ts (Moved from src/platform/bootstrap/onboarding.ts)
[NEW] src/features/settings/settings-wiring.ts (Moved from src/platform/bootstrap/settings.ts)
[NEW] src/features/settings/settings-actions.ts (Moved from src/platform/bootstrap/settings-actions.ts)

[NEW] src/app/stage-gates.ts (Moved from src/platform/bootstrap/stage-gates.ts)
[NEW] src/app/theme-manager.ts (Moved from src/platform/bootstrap/theme.ts)
[NEW] src/app/mode-manager.ts (Moved from src/platform/bootstrap/mode.ts)

[DEL] src/platform/bootstrap/ (All original flat files listed above)
```

### Craft guard

- During the move, we will flag any file that exceeds 600 lines or 12 imports. (`settings-actions.ts` is historically large and will be monitored for split opportunities during EXECUTION).
- We will actively enforce strict boundaries: `src/platform` files must **never** import `src/app` or `src/features` nodes.

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `&[arch] — baseline: generate initial dependency graph visualization of bootstrap sprawl`
2. `^seed[arch] — explicitly define the topological DAG (Infra ← Platform ← App ← UI)`
3. `![arch] — introduce strict dependency linting rules (eslint-plugin-boundaries) to enforce DAG`
4. `&[arch] — audit: fix existing import violations breaking the new topological rules`
5. `&[arch] — audit: resolve any circular dependency warning loops originating in bootstrap`
6. `vocab[app] — define the Spw structural nomenclature for Application vs Platform boundaries`
7. `&[app/layout] — extract 'dock-overlay' and 'drawer' out of platform and into the app layer`
8. `&[app/layout] — extract 'panel-layout' and 'panel-docking' out of platform and into the app layer`
9. `&[app/state] — extract 'theme-manager' and 'mode-manager' into application orchestrators`
10. `&[app] — extract application 'stage-gates' lifecycle controller`
11. `![app] — resolve resulting dependency breakages and document the new App orchestration graph`
12. `vocab[features] — define the standard for Feature 'wiring' abstractions`
13. `&[features/editor] — extract 'editor-wiring' and 'authoring-wiring' out of bootstrap`
14. `&[features/settings] — extract 'settings-wiring' and 'settings-actions' out of bootstrap`
15. `&[features/audio] — extract 'audio-wiring' out of bootstrap`
16. `&[features] — extract remaining 'inspector' and 'onboarding' peripheral wirings`
17. `vocab[platform] — define the strict deterministic lifecycle of the boot sequence`
18. `&[bootstrap] — restructure remaining flat initialization scripts into platform/bootstrap/init/`
19. `&[bootstrap] — enforce strict phase-ordering (e.g. init-worker before init-prism)`
20. `&[bootstrap] — refactor the central init.ts file to reflect the new phased boot sequence`
21. `&[di] — audit: review where global singletons are used vs injected dependencies`
22. `&[di] — refactor critical boot sequence params to utilize explicit dependency injection`
23. `![bootstrap] — execute rigorous headless boot tests to ensure timing invariants aren't broken`
24. `&[arch] — delete the legacy flat bootstrap folder entirely`
25. `.[docs] — construct the interactive Module Topology visualization for the workbench`
26. `.[docs] — write the curriculum: "Developing Taste in Spw Architectural Topologies"`

## Dependencies

none

## Spw Artifact

```
.agent/plans/refactor-import-sprawl/refactor-import-sprawl.spw
```
A distilled `.spw` artifact representing the mathematical Directed Acyclic Graph (DAG) of the Spw architecture, defining the strict topological rules and boundaries of "Wiring vs Initialization".
