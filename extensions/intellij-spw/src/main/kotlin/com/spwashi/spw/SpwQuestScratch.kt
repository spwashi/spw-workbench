package com.spwashi.spw

import com.intellij.ide.scratch.ScratchFileService
import com.intellij.ide.scratch.ScratchRootType
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages

internal object SpwQuestScratch {
    /**
     * Opens the quest.spw scratch file, creating it from the bundled steps when it
     * does not exist yet. An existing quest.spw is reopened as the person left it.
     */
    fun open(project: Project) {
        val text = try {
            SpwQuest.scratchText(SpwQuest.load())
        } catch (error: RuntimeException) {
            Messages.showErrorDialog(project, error.message ?: "The quest steps could not be read.", TITLE)
            return
        }
        val file = ScratchRootType.getInstance().createScratchFile(
            project,
            SpwQuest.SCRATCH_NAME,
            SpwLanguage,
            text,
            ScratchFileService.Option.create_if_missing,
        )
        if (file == null) {
            Messages.showErrorDialog(project, "The ${SpwQuest.SCRATCH_NAME} scratch file could not be created.", TITLE)
            return
        }
        FileEditorManager.getInstance(project).openFile(file, true)
    }

    const val TITLE = "Spw Quest"
}

internal class SpwStartQuestAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        event.presentation.isEnabled = event.project != null
    }

    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        SpwQuestOnboarding.markDone()
        SpwQuestScratch.open(project)
    }
}
