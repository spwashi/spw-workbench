# TypeScript Patterns (Quick Menu)

Keep type work proportional to the runtime risk and expected evolution of the code.

## Boundary Typing

- Use `unknown` at I/O boundaries (DOM, JSON, network).
- Validate/narrow once; keep the core strongly typed.

## Discriminated Unions

Use for state machines, parse results, and UI modes.

```ts
type Result =
  | { ok: true; value: Token[] }
  | { ok: false; error: Error }
```

Add exhaustiveness checks in switches.

## `satisfies` for Config Objects

Keep literal inference without widening.

```ts
const MODES = {
  normal: { label: 'NORMAL' },
  insert: { label: 'INSERT' },
} satisfies Record<string, { label: string }>
```

## Const Tables → Union Types

Derive unions from data.

```ts
const REGIONS = ['sidebar', 'editor', 'inspector'] as const
type Region = (typeof REGIONS)[number]
```

## Branded Types

Use when “stringly typed” ids are easy to mix up.

```ts
type Brand<T, B extends string> = T & { readonly __brand: B }
type NodeId = Brand<string, 'NodeId'>
```

## Assertion/Narrowing Helpers

Use for centralized checks.

```ts
function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value == null) throw new Error('Expected value')
}
```

## Guidelines

- Prefer readable names over clever conditional types.
- Avoid `any` unless bridging an untyped API; isolate it.
- Avoid deep generic plumbing unless you get real safety or clarity back.
