# LAYERS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha layer model.

## v0.2.0 Contract Stub

Layers define structural containment and change boundaries across the system. v0.2.0-alpha layer prep clarifies:
- the canonical layer stack and ownership
- dependency direction and anti-corruption boundaries
- where feature work should land to avoid architecture drift

## Invariants

- Each layer has a clear reason to change.
- Upstream layers do not import downstream layer details.
- Shared contracts move inward rather than duplicated outward.

## Implementation Hooks

- Layer notes in seed docs: `src/seed/docs/audit-guide.spw`
- Boundary counterpart: [BOUNDARIES.md](./BOUNDARIES.md)
- Canon architecture map: `docs/plans/md/architecture-map.md`

## Open Questions

- Which layer boundaries should be enforced by static tooling now?
- Do docs need a machine-readable layer map for analyzer reuse?
