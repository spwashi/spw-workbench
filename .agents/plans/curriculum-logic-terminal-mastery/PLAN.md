# Plan: curriculum-logic-terminal-mastery

## Goal

Design a comprehensive **26-commit deep-dive curriculum** dedicated to mastering terminal-based programming, REPL mechanics, and foundational computational paradigms (Prolog, Haskell, GraphQL/Cypher). The goal is to study how these distinct environments manage state, logic, and IO, and directly map those philosophical precedents into **Spw's linguistic architecture**. This bridges classical computer science rigor with Spw's metacognitive workbench.

**Taste Note:** Actively develops **taste for rigor** (tying Spw's experimental compiler to established mathematical/logical paradigms) and **expressiveness** (unlocking the terminal REPL not just as a prompt, but as a conversational, spatial UI).

## Scope

- **In scope**: Designing a 26-part curriculum of markdown/spw artifacts grouped into 5 distinct phases: TTY Mechanics, Logical Inference (Prolog), Functional Purity (Haskell), Graph Topologies (GQL), and CLI Synthesis. Each step requires reviewing specific paradigms, writing raw experimental code, and synthesizing a Spw reflection.
- **Out of scope**: Building a full Prolog/Haskell compiler in Spw. This is an architectural mapping and skill-building exercise, not a 1:1 runtime implementation.

## The Curriculum Sequence: 26 Steps to Linguistic Mastery

### Phase I: The Terminal & TTY Mechanics (Commits 1–5)
Deep dive into raw TTY buffers, ANSI escape codes, standard streams, and interactive prompt mechanics. We establish how raw streams of characters are converted into structured evaluation loops (the REPL). The Spw reflection explores the terminal not as a linear prompt, but as a sensory event horizon mapping to Spw's continuous compilation model.

### Phase II: Logical Inference & Prolog (Commits 6–10)
Master declarative knowledge bases, Horn clauses, unification, and recursive backtracking. Moving from imperative execution to goal-oriented proof searches. The Spw reflection maps absolute Prolog Unification back to Spw's fluid Pattern Matching and "semantic equivalencies."

### Phase III: Functional Purity & Haskell (Commits 11–15)
Master strict separation of side-effects using Monads, lazy evaluation (thunks), Algebraic Data Types, and Typeclasses. The Spw reflection maps absolute Haskell `IO` purity to Spw's narrative Valences (Bone vs. Boon/Bonk) and translates lazy mathematical bounds into Spw's fluid Ontologies.

### Phase IV: Graph Topologies & GQL (Commits 16–20)
Master the ISO-standard Property Graph models, Cypher traversal syntax (`(a)-[r]->(b)`), and transitive closures. The Spw reflection translates rigorous Subgraph Projections and pattern matching algorithms into Spw's associative Resonance systems and spatial Lenses.

### Phase V: The Spw CLI Synthesis (Commits 21–26)
Unify the previous paradigms. Designing a CLI that leverages TTY interactivity, evaluates ASTs lazily (Haskell), processes logic transitively (Prolog/GQL), and communicates naturally. This phase outlines the ultimate architecture for the Spw command-line experience.

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-logic-terminal-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] .agent/skills/spw-logic-terminal-lab/labs/01-tty-ansi-buffers.md
... (Files 02 through 25)
[NEW] .agent/skills/spw-logic-terminal-lab/labs/26-terminal-mastery-synthesis.md
```

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `^seed[curriculum] — scaffold Lab 1: TTY Buffers and ANSI Escape Codes`
2. `^seed[curriculum] — scaffold Lab 2: Standard Streams and POSIX Pipelines`
3. `^seed[curriculum] — scaffold Lab 3: The Architecture of REPL Evaluation Loops`
4. `^seed[curriculum] — scaffold Lab 4: Terminal UI Constraints (Curses/Blessed mechanics)`
5. `![curriculum] — establish Spw Reflection: The Terminal as a continuous spatial compiler`
6. `^seed[curriculum] — scaffold Lab 5: Prolog Horn Clauses and Declarative Facts`
7. `^seed[curriculum] — scaffold Lab 6: Unification Algorithms and Substitution`
8. `^seed[curriculum] — scaffold Lab 7: Resolution, Backtracking, and the Cut Operator (!)`
9. `^seed[curriculum] — scaffold Lab 8: Homoiconicity and Logic as Data`
10. `![curriculum] — establish Spw Reflection: Unification vs Semantic Pattern Matching`
11. `^seed[curriculum] — scaffold Lab 9: Haskell Absolute Purity and the IO Monad`
12. `^seed[curriculum] — scaffold Lab 10: Lazy Evaluation and Infinite Thunks`
13. `^seed[curriculum] — scaffold Lab 11: Algebraic Data Types (Sum and Product Types)`
14. `^seed[curriculum] — scaffold Lab 12: Typeclasses and Parametric Polymorphism`
15. `![curriculum] — establish Spw Reflection: Mapping Purity to Spw Valences (Bones vs Boons)`
16. `^seed[curriculum] — scaffold Lab 13: Property Graph Models (Nodes, Edges, Properties)`
17. `^seed[curriculum] — scaffold Lab 14: Cypher and GQL Pattern Matching Syntax`
18. `^seed[curriculum] — scaffold Lab 15: Recursive Traversals and Transitive Closures`
19. `^seed[curriculum] — scaffold Lab 16: Subgraph Projections and Isomorphisms`
20. `![curriculum] — establish Spw Reflection: Mapping Graph Traversals to Semantic Resonance`
21. `^seed[curriculum] — scaffold Lab 17: Synthesis: The Polyglot AST Interface`
22. `^seed[curriculum] — scaffold Lab 18: Synthesis: Piped AST Streams in Bash`
23. `^seed[curriculum] — scaffold Lab 19: Synthesis: Visualizing AST Graphs in raw TTY`
24. `^seed[curriculum] — scaffold Lab 20: Synthesis: Designing the Conversational Prompt`
25. `![curriculum] — establish Spw Reflection: The CLI as a Metacognitive Collaborator`
26. `.[docs] — write the definitive curriculum guide for 'Logic Terminal Mastery'`

## Dependencies

- None. Can be run entirely independently in the terminal.

## Spw Artifact

A formal `.spw` document that acts as a Rosette Stone, translating a single conceptual problem into Prolog facts, Haskell types, GQL queries, and pure Spw syntax—executed via the CLI.
