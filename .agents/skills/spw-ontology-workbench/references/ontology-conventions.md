# Ontology Conventions (Spw)

Keep ontologies readable, versioned, and easy to evolve.

## Naming

- Use stable identifiers for concepts and relations.
- Prefer lowercase-with-dashes for ids in frames (human-friendly).
- Keep display labels separate from ids when ambiguity is likely.

## Versioning

- Include a top-level annotation for version and domain.
- Keep backward-incompatible renames explicit and documented.

## Modeling Rules of Thumb

- Prefer explicit relations over implicit nesting when multiple interpretations exist.
- Use examples to stress polysemy, hierarchy, and edge cases.
- Keep the “core” small; add derived conveniences later.

## Interop With Code

- If parsing/loading into TS, define a minimal schema first.
- Validate at load time; avoid “best-effort” silent coercions.
