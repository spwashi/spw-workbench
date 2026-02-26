---
name: spw-ontology-workbench
description: Build and iterate ontologies and domain models in Spw for computational linguistics, geometry, and materials science. Use when modeling concepts/relations, creating example corpora, or mapping domains into Spw.
---

# Spw Ontology Workbench

## Default Workflow

1. Define scope: domain, intended use, and what is explicitly out of scope.
2. List core concepts (nouns) and relations (verbs) and decide what must be primitive.
3. Choose identifiers and naming conventions; keep them stable across iterations.
4. Encode the ontology in Spw using Gen 3 syntax (`.{}` facets, `#[]` sets, `?<>` streams, `=` bias).
5. Add 2–3 concrete examples that stress edge cases (ambiguity, polysemy, hierarchy).
6. If integrating with code, add a small loader/validator and tests.

## Output Contract

- Produce an ontology file in `.spw` using Gen 3 syntax.
- Prefer explicit relations over implicit structure when ambiguity is likely.
- Use `[reg=...]` annotations to classify ontological entries.

## Spw Ontology Primitives

Use these register frames for ontological modeling:

| Frame | Use For |
|---|---|
| `.{ key = value }[reg=facet]` | Definitional properties |
| `#[ items ][reg=set]` | Categories, enumerations |
| `?<a, b, c>[reg=stream]` | Processes, transitions, lifecycles |
| `@(observer, observed)[reg=perspective]` | Observation contexts |
| `^seed[name v:N @profile:Spw.b]` | Ontology headers |

### Modeling Patterns

```spw
# Entity with properties:
entity_name: .{
  category = `X`
  relation_to = `Y`
  constraint = `Z`
}[reg=facet]

# Taxonomy:
taxonomy: #[
  .{ concept = A, parent = B },
  .{ concept = C, parent = B }
][reg=set]

# Process:
lifecycle: ?<birth, growth, maturity, decay>[reg=stream]
```

### Operant Perspectives
Ontologies can be read through multiple perspectives (computation, cognition, illustration, etc.) — the structure is invariant across readings. See `src/lang/docs/operant-perspectives.spw`.

## Codebase-Specific Knowledge

- **12 operators**: `! ^ ~ ? * = @ # . & $ %` — each captures a structural invariant
- **4 containers**: `<>` (concept), `()` (scene), `[]` (mode), `{}` (definition)
- **Valence pentad**: boon/bane/bone/bonk/honk — how material changes
- **Tiered normalization**: SNF (surface) → SiNF (per-sigil) → SeNF (cross-sigil)
- **Cascade frames**: `[cascade=layer priority=N]` for layered overrides

## Codebase Tooling

```bash
npm run generate:domain     # Scaffold a new domain (use when ontology maps to a new src/ domain)
npm run audit:spw-garden    # Structural health of .spw doc files
npm run lint:docs           # Verify .spw path references are valid
```

## Skill Care

Update this skill when:
- New register frame types are added (beyond facet/set/stream/perspective) → update Spw Ontology Primitives table
- The ontology skeleton format changes → update `assets/ontology-skeleton.spw`
- New operant perspectives are documented → update Modeling Patterns section
- A new domain is generated via `generate:domain` → consider whether it needs an ontology entry

## Resources

- Read `.agents/skills/spw-ontology-workbench/references/ontology-conventions.md` for naming and modeling conventions.
- Copy `.agents/skills/spw-ontology-workbench/assets/ontology-skeleton.spw` to start new ontology files quickly.
- Reference `docs/theory/spw/operators.spw` for canonical operator definitions.
- Reference `docs/theory/spw/register-geometry.spw` for the fiber bundle register model.
