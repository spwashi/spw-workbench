package com.spwashi.spw

import com.intellij.ide.util.PropertiesComponent
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The quest offer's memory: at most one offer per IDE session, and none after the
 * person starts the quest or chooses "Don't show again" (stored application-wide).
 */
internal object SpwQuestOnboarding {
    const val GROUP = "Spw onboarding"
    private const val DONE_KEY = "com.spwashi.spw.quest.onboarding.done"
    private val offeredThisSession = AtomicBoolean(false)

    fun isDone(): Boolean = PropertiesComponent.getInstance().getBoolean(DONE_KEY)

    fun markDone() {
        PropertiesComponent.getInstance().setValue(DONE_KEY, true)
    }

    /** True for the first caller in this IDE session, false for every later one. */
    fun claimSessionOffer(): Boolean = offeredThisSession.compareAndSet(false, true)
}

/** First run: when a project with a .spw directory opens, offer the quest in one balloon. */
internal class SpwQuestOnboardingActivity : ProjectActivity {
    override suspend fun execute(project: Project) {
        val application = ApplicationManager.getApplication()
        if (application.isUnitTestMode || application.isHeadlessEnvironment || project.isDefault) return
        if (SpwQuestOnboarding.isDone()) return
        val basePath = project.basePath ?: return
        if (!Files.isDirectory(Path.of(basePath, ".spw"))) return
        if (!SpwQuestOnboarding.claimSessionOffer()) return

        NotificationGroupManager.getInstance()
            .getNotificationGroup(SpwQuestOnboarding.GROUP)
            .createNotification(
                "Spw quest",
                "This project has a .spw directory. The quest opens a scratch file of short panels, one line of Spw in each.",
                NotificationType.INFORMATION,
            )
            .addAction(NotificationAction.createSimpleExpiring("Start the Spw quest") {
                SpwQuestOnboarding.markDone()
                SpwQuestScratch.open(project)
            })
            .addAction(NotificationAction.createSimpleExpiring("Don't show again") { SpwQuestOnboarding.markDone() })
            .notify(project)
    }
}
