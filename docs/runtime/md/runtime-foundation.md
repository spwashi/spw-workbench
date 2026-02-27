# Runtime Foundation (v0.2.0-alpha)

## Why this exists

Runtime docs existed, but `src/runtime` was missing in this rewrite snapshot. This release-day pass ships a minimal runtime foundation so parser output can be executed through a typed state and interpreter boundary.

## What shipped

- `src/runtime/state/*`
  - runtime value and register types
  - operator/container affinity map
  - register bank with lens-indexed resonance hooks
- `src/runtime/interpreter/*`
  - ONF-backed interpreter stub
  - reduction-capable `#` semantics for block intersection/aggregation
- `src/runtime/pipeline/*`
  - `runSpw(source)` parse-to-runtime bridge
  - success/failure result model for downstream tooling
- Runtime tests (`test:runtime`) and runtime release checks (`lint:v020:runtime`)

## Design notes

- `#` is not treated as immutable write semantics.
- `#` is treated as resonance + aggregation:
  - repeated writes are allowed
  - each write is indexed by lens
  - the lens index enables cache optimizations by perspective/lens
- For multi-operand reductions:
  - arrays use strict intersection
  - records use key intersection with value equality guard

## Naming normalization

Runtime source files use kebab-case by default. A dedicated analyzer checks this in `src/runtime` to prevent naming drift during fast release iterations.

## Deferred work

- full VM execution model
- keyboard/UI runtime integration
- cache materialization strategy beyond in-memory index maps
