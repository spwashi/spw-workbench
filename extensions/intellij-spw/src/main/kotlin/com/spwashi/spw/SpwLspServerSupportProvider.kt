package com.spwashi.spw

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.configurations.PathEnvironmentVariableUtil
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.platform.lsp.api.LspServerSupportProvider
import com.intellij.platform.lsp.api.ProjectWideLspServerDescriptor
import com.intellij.util.execution.ParametersListUtil
import com.spwashi.spw.settings.SpwLspSettings
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

class SpwLspServerSupportProvider : LspServerSupportProvider {
    override fun fileOpened(project: Project, file: VirtualFile, serverStarter: LspServerSupportProvider.LspServerStarter) {
        if (file.extension != "spw") return

        val settings = SpwLspSettings.getInstance(project)
        val state = settings.getCurrentState()
        if (!state.enabled) return

        val basePath = project.basePath
        val workDir = resolveWorkDir(basePath, state.workDir)
        if (workDir.isBlank()) {
            notifyOnce(
                project,
                LspStartupIssue.MissingProjectRoot,
                "Spw LSP requires an opened project folder or an absolute working directory."
            )
            return
        }

        if (!Files.isDirectory(Paths.get(workDir))) {
            notifyOnce(
                project,
                LspStartupIssue.MissingWorkDir,
                "Spw LSP working directory does not exist: $workDir."
            )
            return
        }

        val commandOverride = state.command.trim()
        if (commandOverride.isNotEmpty()) {
            val commandParts = ParametersListUtil.parse(commandOverride)
            if (commandParts.isEmpty()) {
                notifyOnce(project, LspStartupIssue.MissingCommand, "Spw LSP command is empty.")
                return
            }
            val executable = commandParts.first()
            if (!isExecutableAvailable(executable, workDir)) {
                notifyOnce(project, LspStartupIssue.MissingCommand, "Spw LSP command not found: $executable.")
                return
            }
            serverStarter.ensureServerStarted(SpwLspServerDescriptor(project, "Spw", commandParts, workDir))
            return
        }

        if (!Files.isRegularFile(Paths.get(workDir, "package.json"))) {
            notifyOnce(
                project,
                LspStartupIssue.MissingPackageJson,
                "Spw LSP requires a package.json in the configured working directory so the default launcher can run `npm run lsp`: $workDir."
            )
            return
        }

        if (!hasLspScript(workDir)) {
            notifyOnce(
                project,
                LspStartupIssue.MissingLspScript,
                "Spw LSP requires an \"lsp\" script in package.json. The default launcher contract is `npm run lsp`."
            )
            return
        }

        if (!isExecutableAvailable("npm", workDir)) {
            notifyOnce(project, LspStartupIssue.MissingNpm, "Spw LSP requires Node.js with npm available in PATH.")
            return
        }

        serverStarter.ensureServerStarted(
            SpwLspServerDescriptor(project, "Spw", listOf("npm", "run", "lsp"), workDir)
        )
    }

    private fun resolveWorkDir(basePath: String?, workDir: String): String {
        val trimmed = workDir.trim()
        if (trimmed.isEmpty()) {
            return basePath.orEmpty()
        }
        val path = Paths.get(trimmed)
        return if (path.isAbsolute) {
            path.normalize().toString()
        } else {
            basePath?.let { Paths.get(it, trimmed).normalize().toString() }.orEmpty()
        }
    }

    private fun isExecutableAvailable(command: String, workDir: String): Boolean {
        val path = Paths.get(command)
        return when {
            path.isAbsolute -> Files.isExecutable(path)
            command.contains("/") || command.contains("\\") -> Files.isExecutable(Paths.get(workDir, command))
            else -> PathEnvironmentVariableUtil.findInPath(command) != null
        }
    }

    private fun hasLspScript(workDir: String): Boolean {
        val packageJsonPath = Paths.get(workDir, "package.json")
        if (!Files.isRegularFile(packageJsonPath)) return false
        return try {
            val content = Files.readString(packageJsonPath)
            val scriptsIdx = content.indexOf("\"scripts\"")
            if (scriptsIdx < 0) return false

            val scriptsObjectStart = content.indexOf('{', scriptsIdx)
            if (scriptsObjectStart < 0) return false

            val scriptsObject = extractJsonObject(content, scriptsObjectStart) ?: return false
            LSP_SCRIPT_PATTERN.containsMatchIn(scriptsObject)
        } catch (_: Exception) {
            false
        }
    }

    private fun extractJsonObject(content: String, objectStart: Int): String? {
        var depth = 0
        var inString = false
        var escaped = false

        for (i in objectStart until content.length) {
            val ch = content[i]

            if (inString) {
                if (escaped) {
                    escaped = false
                    continue
                }
                when (ch) {
                    '\\' -> escaped = true
                    '"' -> inString = false
                }
                continue
            }

            when (ch) {
                '"' -> inString = true
                '{' -> depth += 1
                '}' -> {
                    depth -= 1
                    if (depth == 0) {
                        return content.substring(objectStart, i + 1)
                    }
                }
            }
        }

        return null
    }

    private fun notifyOnce(project: Project, issue: LspStartupIssue, message: String) {
        val notified = project.getUserData(NOTIFIED_ISSUES_KEY) ?: mutableSetOf<LspStartupIssue>().also {
            project.putUserData(NOTIFIED_ISSUES_KEY, it)
        }

        if (!notified.add(issue)) return

        NotificationGroupManager.getInstance()
            .getNotificationGroup(LSP_NOTIFICATION_GROUP)
            .createNotification(message, NotificationType.WARNING)
            .notify(project)
    }

    private enum class LspStartupIssue {
        MissingProjectRoot,
        MissingWorkDir,
        MissingPackageJson,
        MissingLspScript,
        MissingNpm,
        MissingCommand,
    }

    companion object {
        private const val LSP_NOTIFICATION_GROUP = "Spw LSP"
        private val NOTIFIED_ISSUES_KEY = Key.create<MutableSet<LspStartupIssue>>("spw.lsp.startup.issues")
        private val LSP_SCRIPT_PATTERN = Regex(""""lsp"\s*:""")
    }
}

class SpwLspServerDescriptor(
    project: Project,
    presentableName: String,
    private val commandParts: List<String>,
    private val workDir: String,
) : ProjectWideLspServerDescriptor(project, presentableName) {
    override fun isSupportedFile(file: VirtualFile) = file.extension == "spw"

    override fun createCommandLine(): GeneralCommandLine {
        val commandLine = GeneralCommandLine(commandParts.first())
        if (commandParts.size > 1) {
            commandLine.addParameters(commandParts.drop(1))
        }
        return commandLine.withWorkDirectory(workDir)
    }
}
