# Spw v0.3.0 Architecture

## Status

Active architecture surface for the v0.3.0 specification library.

## Intent

Define the layout and semantics bridge so architecture remains legible across:
- markdown contracts (`*.md`) for human-readable specification
- `.spw` supports for composable, queryable architectural navigation
- source links (`src/`, `packages/`) for implementation traceability

## Layout Principles

1. Contract-first: each stratum publishes a contract surface before deep implementation.
2. Dual-surface docs: markdown expresses narrative; `.spw` expresses navigable structure.
3. Source-linked: every contract names its governing source files.
4. Normalized naming: architecture support files use kebab-case and explicit scopes.
5. Forward-staged: each version's docs explicitly name candidates for the next release.

## Library Strata

| Stratum | Purpose | Primary Surface | v0.3.0 State |
|---|---|---|---|
| `core/` | language kernel contracts | markdown + `.spw` | carried from v0.2.0 |
| `runtime/` | execution + state contracts | markdown + `.spw` | carried from v0.2.0 |
| `dialects/` | syntax family guidance | markdown + `.spw` | carried from v0.2.0 |
| `domains/` | posture/profile/taste | markdown + `.spw` | carried from v0.2.0 |
| `applications/` | applied expression surfaces | markdown + `.spw` | carried from v0.2.0 |
| `infra/` | conformance + infra posture | markdown + `.spw` | carried from v0.2.0 |
| `architecture/` | structural + theory bridge | `.spw` supports | carried from v0.2.0 |
| `packages/` | monorepo package topology | markdown | **new in v0.3.0** |
| `surfaces/` | plugin + projection protocol | markdown | **new in v0.3.0** |

## 3-Layer Kernel

| Layer | Time | Owns | Invariant |
|:--|:--|:--|:--|
| **Grammar** | parse | operators, containers, seeds, tokens | Facts verified at parse time; no runtime dependency |
| **Semantics** | meaning | planes, axes, polarity, spirit sequence | Claims falsifiable via probes; never mutate grammar |
| **Pragmatics** | use | shelves, editing, biome, process, tooling | Conventions orient usage without constraining grammar or semantics |

Dependency direction: `pragmatics → semantics → grammar` (never reversed).

## Brace-First Thesis

Spw treats braces as primordial semantic constructs:
- `<>` concept — `()` scene — `[]` mode — `{}` definition
- UAL framing: universal augmentation primitives across C-family languages
- Operator polarity: `#` trends extrinsic/projection, `.` trends intrinsic/reduction

## Monorepo Topology (New in v0.3.0)

The workspace root coordinates four packages:

| Package | Boundary | Exports |
|---|---|---|
| `spw-seed` | parser kernel | parse, normalize, AST types |
| `spw-runtime` | execution engine | interpret, register bank, pipeline |
| `spw-lsp` | language server | stdio server, providers |
| `spw-cli` | command-line interface | init, select, format, ls |

Each package owns its source, tests, and types. Cross-package imports flow downward: `cli → lsp → runtime → seed`.

## Verification Commands

- `npm run lint:v020` — core contract-stub integrity
- `npm run lint:v020:runtime` — runtime contract-stub + filename integrity
- `npm run lint:v020:architecture` — library architecture surface integrity
- `npm run lint:spw` — parse validation for `.spw`
- `npm run build` — TypeScript type check
- `npm run test:run` — full test suite
