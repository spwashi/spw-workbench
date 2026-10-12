# Plan: intellij-lsp4ij

Evaluate whether migrating the IntelliJ plugin from the deprecated native JetBrains LSP API to LSP4IJ earns its added dependency and migration cost before compatibility expands beyond the verified 262 platform branch.

## Goal

The 2026.2 Plugin Verifier accepts the native adapter but reports its LSP types as deprecated. LSP4IJ can also expose a typed custom-request interface. Those differences are real, but deprecation and VS Code feature parity are not by themselves migration reasons. This plan stays speculative through the 262 range; it must be decided before a 263 compatibility claim, using identity-free mounted-consumer evidence and the replacement APIs available at that boundary.

Taste note: clarity (cleaner LSP4IJ API), layering (no more native LSP API lock-in), expressiveness (three new views).

## Scope

- **In scope:** Record the migration decision against mounted-consumer evidence; if activated, migrate to LSP4IJ, implement the narrow typed custom-request bridge that evidence requires, and add only the surfaces justified by that review loop.
- **Out of scope:** Restyling the plugin; implementing LSP4IJ Debug Adapter Protocol (DAP) support; Semantic Tokens or other future enhancements; adding more than the three declared surfaces.

## Mounted-consumer asks (2026-10-12)

A mounted consumer's editor review (pin `229aedcf`) made no IntelliJ-specific ask. Everything here is **derived** from the routing table in `vscode-lsp-roadmap/PLAN.md`; it adds host consequences only and does not change the 263 gate or make parity a migration reason. No consumer identifier belongs in this plan's evidence.

- **LSP-level rows arrive through whichever substrate wins.** Parser-first citations, fragment and alias navigation, hover layers, stream-stamp completion, plan-context hover, freshness diagnostics and `willRenameFiles` are standard LSP, so the server owns them and the plugin projects what its substrate surfaces. Nothing here earns a new custom request; any that would joins the held matrix in `lsp-custom-request-completions`.
- **Evidence for the gate.** Add one column to the method matrix: which of the standard features these asks depend on (`willRenameFiles`, lenses that carry a command, `$/progress`, document links, completion triggers on `>>[`) the native adapter and LSP4IJ each surface. That is substrate evidence, which the gate wants; it is not a feature program.
- **Chrome is not ported.** Plans, Questions and Tending views, capture mode and the Timeline provider stay VS Code only (roadmap doctrine 12). IntelliJ's own distraction-free and presentation modes are its capture analogue; no Spw chrome is added.
- **Instruments.** `SpwInstrumentActions` already reads the saved file through the CLI. If the consumer's gesture rule (hover never writes; fixes previewed) is adopted by `vscode-editor-contract`, the instrument actions are its first IntelliJ check: read-only, and plan-only for refactors.
- **Grammar drift.** The bundled TextMate grammar is a separate copy and already lacks the `dialect-exp` repository present in the VS Code grammar. The one-operator-table ask (`?[operator_table]` in the roadmap) must name how this copy is generated or checked, or it will drift again.

## Files

**Phase 1: Migration**
```
[MOD] extensions/intellij-spw/build.gradle.kts
[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerFactory.kt
[DEL] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt
```

**Phase 2: Custom Request Bridge**
```
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwCustomServer.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/services/SpwWorkspaceService.kt
```

**Phase 3: Views**
```
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/panels/SpwAnnotationPanel.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/panels/SpwWorkspaceAtlasPanel.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/status/SpwContextStatusWidget.kt
[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml
```

Craft guard: Watch `SpwWorkspaceService` for state management scope creep. Panels should stay focused on rendering and user interaction, not business logic.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before `native_lsp_audit`, before merge
- Hygiene split: none

## Dependencies

- `spw-site-install` — mounted-consumer startup and the repo-local review contract must work before custom-request UI is evaluated
- `lsp-custom-request-completions` — server handlers must be stable and useful outside the VS Code client
- `mounted-consumer-tooling` — supplies the capability evidence matrix and activation criterion
- `webstorm-compatibility` — supplies the verified 242..262.* range, shared launcher resolver, and native-LSP deprecation receipt

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/intellij-lsp4ij/intellij-lsp4ij.spw` only if the branch earns a distilled artifact.
