# Documentation Map

Use this map to jump between canonical documentation surfaces in the repository.

## Repository entrypoints

| Surface | Purpose | Path |
| --- | --- | --- |
| Project overview | Top-level orientation | `README.md` |
| Documentation index | Primary docs graph | `docs/index.spw` |
| Docs table of contents | Broad navigation | `docs/toc.spw` |
| Kernel docs | Kernel reading map | `src/seed/docs/index.spw` |
| Agent workflow rules | Contribution protocol | `AGENTS.md` |
| Writerside entrypoint | Documentation build config | `Writerside/writerside.cfg` |
| Writerside TOC and instances | Internal/public doc graph | `Writerside/spw-workbench.tree` |

## Architecture and planning

| Surface | Purpose | Path |
| --- | --- | --- |
| Layer architecture | Cross-layer model | `docs/plans/spw/architecture.spw` |
| Domain registry | Module inventory | `docs/plans/spw/domains.spw` |
| Dependency map | Import graph | `docs/plans/spw/dependencies.spw` |
| Near-term priorities | 1-3-6 month direction | `docs/plans/spw/directions.spw` |

## Validation and quality references

| Surface | Purpose | Path |
| --- | --- | --- |
| Writerside consistency checks | Instance, TOC, and local links | `npm run lint:writerside` |
| Canon docs check | Writerside integrity (canon-safe) | `npm run lint:docs` |
| Docs reference integrity | `.spw` path integrity + Writerside | `npm run lint:docs:strict` |
| Spw parser checks | Parse validation | `npm run lint:spw` |
| Syntax generation audit | Gen 1/2/3 scan | `.agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh` |

### Tip: choose depth by task {collapsible="true"}

- Prompting/media work: start at `orientation-for-artists.md`, then `prompt-packs.md`.
- Documentation repair: start at `docs/toc.spw` and `docs/index.spw`.
- Kernel work: start at `src/seed/` and `src/seed/docs/index.spw`.

See also: `Writerside/topics/experiments-and-skills.md`.
