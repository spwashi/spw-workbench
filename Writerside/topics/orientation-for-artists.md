# Orientation for Artists (Who Like Rigor)

This project is a workbench for Spw: a language whose *forms* and *operators* are treated as first-class.

Working metaphors:
- **Spw** is the evolution force: it makes structures differentiable and composable.
- **Boonhonk** is the field of wonder: it names taste, posture, and quality as something observable.

## How to read this repo

If you are here for aesthetic and conceptual leverage (not just implementation detail), start with:

1. `docs/waypoints/` for curated routes.
2. `docs/toc.spw` and `docs/index.spw` for the full map.
3. `lib/spw-v0.2.0-alpha/` for the spec library path and delta map.
4. `src/seed/` for the kernel (lexer/parser/types).

## What to pay attention to in updates

Updates should land as one of:
- **Exhibit**: a perceivable output (rendering, trace, map, “before/after” behavior).
- **Instrument**: a new measurement/visibility surface (lint, audit, inspector).
- **Claim**: an explicit invariant (what must remain true, and how we verify it).
- **Waypoint**: a join-point that changes what “the system” includes.

When an update is only refactor churn, it should be skipped or bundled.

## Minimal local loop (canon rewrite)

This canon repo may not ship the full application toolchain at all times.
The stable baseline is the kernel and its documentation.

```bash
npm install
npm run lint:spw
```

See also: [Exhibits](exhibits.md) and [Documentation Map](documentation-map.md).
