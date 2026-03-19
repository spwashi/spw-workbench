# Plan: brand-core-ids

Strictly brand core identifiers (Frame, Register, Domain) to prevent accidental mixing of primitives in the runtime.

## Goal

The current runtime passes `FrameId`, `RegisterId`, and `DomainId` as simple strings. While easy to read, this allows for accidental mixing (e.g., passing a Domain ID where a Frame ID is expected). This plan introduces **Branded Types** (nominal typing) to ensure that core identifiers are used correctly throughout the `src/runtime` and `src/seed` layers, improving type safety without runtime overhead.

## Scope

- **In scope**: Introduce branding utility in `src/seed/types/brand.ts`; brand `FrameId`, `RegisterId`, `DomainId`, and `LayerId` in `src/seed/types/`; update `src/runtime/state/register-bank.ts` and `src/runtime/pipeline/substrate.ts` to use branded types; update corresponding tests.
- **Out of scope**: Branding token-level strings, modifying existing string-based parsers, or changing external API signatures beyond what is necessary for internal type safety.

## Files

[NEW] `src/seed/types/brand.ts`
[MOD] `src/seed/types/ast/nodes.ts`
[MOD] `src/seed/types/token.ts`
[MOD] `src/runtime/state/register-bank.ts`
[MOD] `src/runtime/pipeline/substrate.ts`
[MOD] `src/runtime/pipeline/types.ts`
[MOD] `src/runtime/__tests__/register-bank.test.ts`
[MOD] `src/runtime/__tests__/substrate.test.ts`

## Commits

1. `types[seed] — add branding utility and brand core identifiers (Frame, Register, Domain)`
2. `types[runtime] — apply branded IDs to RegisterBank and Substrate`
3. `test[runtime] — align tests to branded identifier types`

## Spw Artifact

`.agents/plans/brand-core-ids/wip.spw` — tracking progress and open questions for ID branding.
