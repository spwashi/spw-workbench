# Plan: command-experience-tools

## Goal

Develop a comprehensive and seamless Command Experience coupled with in-depth Concept Reference and Object Manipulation tools. This plan transforms the Workbench from a text editor into a fully realized semantic operating environment. Users will be able to summon a global command palette, look up Spw concepts (sigils, valences, ontologies) inline, semantically select AST objects, and manipulate them visually (e.g., shifting their strata or changing their valence) through rigorous, typed command intents.

**Taste Note:** Improves **interactivity** (providing multiple modalities—keyboard, palette, direct manipulation—to edit Spw structures), **expressiveness** (making the Spw language's own ontology searchable from within), and **rigor** (driving all visual tools through a strictly typed central Command Bus).

## Scope

- **In scope**: Developing the `CommandBus`, the visual `CommandPalette`, the `ConceptLookupService` and associated UI (hover cards), semantic `ASTObjectSelector` logic, UI panels for manipulating node parameters (`Valence`, `Strata`), and the core transformation engines that execute these commands.
- **Out of scope**: Modifying the underlying parser or lexer algorithms. We are building the *experience* and *tools* that sit on top of the existing AST infrastructure.

## Phase Breakdown

The 26 commits are strategically grouped into phases:
1. **The Infrastructure** (Commits 1-3): The Command Bus and Actions.
2. **The Command Palette** (Commits 4-5): The primary UI overlay.
3. **Concept References** (Commits 6-11): Ontologies, lookup services, and hover cards.
4. **Semantic Selection** (Commits 12-14): Selecting objects structurally rather than textually.
5. **Object Manipulation** (Commits 15-21): UI and engines to modify AST objects.
6. **Polish and Verification** (Commits 22-26): Testing, animations, and documentation.

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/command-experience-tools-agentic-hygiene` before implementation commits

## Files

Predicted file changes:
```
[NEW] src/core/command-bus.ts
[NEW] src/core/models/command-intents.ts
[NEW] src/ui/elements/command-palette/
[NEW] src/platform/concept-lookup.ts
[NEW] src/ui/elements/concept-reference/
[NEW] src/editor/ast-selector.ts
[NEW] src/ui/tools/object-inspector/
[NEW] src/core/ast-transformer.ts
```

### Craft guard

- The `CommandBus` must remain entirely decoupled from the UI layer. `src/core` handles the routing; `src/ui` simply dispatches intents.
- UI manipulation tools must not mutate the AST directly; they must dispatch intents to the transformer engine to ensure undo/redo and history remain intact.

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `&[core] — establish the central CommandBus and action registry`
2. `vocab[core] — define rigorous CommandIntent and ActionContext branded types`
3. `&[platform] — wire the CommandBus to global keyboard shortcuts and the REPL`
4. `&[ui/command] — scaffold the visual CommandPalette overlay component`
5. `&[ui/command] — implement fuzzy-matching and command history in the palette`
6. `^seed[reference] — design the ConceptReference data topology for Spw ontologies`
7. `vocab[reference] — type the Definition, Sigil, and Valence reference nodes`
8. `&[platform] — build the ConceptLookupService to query the reference topology`
9. `&[ui/elements] — implement the ConceptHoverCard for inline Spw documentation`
10. `&[editor] — wire editor tooltips to the ConceptLookupService`
11. `&[ui/command] — integrate concept lookup directly into the Command Palette search`
12. `&[editor] — scaffold the ASTObjectSelector for semantic code selection`
13. `vocab[editor] — define SelectionBoundary and GeometricTarget types`
14. `&[editor] — implement structural expansion (select parent/child/sibling node)`
15. `&[ui/tools] — scaffold the ObjectInspector panel for selected AST nodes`
16. `&[ui/tools] — implement ValenceManipulator UI (dialing boon/bane on nodes)`
17. `&[platform] — wire ValenceManipulator to emit AST transformation intents`
18. `&[ui/tools] — implement StrataShifter UI (moving objects between semantic layers)`
19. `&[platform] — wire StrataShifter to emit structural modification intents`
20. `&[ui/command] — map object manipulation intents back into the globally accessible CommandBus`
21. `&[core] — implement the AST transformation engine listening to the CommandBus`
22. `![core] — write integration tests for visual-to-AST command flow`
23. `&[ui/elements] — polish the animations and transitions for the Command Palette opening/closing`
24. `&[ui/elements] — polish the visual feedback mapping (color flashes) when objects are manipulated`
25. `.[docs] — write the Command Experience and Object Manipulation user guides`
26. `.[docs] — update the Spw linguistic architectural diagrams covering the new command flow`

## Dependencies

- None. This is a foundational vertical slice impacting the core user experience.

## Spw Artifact

```
.agent/plans/command-experience-tools/command-topology.spw
```
A formal Spw record documenting the relationship between human intent (UI/Keystroke), logical representation (`CommandIntent`), and physical mutation (AST Transformation).
