package com.spwashi.spw

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.extensions.PluginId
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider
import java.net.JarURLConnection
import java.net.URL
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

class SpwTextMateBundleProvider : TextMateBundleProvider {
    override fun getBundles(): List<TextMateBundleProvider.PluginBundle> {
        val bundlePath = resolveBundlePath() ?: return emptyList()
        return listOf(TextMateBundleProvider.PluginBundle("Spw", bundlePath))
    }

    private fun resolveBundlePath(): Path? {
        cachedBundlePath?.let { path ->
            if (Files.exists(path.resolve(PACKAGE_JSON))) {
                return path
            }
        }

        val resource = javaClass.classLoader.getResource("textmate/$PACKAGE_JSON")
        if (resource == null) {
            logger.warn("Spw TextMate bundle missing: resource textmate/$PACKAGE_JSON not found.")
            return null
        }

        val resolved = when (resource.protocol) {
            "file" -> runCatching { Path.of(resource.toURI()).parent }.getOrNull()
            "jar" -> extractFromJar(resource)
            else -> {
                logger.warn("Spw TextMate bundle has unsupported protocol: ${resource.protocol}.")
                null
            }
        }

        if (resolved != null) {
            cachedBundlePath = resolved
        }

        return resolved
    }

    private fun extractFromJar(resource: URL): Path? {
        val plugin = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))
        val version = plugin?.version ?: "dev"
        val bundleRoot = Path.of(PathManager.getSystemPath(), "spw-textmate", version, "textmate")
        val packageJson = bundleRoot.resolve(PACKAGE_JSON)

        if (Files.exists(packageJson)) {
            return bundleRoot
        }

        Files.createDirectories(bundleRoot)

        try {
            val connection = resource.openConnection() as? JarURLConnection ?: return null
            connection.jarFile.use { jar ->
                val entries = jar.entries()
                while (entries.hasMoreElements()) {
                    val entry = entries.nextElement()
                    if (entry.isDirectory || !entry.name.startsWith("textmate/")) {
                        continue
                    }
                    val relativePath = entry.name.removePrefix("textmate/")
                    if (relativePath.isBlank()) {
                        continue
                    }
                    val target = bundleRoot.resolve(relativePath)
                    Files.createDirectories(target.parent)
                    jar.getInputStream(entry).use { input ->
                        Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING)
                    }
                }
            }
        } catch (e: Exception) {
            logger.warn("Failed to extract Spw TextMate bundle from plugin JAR.", e)
            return null
        }

        return bundleRoot
    }

    companion object {
        private const val PLUGIN_ID = "com.spwashi.spw"
        private const val PACKAGE_JSON = "package.json"

        private val logger = Logger.getInstance(SpwTextMateBundleProvider::class.java)

        @Volatile
        private var cachedBundlePath: Path? = null
    }
}
