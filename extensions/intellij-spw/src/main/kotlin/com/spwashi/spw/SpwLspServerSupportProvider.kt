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
        val toolRoot = SpwLspLauncher.resolveToolRoot(basePath, state.workDir)
        if (toolRoot == null) {
            notifyOnce(
                project,
                LspStartupIssue.MissingProjectRoot,
                "Spw LSP requires an opened project folder or an absolute working directory."
            )
            return
        }
        val workDir = toolRoot.path.toString()

        if (!Files.isDirectory(toolRoot.path)) {
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

        if (!Files.isRegularFile(toolRoot.path.resolve("package.json"))) {
            notifyOnce(
                project,
                LspStartupIssue.MissingPackageJson,
                "Spw LSP could not find a package.json with the launcher contract in the project or mounted `.spw/_workbench`: $workDir."
            )
            return
        }

        if (!SpwLspLauncher.hasLspScript(toolRoot.path)) {
            notifyOnce(
                project,
                LspStartupIssue.MissingLspScript,
                "Spw LSP requires an \"lsp\" script in package.json. The default launcher contract is `npm run --silent lsp`."
            )
            return
        }

        if (!isExecutableAvailable("npm", workDir)) {
            notifyOnce(project, LspStartupIssue.MissingNpm, "Spw LSP requires Node.js with npm available in PATH.")
            return
        }

        serverStarter.ensureServerStarted(
            SpwLspServerDescriptor(project, "Spw", listOf("npm", "run", "--silent", "lsp"), workDir)
        )
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
        MissingPackageJson,
        MissingLspScript,
        MissingNpm,
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
