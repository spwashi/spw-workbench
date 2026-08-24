# Plan: webstorm-compatibility

Make the IntelliJ Spw plugin build reproducibly with Java 21, target WebStorm as its actual host product, and support the 2024.2 through 2026.2 platform range with evidence narrower than its marketing copy.

## Goal

Prepare the plugin for WebStorm 2026.2.0.1 while retaining a useful backwards-compatible floor at WebStorm 2024.2.1. Align Java, Gradle, Kotlin, and IntelliJ Platform Gradle tooling so a contributor can reproduce the build without an absolute machine-local Gradle override, then verify the plugin at the oldest and current supported platform boundaries.

Taste note: improve **correctness**, **portability**, **recoverability**, and **compatibility legibility**. A declared compatibility range should be an evidence coordinate, not an optimistic adjective.

## Scope

- **In scope**:
  - Install and select a Java 21 JDK for local Gradle execution.
  - Upgrade the Gradle wrapper, stable Kotlin JVM plugin, and IntelliJ Platform Gradle Plugin to mutually supported versions.
  - Build against WebStorm 2024.2.1, the lowest supported platform, and verify the packaged plugin against WebStorm 2026.2.0.1 plus the latest 2026.2 maintenance release when practical.
  - Declare `sinceBuild=242` and `untilBuild=262.*`; remove claims about unverified 2026.3 compatibility.
  - Add deterministic mounted-workbench discovery so a consumer project can launch the shared `npm run lsp` contract from `.spw/_workbench` without manual settings.
  - Tighten plugin documentation, settings copy, and release build commands around the tested support matrix and LSP recovery path.
  - Re-run shared LSP and VS Code verification as negative controls; do not fork server semantics into Kotlin.
- **Out of scope**:
  - Migrating from the native JetBrains LSP API to LSP4IJ.
  - Adding IntelliJ-only custom `spw/*` requests, panels, inspections, PSI grammar, or formatter semantics.
  - Changing Spw syntax, parser meaning, or the LSP wire protocol.
  - Publishing to JetBrains Marketplace, changing release versions, or claiming support beyond the verified matrix.

## Files

```text
[NEW] extensions/intellij-spw/.java-version
[MOD] extensions/intellij-spw/build.gradle.kts
[MOD] extensions/intellij-spw/gradle/wrapper/gradle-wrapper.properties
[MOD?] extensions/intellij-spw/gradle/wrapper/gradle-wrapper.jar
[MOD?] extensions/intellij-spw/gradlew
[MOD?] extensions/intellij-spw/gradlew.bat
[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspLauncher.kt
[NEW] extensions/intellij-spw/src/test/kotlin/com/spwashi/spw/SpwLspLauncherTest.kt
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt
[MOD] extensions/intellij-spw/README.md
[MOD] package.json
[MOD] scripts/release/bundle-extensions.sh
[MOD?] docs/runtime/md/lsp-editor-integration.md
[MOD] .spw/tooling/intellij-plugin.spw
```

### Craft guard

- Keep platform coordinates as named build constants rather than scattering version strings.
- `SpwLspServerSupportProvider.kt` is already over 200 lines and mixes discovery, validation, launch, and notification. Extract pure launcher discovery instead of adding more branches to it.
- No changed Kotlin source should exceed 400 lines or 12 imports. The new launcher owns filesystem candidate selection and package-script recognition; the provider owns JetBrains lifecycle and notifications.
- Do not commit `gradle.properties` with an absolute JDK path. The Java requirement belongs in the toolchain, `.java-version`, and documentation.
- Plugin copy must distinguish **built against**, **verified against**, and **declared compatible with**.

## Commits

1. `.[plans] — define WebStorm compatibility and editor startup gates`
2. `#[intellij] — align Java, Gradle, Kotlin, and WebStorm verification coordinates`
3. `&[intellij,lsp] — resolve mounted workbench launchers with tested diagnostics`
4. `.[intellij,editors] — publish support matrix and release verification path`
5. `![intellij] *verify[webstorm] — retain compatibility and build evidence`

Fuzz strategy:

- Explore: `./gradlew --version`, `printBundledPlugins`, focused launcher unit tests, and plugin project configuration checks.
- Stabilize: `./gradlew test buildPlugin verifyPluginStructure`, `npm run build:lsp`, `npm run test:lsp`, and `npm run test:vscode`.
- Ship: Plugin Verifier against the matrix boundaries, `npm run build:extensions`, archive smoke, docs lint, and staged commit review under the ship profile.

## Agentic Hygiene

- Rebase target: `main@ba40cea95bc2fa87ff83bd35337c1b3edf39b4fb`
- Rebase cadence: before commit 1 and before merge
- Hygiene split: isolated in `codex/webstorm-compatibility`; the main checkout was clean and no unrelated feature drift exists

## Dependencies

- No unmerged branch dependency.
- `intellij-plugin-integration` supplies the existing mounted-startup lane this branch completes.
- `package-iteration-radius` owns the broader environment-receipt and clean-consumer automation horizon.
- `intellij-lsp4ij` remains speculative and is not activated by this compatibility work.

## Failure Modes

- **Hard**: the build succeeds only because of an ignored absolute `org.gradle.java.home` path or an ambient IDE installation.
- **Hard**: plugin metadata declares WebStorm compatibility that Plugin Verifier rejects at either support boundary.
- **Hard**: a mounted consumer starts the LSP with the consumer root as the tool root and therefore cannot find the `lsp` package script.
- **Soft**: the requested or latest verifier IDE cannot be downloaded. Preserve the exact missing coordinate and do not widen the compatibility claim.
- **Soft**: Node/npm is unavailable. Keep syntax, folding, structure, and TextMate behavior available while presenting one actionable LSP warning.
- **Non-negotiable**: semantic meaning remains in `spw-lsp`; Kotlin performs host discovery and native projection only.
- **Non-negotiable**: no absolute user path enters committed configuration, test fixtures, documentation, or release metadata.

## Validation

- **Hypotheses**:
  - Java 21 plus supported Gradle/Kotlin/JetBrains tooling removes the current configuration failure.
  - Building against WebStorm 2024.2.1 catches accidental use of newer APIs while verification at 2026.2 proves forward compatibility.
  - A pure launcher resolver can make checkout-root and mounted-workbench startup equivalent without teaching the LSP about editor-specific paths.
- **Negative controls**:
  - Opening a project without Node/npm does not disable TextMate, folding, structure view, or file recognition.
  - Explicit LSP command and working-directory settings continue to outrank automatic discovery.
  - VS Code remains a bundled thin client and Neovim keeps its existing mounted-root behavior.
- **Demo sequence**:
  1. Confirm `java -version` and `./gradlew --version` report Java 21.
  2. Build and test the plugin against WebStorm 2024.2.1.
  3. Verify the packaged plugin against WebStorm 2026.2.0.1 and the latest 2026.2 maintenance release.
  4. Open an identity-free fixture with `.spw/_workbench`; observe the IntelliJ client launch `npm run lsp` from the mount while the LSP initializes the consumer project.
  5. Build the VS Code client and run shared LSP tests to prove server behavior did not fork.

## Spw Artifact

`.agents/plans/webstorm-compatibility/webstorm-compatibility.spw`

The artifact records the build, host, compatibility, and launcher coordinates independently so later releases can extend one axis without implying all others moved.
