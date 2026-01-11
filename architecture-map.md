# Architecture Map: Spw Workbench

This guide is a top-down navigation map for researchers and implementers. It
prioritizes *how to find the idea you want* over exhaustiveness.

## Top-Down Ontology

Start from the outer shell and move inward:

1) **Platform** (`src/platform/`)  
   Browser entrypoint and wiring. This is where the app is bootstrapped and
   layers are connected (`src/platform/main.ts`).

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
   Cross-cutting infrastructure: events, timing, lifecycle, state, a11y.

## Import Rules (Clarity > Convenience)

- `lang` is the *public* API for the parser/types; import `lib/spw` only inside `lang`.
- `infra` should be pure infrastructure (no UI or runtime dependencies).
- `app` and `platform` are the only layers allowed to wire cross-layer flows.
- Prefer barrel exports for public entrypoints; avoid deep imports across layers.

## Spw Design Taste (What to Notice)

- **Operators as meaning**: the sigils are semantic (not just syntax). See
  `src/infra/operators.ts` and `docs/patterns.spw`.
- **Three-layer phasor**: syntactic / semantic / pragmatic. See
  `docs/phasor.spw` and `src/infra/layers/`.
- **Qualities (BBBH)**: boon/bane/bone/honk expresses design pressure.
  See `docs/quality.spw` and `src/infra/quality.ts`.
- **Domain projection**: domain-specific meaning is a first-class axis.
  See `docs/domains.spw` and `src/infra/domains/`.

## Navigation Trails (Pick One)

- *Language mechanics*: `src/lang/` → `src/lib/spw/` → `src/runtime/`
- *Visualization mapping*: `src/viz/` → `src/lang/` → `src/infra/events/`
- *UI composition*: `src/ui/` → `src/design/` → `src/app/components/`
- *Interaction behavior*: `src/features/` → `src/infra/timing/`

## Research Notes

If you are porting Spw to another language/runtime, mirror the same layering:
`infra` (timing/events/state) → `lang` (surface) → `runtime` (execution) → `viz`
and `ui` as optional adapters. This keeps the language core portable and the
workbench bindings replaceable.
