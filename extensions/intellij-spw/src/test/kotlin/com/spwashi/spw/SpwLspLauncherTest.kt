package com.spwashi.spw

import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.createTempDirectory
import kotlin.io.path.writeText
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SpwLspLauncherTest {
    @Test
    fun `configured absolute tool root takes precedence`() = withTempDirectory { projectRoot ->
        val configuredRoot = createTempDirectory("spw-lsp-configured-")
        try {
            val resolved = SpwLspLauncher.resolveToolRoot(projectRoot.toString(), configuredRoot.toString())

            assertEquals(configuredRoot, resolved?.path)
            assertEquals(SpwLspToolRootSource.Configured, resolved?.source)
        } finally {
            configuredRoot.toFile().deleteRecursively()
        }
    }

    @Test
    fun `configured relative tool root resolves from project`() = withTempDirectory { projectRoot ->
        val resolved = SpwLspLauncher.resolveToolRoot(projectRoot.toString(), "tools/spw")

        assertEquals(projectRoot.resolve("tools/spw"), resolved?.path)
        assertEquals(SpwLspToolRootSource.Configured, resolved?.source)
    }

    @Test
    fun `project launcher takes precedence over mounted workbench`() = withTempDirectory { projectRoot ->
        writeLauncher(projectRoot)
        writeLauncher(projectRoot.resolve(".spw/_workbench"))

        val resolved = SpwLspLauncher.resolveToolRoot(projectRoot.toString(), "")

        assertEquals(projectRoot, resolved?.path)
        assertEquals(SpwLspToolRootSource.Project, resolved?.source)
    }

    @Test
    fun `mounted workbench supplies launcher for a consumer project`() = withTempDirectory { projectRoot ->
        val mountedWorkbench = projectRoot.resolve(".spw/_workbench")
        writeLauncher(mountedWorkbench)

        val resolved = SpwLspLauncher.resolveToolRoot(projectRoot.toString(), "")

        assertEquals(mountedWorkbench, resolved?.path)
        assertEquals(SpwLspToolRootSource.MountedWorkbench, resolved?.source)
    }

    @Test
    fun `project remains diagnostic root when no launcher is available`() = withTempDirectory { projectRoot ->
        val resolved = SpwLspLauncher.resolveToolRoot(projectRoot.toString(), "")

        assertEquals(projectRoot, resolved?.path)
        assertEquals(SpwLspToolRootSource.Project, resolved?.source)
    }

    @Test
    fun `relative configuration requires a project root`() {
        assertNull(SpwLspLauncher.resolveToolRoot(null, "tools/spw"))
    }

    @Test
    fun `launcher script detection stays inside the scripts object`() = withTempDirectory { toolRoot ->
        toolRoot.resolve("package.json").writeText(
            """{
              "description": "an lsp label outside scripts",
              "scripts": {
                "test": "echo { nested }"
              },
              "lsp": "not-a-script"
            }"""
        )

        assertFalse(SpwLspLauncher.hasLspScript(toolRoot))

        writeLauncher(toolRoot)
        assertTrue(SpwLspLauncher.hasLspScript(toolRoot))
    }

    @Test
    fun `npm script detection supports the shared CLI without accepting script injection`() = withTempDirectory { toolRoot ->
        toolRoot.resolve("package.json").writeText(
            """{
              "scripts": {
                "lsp": "tsx server.ts",
                "spw": "tsx cli.ts"
              }
            }"""
        )

        assertTrue(SpwLspLauncher.hasNpmScript(toolRoot, "spw"))
        assertFalse(SpwLspLauncher.hasNpmScript(toolRoot, "spw\" || true"))
    }

    private fun writeLauncher(toolRoot: Path) {
        toolRoot.createDirectories()
        toolRoot.resolve("package.json").writeText(
            """{
              "scripts": {
                "lsp": "tsx scripts/lsp/stdio-upstream-bridge.ts"
              }
            }"""
        )
    }

    private fun withTempDirectory(block: (Path) -> Unit) {
        val directory = createTempDirectory("spw-lsp-launcher-")
        try {
            block(directory)
        } finally {
            Files.walk(directory)
                .sorted(Comparator.reverseOrder())
                .forEach(Files::deleteIfExists)
        }
    }
}
