# Experiments & Skills

Use these loops to explore parser/runtime behavior, UI semantics, and code quality — with an emphasis on fast feedback and safe experimentation.

## Quick experiment commands

- `npm run fuzz:explore` — warning-oriented, fast feedback loop while experimenting
- `npm run fuzz:stabilize` — correctness + runtime safety pass before review
- `npm run fuzz:refactor` — pressure-test structure, types, and mutation hotspots
- `npm run fuzz:ship` — strict pre-merge gate (error-level)
- `npm run fuzz:all` — run the full fuzz matrix at warn level
- `npm run fuzz --profile=types+async` — compose custom lenses (e.g., type + async)
- `npm run fuzz --profile=types+runtime --level=warn` — force severity for exploratory runs
- `npm run fuzz:explore --target=src/runtime/` — scope to one area while iterating
- `npm run fuzz:types` / `:complexity` / `:async` / `:purity` / `:dead` / `:naming` / `:runtime` — focused single-dimension lenses
- `npm run analyze:patterns` — pattern learner analyzer
- `npm run audit` / `npm run audit:md` / `npm run audit:json` — audit markers and summarize
- `npm run audit:ui-selectors` — check UI selectors; add `:update` to refresh baseline
- `npm run lsp` — start the LSP for IDE integrations

Commit-review scripts (shell):

```bash
bash .agents/skills/spw-commit-review/scripts/layer-check.sh
bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh
```

## Skills (curated)

| Skill | Purpose | How to run |
| --- | --- | --- |
| commit-review | Commit hygiene: import layers, Spw syntax generations | `layer-check.sh`, `spw-syntax-audit.sh` |
| css-dom-lab | CSS/DOM experiment protocol | `bash .agents/skills/spw-css-dom-lab/scripts/css-experiment-gate.sh` |
| semantics-rigor | Semantics checks and rigor workflow | `bash .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh` |
| typescript-affordances | Type-level audits and notes | `bash .agents/skills/spw-typescript-affordances/scripts/type-audit.sh` |
| craft-quality | Craft quality checklist and guardrails | `bash .agents/skills/spw-craft-quality/scripts/craft-check.sh` |
| ui-containment-audit | UI containment scanning | `bash .agents/skills/spw-ui-containment-audit/scripts/containment-scan.sh` |
| privacy-engineering | Privacy checklist scanning | `bash .agents/skills/spw-privacy-engineering/scripts/privacy-scan.sh` |
| research-rigor | Research notebook and workflow | see `.agents/skills/spw-research-rigor/` |
| ontology-workbench | Ontology skeleton and conventions | see `.agents/skills/spw-ontology-workbench/` |
| math-algorithm-radar | Algorithm radar templates | see `.agents/skills/spw-math-algorithm-radar/` |

Tip: run scripts from repository root. Prefer branch-scoped experiments; keep commits focused.

## Troubleshooting cues

- If a fuzz or audit command reports many findings, start with the most central module or the smallest high-impact fix.
- For `layer-check.sh` failures, review imports against `src/core/domains/index.ts` boundaries.
- For `spw-syntax-audit.sh` failures, open the reported `.spw` files and resolve parser diagnostics first.

<seealso>
  <category ref="spw-workbench">
    <a href="developer-workflow.md"/>
    <a href="validation-playbook.topic"/>
    <a href="maintenance-surface.topic"/>
    <a href="documentation-map.md"/>
  </category>
</seealso>
