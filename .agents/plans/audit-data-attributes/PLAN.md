# Plan: audit-data-attributes

## Goal

Conduct a comprehensive, curricular audit of how `data-*` attributes and ARIA states are used to synchronize application state with the DOM. The goal is to elevate DOM sync from an imperative chore into a masterclass on robust, declarative state machines. We will actively **develop taste** by migrating scattered `setAttribute` calls into highly rigorous, unidirectional Lit properties and centralized global orchestrators.

**Taste Note:** Improves **correctness** (ensuring the DOM state always precisely reflects the internal Spw state machines without race conditions), **performance** (minimizing raw DOM thrashing), and **clarity** through a standardized, curricular approach to attribute reflection and ARIA semantics.

## Scope

- **In scope**: A deep 5-phase curricular audit: Global State Orchestration, Primitive Component State, Advanced State Machines, Semantic ARIA Sync, and Render Optimization. Scanning for `setAttribute('data-' ...)` and `dataset` manipulations across `src/platform`, `src/features`, and `src/ui`. Converting component-level attributes to Lit `@property({reflect: true})` and centralizing global mutations.
- **Out of scope**: Changing the visual manifestation (CSS rules) of these attributes; we are refactoring the *engine* that drives them.

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/audit-data-attributes-agentic-hygiene` before implementation commits

## Files

Predicted file changes:
```
[MOD] src/ui/elements/**/*.ts    (refactoring manual sets to reactive properties)
[MOD] src/platform/**/*.ts       (centralizing global writes)
[NEW] src/app/dom-sync/theme-orchestrator.ts
[NEW] src/app/dom-sync/strata-orchestrator.ts
[NEW] src/app/dom-sync/aria-orchestrator.ts
```

### Craft guard

- If a single component manages more than 4 distinct `data-` states, we will evaluate if that state should be modeled as a true state machine rather than standalone booleans.
- Reactive properties replacing imperative sets must not inadvertently trigger expensive re-renders in tight update loops (e.g., during scroll or mousemove).

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `&[platform] — baseline: audit and catalog all global, imperative data- attribute writes`
2. `&[ui/elements] — baseline: audit and catalog ad-hoc setAttribute calls within components`
3. `vocab[dom-sync] — define the vocabulary for Global vs. Component-level DOM state`
4. `^seed[dom-sync] — establish the ThemeOrchestrator for global 'data-theme' synchronization`
5. `&[platform] — migrate legacy theme attribute mutations to the ThemeOrchestrator`
6. `^seed[dom-sync] — establish the StrataOrchestrator for global 'data-stratum' tracking`
7. `&[platform] — migrate semantic layering mutations to the StrataOrchestrator`
8. `vocab[ui] — define the standard for primitive reflective properties (booleans, enums)`
9. `&[elements] — refactor boolean states (open, active, disabled) to @property({reflect: true})`
10. `&[elements] — refactor string enum states (size, variant) to constrained reflective properties`
11. `vocab[ui] — define state machine interfaces for complex, multi-variant components`
12. `&[elements] — refactor complex components (e.g. editor panels) to use state machines for data- attributes`
13. `&[elements] — implement interaction mode reflection (e.g. data-interaction="command-palette")`
14. `&[elements] — implement topological reflection (e.g. data-orientation, data-placement)`
15. `![ui] — write unit tests ensuring custom attribute reflection aligns with state machines`
16. `vocab[aria] — define the Spw strict mapping between internal state and W3C ARIA specifications`
17. `^seed[dom-sync] — establish the AriaOrchestrator for complex, cross-component accessibility states`
18. `&[elements] — refactor aria-expanded and aria-hidden to map strictly to Spw intent`
19. `&[elements] — refactor aria-current and aria-pressed attributes in navigation elements`
20. `&[elements] — audit ARIA live regions for correct mutation timings`
21. `&[performance] — baseline: audit the render cycle cost of reflective property updates`
22. `&[performance] — optimize bulk attribute writes using fastdom or animation frame batching`
23. `&[performance] — remove redundant dataset reads (caching state in class properties)`
24. `![performance] — verify frame-rates during high-frequency data- attribute mutations`
25. `.[docs] — construct the DOM Sync debugging UI panel for the workbench`
26. `.[docs] — write the curriculum: "Developing Taste in Spw DOM Synchronization"`

## Dependencies

- **`refactor-import-sprawl`**: We should let the import refactoring settle before moving the global data attribute managers, or ensure they align with the new `app/` and `features/` structure.

## Spw Artifact

```
.agent/plans/audit-data-attributes/audit-data-attributes.spw
```
A formal Spw record defining the exact interaction between the application's semantic memory ("valence" and "strata") and the physical DOM's `dataset` reflection.
