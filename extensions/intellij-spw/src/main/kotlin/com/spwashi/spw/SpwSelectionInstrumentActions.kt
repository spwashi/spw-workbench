package com.spwashi.spw

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.TextRange

/**
 * Reads the editor's text, not the file: the selection, or the caret line when nothing is selected.
 * The buffer need not be saved, and the file need not sit inside the consumer workspace (the quest
 * scratch file works too).
 */
internal class SpwFingerprintSelectionAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        val file = event.getData(CommonDataKeys.VIRTUAL_FILE)
        event.presentation.isEnabled = event.project != null &&
            event.getData(CommonDataKeys.EDITOR) != null &&
            file?.extension == SPW_EXTENSION
    }

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        val editor = event.getData(CommonDataKeys.EDITOR) ?: return
        val invocation = try {
            val expression = SpwCliInvocations.fingerprintExpression(editor.selectionModel.selectedText, caretLine(editor))
            SpwCliInvocations.fingerprint(expression)
        } catch (error: IllegalArgumentException) {
            Messages.showErrorDialog(project, error.message ?: "The Spw expression is invalid.", "Spw Fingerprint")
            return
        }
        project.getService(SpwCliRunner::class.java).run(invocation)
    }

    private fun caretLine(editor: Editor): String {
        val document = editor.document
        val line = document.getLineNumber(editor.caretModel.offset)
        return document.getText(TextRange(document.getLineStartOffset(line), document.getLineEndOffset(line)))
    }

    private companion object {
        const val SPW_EXTENSION = "spw"
    }
}
