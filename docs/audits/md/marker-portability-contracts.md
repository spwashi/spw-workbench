# Marker Extraction And Seed Contracts

The marker chain now supports an optional contract bag:

- `@spw:<family>:<qualifier>[key=value,key=value|value]`

This is the first extension aimed at implementation planning, later extraction, and sparse-file seeding.

## Why

The plain marker chain is useful for inventory, but ambitious feature work needs more than a label. Extraction candidates and sparse starter files need named systems, semantic affinities, blockers, and short evidence that explains why a marker is attached.

## Initial Contract Keys

- `layer` — implementation stratum such as `parser`, `query`, or `pipeline`
- `system` — proposed extracted subsystem such as `seed-parser` or `selector-engine`
- `extract` — extraction posture such as `candidate`, `ready`, or `blocked`
- `semantic` — semantic affinity such as `prolog|sql|css`
- `next` — the next file or surface to build from
- `density` — how sparse or kernel-like the current file is
- `status` — maturity or rollout state such as `experimental`
- `blocker` — named impediment for a feature or extraction
- `basis` — short reason or evidence such as `no-dom`

## Pilot Examples

- `@spw:portable:seed[layer=parser,system=seed-parser,extract=candidate,basis=no-dom|core-invariants]`
- `@spw:seed:kernel[system=seed-parser,extract=candidate,density=kernel,basis=core-invariants]`
- `@spw:surface:query[system=selector-expr,semantic=prolog|sql|css,status=experimental]`
- `@spw:seed:starter[system=selector-engine,extract=candidate,next=match,density=sparse]`
- `@spw:extract:blocked[system=stage-pipeline,blocker=register-coupling,basis=register-snapshot]`

## Audit Consequences

- The marker audit preserves the full contract signature in plain, markdown, and JSON output.
- `--marker=` accepts the exact signature when the attribute bag is included.
- `--attribute=` filters by contract field presence or value.

Example queries:

- `node --import tsx scripts/analyzers/spw-marker-audit.ts --tag=seed`
- `node --import tsx scripts/analyzers/spw-marker-audit.ts --attribute=extract=candidate`
- `node --import tsx scripts/analyzers/spw-marker-audit.ts --attribute=semantic=sql`

Reserve `target` for real implementation ports. If the intent is later extraction, sparse-file seeding, or semantic projection, prefer `system`, `extract`, `semantic`, `basis`, and `next`.

## Constraint

The contract bag stays optional. The chain remains the primary grep-friendly selector, and markers should only gain attributes when the metadata materially helps extraction, seeding, or semantic projection decisions.
