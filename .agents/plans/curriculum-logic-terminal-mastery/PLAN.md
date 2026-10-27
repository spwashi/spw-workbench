# Plan: curriculum-logic-terminal-mastery

## Goal

Design a comprehensive **five-lab deep-dive curriculum** (planned as 26 lesson commits; collapsed to five lab files on 2026-10-12) dedicated to mastering terminal-based programming, REPL mechanics, and foundational computational paradigms (Prolog, Haskell, GraphQL/Cypher). The goal is to study how these distinct environments manage state, logic, and IO, and directly map those philosophical precedents into **Spw's linguistic architecture**. This bridges classical computer science rigor with Spw's metacognitive workbench. This lane is intentionally curricular and exploratory: it should create better CLI and language discussion subjects, plus reusable experiments, without pretending to be a release blocker on its own.

This curriculum sits between the `language` and `service` rungs in the current ecology. Its value is to create better questions, prototypes, and snippets for query/CLI/service design, not to silently become an implementation branch for foreign runtimes.

**Taste Note:** Actively develops **taste for rigor** (tying Spw's experimental compiler to established mathematical/logical paradigms) and **expressiveness** (unlocking the terminal REPL not just as a prompt, but as a conversational, spatial UI).

## Scope

- **In scope**: Designing a five-lab curriculum of markdown/spw artifacts, one per phase: TTY Mechanics, Logical Inference (Prolog), Functional Purity (Haskell), Graph Topologies (GQL), and CLI Synthesis. Each step requires reviewing specific paradigms, writing raw experimental code, synthesizing a Spw reflection, reviewing at least one current repo query/CLI/tooling surface alongside the precedent, and naming at least one experiment or heuristic that could sharpen a future CLI or query surface.
- **Out of scope**: Building a full Prolog/Haskell compiler in Spw or silently becoming a required release lane. This is an architectural mapping and skill-building exercise, not a 1:1 runtime implementation.

## The Curriculum Sequence: 26 Steps to Linguistic Mastery

### Phase I: The Terminal & TTY Mechanics (lab_terminal_tty)
Deep dive into raw TTY buffers, ANSI escape codes, standard streams, and interactive prompt mechanics. We establish how raw streams of characters are converted into structured evaluation loops (the REPL). The Spw reflection explores the terminal not as a linear prompt, but as a sensory event horizon mapping to Spw's continuous compilation model.

### Phase II: Logical Inference & Prolog (lab_prolog_unification)
Master declarative knowledge bases, Horn clauses, unification, and recursive backtracking. Moving from imperative execution to goal-oriented proof searches. The Spw reflection maps absolute Prolog Unification back to Spw's fluid Pattern Matching and "semantic equivalencies."

### Phase III: Functional Purity & Haskell (lab_haskell_purity)
Master strict separation of side-effects using Monads, lazy evaluation (thunks), Algebraic Data Types, and Typeclasses. The Spw reflection maps absolute Haskell `IO` purity to Spw's narrative Valences (Bone vs. Boon/Bonk) and translates lazy mathematical bounds into Spw's fluid Ontologies.

### Phase IV: Graph Topologies & GQL (lab_graph_gql)
Master the ISO-standard Property Graph models, Cypher traversal syntax (`(a)-[r]->(b)`), and transitive closures. The Spw reflection translates rigorous Subgraph Projections and pattern matching algorithms into Spw's associative Resonance systems and spatial Lenses.

### Phase V: The Spw CLI Synthesis (lab_cli_synthesis)
Unify the previous paradigms. Designing a CLI that leverages TTY interactivity, evaluates ASTs lazily (Haskell), processes logic transitively (Prolog/GQL), and communicates naturally. This phase outlines the ultimate architecture for the Spw command-line experience.

## Agentic Hygiene

- **Rebase target**: `main@551bb419` (updated 2026-10-12)
- **Rebase cadence**: rebase before lab_terminal_tty and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-logic-terminal-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] docs/learn/labs/logic-terminal/01-terminal-tty.md
[NEW] docs/learn/labs/logic-terminal/02-prolog-unification.md
[NEW] docs/learn/labs/logic-terminal/03-haskell-purity.md
[NEW] docs/learn/labs/logic-terminal/04-graph-gql.md
[NEW] docs/learn/labs/logic-terminal/05-cli-synthesis.md
      (each with its NN-slug.check.test.ts; the 26 lesson files collapsed to five on 2026-10-12)
[NEW] the Rosetta-stone .spw artifact (rosetta_stone_artifact; path not chosen)
[MOD] .spw/conventions/selection.spw
[MOD] .spw/tooling/vscode-spw.spw
[MOD] packages/spw-seed/src/query/selector-expr.ts
[MOD] packages/spw-cli/src/query.ts
```

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Dependencies

- `plan-ecology-clustering` — this curriculum bridges `language` and `service` judgment and should feed CLI/query/service plans with reusable reasoning rather than hidden urgency.
- `absorb-spwq-cli` — likely downstream consumer of REPL, command, and selection heuristics.
- `register-phase-evolution` — likely downstream consumer of logic/query vocabulary.
- `runtime-dx-foundation` — likely downstream consumer of terminal/diagnostic interaction heuristics.

## Principal Engineering Orientation

- Ladder position: `language -> service bridge`
- Judgment target: make CLI and query design more rigorous by studying proven terminal, logic, functional, and graph precedents directly
- Commit bar: each lab should yield one transferable concept, one Spw translation, and one future CLI/query/service question worth pursuing

## Review Surfaces

- External precedents: TTY/ANSI mechanics, Prolog, Haskell, GraphQL/Cypher/GQL, REPL design
- Repo precedents: `.spw/conventions/selection.spw`, `.spw/tooling/vscode-spw.spw`, `packages/spw-seed/src/query/selector-expr.ts`, `packages/spw-cli/src/query.ts`
- Future consumers: query, CLI, diagnostics, and authoring/editor plans that need firmer command/selection reasoning

## Capability Transfer

- Language capability: naming selectors, rules, laziness, inference, and graph traversal more precisely
- Service capability: richer REPL/CLI affordances, query exploration loops, and terminal-native diagnostics
- Research capability: portable examples that compare one problem across multiple paradigms

## Syntax and Snippet Discipline

- Stable snippets: preserve small examples that show the same conceptual problem in TTY, logic, functional, graph, and Spw forms
- Experimental snippets: speculative CLI spellings and prompt choreography should be marked experimental until they survive user-facing discussion
- Route discipline: each lesson should say whether it primarily sharpens query syntax, command language, service ergonomics, or broader semantics

## Spw Artifact

A formal `.spw` document that acts as a Rosette Stone, translating a single conceptual problem into Prolog facts, Haskell types, GQL queries, and pure Spw syntax—executed via the CLI.

## Reheated 2026-10-12

The live commit list, shared lab format, verification tiers and open questions are in wip.spw (the commits and lab_format frames); the shared format is owned by curriculum-html-css-mastery. Lab home: docs/learn/labs/logic-terminal/.
