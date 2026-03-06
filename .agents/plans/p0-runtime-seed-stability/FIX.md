# Fix: p0-runtime-seed-stability

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | `src/runtime/state/register-bank.ts` | `TS2352`, `TS2365`, `TS2362`, `TS2322` around liminality arithmetic | type-drift | P0 |
| 2 | `src/runtime/__tests__/register-bank.test.ts` | `memoryWeight increases with phase progression` expected `0.6`, got `0.5` | type-drift | P0 |
| 3 | `src/seed/grammar/match.ts` / `src/seed/grammar/bullets.ts` | `ReferenceError: require is not defined` during `lint:spw` parse validation | regression | P0 |

## Diagnosis

- Runtime metadata models `Liminality` as string labels while `RegisterBank` currently increments and decrements it numerically.
- Runtime phase names drift between canonical `semantic` and shorthand `sem`, so unknown phases fall back to the default memory weight.
- Seed grammar still breaks cycles with runtime `require()` inside ESM execution, which crashes parser consumers that load `.spw` files through the syntax validator.

## Planned Fixes

### Commit 1: `vocab[runtime] — repair liminality and phase invariants`
- Align `RegisterBank` with declared `Liminality` and `RegisterPhase` types.
- Accept legacy phase shorthands only at the runtime boundary, then normalize to canonical phases.
- Ripple risk: medium

### Commit 2: `&[seed] — remove ESM-incompatible lazy require`
- Replace runtime `require()` cycle breaks with ESM-safe imports.
- Verify parser entrypoints and syntax validator behavior.
- Ripple risk: medium

### Commit 3: `![stability] — verify P0 stabilization loop`
- Re-run build, runtime tests, and `lint:spw`.
- Ripple risk: low

## Deferred

- Larger chemistry and metaphysics redesign of `RegisterBank` stays deferred until the invariants are green.
- Audit-surface expansion (`audit:full`, real fuzz analyzers) is deferred to a follow-up planning pass.
