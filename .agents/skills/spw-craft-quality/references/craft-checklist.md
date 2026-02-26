# Craft Checklist (Spw Workbench)

Use this as a quick, repeatable review pass. Prefer fixing root causes over cosmetic churn.

## Scope

- Define the smallest slice that pays off.
- State the constraint you are optimizing (clarity, correctness, UX, performance, a11y).

## Architecture + Boundaries

- Follow layer boundaries from `src/README.md` (inner layers must not import outer UI layers).
- Keep modules small and single-purpose; avoid “utility dumping grounds”.
- Prefer explicit data flow over hidden globals.

## TypeScript

- Prefer `unknown` at boundaries; narrow once; keep the interior strongly typed.
- Use discriminated unions for state machines and parse results.
- Use `satisfies` for config objects to keep literal types without widening.
- Add exhaustiveness checks for future variants.

## Tests

- Add tests adjacent to the changed behavior when it reduces regression risk.
- Prefer small unit tests for parsing/runtime logic; avoid UI snapshots unless needed.
- Ensure failures are actionable (clear names, minimal setup).

## UI + CSS

- Make containment explicit: who owns width/height/scroll?
- Avoid accidental overflow; ensure flex/grid children can shrink (`min-width: 0`, `min-height: 0`).
- Keep spacing owned by containers (`padding`, `gap`) rather than child margins when possible.
- Preserve keyboard navigation and focus visibility.

## Axis Legibility

- Every timing constant should derive from a named axis primitive (`--spw-beat`, `--spw-half-beat`) rather than raw milliseconds.
- Every easing curve should use a named token (`--spw-ease-medium-swing`) rather than an anonymous `cubic-bezier`.
- Axis values should be independent: timing code doesn't encode disclosure; stability code doesn't hardcode affect.
- If a file contains values from multiple axes, each should be visually grouped or commented by axis.

## Literature Quality

- **Self-documentation test**: Can a reader derive the *why* from the code alone, without external docs?
- **Axis attribution**: Each constant names the axis it belongs to (via variable name, derivation, or grouping).
- **No redundant comments**: Comments add narrative context, not restatements of what the code does.
- **Named derivations**: `calc(var(--spw-beat) * 3)` over `1500ms` — the multiplication *is* the documentation.

## Performance + Instrumentation

- Prefer reducing work over caching work.
- Measure before/after when changing parser/runtime hot paths.
- Keep instrumentation cheap and removable; avoid noisy logs.

## Done Criteria

- `npm run lint` passes.
- `npm run test:run` passes.
- `npm run build` passes when types or build pipeline changed.
