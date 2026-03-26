# PROJECTIONS (Spw v0.3.0)

## Status

New in v0.3.0 — documents the projection system that transforms `.spw` frames into output formats.

## v0.3.0 Contract

Projections are the mechanism by which `.spw` content becomes visible outside the Spw workspace:
- A projection maps a set of selected frames to an output format (HTML, RSS, JSON, markdown).
- Projections are defined by surface rules in `.spw/surfaces/`.
- The default projection (no plugins) produces the workspace's native rendering.

## Source Links

- Surface definitions: `.spw/surfaces/`
- Plugin protocol: `.spw/surfaces/plugin-protocol.spw`
- Prompt surfaces: `prompts/` (example of projection to image generation briefs)

## Invariants

- Projections are deterministic: same input frames produce same output.
- Projections never modify source `.spw` files.
- Every projection declares its output format explicitly.

## Migration Notes

New in v0.3.0. Projection semantics were implicit in the v0.2.0 surface system. v0.3.0 names them as a first-class concept to support plugin composition.

## Open Questions

- Should projections support streaming output for large frame sets?
- How should projection caching interact with workspace file watches?

## v0.4.0 Candidates

- Projection registry with named, reusable projection configurations.
- Streaming projection support for live surfaces.
- Projection debugging tools (show selected frames, intermediate transforms).
