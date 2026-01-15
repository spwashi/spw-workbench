# Architecture Map: Spw Workbench

This guide is a top-down navigation map for researchers and implementers. It
prioritizes *how to find the idea you want* over exhaustiveness.

## Top-Down Ontology

Start from the outer shell and move inward:

1) **Platform** (`src/platform/`)  
   Browser entrypoint and wiring. The app entrypoint is `src/platform/main.ts`,
   with wiring in `src/platform/bootstrap.ts`.

2) **App** (`src/app/`)  
   Workbench glue and app-specific components (integration, adapters, HUD).

3) **Features** (`src/features/`)  
   User behaviors and interaction patterns (keyboard, onboarding, inspector).

4) **UI + Design** (`src/ui/`, `src/design/`)  
   Portable components and design system (tokens, themes, topology).

5) **Viz** (`src/viz/`)  
   Visualizations of language state (tokens, AST, flow, steps).

6) **Runtime** (`src/runtime/`)  
   Execution machinery and session state.

7) **Lang + Lib** (`src/lang/`, `src/lib/spw/`)  
   The language surface (`lang`) and its parser implementation (`lib/spw`).

8) **Infra** (`src/infra/`)  
   Cross-cutting infrastructure: timing, lifecycle, state, a11y.

9) **Core** (`src/core/`)  
   Spw primitives: domains, conventions, layers, operators, quality, tally.

## Import Rules (Clarity > Convenience)

- `lang` is the *public* API for the parser/types; import `lib/spw` only inside `lang`.
- `core` is the semantic base; keep it minimal and portable.
- `infra` should be pure infrastructure (no UI or runtime dependencies).
- `app` and `platform` are the only layers allowed to wire cross-layer flows.
- Prefer layer index exports (`src/{layer}/index.ts`) for public entrypoints; avoid deep imports across layers.

## Spw Design Taste (What to Notice)

- **Operators as meaning**: the sigils are semantic (not just syntax). See
  `src/core/operators.ts` and `docs/patterns.spw`.
- **Three-layer phasor**: syntactic / semantic / pragmatic. See
  `docs/phasor.spw` and `src/core/layers/`.
- **Qualities (BBBH)**: boon/bane/bone/honk expresses design pressure.
  See `docs/quality.spw` and `src/core/quality.ts`.
- **Domain projection**: domain-specific meaning is a first-class axis.
  See `docs/domains.spw` and `src/core/domains/`.

## Navigation Trails (Pick One)

- *Language mechanics*: `src/lang/` → `src/lib/spw/` → `src/runtime/`
- *Visualization mapping*: `src/viz/` → `src/lang/` → `src/infra/timing/`
- *UI composition*: `src/ui/` → `src/design/` → `src/app/components/`
- *Interaction behavior*: `src/features/` → `src/infra/timing/`

## Research Notes

If you are porting Spw to another language/runtime, mirror the same layering:
`core` (primitives) → `infra` (timing/state) → `lang` (surface) → `runtime` → `viz`
and `ui` as optional adapters. This keeps the language core portable and the
workbench bindings replaceable.
