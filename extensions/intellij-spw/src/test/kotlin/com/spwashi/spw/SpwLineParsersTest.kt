package com.spwashi.spw

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class SpwLineParsersTest {
    @Test
    fun `parses bracketed single-quoted frame`() {
        val frame = SpwLineParsers.parseFrame("^['roots']{")
        assertNotNull(frame)
        assertEquals("roots", frame.name)
        assertEquals("frame", frame.kind)
        assertEquals("^\"roots\"", frame.presentation)
    }

    @Test
    fun `parses frame with leading label facet`() {
        val frame = SpwLineParsers.parseFrame("^[Integration]['roots']{")
        assertNotNull(frame)
        assertEquals("roots", frame.name)
        assertEquals("frame", frame.kind)
    }

    @Test
    fun `parses legacy quoted frame`() {
        val frame = SpwLineParsers.parseFrame("^\"loop\"{")
        assertNotNull(frame)
        assertEquals("loop", frame.name)
        assertEquals("^\"loop\"", frame.presentation)
    }

    @Test
    fun `parses typed frame declarations`() {
        val frame = SpwLineParsers.parseFrame("^seed[Spw.Workbench.Canon v:0.0.0 @profile:Spw.b]")
        assertNotNull(frame)
        assertEquals("seed", frame.kind)
        assertEquals("Spw.Workbench.Canon v:0.0.0 @profile:Spw.b", frame.name)
        assertEquals("seed[Spw.Workbench.Canon v:0.0.0 @profile:Spw.b]", frame.presentation)
    }

    @Test
    fun `returns null for non-frame line`() {
        assertNull(SpwLineParsers.parseFrame(".. @docs/toc.spw"))
    }

    @Test
    fun `parses headings with indentation`() {
        val heading = SpwLineParsers.parseHeading("  ## Runtime")
        assertNotNull(heading)
        assertEquals(2, heading.level)
        assertEquals("Runtime", heading.title)
    }

    @Test
    fun `parses anchor token`() {
        val anchor = SpwLineParsers.parseAnchor("#>spw_workspace")
        assertNotNull(anchor)
        assertEquals("spw_workspace", anchor.name)
    }

    @Test
    fun `parses prompt root anchor token`() {
        val anchor = SpwLineParsers.parseAnchor("##>song_generation_prompt")
        assertNotNull(anchor)
        assertEquals("song_generation_prompt", anchor.name)
    }
}
