package com.spwashi.spw

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SpwQuestTest {
    private val spwStep = SpwQuestStep(
        name = "act",
        tryLine = "~door",
        then = listOf("?door", "!door"),
        reads = "One character says what the word is doing.",
        notice = "The word stays the same.",
        check = "operation_before_word",
        grow = "Mark a word by what it does.",
    )
    private val terminalStep = SpwQuestStep(
        name = "grow",
        tryLine = "spw lint .spw && spw resolve --from .spw",
        then = emptyList(),
        reads = "The same steps become files the tools can check.",
        notice = "Nothing here commits.",
        check = "commands_pass",
        grow = "Add one page.",
    )

    @Test
    fun `bundled quest json reads in order with the first step first`() {
        val steps = SpwQuest.load()
        assertTrue(steps.isNotEmpty())
        assertEquals("write", steps.first().name)
        assertEquals(steps.map { it.name }.distinct(), steps.map { it.name })
        steps.forEach { step ->
            assertTrue(step.tryLine.isNotBlank(), "step ${step.name} has a try line")
            assertTrue(step.reads.isNotBlank() && step.notice.isNotBlank() && step.grow.isNotBlank())
        }
    }

    @Test
    fun `parse keeps then lines and defaults a missing then to empty`() {
        val steps = SpwQuest.parse(
            """
            {"steps": [
              {"name": "act", "scene": "(threshold)", "speaker": "@you", "try": "~door", "then": ["?door", "!door"], "reads": "r", "notice": "n", "check": "c", "grow": "g"},
              {"name": "hold", "try": "door[closed]{hinge, frame, key}", "reads": "r", "notice": "n", "check": "c", "grow": "g"}
            ]}
            """.trimIndent(),
        )
        assertEquals(listOf("~door", "?door", "!door"), steps[0].lines)
        assertEquals("(threshold) @you — act", steps[0].heading)
        assertEquals(listOf("door[closed]{hinge, frame, key}"), steps[1].lines)
        assertEquals(null, steps[1].scene)
    }

    @Test
    fun `scratch text writes try and then lines verbatim under each step`() {
        val lines = SpwQuest.scratchText(listOf(spwStep)).lines()
        val heading = lines.indexOf("# 1. act")
        assertTrue(heading >= 0)
        assertEquals("// reads: ${spwStep.reads}", lines[heading + 1])
        assertEquals("// notice: ${spwStep.notice}", lines[heading + 2])
        assertEquals("// grow: ${spwStep.grow}", lines[heading + 3])
        assertEquals(listOf("~door", "?door", "!door"), lines.subList(heading + 4, heading + 7))
    }

    @Test
    fun `scratch text keeps terminal commands as comments and ends with the terminal form`() {
        val text = SpwQuest.scratchText(listOf(spwStep, terminalStep))
        val lines = text.lines()
        assertFalse(lines.contains(terminalStep.tryLine))
        assertTrue(lines.contains("// ${terminalStep.tryLine}"))
        assertEquals("// ${SpwQuest.TERMINAL_FORM}", lines.last { it.isNotEmpty() })
        assertTrue(text.startsWith("# Spw quest: 2 panels"))
    }

    @Test
    fun `panel heading carries scene and speaker when the step sets them`() {
        val panel = spwStep.copy(scene = "(threshold)", speaker = "@you")
        assertTrue(SpwQuest.scratchText(listOf(panel)).lines().contains("# 1. (threshold) @you — act"))
        assertEquals("act", spwStep.heading)
        assertEquals("@door — hold", spwStep.copy(name = "hold", speaker = "@door").heading)
    }
}
