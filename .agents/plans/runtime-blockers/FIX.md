# Fix: runtime-blockers

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | `src/runtime/interpreter/interpreter.ts` | `TS2345: Argument of type 'string' is not assignable to parameter of type 'RegisterId'` | type-drift | P0 |
| 2 | `src/runtime/pipeline/resonance.ts` | `TS2322: Type 'string' is not assignable to type 'RegisterId'` | type-drift | P0 |
| 3 | `src/runtime/pipeline/substrate.ts` | `TypeError: sub.bind is not a function` in `src/runtime/__tests__/substrate.test.ts:50,60,71,82` | missing-impl | P0 |

## Diagnosis

- The runtime state layer now brands register keys as `RegisterId`, but the interpreter and resonance detector still synthesize or aggregate plain strings in several call sites. The code is semantically correct; the type surface is stale.
- `Substrate` already has event dispatch that assumes binding tables exist, but the public `bind` method body is missing from the class, so tests fail before they can exercise the dispatch behavior.

## Planned Fixes

### Commit 1: `&[runtime-blockers] — restore branded register flows and substrate binding`
- Update interpreter call sites to normalize synthesized keys and string arguments into `RegisterId`.
- Extend the brand template tags so interpolated keys can still use `$register`, `$frame`, `$domain`, and `$layer` ergonomics instead of falling back to constructor-style helpers.
- Update resonance detection internals to store branded keys instead of degrading to `string`.
- Restore the `Substrate.bind` method with minimal dispatch behavior matching the current tests.
- Ripple risk: medium
- Confidence: high

### Commit 2: `&[lsp-modules] — move lsp implementation modules behind the package boundary`
- Relocate package-owned LSP implementation modules out of `scripts/lsp/*` and keep compatibility wrappers where still needed.
- Update package entrypoints and imports to point at local package modules.
- Ripple risk: medium
- Confidence: medium

## Deferred

- The two pre-existing `textDocument/references` timeouts in `npm run lsp:smoke` are not blocked by the package-entrypoint work and should be treated separately from this runtime blocker pass.
