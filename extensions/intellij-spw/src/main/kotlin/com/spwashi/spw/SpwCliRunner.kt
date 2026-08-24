package com.spwashi.spw

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.CapturingProcessHandler
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.testFramework.LightVirtualFile
import com.spwashi.spw.settings.SpwLspSettings
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

@Service(Service.Level.PROJECT)
internal class SpwCliRunner(private val project: Project) {
    fun run(invocation: SpwCliInvocation) {
        val host = resolveHost() ?: return
        val commandLine = GeneralCommandLine(invocation.command(host.toolRoot))
            .withWorkDirectory(host.consumerRoot.toString())

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, invocation.title, true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.text = invocation.arguments.joinToString(" ")
                val startedAt = System.nanoTime()
                try {
                    val output = CapturingProcessHandler(commandLine)
                        .runProcessWithProgressIndicator(indicator, PROCESS_TIMEOUT_MS)
                    val durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)

                    when {
                        output.isCancelled -> notify(
                            "${invocation.title} cancelled after ${durationMs}ms.",
                            NotificationType.INFORMATION,
                        )
                        output.isTimeout -> notify(
                            "${invocation.title} exceeded ${PROCESS_TIMEOUT_MS / 1000}s. Run the same CLI form in a terminal to inspect a larger corpus.",
                            NotificationType.WARNING,
                        )
                        output.exitCode != 0 -> notify(
                            buildFailureMessage(invocation, output.stderr, output.exitCode),
                            NotificationType.ERROR,
                        )
                        else -> present(invocation, output.stdout, durationMs)
                    }
                } catch (error: Exception) {
                    notify(
                        "${invocation.title} could not start: ${error.message ?: error.javaClass.simpleName}. Check Node/npm and the Spw LSP working-directory setting.",
                        NotificationType.ERROR,
                    )
                }
            }
        })
    }

    private fun resolveHost(): SpwCliHost? {
        val consumerRoot = project.basePath?.let(Path::of)?.toAbsolutePath()?.normalize()
        if (consumerRoot == null || !Files.isDirectory(consumerRoot)) {
            notify("Spw instruments require an opened project folder.", NotificationType.WARNING)
            return null
        }

        val settings = SpwLspSettings.getInstance(project).getCurrentState()
        val toolRoot = SpwLspLauncher.resolveToolRoot(project.basePath, settings.workDir)?.path
        if (toolRoot == null || !Files.isDirectory(toolRoot)) {
            notify(
                "Spw instruments could not resolve the project or mounted `.spw/_workbench` tool root.",
                NotificationType.WARNING,
            )
            return null
        }
        if (!SpwLspLauncher.hasNpmScript(toolRoot, SPW_SCRIPT)) {
            notify(
                "Spw instruments require an npm `spw` script in the project or mounted `.spw/_workbench`.",
                NotificationType.WARNING,
            )
            return null
        }
        return SpwCliHost(consumerRoot, toolRoot)
    }

    private fun present(invocation: SpwCliInvocation, stdout: String, durationMs: Long) {
        val content = stdout.ifBlank { "(Spw returned no output.)\n" }
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) return@invokeLater
            val fileType = FileTypeManager.getInstance().getFileTypeByExtension(invocation.output.extension)
            val resultFile = LightVirtualFile(
                "${invocation.title}.${invocation.output.extension}",
                fileType,
                content,
            ).also { it.isWritable = false }
            FileEditorManager.getInstance(project).openFile(resultFile, true)
            notify(
                "${invocation.title} completed in ${durationMs}ms · source: CLI · effect: read-only.",
                NotificationType.INFORMATION,
            )
        }
    }

    private fun buildFailureMessage(invocation: SpwCliInvocation, stderr: String, exitCode: Int): String {
        val detail = stderr.trim().lineSequence().firstOrNull()?.take(240)
            ?: "No error detail was returned."
        return "${invocation.title} exited $exitCode: $detail"
    }

    private fun notify(message: String, type: NotificationType) {
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) return@invokeLater
            NotificationGroupManager.getInstance()
                .getNotificationGroup(NOTIFICATION_GROUP)
                .createNotification(message, type)
                .notify(project)
        }
    }

    private data class SpwCliHost(
        val consumerRoot: Path,
        val toolRoot: Path,
    )

    companion object {
        private const val NOTIFICATION_GROUP = "Spw Instruments"
        private const val PROCESS_TIMEOUT_MS = 120_000
        private const val SPW_SCRIPT = "spw"
    }
}
