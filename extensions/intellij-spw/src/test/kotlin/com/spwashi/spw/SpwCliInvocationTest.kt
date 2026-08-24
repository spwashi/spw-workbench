package com.spwashi.spw

import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SpwCliInvocationTest {
    private val consumer = Path.of("/workspace/consumer")
    private val mountedWorkbench = consumer.resolve(".spw/_workbench")
    private val surface = consumer.resolve("docs/example.spw")

    @Test
    fun `tool root selects executable while arguments stay consumer relative`() {
        val invocation = SpwCliInvocations.form(consumer, surface)

        assertEquals(
            listOf(
                "npm", "--prefix", mountedWorkbench.toString(),
                "run", "--silent", "spw", "--",
                "form", "docs/example.spw", "--resonance", "--spw",
            ),
            invocation.command(mountedWorkbench),
        )
    }

    @Test
    fun `cache and stack use canonical CLI command names`() {
        assertEquals(
            listOf("inspect", "cache", "docs/example.spw", "--json"),
            SpwCliInvocations.cache(consumer, surface).arguments,
        )
        assertEquals(
            listOf("stack", "docs/example.spw", "--json"),
            SpwCliInvocations.stack(consumer, surface).arguments,
        )
    }

    @Test
    fun `corpus refactor remains a plan without write capability`() {
        val invocation = SpwCliInvocations.refactorPlan("mark:status=phase")

        assertEquals(
            listOf("refactor", ".", "--rename", "mark:status=phase", "--json"),
            invocation.arguments,
        )
        assertEquals(false, invocation.arguments.contains("--write"))
    }

    @Test
    fun `rejects malformed rename specs and files outside consumer root`() {
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.refactorPlan("status=phase")
        }
        assertFailsWith<IllegalArgumentException> {
            SpwCliInvocations.form(consumer, Path.of("/another/example.spw"))
        }
    }
}
