# Opus Handoff: Phase 4 (Formal Spec Integration + Visual Pedagogy)

## Status
Prep complete. Codebase audited and scaffolding created. No commit yet. See `PHASE-4-PREP-REPORT.md` for full audit details.

## Prep Decisions Implemented (Actual Repo State)
- **Annotation syntax renamed**: `#` → `~#` in lexer + grammar + `.spw` docs/examples. `#` is now free for reflect operator.
- **Deterministic IDs**: random IDs replaced with hash-based IDs via `src/core/ids.ts`.
  - Updated: `src/features/keyboard/editor-history.ts`, `src/runtime/session/state.ts`, `src/app/events/selection-bus.ts`, `src/core/layers/differential.ts`.
- **Property testing**: zero-dep harness added at `src/test/property.ts` (no fast-check).
- **Layer lint**: `npm run lint:layers` now passes (warnings only).

## Scaffolding Assets Ready
- `src/core/operators.test.ts` (stub)
- `src/lib/spw/__tests__/parser.determinism.test.ts` (stub)
- `src/lib/spw/__tests__/container-disambiguation.test.ts` (stub)
- `src/design/__tests__/color-wheel.test.ts` (stub)
- `src/lib/spw/__tests__/snapshots/phase-4-golden/` (examples + expected-outputs.json)
- `src/infra/lifecycle/trace.ts` (trace stub)
- `src/lib/spw/types/token.ts` (Phase 4 TODO comment)
- `src/test/property.ts` (zero-dep property harness)

## Known Constraints / Notes
- `#` used to be annotation; now `~#` is annotation. Lexer handles `~#` and reserves `#` for operator.
- Operator kind union in `src/lib/spw/types/token.ts` currently includes `/` and `->` (connectors). Decide where `#` fits.
- Couple `<>` vs capsule `<tag ...>` disambiguation still depends on matcher order; spaced `< >` remains untested.
- `npm run grep` is not defined; use `rg` for audits.
- `npm run test:run -- --grep=...` is invalid; use `-t` instead.

## Implementation Targets (Phase 4)
- Add reflect operator `#` across lexer, parser, semantics, flow/viz, keybindings, UI.
- Implement determinism + trace event spine (`TraceEvent`, `Trace`).
- Fill in scaffold tests and golden snapshot expectations.
- Visual pedagogy: 9-operator color wheel + modal temperature shifts + salience rules.

## Validation Commands
- `npm run test:run -t operator`
- `npm run test:run -t determinism`
- `npm run test:run -t container`
- `npm run lint:layers`
- `npm run build`

## Property Harness Usage (No Deps)
- Import from `src/test/property.ts` and use `forAll` + generators.
- Seed control via custom config (no global setup).

---

Status: 🟢 Ready for implementation. Use `PHASE-4-PREP-REPORT.md` for full audit output.
