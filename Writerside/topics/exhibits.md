# Exhibits

An exhibit is a perceivable artifact that makes the system legible.

Examples of exhibits in this project:
- A small `.spw` corpus that demonstrates an operator boundary.
- A rendered diagram (AST, flow, registers) paired with its source.
- A trace that proves an invariant (determinism, normalization rules).

## Exhibit rules

- Exhibits should be runnable or viewable from the repo.
- An exhibit must name its purpose and the claim it supports.
- Prefer small, dense artifacts over large dumps.

## Where exhibits live

This is intentionally flexible in early canon.
Recommended:
- `docs/exhibits/` (narrated)
- `examples/` (runnable)
- `src/seed/__tests__/snapshots/` (golden, if appropriate)

## Add a new exhibit

1. Create the artifact.
2. Add a short doc entry explaining what it shows.
3. Add verification steps (even if manual).
