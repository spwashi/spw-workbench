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

        val scriptPath = Paths.get(workDir, "scripts", "lsp", "stdio-server.ts")
        if (!Files.isRegularFile(scriptPath)) {
            notifyOnce(project, LspStartupIssue.MissingServerScript, "Spw LSP script not found at ${scriptPath}.")
            return
        }

        if (!isExecutableAvailable("npx", workDir)) {
            notifyOnce(project, LspStartupIssue.MissingNpx, "Spw LSP requires Node.js with npx available in PATH.")
            return
        }

        serverStarter.ensureServerStarted(
            SpwLspServerDescriptor(project, "Spw", listOf("npx", "tsx", scriptPath.toString()), workDir)
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
        MissingServerScript,
        MissingNpx,
        MissingCommand,
    }

    companion object {
        private const val LSP_NOTIFICATION_GROUP = "Spw LSP"
        private val NOTIFIED_ISSUES_KEY = Key.create<MutableSet<LspStartupIssue>>("spw.lsp.startup.issues")
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
