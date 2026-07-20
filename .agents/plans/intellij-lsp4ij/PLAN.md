# Plan: intellij-lsp4ij

Evaluate whether migrating the IntelliJ plugin from the native JetBrains LSP API to LSP4IJ earns its added dependency and migration cost through repeated mounted-consumer review needs.

## Goal

The native JetBrains LSP API cannot invoke custom `spw/*` requests, while LSP4IJ can expose a typed custom-request interface. That difference is real, but VS Code feature parity is not by itself a migration reason. This plan stays speculative until identity-free mounted-consumer audits show that a custom request materially improves claim/evidence navigation, repository orientation, or review provenance beyond standard LSP and IntelliJ-native affordances.

Taste note: clarity (cleaner LSP4IJ API), layering (no more native LSP API lock-in), expressiveness (three new views).

## Scope

- **In scope:** Record the migration decision against mounted-consumer evidence; if activated, migrate to LSP4IJ, implement the narrow typed custom-request bridge that evidence requires, and add only the surfaces justified by that review loop.
- **Out of scope:** Restyling the plugin; implementing LSP4IJ Debug Adapter Protocol (DAP) support; Semantic Tokens or other future enhancements; adding more than the three declared surfaces.

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

1. `&[intellij] =fix[build] — fix SpwLspConfigurable and bump Gradle IntelliJ Plugin to 2.13.1`
2. `&[intellij] =migration[lsp4ij] — replace native LSP API with LSP4IJ LanguageServerFactory`
3. `^seed[intellij] — add SpwCustomServer interface and WorkspaceService state caching`
4. `&[intellij] =surface[panels] — add annotation panel, workspace atlas panel, context strip widget`

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- `spw-site-install` — mounted-consumer startup and the repo-local review contract must work before custom-request UI is evaluated
- `lsp-custom-request-completions` — server handlers must be stable and useful outside the VS Code client
- `mounted-consumer-tooling` — supplies the capability evidence matrix and activation criterion

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/intellij-lsp4ij/intellij-lsp4ij.spw` only if the branch earns a distilled artifact.
