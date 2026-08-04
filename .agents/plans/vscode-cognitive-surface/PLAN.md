# Plan: vscode-cognitive-surface

Define what authors should **notice, learn, infer, and enjoy** when Spw editor surfaces reveal workspace structure, field state, phase, and change over time — without adding noise. Vocabulary is **shared**; chrome differs (VS Code strip/trees vs Neovim statusline/quickfix).

## Goal

Core atlas/concepts/strip surfaces exist in VS Code, and Neovim already surfaces Spw through syntax + LSP, but orientation language is still uneven. This plan is a **speculative / teaching** rung: user questions, surface taxonomy, comparison language, **reading profiles**, and joy-under-discipline. It improves legibility and cross-surface coherence *after* performance and capability honesty land.

**Taste note**: legibility, delight, containment, cross-surface coherence, cross-client honesty.

## Ecology

Parent: `.agents/plans/shape-syntax-ecology/PLAN.md`.  
**Shape-over-phoneme:** reading profiles and gestalt disclosure; semantic tokens as operator/brace visual primitives.  
**Screenshot/LLM policy:** vision may classify gestalt; **AST dual-read required** before any edit advice is trusted.  
Dialect curriculum disclosure: show which product surface (b/p/q/m/f/x/t) the buffer is teaching.  
Cognitive aerodynamics (drag/lift/wake) remain **interpretive** until measured; do not ship as law.

## Imagination / play

| Mode | Play |
|------|------|
| **IDE** | Switch reading profile author→research→creative; note disclosure change without parse change |
| **Screenshot** | Full brace glow region; ask model for “airfoil” of attention; compare to form-geometry ports |
| **Learning** | Pair with syntax-profile-stack examples; one dialect per day |
| **Falsify** | Joy metrics from dwell time alone; interpretive charge as ONF |

## Practical use

| Concern | Hook |
|---------|------|
| Learning | reading profiles + dialect ethos |
| Memory | orientation copy for plan context |
| Selectors | quiet vs loud disclosure |
| Tests | copy fixtures not parse |

## Scope

- **In scope**:
  - user-question catalog (“where am I?”, “what changed?”, “what is inherited?”, “what can I ignore?”, “is this claim still true?”, “what is this wonder measuring?”)
  - copy and badge dialect (**status-tagged** metaphors only)
  - comparative reading
  - **reading profiles** used by both clients:

    | Profile | Noise budget | Primary signals |
    |---------|--------------|-----------------|
    | `author` | medium | diagnostics, rename, mass/authority, symbols |
    | `prompt` | low red / high structure | depth, op-density, path thrift, wonder blocks |
    | `research` | high evidence | claim chain, probes, falsify thresholds, grades |
    | `creative` | soft | file-physics thrift, soft_miss as invitation, minimal hard fails |

  - plan-context orientation when under `.agents/plans/<slug>/`
  - clone-first-open orientation copy for repos that ship `.spw/`
  - links to strip, hover, atlas, concepts (VS Code) and statusline/quickfix (Neovim)
  - optional render-only experiments that do not require new LSP methods first
- **Out of scope**: new semantic engines; webview consoles; implementing probe/mass engines (authoring + measure plans); performance packaging (rung 2); Neovim panel ports

## Relationship to ladder

Roadmap rung **5** — polish after rungs 0–4. May draft copy earlier; must not block performance or capability work.

**Doctrine inputs:** `operational-topography` and `vscode-editor-contract` own evidence eligibility, grades, authority, and differential shape. Garden profiles may own measurement recipes; cognitive profiles own wording, disclosure, rendered rotations, and explicit learning/joy experiments.

## Files

```text
[NEW] .agents/plans/vscode-cognitive-surface/PLAN.md
[MOD] .agents/plans/vscode-cognitive-surface/wip.spw
[NEW] .agents/plans/vscode-cognitive-surface/vscode-cognitive-surface.spw
[MOD?] extensions/vscode-spw/src/context-strip.ts
[MOD?] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD?] extensions/vscode-spw/src/views/concepts-tree.ts
[MOD?] extensions/neovim-spw/README.md                    reading_profile docs
[MOD?] packages/spw-lsp                                   init setting: spw.readingProfile
[REF] .agents/plans/vscode-editor-contract/PLAN.md
[REF] .agents/plans/vscode-lsp-roadmap/PLAN.md
[REF] .agents/plans/neovim-spw-surfaces/PLAN.md
```

### Craft guard

- Delight is subordinate to orientation and evidence truth; it is explicitly reported, not inferred from dwell time or syntax density.
- Prefer reusing existing surfaces over adding panels.
- Any copy change should reuse Spw vocabulary already in interaction contract.
- Reading profiles change **disclosure**, not parse truth.

## Commits

1. `.[plans] — formalize vscode-cognitive-surface PLAN and artifact`
2. `.[plans] — publish user-question catalog and noise budget`
3. `.[vscode]? — apply copy/badge dialect once lower rungs are quiet`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before implementation commits
- Hygiene split: none

## Dependencies

- Hard: operational-topography and editor-contract
- Soft: plugin-performance (so polish is not applied to thrashing UI)
- Related: workspace-atlas, authoring-probe-loop, neovim-spw-surfaces, measure-invariant-generalization

## Spw Artifact

`.agents/plans/vscode-cognitive-surface/vscode-cognitive-surface.spw`
