---
name: spw-css-dom-lab
description: Design and run small, reversible UI experiments using modern CSS and DOM APIs in this repo. Use for "CSS as query language", runtime philosophy experiments, interaction prototypes, and instrumented UX hypotheses.
---

# Spw CSS + DOM Lab

## Default Workflow

1. State the hypothesis in one sentence (what should change, for whom, and why).
2. Choose a minimal "probe" that is reversible (a CSS rule, a data-attr, a small DOM hook).
3. Gate the experiment behind an explicit switch (data attribute, query param, or feature flag).
4. Instrument outcomes (DOM state, timing, user-visible deltas) with minimal logging.
5. Keep the patch small; prefer deleting code over accumulating toggles.
6. Record results and next steps in a short note.

## Output Contract

- Prefer experiments that can be removed in one commit.
- Avoid permanent architectural changes unless the experiment is validated.

## Codebase-Specific Context

### CSS Architecture
- **Domain prefixes**: `.spw-app-*`, `.spw-ui-*`, `.spw-viz-*`, `.spw-lang-*`, `.spw-panel-*`
- **Naming pattern**: `.spw-{domain}-{component}[-{element}][-{modifier}]`
- **Token system**: `--spw-*` custom properties managed via `src/design/`
- **Context textures**: discipline-specific CSS fragment programs (astronomy, circuitry, biology, logic, cartography, choreography, acoustics)
- **Narrative tokens**: personality → CSS bridge via `src/design/themes/cognitive-bridge.ts` (warmth, rhythm, grain, luminance cycle, particle density, motion character, depth)
- **Stages**: 0=silent → 3=full. Stage gates atmosphere and motion intensity.

### Data Attributes for Experiments
- `html[data-activation-context]` — current activation context
- `html[data-perspective]` — derived perspective
- `html[data-stage]` — intensity stage (0–3)
- `html[data-theme]` — active theme
- `html[data-genre]` — active genre (coincidence of axis configuration)
- `[data-spw-component]` — stable component identification for tests/automation

### Semantic Lenses
- Ctrl+1/2/3 for lens triangulation (syntactic, semantic, pragmatic)
- Lens state exposed via `html[data-lens]`

### Deformation Axis Tokens
- Timing axis primitives: `--spw-beat`, `--spw-half-beat`, `--spw-bar` (derived from `--spw-bpm`)
- Named easing curves: `--spw-ease-light-swing`, `--spw-ease-medium-swing`, `--spw-ease-funk-pocket`, `--spw-ease-ghost-note`
- Genre-scoped CSS: `src/styles/genres/`
- When designing experiments under axis-deformed code, consume the axis tokens rather than ad-hoc `cubic-bezier` values.

## Codebase Tooling

```bash
npm run fuzz:runtime        # Unnecessary conditions, coercion (catches CSS logic bugs in JS)
npm run audit:ui-selectors  # Verify UI selector baseline hasn't drifted
npm run lint                # ESLint (catches data-attr misuse)
```

## Skill Care

Update this skill when:
- New CSS domain prefixes are established → update CSS Architecture section
- New `data-*` attributes are standardized → update Data Attributes section
- A new activation context is added → update Codebase-Specific Context
- Stage gating changes (new stages added) → update Stages description
- The cognitive-bridge token system changes → update Narrative Tokens section
- A new deformation axis or axis primitive is added → update Deformation Axis Tokens section

## Scripts

- `bash .agents/skills/spw-css-dom-lab/scripts/css-experiment-gate.sh <name> check` — pre-experiment checklist
- `bash .agents/skills/spw-css-dom-lab/scripts/css-experiment-gate.sh <name> cleanup` — post-experiment artifact scan

## Resources

- Read `.agents/skills/spw-css-dom-lab/references/experiment-template.md` for a consistent experiment structure.
