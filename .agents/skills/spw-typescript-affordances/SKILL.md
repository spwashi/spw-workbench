---
name: spw-typescript-affordances
description: Apply TypeScript language and compiler affordances in this repo to improve safety and ergonomics (narrowing, unions, satisfies, generics, inference). Use for typing/design requests and "lean on TS" refactors.
---

# Spw TypeScript Affordances

## Default Workflow

1. Identify the runtime boundary (I/O, DOM, JSON, user input) and type the boundary first.
2. Prefer `unknown` at boundaries; validate/narrow once; propagate strong types inward.
3. Choose the lightest type tool that solves the problem (do not over-genericize).
4. Encode invariants with types (discriminated unions, branded types, tuple types, `satisfies`).
5. Add exhaustiveness checks where future variants are expected.
6. Verify with `npm run build` (tsc) and `npm run test:run`.

## Preferred Patterns (Use When Helpful)

- Use discriminated unions for state machines and parse results.
- Use `satisfies` for configuration objects to keep literal types without widening.
- Use `as const` for tables of tokens/ids and to derive union types from data.
- Use `asserts` functions or type predicates to centralize narrowing.
- Use "never exhaustiveness" to make unhandled cases compile errors.

## Codebase-Specific Types

### Branded Types (`src/core/types/branded.ts`)
All domain primitives use branded string types:

| Type | Values | Used For |
|---|---|---|
| `OperatorSigil` | `! ^ ~ ? * = @ # . & $ %` | Operator identity |
| `Layer` | `signal \| pattern \| flow \| structure` | Interpretive depth |
| `Quality` | `boon \| bane \| bone \| bonk \| honk` | Valence pentad |
| `RegisterKind` | `set \| facet \| stream \| perspective` | Register frame types |
| `Region` | `editor \| inspector \| sidebar \| ...` | UI regions |
| `ActivationContext` | `visual \| editing \| reporting \| debug \| ...` | Context states |
| `LensName` | `syntactic \| semantic \| pragmatic` | Lens triangulation |
| `EventKind` | 30+ events | Event catalog |

### Type Patterns in Use
- `as const satisfies Record<Brand, Meta>` — narrowest literal type with shape validation
- `assertNever(x: never)` — exhaustiveness guards in switch statements
- `Partial<AppState>` for state diffs (avoid `any` in appliedChanges)
- `Record<string, unknown>` for event detail (avoid `any`)

### ONF Types (`src/seed/types/ast/onf.ts`)
- `normalizeToONF()` implements the tiered normalization pipeline.
- `FrameMap` carries register bindings `reg` and semantic metadata.

## Codebase Tooling

```bash
npm run fuzz:types          # Unsafe any, type assertions, weak inference
npm run fuzz:async          # Floating promises, unhandled async
npm run audit:types         # @spw:types markers (known type debt)
npm run audit:async         # @spw:async markers (known async debt)
npm run audit:json          # Machine-readable audit output
npm run build               # tsc — catches all type errors
```

## Skill Care

Update this skill when:
- A new branded type is added to `src/core/types/branded.ts` → update the type table
- A new fuzz profile is added → add it to the tooling table
- `tsconfig.json` strictness changes → update the Output Contract
- ONF types in `src/seed/types/ast/onf.ts` are implemented → remove the "stub" note

## Scripts

- `bash .agents/skills/spw-typescript-affordances/scripts/type-audit.sh [path]` — scan for `any`, `Record<string,...>`, type assertions

## Resources

- Read `.agents/skills/spw-typescript-affordances/references/patterns.md` for a quick menu of idioms and decision rules.
- Read `.agents/skills/spw-typescript-affordances/references/tsconfig-notes.md` when considering compiler-flag changes.
