# Documentation

## Structure

```
docs/
├── contributing/     # Contributor onboarding guides
│   ├── README.md     # Hub page with persona selector
│   ├── researchers.md
│   ├── engineers.md
│   ├── hobby-coders.md
│   ├── new-form-template.md
│   └── common-tasks.md
│
├── audits/           # Intentional review lanes (coherence, learnability)
│   ├── index.spw     # Audit index
│   ├── ontological-geometry-audit.md
│   └── vim-keybindings-inconsistencies-audit.md
│
├── design/           # Design decisions and history
│   ├── goals.md      # Product design goals
│   ├── history.md    # Origin story, influences
│   ├── research-episodes-plan.md      # Research/recording development plan
│   ├── semantic-features-model.md     # Semantics→visual mapping theory
│   ├── cognitive-hierarchy-visual-theming.md # Salience/temperature/theming theory
│   └── phase-3-flow-inspector-plan.md # Flow inspector implementation plan
│
├── lang/             # Spw language documentation
│   └── few-shot.spw.md
│
└── learn/            # Learning paths (future)
```

## Entry Points

### For Contributors
- **Ready to contribute?** Start with `contributing/README.md` (contributing guide hub)
- **Your persona:** Choose [researchers](contributing/researchers.md), [engineers](contributing/engineers.md), or [hobby coders](contributing/hobby-coders.md)
- **Contributor plans:** 6-week plans with time-budget variants in each persona guide
- **Common tasks?** See `contributing/common-tasks.md`
- **Adding a language form?** See `contributing/new-form-template.md`

### For Users & Learners
- **Complete navigation?** Open `toc.spw` (table of contents)
- **New to Spw?** Start with `lang/few-shot.spw.md`
- **Understanding the architecture?** See `design/goals.md`
- **UI design principles?** See `.spw/patterns/literate-ui.spw` (operator navigation, snippet economy, component physics)
- **Need a top-down map?** Read `architecture-map.md`
- **Curious about origins?** Read `design/history.md`
- **Roadmap view?** Read `directions.spw` (1–3–6 month priorities)
- **Episode plan (research/recording)?** Read `design/research-episodes-plan.md`
- **Theming semantics model?** Read `design/semantic-features-model.md`
- **Visual hierarchy/theming theory?** Read `design/cognitive-hierarchy-visual-theming.md`
- **Flow inspector implementation plan?** Read `design/phase-3-flow-inspector-plan.md`
- **Need the full map?** Open `index.spw`
- **Working with feature flags?** See `feature-registry.spw`

## Path Syntax

Documentation files use a path topology syntax:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `@name: ~"path"` | Declare named root | `@src: ~"../src"` |
| `@root/path/` | Root-relative dir | `@src/core/` |
| `@root/file.ext` | Root-relative file | `@src/index.ts` |
| `~"./path"` | Local relative ref | `~"./README.md"` |
