# Plan: prompt-surface-align

Align parser, LSP, and editor plugin support with the prompt-pack surface now used in `prompts/*.prompt.spw`.

## Goal

The desired end state is that the prompt-pack files parse cleanly, stop raising false lexer diagnostics, and receive first-class editor affordances across the LSP, VS Code extension, and IntelliJ plugin. This improves correctness first, then expressiveness: the language surface exposed to authors should match the prompt dialect already present in the repo instead of treating it as second-class sugar. The taste note is correctness and expressiveness: prompt syntax should feel intentional, not accidental.

## Scope

- **In scope**: parser/lexer changes needed for prompt formulas to parse without lexer errors; LSP annotation/completion updates for prompt headers and prompt sigils; VS Code and IntelliJ plugin updates so prompt headers, prompt tags, and prompt formulas are recognized consistently.
- **Out of scope**: redesigning the prompt files themselves, introducing a new prompt ontology, changing runtime execution semantics, or broad grammar redesign outside prompt-surface support.

## Files

```text
[MOD] .agents/plans/prompt-surface-align/PLAN.md
[MOD] .agents/plans/prompt-surface-align/wip.spw
[MOD] packages/spw-seed/src/lexer/profiles.ts
[MOD] src/seed/lexer/profiles.ts
[MOD] src/seed/__tests__/parser.test.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/handlers/editing.ts
[MOD] extensions/vscode-spw/src/annotation-index.ts
[MOD] extensions/vscode-spw/src/providers/completion.ts
[MOD] extensions/vscode-spw/src/providers/semantic-tokens.ts
[MOD] extensions/vscode-spw/syntaxes/spw.tmLanguage.json
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLineParsers.kt
[MOD] extensions/intellij-spw/src/test/kotlin/com/spwashi/spw/SpwLineParsersTest.kt
[MOD] extensions/intellij-spw/src/main/resources/textmate/spw.tmLanguage.json
[DEL] (none)
```

### Craft guard

The JSON TextMate grammars are large and duplicated across VS Code and IntelliJ, so the main craft risk is drift between the two copies. Parser support remains intentionally narrow: this pass should eliminate prompt-surface false positives without turning the whole language into an arithmetic DSL.

## Commits

1. `.[prompt-surface] — plan parser and editor alignment for prompt packs`
2. `&[seed] — eliminate prompt-pack lexer errors in parser surface`
3. `&[lsp] — align annotation and completion support with prompt headers`
4. `&[plugins] — teach VS Code and IntelliJ prompt-surface syntax`
5. `![prompt-surface] — lock prompt parsing and plugin anchor behavior with tests`

Fuzz strategy:
- Explore loop: `fuzz:explore --target=prompt-surface`
- Stabilize loop: `fuzz:stabilize --target=prompt-surface`
- Ship gate: `npm run test:seed`

## Agentic Hygiene

- Rebase target: `main@1ddeba973442da8bdd4ea99c549bd33a15049d18`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; `main...HEAD` shows no unrelated drift outside `.agents/plans/`

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; this is support-surface alignment work, not a new durable protocol.
