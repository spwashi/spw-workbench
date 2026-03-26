# Plan: intellij-plugin-integration

Improve IntelliJ Spw plugin integration reliability and configurability.

## Goal

Ensure TextMate bundles load deterministically and LSP startup failures are surfaced with actionable diagnostics.
Add basic configuration hooks so the LSP can run outside the repo root or in non-standard environments.
Taste note: improve correctness and clarity in editor integration behavior.

## Scope

- **In scope**: TextMate bundle registration, LSP preflight guards, user-facing notifications, optional LSP settings UI, file icon polish, and documentation/build metadata alignment.
- **Out of scope**: New Spw grammar changes, PSI/parser work, LSP server implementation changes, or broader IntelliJ feature work (completion/refactor/inspections).

## Files

[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml  
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwTextMateBundleProvider.kt  
[NEW] extensions/intellij-spw/src/main/resources/textmate/package.json  
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt  
[MOD?] extensions/intellij-spw/build.gradle.kts  
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspSettings.kt  
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt  
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLanguage.kt  
[NEW] extensions/intellij-spw/src/main/resources/icons/spwFile.svg  
[MOD] extensions/intellij-spw/README.md

### Craft guard

No files expected to exceed 600 lines or 12 imports. Keep settings/UI classes small and single-purpose.

## Commits

1. #[intellij-spw] — wire TextMate bundle + LSP preflight notifications
2. &[intellij-spw] — add LSP settings hooks and configuration UI
3. .[intellij-spw] — add file icon and align docs/build metadata
4. &[intellij-spw] — tighten LSP settings + TextMate diagnostics
5. #[repo] — ignore build artifacts and remove local Gradle props

## Agentic Hygiene

- Rebase target: historical baseline `58cd708a6b1e2ee40e972ffde90bbd1cbecbc154` (lore-era; not on rewritten main)
- Rebase cadence: before commit 1, before merge
- Hygiene split: unrelated local build artifacts and untracked files exist; avoid touching and keep out of commits

## Dependencies

none
