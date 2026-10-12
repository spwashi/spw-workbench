package com.spwashi.spw

import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * One quest step as docs/learn/quest.spw writes it. The plugin reads the steps
 * from quest/quest.json, which scripts/sync-quest.mjs generates with the
 * spw-seed parser; Kotlin never parses Spw itself.
 */
internal data class SpwQuestStep(
    val name: String,
    val tryLine: String,
    val then: List<String>,
    val reads: String,
    val notice: String,
    val check: String,
    val grow: String,
    /** Panel fields, absent when the step does not set them: where it happens, whose bubble it is. */
    val scene: String? = null,
    val speaker: String? = null,
) {
    /** A step whose lines are shell commands (quest check `commands_pass`), not Spw. */
    val runsInTerminal: Boolean get() = check == TERMINAL_CHECK

    val lines: List<String> get() = listOf(tryLine) + then

    /** `(threshold) @you — act`, or just the name when the panel fields are absent. */
    val heading: String get() = listOfNotNull(scene, speaker).joinToString(" ")
        .let { panel -> if (panel.isEmpty()) name else "$panel — $name" }

    companion object {
        private const val TERMINAL_CHECK = "commands_pass"
    }
}

internal object SpwQuest {
    const val RESOURCE = "/quest/quest.json"
    const val SCRATCH_NAME = "quest.spw"
    const val TERMINAL_FORM = "npm --prefix .spw/_workbench run spw -- quest"

    fun load(): List<SpwQuestStep> {
        val json = SpwQuest::class.java.getResourceAsStream(RESOURCE)
            ?.use { it.readBytes().toString(Charsets.UTF_8) }
            ?: error("The plugin is missing $RESOURCE.")
        return parse(json)
    }

    fun parse(json: String): List<SpwQuestStep> =
        JsonParser.parseString(json).asJsonObject.getAsJsonArray("steps").map { element ->
            val step = element.asJsonObject
            SpwQuestStep(
                name = step.text("name"),
                tryLine = step.text("try"),
                then = step.getAsJsonArray("then")?.map { it.asString }.orEmpty(),
                reads = step.text("reads"),
                notice = step.text("notice"),
                check = step.text("check"),
                grow = step.text("grow"),
                scene = step.optionalText("scene"),
                speaker = step.optionalText("speaker"),
            )
        }

    /**
     * The scratch file: each panel opens with a `#` heading (so it folds and shows
     * in Structure View), its reads/notice/grow as `//` comments, then its try and
     * then lines verbatim. A terminal panel's lines stay commented, since they are
     * shell commands rather than Spw.
     */
    fun scratchText(steps: List<SpwQuestStep>): String = buildString {
        appendLine("# Spw quest: ${steps.size} panels, smallest first")
        appendLine("// Each panel says what Spw reads in its line, what to notice, and what it lets you grow, then gives the line.")
        appendLine("// Change the lines or add your own; this scratch file lives outside the project.")
        steps.forEachIndexed { index, step ->
            appendLine()
            appendLine("# ${index + 1}. ${step.heading}")
            appendLine("// reads: ${step.reads}")
            appendLine("// notice: ${step.notice}")
            appendLine("// grow: ${step.grow}")
            if (step.runsInTerminal) {
                appendLine("// In a terminal:")
                step.lines.forEach { appendLine("// $it") }
            } else {
                step.lines.forEach { appendLine(it) }
            }
        }
        appendLine()
        appendLine("# In a terminal")
        appendLine("// The same quest, from a project with the workbench mounted at .spw/_workbench:")
        appendLine("// $TERMINAL_FORM")
    }

    private fun JsonObject.optionalText(key: String): String? =
        get(key)?.takeUnless { it.isJsonNull }?.asString?.takeUnless { it.isBlank() }

    private fun JsonObject.text(key: String): String =
        optionalText(key) ?: error("Quest step is missing \"$key\".")
}
