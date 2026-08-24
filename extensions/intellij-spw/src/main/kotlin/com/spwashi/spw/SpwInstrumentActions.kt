package com.spwashi.spw

import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.DumbAwareAction
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
        val editor = event.getData(CommonDataKeys.EDITOR)
        if (editor != null && FileDocumentManager.getInstance().isDocumentUnsaved(editor.document)) {
            Messages.showWarningDialog(
                project,
                "This instrument reads the saved file through the Spw CLI. Save the buffer, then run it again.",
                "Spw Instrument",
            )
            return
        }

        val consumerRoot = project.basePath?.let(Path::of) ?: return
        val invocation = try {
            invocation(consumerRoot, file)
        } catch (error: IllegalArgumentException) {
            Messages.showErrorDialog(project, error.message ?: "The Spw instrument input is invalid.", "Spw Instrument")
            return
        }
        project.getService(SpwCliRunner::class.java).run(invocation)
    }

    protected abstract fun invocation(consumerRoot: Path, file: VirtualFile): SpwCliInvocation

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
