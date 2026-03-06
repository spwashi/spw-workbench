# Spw Marker Conventions

Markers are structured annotations, not flat labels.

## Syntax

Use the marker chain form:

- `@spw:<family>`
- `@spw:<family>:<qualifier>`
- `@spw:<family>:<qualifier>:<detail>`
- `@spw:<family>:<qualifier>[key=value,key=value|value]`

Examples:

- `@spw:todo:follow-up`
- `@spw:portable:seed[layer=parser,system=seed-parser,extract=candidate,basis=no-dom|core-invariants]`
- `@spw:boundary:reset`
- `@spw:types:debt`
- `@spw:surface:query[system=selector-expr,semantic=prolog|sql|css,status=experimental]`
- `@spw:seed:starter[system=selector-engine,extract=candidate,next=match,density=sparse]`
- `@spw:lens:syntactic`

## Contract

- The first segment is the **family**. It is the stable filter key for audits and scripts.
- Remaining segments are **qualifiers**. They refine meaning and are ordered.
- An optional bracket bag carries implementation-grade metadata such as `system`, `extract`, `semantic`, `status`, `blocker`, `basis`, or `next`.
- The analyzer now preserves the full chain instead of truncating after the first segment.
- `--tag=<family>` remains the backward-compatible family filter.
- `--marker=<family[:qualifier...]>` filters an exact structured marker.
- `--marker=<family[:qualifier...][...]>` also filters an exact marker contract when the attribute bag is included.
- `--attribute=<key>` filters markers that carry a given contract field.
- `--attribute=<key=value>` filters markers whose contract field includes a given value.

## Writing Guidance

- Prefer a small, stable family vocabulary over proliferating one-off roots.
- Add qualifiers when the extra structure changes meaning, not just wording.
- Keep markers lowercase and comment-friendly.
- If a new family becomes durable, document it here before spreading it widely.

Observed structured families in the current corpus include:

- `portable:seed[layer=parser,system=seed-parser,extract=candidate,basis=no-dom|core-invariants]`
- `portable:runtime[layer=pipeline,system=event-substrate,extract=candidate,basis=no-dom|event-log]`
- `surface:query[system=selector-expr,semantic=prolog|sql|css,status=experimental]`
- `seed:starter[system=selector-engine,extract=candidate,next=match,density=sparse]`
- `types:debt`
- `async:debt`
- `boundary:reset`
- `episode:contract`

Recommended contract keys:

- `system` — proposed extracted subsystem or feature surface
- `extract` — extraction posture such as `candidate`, `ready`, or `blocked`
- `semantic` — semantic affinity such as `prolog`, `sql`, or `css`
- `layer` — subsystem or implementation stratum
- `next` — the next sparse file or surface to implement from
- `density` — how sparse or kernel-like the file is as a starting point
- `status` — maturity or rollout state
- `blocker` — named impediment for an extraction or feature contract
- `basis` — short evidence for why the marker is attached

Use `target` only when there is an actual planned implementation port. When the goal is later extraction or semantic projection, prefer `system`, `extract`, and `semantic`.

Useful seed families:

- `seed:starter` — a strong sparse starting point for a new system
- `seed:kernel` — minimal durable core with the key invariants already present
- `seed:scaffold` — promising structure exists, but more logic must land before extraction
- `extract:blocked` — a surface worth extracting later, but presently constrained by a named blocker

## Current Decision

This rewrite keeps the colon-chain syntax as the outer shell. The useful extension is the optional contract bag: markers can now carry extraction, seed, and semantic metadata while staying grep-friendly across code and canon surfaces.
