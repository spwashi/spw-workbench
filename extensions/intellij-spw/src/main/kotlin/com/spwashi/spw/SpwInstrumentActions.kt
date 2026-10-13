package com.spwashi.spw

import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.VirtualFile
import java.nio.file.Path

internal abstract class SpwFileInstrumentAction : DumbAwareAction() {
    final override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    final override fun update(event: AnActionEvent) {
        val file = event.getData(CommonDataKeys.VIRTUAL_FILE)
        event.presentation.isEnabled = event.project != null && file?.extension == SPW_EXTENSION
    }

    final override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        val file = event.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        val selection = event.getData(CommonDataKeys.EDITOR)?.selectionModel?.selectedText?.takeIf(String::isNotBlank)
        val invocation = try {
            selection?.let(::selectionInvocation) ?: savedFileInvocation(project, file) ?: return
        } catch (error: IllegalArgumentException) {
            Messages.showErrorDialog(project, error.message ?: "The Spw instrument input is invalid.", "Spw Instrument")
            return
        }
        project.getService(SpwCliRunner::class.java).run(invocation)
    }

    private fun savedFileInvocation(project: Project, file: VirtualFile): SpwCliInvocation? {
        val documents = FileDocumentManager.getInstance()
        if (documents.getCachedDocument(file)?.let(documents::isDocumentUnsaved) == true) {
            Messages.showWarningDialog(
                project,
                "This instrument reads the saved file through the Spw CLI. Save the buffer, then run it again.",
                "Spw Instrument",
            )
            return null
        }
        val consumerRoot = project.basePath?.let(Path::of) ?: return null
        return invocation(consumerRoot, file)
    }

    protected abstract fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation

    /**
     * Instruments that can read selected text as written return its invocation here. A selection never
     * needs saving, because the text itself is the argument. `null` keeps the saved-file path.
     */
    protected open fun selectionInvocation(selection: String): SpwCliInvocation? = null

    companion object {
        private const val SPW_EXTENSION = "spw"
    }
}

internal class SpwInspectFormAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.form(consumerRoot, Path.of(file.path))
}

internal class SpwInspectStackAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.stack(consumerRoot, Path.of(file.path))
}

internal class SpwInspectCacheAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.cache(consumerRoot, Path.of(file.path))
}

internal class SpwInspectSourceAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.inspectSource(consumerRoot, Path.of(file.path))

    override fun selectionInvocation(selection: String): SpwCliInvocation =
        SpwCliInvocations.inspectSourceText(selection)
}

internal class SpwCheckPerformanceAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.performance(consumerRoot, Path.of(file.path))
}

internal class SpwShowProjectionAction : SpwFileInstrumentAction() {
    override fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation =
        SpwCliInvocations.projection(consumerRoot, Path.of(file.path))
}

internal class SpwInspectMemoryAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        event.presentation.isEnabled = event.project?.basePath != null
    }

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        project.getService(SpwCliRunner::class.java).run(SpwCliInvocations.memory())
    }
}

internal class SpwRenameAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        val file = event.getData(CommonDataKeys.VIRTUAL_FILE)
        event.presentation.isEnabled = event.project != null && file?.extension == "spw"
    }

    override fun actionPerformed(event: AnActionEvent) {
        val rename = ActionManager.getInstance().getAction(IdeActions.ACTION_RENAME) ?: return
        ActionManager.getInstance().tryToExecute(rename, event.inputEvent, null, event.place, true)
    }
}

internal class SpwPlanCorpusRefactorAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        event.presentation.isEnabled = event.project?.basePath != null
    }

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        val spec = Messages.showInputDialog(
            project,
            "Enter kind:from=to. Kinds: mark, anchor, case, mood. This opens a read-only corpus plan and never applies edits.",
            "Plan Spw Corpus Refactor",
            Messages.getQuestionIcon(),
            "mark:old=new",
            null,
        ) ?: return

        val invocation = try {
            SpwCliInvocations.refactorPlan(spec)
        } catch (error: IllegalArgumentException) {
            Messages.showErrorDialog(project, error.message ?: "Invalid rename specification.", "Spw Refactor Plan")
            return
        }
        project.getService(SpwCliRunner::class.java).run(invocation)
    }
}
