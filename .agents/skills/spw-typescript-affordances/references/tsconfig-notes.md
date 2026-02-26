# TSConfig Notes (Change Carefully)

This repo type-checks via `npm run build` (`tsc` then Vite build).

## How to Approach Compiler Flag Changes

1. State the goal (what class of bug you want to prevent).
2. Estimate blast radius (how many files will change).
3. Prefer incremental rollout (one subsystem at a time) when feasible.
4. Avoid churn-only changes; keep commits reviewable.

## Flags Often Worth Considering (Context Dependent)

- `noUncheckedIndexedAccess`: surface missing checks on indexing; can reduce undefined bugs.
- `exactOptionalPropertyTypes`: make `foo?: T` different from `foo: T | undefined`.
- `noPropertyAccessFromIndexSignature`: enforce safer access patterns.

## Flags That Can Create Noise

- `noImplicitOverride`, `useDefineForClassFields`, and friends can be valuable but may require broad refactors.

## Output

When proposing flag changes, include:

- The concrete bug class you’re addressing.
- A small sample diff showing the new required checks.
- A migration plan (what to change first, and what to defer).
