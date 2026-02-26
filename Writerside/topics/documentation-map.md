# Documentation Map

Use this map to jump between canonical documentation surfaces in the repository.

## Repository entrypoints

| Surface | Purpose | Path |
| --- | --- | --- |
| Project overview | Top-level orientation | `README.md` |
| Documentation index | Primary docs graph | `docs/index.spw` |
| Docs table of contents | Broad navigation | `docs/toc.spw` |
| Source index | Layer/source graph | `src/index.spw` |
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
| Docs link/path checks | Writerside + `.spw` references | `npm run lint:docs` |
| Spw parser checks | Parse validation | `npm run lint:spw` |
| Layer boundaries | Import boundary report | `.agents/skills/spw-commit-review/scripts/layer-check.sh` |
| Syntax generation audit | Gen 1/2/3 scan | `.agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh` |

### Tip: choose depth by task {collapsible="true"}

- Feature implementation: start at `src/index.spw`, then domain docs.
- Documentation repair: start at `docs/toc.spw` and `docs/index.spw`.
- Workflow/tooling changes: start at `AGENTS.md`, `.agents/workflows/`, and `Writerside/writerside.cfg`.


## Experiments and skills

| Surface | Purpose | Path |
| --- | --- | --- |
| Skills (curated) | Commit review, CSS/DOM lab, semantics rigor, TS affordances, privacy, UI containment | `.agents/skills/` |
| Experiment commands | Fuzz, audits, analyzers, LSP | `npm run fuzz:*`, `npm run audit:*`, `npm run analyze:patterns`, `npm run lsp` |

See also: `Writerside/topics/experiments-and-skills.md`.
