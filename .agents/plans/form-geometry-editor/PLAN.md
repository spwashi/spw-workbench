# Plan: form-geometry-editor

Project Seed form geometry, boundary ladders, mutation/pulse differentials, and topography probes into `spw-lsp` and the VS Code thin client — without inventing a second structural model.

## Goal

The seed kernel can already:

- attach coupling frames (occupancy, payload, kind/form);
- walk boundary and operator ladders;
- apply label-mobility rules and higher-order forms (HOF);
- plan mutation automata / pulse profiles with topography deltas;
- bridge `$(name)` to register liminality through an explicit, opt-in runtime `effect.l1.memory` call.

The editor does not yet show or apply most of this. End state: caret-local **form context**, **previewable mobility actions**, **pulse check/apply** sharing the CLI differential kernel, and optional teaching surfaces that stay anti-echo and E/S-grade honest.

**Taste note**: evidence discipline, thin client, one differential kernel, learnability without capacitance theatre.

## Ladder position

Roadmap rung **0c** (after operational-topography kernel, before or parallel to capability registry work that *earns* `spw/formContext`). See `.agents/plans/vscode-lsp-roadmap/PLAN.md`.

## Doctrine

1. Seed owns apply() and probes; LSP maps to ranges/edits; plugin authorizes S2.
2. `status: implemented` is necessary but insufficient for a code action: the actual-source preview must return a receipt, preserve parse health, pass the declared inverse/information policy, and resolve against the current document revision.
3. Proposed rules may appear in hover as “conceptual”, never auto-apply.
4. Digraph `<>` vs capsule `<…>` always named distinctly in UI.
5. Pair labels use desugar surfaces until grammar retains pair_id/open_label.

## Implementation slices

| Slice | Deliverable | Effect grade |
|-------|-------------|--------------|
| **P0a** | Hover coupling packet (kind, form, occupancy, payload, empty state; no invented runtime unit) | S0 (topography read) |
| **P0b** | Code actions: exact-surface candidates whose actual preview receipts pass health, loss, inverse, and revision gates | S1 plan → S2 apply |
| **P1a** | Server `spw/formContext` (revision-addressed) | S0 (+ optional S1 previews) |
| **P1b** | Context strip fields from formContext | S0 |
| **P1c** | Pulse/mutation `SourceEdit` → LSP `TextEdit`; commands Pulse Check / Apply | S0 / S2 |
| **P1d** | Range address `#:L12-L28` + `indent_lines` (see `docs/theory/spw/range-transform.spw`) | S0–S2 |
| **P2a** | Diagnostics: prose-fallback boundaries; optional empty-bound hints (config off by default) | S0 |
| **P2b** | Semantic token modifiers: occupancy, couple vs capsule | S0 |
| **P3a** | HOF walk command (preview panel → apply) | S1→S2 |
| **P3b** | Register bridge command (after honest `registerSnapshot` or document-local interpret) | effect.l1.memory + S2 UI gate |

## Scope

- **In scope**: LSP handlers (hover, codeAction, optional formContext), thin VS Code commands/config, TextEdit mapping, tests under `packages/spw-lsp` and seed (already green for kernel).
- **Out of scope**: re-parsing in the client; new physical metaphors as diagnostics; auto-HOF on type; automatic register promotion inferred from `$(name)` syntax; implementing phantom resonance/frequency methods as a side quest; IntelliJ first (second client after VS Code proof).

## Files

```text
[NEW] .agents/plans/form-geometry-editor/PLAN.md
[NEW] .agents/plans/form-geometry-editor/wip.spw
[NEW] .agents/plans/form-geometry-editor/form-geometry-editor.spw
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD] packages/spw-lsp/src/handlers/editing.ts
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/types.ts
[NEW?] packages/spw-lsp/src/handlers/form-context.ts
[NEW?] packages/spw-lsp/src/protocol.ts
[MOD] extensions/vscode-spw/src/lsp/custom-requests.ts
[MOD] extensions/vscode-spw/src/context-strip.ts
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/package.json
[REF] packages/spw-seed/src/canonical/form-geometry.ts
[REF] packages/spw-seed/src/canonical/form-ladders.ts
[REF] packages/spw-seed/src/canonical/form-contours.ts
[REF] packages/spw-seed/src/canonical/mutation-automata.ts
[REF] packages/spw-seed/src/canonical/differential.ts
[REF] packages/spw-cli/src/pulse.ts
[REF] packages/spw-runtime/src/state/liminality-bridge.ts
[REF] docs/theory/spw/range-transform.spw
[MOD] .agents/plans/vscode-lsp-roadmap/PLAN.md
[MOD] .agents/plans/lsp-custom-request-completions/PLAN.md
[MOD] .agents/plans/vscode-authoring-probe-loop/PLAN.md
[MOD] .agents/plans/operational-topography/PLAN.md
```

### Craft guard

- Extract form-context assembly into its own handler file; do not grow `display.ts` further without extract.
- Reuse seed exports; no duplicated regex “geometry” in the plugin.
- Map offsets carefully: seed `SourceEdit` is UTF-16-ish JS string offsets — document encoding tests required.

## Commits

1. `.[plans] — stage form-geometry-editor projection plan`
2. `^seed[lsp] =hover[coupling] — occupancy/payload packet at bound caret`
3. `^seed[lsp] =action[mobility] — implemented label-mobility code actions`
4. `vocab[lsp] =request[formContext] — revision-addressed geometry packet`
5. `&[lsp,cli] =pulse[edits] — SourceEdit → TextEdit + check/apply commands`
6. `![lsp] *verify[form-geometry] — hover/actions/formContext tests`

## Agentic Hygiene

- Rebase target: current `main` (path-nav + handoff landed 2026-07-21; re-pin SHA before P0)
- Rebase cadence: before P0 implementation, before formContext, before merge
- Hygiene split: plan commit separate from product; product commits use episode blocks

## Dependencies

- Hard: seed form-geometry / ladders / pulse (landed)
- Hard: operational-topography doctrine (landed theory + partial engine)
- Soft: lsp-custom-request-completions registry (for advertisement of formContext)
- Soft: vscode-plugin-performance shared cursor context (avoid third debounce)
- Soft: vscode-register-explorer for P3b liminality UI

## Failure Modes

- **Hard**: code actions that apply proposed rules, trust `implemented` without an actual-source receipt, discard payload, or fail closed poorly
- **Hard**: client reparse of Spw for “smart” geometry
- **Soft**: hover re-echo of glyph without occupancy delta
- **Soft**: pulse format diverging from CLI profiles
- **Non-negotiable**: no S2 without explicit user accept

## Validation

- Hover on `[]` vs `[x]` differs by occupancy/payload
- Reduced hover/outline contours disclose omitted fields; expansion restores the input contour signature
- Code action chain shows `topic → @(topic) → $(topic)` (and peer mobility steps); direct `topic → $(topic)` is intentionally rejected
- `Spw: Pulse Check` matches `npm run spw:pulse -- --check <file>` on same content
- Client custom-request map for formContext has server handler + test
- Capability audit does not list formContext as phantom

## Spw Artifact

`.agents/plans/form-geometry-editor/form-geometry-editor.spw`
