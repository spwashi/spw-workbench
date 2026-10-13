package com.spwashi.spw

import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SpwInspectionInvocationTest {
    private val consumer = Path.of("/workspace/consumer")
    private val surface = consumer.resolve("docs/example.spw")

    @Test
    fun `inspect source reads the saved file through trace`() {
        val invocation = SpwCliInvocations.inspectSource(consumer, surface)

        assertEquals(
            listOf("inspect", "source", "docs/example.spw", "--through", "trace"),
            invocation.arguments,
        )
        assertEquals(SpwInstrumentOutput.Text, invocation.output)
    }

    @Test
    fun `inspect source passes a selection as one text token and never names the file`() {
        val selection = "  a[b]{\n  c }\n"
        val invocation = SpwCliInvocations.inspectSourceText(selection)

        assertEquals(
            listOf("inspect", "source", "--text=$selection", "--through", "trace"),
            invocation.arguments,
        )
        assertFalse(invocation.arguments.any { it.endsWith(".spw") })
    }

    @Test
    fun `selection that starts like a flag stays text`() {
        assertEquals(
            listOf("inspect", "source", "--text=--help", "--through", "trace"),
            SpwCliInvocations.inspectSourceText("--help").arguments,
        )
        assertEquals(
            listOf("fingerprint", "--expr=--help"),
            SpwCliInvocations.fingerprint("--help").arguments,
        )
    }

    @Test
    fun `fingerprint reads the selection, else the caret line, trimmed`() {
        assertEquals("a[b]{c}", SpwCliInvocations.fingerprintExpression("  a[b]{c}\n", "ignored"))
        assertEquals("x{y}", SpwCliInvocations.fingerprintExpression(null, "    x{y}"))
        assertEquals("x{y}", SpwCliInvocations.fingerprintExpression("   ", "x{y}"))
        assertEquals(
            listOf("fingerprint", "--expr=noun[mode]{parts}"),
            SpwCliInvocations.fingerprint(" noun[mode]{parts} ").arguments,
        )
    }

    @Test
    fun `fingerprint refuses an empty selection on a blank line`() {
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.fingerprintExpression(null, "   ")
        }
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.fingerprint("")
        }
    }

    @Test
    fun `inline text above the cap is refused with a save-and-run hint`() {
        val oversized = "a".repeat(SpwCliInvocations.MAX_INLINE_CHARS + 1)
        val error = assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.inspectSourceText(oversized)
        }
        assertTrue(error.message!!.contains("Save the file"))
        SpwCliInvocations.inspectSourceText("a".repeat(SpwCliInvocations.MAX_INLINE_CHARS))
    }

    @Test
    fun `memory runs inspect memory then mem list`() {
        val memory = SpwCliInvocations.memory()

        assertEquals(
            listOf(listOf("inspect", "memory"), listOf("mem", "list")),
            memory.steps.map { it.arguments },
        )
        assertEquals(SpwInstrumentOutput.Text, memory.output)
    }

    @Test
    fun `performance queries the file's folder and keeps stats from stderr`() {
        val invocation = SpwCliInvocations.performance(consumer, surface)

        assertEquals(
            listOf("query", "--from", "docs", "--selector", "pathRefs", "--count", "--stats"),
            invocation.arguments,
        )
        assertTrue(invocation.keepsStderr)
    }

    @Test
    fun `performance on a file at the consumer root queries dot`() {
        assertEquals(
            listOf("query", "--from", ".", "--selector", "pathRefs", "--count", "--stats"),
            SpwCliInvocations.performance(consumer, consumer.resolve("index.spw")).arguments,
        )
    }

    @Test
    fun `performance refuses folders outside the consumer or with a comma`() {
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.performance(consumer, Path.of("/another/example.spw"))
        }
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.performance(consumer, consumer.resolve("a,b/example.spw"))
        }
    }

    @Test
    fun `projection is emit ir on the saved file and never writes`() {
        val invocation = SpwCliInvocations.projection(consumer, surface)

        assertEquals(listOf("emit", "ir", "docs/example.spw"), invocation.arguments)
        assertEquals(SpwInstrumentOutput.Json, invocation.output)
        assertFalse(invocation.arguments.any { it == "--out" || it == "-o" || it.startsWith("--out=") })
    }

    @Test
    fun `one-step document passes stdout through unchanged`() {
        val sequence = SpwCliSequence.of(SpwCliInvocations.projection(consumer, surface))

        assertEquals("{\"version\":\"spw.emit/1\"}", sequence.document(listOf(SpwCliCapture("{\"version\":\"spw.emit/1\"}", "warn"))))
        assertEquals("(Spw returned no output.)\n", sequence.document(listOf(SpwCliCapture("", ""))))
    }

    @Test
    fun `kept stderr follows stdout`() {
        val sequence = SpwCliSequence.of(SpwCliInvocations.performance(consumer, surface))

        assertEquals(
            "total=3  files=1\nspw query stats {\"total_ms\":4}\n",
            sequence.document(listOf(SpwCliCapture("total=3  files=1", "spw query stats {\"total_ms\":4}"))),
        )
    }

    @Test
    fun `several steps open one document with a header per step`() {
        val document = SpwCliInvocations.memory().document(
            listOf(
                SpwCliCapture("# spw mem status  pressure=normal\n", ""),
                SpwCliCapture("", ""),
            ),
        )

        assertEquals(
            "# spw inspect memory\n# spw mem status  pressure=normal\n\n" +
                "# spw mem list\n(Spw returned no output.)\n",
            document,
        )
    }

    @Test
    fun `summary bounds long inline text on one line`() {
        val summary = SpwCliInvocations.inspectSourceText("a\n".repeat(200)).summary()

        assertEquals(160, summary.length)
        assertFalse(summary.contains('\n'))
        assertTrue(summary.startsWith("spw inspect source --text=a a"))
    }
}
