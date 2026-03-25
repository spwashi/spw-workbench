# Plan: editor-color-reference-hints

Enhance the editor color treatment and reference hints for Spw authoring surfaces.

## Goal

The desired end state is an editor surface where Spw syntax reads more intentionally and reference affordances feel more navigable. This improves clarity and craft quality: syntax colors should better separate anchors, prompt constructs, traits, and measures, while reference hints should expose enough local context to reduce jump-and-guess workflows.

## Scope

- **In scope**: refine VS Code token color defaults and supporting syntax scopes; improve VS Code CodeLens/hover reference summaries; improve LSP code-lens and inlay-hint wording for references and anchors.
- **Out of scope**: a full custom theme, runtime semantic changes, or broad parser work outside editor display/hint surfaces.

## Files

```text
[NEW] .agents/plans/editor-color-reference-hints/PLAN.md
[NEW] .agents/plans/editor-color-reference-hints/wip.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/providers/codelens.ts
[MOD] extensions/vscode-spw/src/providers/hover.ts
[MOD] extensions/vscode-spw/src/providers/document-symbol.ts
[MOD] packages/spw-lsp/src/handlers/display.ts
[MOD?] extensions/vscode-spw/syntaxes/spw.tmLanguage.json
[DEL] (none)
```

### Craft guard

The highest drift risk is between the semantic-token provider, TextMate scopes, and the package-level color defaults. This pass should keep color changes centralized and avoid adding a second competing color system.

## Commits

1. `.[editor-hints] — plan color and reference-hint polish`
2. `&[vscode] — sharpen token palette for prompt and reference surfaces`
3. `&[hints] — enrich VS Code and LSP reference hints with better context`
4. `![editor-hints] — verify build and focused editor behavior`

Fuzz strategy:
- Explore loop: `fuzz:explore --target=editor-hints`
- Stabilize loop: `npm run build`
- Ship gate: `npm run build`

## Agentic Hygiene

- Rebase target: `main@d6776aeb44bb896d212e2de725a970abb032b037`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; this is editor-surface polish, not a new durable protocol.
