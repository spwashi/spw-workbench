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
        run(SpwCliSequence.of(invocation))
    }

    /** Runs each step in order; the first cancel, timeout, or failure stops the sequence and names its step. */
    fun run(sequence: SpwCliSequence) {
        val host = resolveHost() ?: return

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, sequence.title, true) {
            override fun run(indicator: ProgressIndicator) {
                val startedAt = System.nanoTime()
                val captures = mutableListOf<SpwCliCapture>()
                try {
                    for (step in sequence.steps) {
                        indicator.text = step.summary()
                        val commandLine = GeneralCommandLine(step.command(host.toolRoot))
                            .withWorkDirectory(host.consumerRoot.toString())
                        val output = CapturingProcessHandler(commandLine)
                            .runProcessWithProgressIndicator(indicator, PROCESS_TIMEOUT_MS)
                        val label = stepLabel(sequence, step)

                        val stop: Pair<String, NotificationType>? = when {
                            output.isCancelled ->
                                "$label cancelled after ${elapsedMs(startedAt)}ms." to NotificationType.INFORMATION
                            output.isTimeout ->
                                "$label exceeded ${PROCESS_TIMEOUT_MS / 1000}s. Run the same CLI form in a terminal to inspect a larger corpus." to
                                    NotificationType.WARNING
                            output.exitCode != 0 ->
                                buildFailureMessage(label, output.stderr, output.exitCode) to NotificationType.ERROR
                            else -> null
                        }
                        if (stop != null) {
                            notify(stop.first, stop.second)
                            return
                        }
                        captures += SpwCliCapture(output.stdout, output.stderr)
                    }
                    present(sequence, sequence.document(captures), elapsedMs(startedAt))
                } catch (error: Exception) {
                    notify(
                        "${sequence.title} could not start: ${error.message ?: error.javaClass.simpleName}. Check Node/npm and the Spw LSP working-directory setting.",
                        NotificationType.ERROR,
                    )
                }
            }
        })
    }

    private fun elapsedMs(startedAt: Long): Long = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt)

    private fun stepLabel(sequence: SpwCliSequence, step: SpwCliInvocation): String =
        if (sequence.steps.size == 1) sequence.title else "${sequence.title} (${step.summary()})"

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

    private fun present(sequence: SpwCliSequence, content: String, durationMs: Long) {
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) return@invokeLater
            val fileType = FileTypeManager.getInstance().getFileTypeByExtension(sequence.output.extension)
            val resultFile = LightVirtualFile(
                "${sequence.title}.${sequence.output.extension}",
                fileType,
                content,
            ).also { it.isWritable = false }
            FileEditorManager.getInstance(project).openFile(resultFile, true)
            notify(
                "${sequence.title} completed in ${durationMs}ms · source: CLI · effect: read-only.",
                NotificationType.INFORMATION,
            )
        }
    }

    private fun buildFailureMessage(label: String, stderr: String, exitCode: Int): String {
        val detail = stderr.trim().lineSequence().firstOrNull()?.takeIf(String::isNotBlank)?.take(240)
            ?: "No error detail was returned."
        return "$label exited $exitCode: $detail"
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
