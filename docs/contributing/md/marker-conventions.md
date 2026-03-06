# Spw Marker Conventions

Markers are structured annotations, not flat labels.

## Syntax

Use the marker chain form:

- `@spw:<family>`
- `@spw:<family>:<qualifier>`
- `@spw:<family>:<qualifier>:<detail>`

Examples:

- `@spw:todo`
- `@spw:portable`
- `@spw:lens:syntactic`

## Contract

- The first segment is the **family**. It is the stable filter key for audits and scripts.
- Remaining segments are **qualifiers**. They refine meaning and are ordered.
- The analyzer now preserves the full chain instead of truncating after the first segment.
- `--tag=<family>` remains the backward-compatible family filter.
- `--marker=<family[:qualifier...]>` filters an exact structured marker.

## Writing Guidance

- Prefer a small, stable family vocabulary over proliferating one-off roots.
- Add qualifiers when the extra structure changes meaning, not just wording.
- Keep markers lowercase and comment-friendly.
- If a new family becomes durable, document it here before spreading it widely.

## Current Decision

This rewrite keeps the colon-chain syntax. The useful change is the schema contract: markers are now treated as a family plus ordered qualifiers, and audits preserve that structure.
