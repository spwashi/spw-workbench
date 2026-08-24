package com.spwashi.spw

import java.nio.file.Files
import java.nio.file.Path

internal enum class SpwLspToolRootSource {
    Configured,
    Project,
    MountedWorkbench,
}

internal data class SpwLspToolRoot(
    val path: Path,
    val source: SpwLspToolRootSource,
)

internal object SpwLspLauncher {
    fun resolveToolRoot(projectBase: String?, configuredWorkDir: String): SpwLspToolRoot? {
        val configured = configuredWorkDir.trim()
        if (configured.isNotEmpty()) {
            val configuredPath = Path.of(configured)
            val resolved = if (configuredPath.isAbsolute) {
                configuredPath
            } else {
                projectBase?.let { Path.of(it).resolve(configuredPath) } ?: return null
            }
            return SpwLspToolRoot(resolved.normalize(), SpwLspToolRootSource.Configured)
        }

        val projectRoot = projectBase?.let(Path::of)?.normalize() ?: return null
        if (hasNpmScript(projectRoot, LSP_SCRIPT)) {
            return SpwLspToolRoot(projectRoot, SpwLspToolRootSource.Project)
        }

        val mountedWorkbench = projectRoot.resolve(MOUNTED_WORKBENCH_PATH)
        if (hasNpmScript(mountedWorkbench, LSP_SCRIPT)) {
            return SpwLspToolRoot(mountedWorkbench, SpwLspToolRootSource.MountedWorkbench)
        }

        return SpwLspToolRoot(projectRoot, SpwLspToolRootSource.Project)
    }

    fun hasLspScript(toolRoot: Path): Boolean = hasNpmScript(toolRoot, LSP_SCRIPT)

    fun hasNpmScript(toolRoot: Path, script: String): Boolean {
        if (!NPM_SCRIPT_NAME_PATTERN.matches(script)) return false
        val packageJsonPath = toolRoot.resolve(PACKAGE_JSON)
        if (!Files.isRegularFile(packageJsonPath)) return false

        return try {
            val content = Files.readString(packageJsonPath)
            val scriptsProperty = SCRIPTS_PROPERTY_PATTERN.find(content) ?: return false
            val scriptsObjectStart = content.indexOf('{', scriptsProperty.range.last + 1)
            if (scriptsObjectStart < 0) return false

            val scriptsObject = extractJsonObject(content, scriptsObjectStart) ?: return false
            Regex("\"${Regex.escape(script)}\"\\s*:").containsMatchIn(scriptsObject)
        } catch (_: Exception) {
            false
        }
    }

    private fun extractJsonObject(content: String, objectStart: Int): String? {
        var depth = 0
        var inString = false
        var escaped = false

        for (index in objectStart until content.length) {
            val character = content[index]

            if (inString) {
                if (escaped) {
                    escaped = false
                    continue
                }
                when (character) {
                    '\\' -> escaped = true
                    '"' -> inString = false
                }
                continue
            }

            when (character) {
                '"' -> inString = true
                '{' -> depth += 1
                '}' -> {
                    depth -= 1
                    if (depth == 0) {
                        return content.substring(objectStart, index + 1)
                    }
                }
            }
        }

        return null
    }

    private const val PACKAGE_JSON = "package.json"
    private const val MOUNTED_WORKBENCH_PATH = ".spw/_workbench"
    private const val LSP_SCRIPT = "lsp"
    private val SCRIPTS_PROPERTY_PATTERN = Regex(""""scripts"\s*:""")
    private val NPM_SCRIPT_NAME_PATTERN = Regex("[A-Za-z0-9:_-]+")
}
