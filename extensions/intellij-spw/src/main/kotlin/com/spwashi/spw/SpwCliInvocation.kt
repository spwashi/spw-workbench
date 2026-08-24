package com.spwashi.spw

import java.nio.file.Path

internal enum class SpwInstrumentOutput(val extension: String) {
    Spw("spw"),
    Json("json"),
}

internal data class SpwCliInvocation(
    val title: String,
    val arguments: List<String>,
    val output: SpwInstrumentOutput,
) {
    fun command(toolRoot: Path): List<String> = listOf(
        "npm",
        "--prefix",
        toolRoot.normalize().toString(),
        "run",
        "--silent",
        "spw",
        "--",
    ) + arguments
}

internal object SpwCliInvocations {
    fun form(consumerRoot: Path, file: Path): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Form",
        arguments = listOf("form", consumerPath(consumerRoot, file), "--resonance", "--spw"),
        output = SpwInstrumentOutput.Spw,
    )

    fun stack(consumerRoot: Path, file: Path): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Surface Stack",
        arguments = listOf("stack", consumerPath(consumerRoot, file), "--json"),
        output = SpwInstrumentOutput.Json,
    )

    fun cache(consumerRoot: Path, file: Path): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Cache",
        arguments = listOf("inspect", "cache", consumerPath(consumerRoot, file), "--json"),
        output = SpwInstrumentOutput.Json,
    )

    fun refactorPlan(spec: String): SpwCliInvocation {
        val normalized = validateRenameSpec(spec)
        return SpwCliInvocation(
            title = "Spw Corpus Refactor Plan",
            arguments = listOf("refactor", ".", "--rename", normalized, "--json"),
            output = SpwInstrumentOutput.Json,
        )
    }

    fun validateRenameSpec(spec: String): String {
        val normalized = spec.trim()
        val match = RENAME_SPEC.matchEntire(normalized)
            ?: throw IllegalArgumentException("Expected kind:from=to with kind mark, anchor, case, or mood.")
        if (match.groupValues[2].isBlank() || match.groupValues[3].isBlank()) {
            throw IllegalArgumentException("Rename source and destination must both be non-empty.")
        }
        return normalized
    }

    private fun consumerPath(consumerRoot: Path, file: Path): String {
        val root = consumerRoot.toAbsolutePath().normalize()
        val surface = file.toAbsolutePath().normalize()
        require(surface.startsWith(root)) { "Spw instruments require a file inside the consumer workspace." }
        return root.relativize(surface).toString().replace('\\', '/')
    }

    private val RENAME_SPEC = Regex("(mark|anchor|case|mood):([^=\\r\\n]+)=([^\\r\\n]+)")
}
