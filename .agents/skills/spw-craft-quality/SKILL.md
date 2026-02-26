---
name: spw-craft-quality
description: Improve craft quality of this codebase (naming, layering, types, tests, UX polish, performance). Use for craft passes, refactors for clarity, and raising the quality bar.
---

# Spw Craft Quality

## Default Workflow

1. Identify the smallest scope that pays off (one subsystem, one feature slice).
2. Read the nearest `docs/index.spw` and `docs/audit-guide.spw` for the target stratum.
3. Define the "quality axis" you are improving (clarity, correctness, testability, performance, UX, a11y).
4. Run `npm run audit` to see existing `@spw:` debt markers in scope.
5. Make focused changes that remove root causes (not surface patches).
6. Add or tighten tests adjacent to the change when it reduces future regressions.
7. Run the verification loop (see Scripts).
8. Update the stratum's `.spw` docs if the change affects component surface, semantics, or valence.

## Output Contract

- Prefer small, reviewable patches with clear intent.
- Keep layer boundaries intact (12-domain layered architecture; inner ≠ imports outer).
- Preserve existing behavior unless the user explicitly requests changes.
- The pre-commit hook will block until human authorization — prepare a clear commit message.

## Heuristics

- Reduce "concept count" per module; split files when responsibilities blur.
- Make illegal states unrepresentable (branded types, discriminated unions, `satisfies`, total functions).
- Prefer data-structure clarity over clever control flow.
- Treat UI containment/scroll as owned by explicit containers (avoid accidental overflow).
- Use existing tokens and patterns; avoid introducing new conventions unless necessary.
- When touching `.spw` files, prefer Gen 3 syntax (`.{}` facets, `#[]` sets, `=` bias, `[reg=...]`) over Gen 2.
- Valence pentad (boon/bane/bone/bonk/honk) should describe how the component's material changes, not just what it does.
- **Axis legibility**: Every constant should trace to a deformation axis (timing, disclosure, stability, affect, resolution, noise). Named derivations over magic numbers — e.g., `var(--spw-beat)` over `500ms`.
- **Combinatoric hygiene**: Axis values should be independent. Timing code shouldn't encode disclosure logic; stability code shouldn't hardcode affect.
- **Literature quality**: Code is self-documenting when a reader can identify *which axis* shaped each design decision without comments. Apply the literature rubric (see craft checklist).

## Codebase Tooling

```bash
npm run audit               # All @spw: markers (debt, async, types, ui)
npm run audit:debt          # Technical debt markers
npm run audit:md            # Markdown report of all markers
npm run fuzz:complexity     # Cyclomatic complexity, function size
npm run fuzz:dead           # Unused code, missing switch cases
npm run fuzz:naming         # Naming convention violations
npm run fuzz:boonhonk       # FUZZ=boonhonk — groove detector (timing/entropy)
npm run fuzz:all            # All fuzz profiles at warn level
npm run analyze:patterns    # Pattern learner — finds repeated structures
npm run test:run            # Full test suite
npm run lint                # ESLint
npm run build               # tsc + vite build
```

## Skill Care

Update this skill when:
- A new `@spw:` marker category is added to the audit system → add it to the tooling table
- A new fuzz profile is added to `package.json` → add it to the tooling table
- The 12-domain architecture changes (new domain added/removed) → update Codebase-Specific Knowledge
- The valence pentad changes → update Heuristics
- A new deformation axis is formalized → update axis legibility heuristics

## Scripts

- `bash .agents/skills/spw-craft-quality/scripts/craft-check.sh` — lint + test + build loop

## Resources

- Use `.agents/skills/spw-craft-quality/references/craft-checklist.md` as the default review checklist.
