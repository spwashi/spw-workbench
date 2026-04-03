# Plan: intellij-lsp4ij

Migrate the IntelliJ plugin from the native JetBrains LSP API (which cannot invoke custom requests) to LSP4IJ (Red Hat's open-source LSP client), then add Concepts panel, Workspace Atlas, and Context Strip surfaces.

## Goal

The native JetBrains LSP API cannot invoke custom `spw/*` requests, leaving IntelliJ users without Concepts tree, Workspace Atlas, or Context Strip features. LSP4IJ provides a `LanguageServerFactory` extension point with a `getServerInterface()` method that returns a typed Kotlin interface with `@JsonRequest` annotations — enabling full custom request support. Once migrated, implement three surfaces that bring IntelliJ to feature parity with VSCode (for the custom request lane).

Taste note: clarity (cleaner LSP4IJ API), layering (no more native LSP API lock-in), expressiveness (three new views).

## Scope

- **In scope:** Fix broken build (`SpwLspConfigurable.kt`), migrate to LSP4IJ, implement typed `SpwCustomServer` bridge interface, add `SpwWorkspaceService` project service with state caching, implement Concepts/Annotations panel, Workspace Atlas panel, Context Strip status bar widget.
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

none

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/intellij-lsp4ij/intellij-lsp4ij.spw` only if the branch earns a distilled artifact.
