package com.spwashi.spw

import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.Logger
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider
import java.net.JarURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.HexFormat
import java.util.jar.JarEntry

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
        try {
            val connection = resource.openConnection() as? JarURLConnection ?: return null
            connection.jarFile.use { jar ->
                val entries = jar.entries().asSequence()
                    .filter { !it.isDirectory && it.name.startsWith("textmate/") }
                    .toList()
                val bundleRoot = Path.of(
                    PathManager.getSystemPath(),
                    "spw-textmate",
                    bundleCacheKey(entries),
                    "textmate",
                )
                val packageJson = bundleRoot.resolve(PACKAGE_JSON)

                if (Files.exists(packageJson)) {
                    return bundleRoot
                }

                Files.createDirectories(bundleRoot)
                for (entry in entries) {
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

                return bundleRoot
            }
        } catch (e: Exception) {
            logger.warn("Failed to extract Spw TextMate bundle from plugin JAR.", e)
            return null
        }
    }

    private fun bundleCacheKey(entries: List<JarEntry>): String {
        val digest = MessageDigest.getInstance("SHA-256")
        entries.sortedBy { it.name }.forEach { entry ->
            val identity = "${entry.name}\u0000${entry.crc}\u0000${entry.size}\n"
            digest.update(identity.toByteArray(StandardCharsets.UTF_8))
        }
        return HexFormat.of().formatHex(digest.digest()).take(16)
    }

    companion object {
        private const val PACKAGE_JSON = "package.json"

        private val logger = Logger.getInstance(SpwTextMateBundleProvider::class.java)

        @Volatile
        private var cachedBundlePath: Path? = null
    }
}
