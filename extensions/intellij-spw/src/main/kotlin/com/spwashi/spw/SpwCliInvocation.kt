package com.spwashi.spw

import java.nio.file.Path

internal enum class SpwInstrumentOutput(val extension: String) {
    Spw("spw"),
    Json("json"),
    Text("txt"),
}

internal data class SpwCliInvocation(
    val title: String,
    val arguments: List<String>,
    val output: SpwInstrumentOutput,
    /** Keep stderr in the preview, for CLI forms that write their receipt there (`query --stats`). */
    val keepsStderr: Boolean = false,
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

    /** The CLI form as a person would type it, bounded so a long inline selection stays readable. */
    fun summary(): String {
        val form = (listOf("spw") + arguments).joinToString(" ").replace('\n', ' ')
        return if (form.length <= SUMMARY_LIMIT) form else form.take(SUMMARY_LIMIT - 1) + "…"
    }

    /** One step's preview text: stdout, then stderr when this form keeps it. */
    fun content(capture: SpwCliCapture): String {
        val stderr = capture.stderr.takeIf { keepsStderr && it.isNotBlank() } ?: return capture.stdout
        return capture.stdout.withTrailingNewline() + stderr.withTrailingNewline()
    }

    private companion object {
        const val SUMMARY_LIMIT = 160
    }
}

internal data class SpwCliCapture(
    val stdout: String,
    val stderr: String,
)

/** An instrument that reads one or more CLI forms in order and opens one read-only preview. */
internal data class SpwCliSequence(
    val title: String,
    val steps: List<SpwCliInvocation>,
    val output: SpwInstrumentOutput,
) {
    init {
        require(steps.isNotEmpty()) { "A Spw instrument needs at least one CLI step." }
    }

    /** A single step passes through unchanged (JSON stays JSON); several steps each get a `# spw …` header. */
    fun document(captures: List<SpwCliCapture>): String {
        require(captures.size == steps.size) { "Expected ${steps.size} captures, got ${captures.size}." }
        val body = if (steps.size == 1) {
            steps.single().content(captures.single())
        } else {
            steps.zip(captures).joinToString("\n") { (step, capture) ->
                val section = step.content(capture).ifBlank { NO_OUTPUT }
                "# ${step.summary()}\n${section.withTrailingNewline()}"
            }
        }
        return body.ifBlank { NO_OUTPUT }
    }

    companion object {
        fun of(invocation: SpwCliInvocation): SpwCliSequence =
            SpwCliSequence(invocation.title, listOf(invocation), invocation.output)

        private const val NO_OUTPUT = "(Spw returned no output.)\n"
    }
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

    fun inspectSource(consumerRoot: Path, file: Path): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Source Trace",
        arguments = listOf("inspect", "source", consumerPath(consumerRoot, file), "--through", "trace"),
        output = SpwInstrumentOutput.Text,
    )

    /** Selected text is passed as written (spacing is part of what source inspection reports). */
    fun inspectSourceText(text: String): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Source Trace",
        arguments = listOf("inspect", "source", inlineFlag("--text", text), "--through", "trace"),
        output = SpwInstrumentOutput.Text,
    )

    fun fingerprint(expression: String): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Fingerprint",
        arguments = listOf("fingerprint", inlineFlag("--expr", expression.trim())),
        output = SpwInstrumentOutput.Text,
    )

    /** The selection when it has text, otherwise the caret line. */
    fun fingerprintExpression(selection: String?, caretLine: String): String {
        val expression = selection?.takeIf(String::isNotBlank) ?: caretLine
        require(expression.isNotBlank()) { "Select an expression, or place the caret on a line with Spw on it." }
        return expression.trim()
    }

    fun memory(): SpwCliSequence = SpwCliSequence(
        title = "Spw Memory",
        steps = listOf(
            SpwCliInvocation("Spw Memory", listOf("inspect", "memory"), SpwInstrumentOutput.Text),
            SpwCliInvocation("Spw Memory", listOf("mem", "list"), SpwInstrumentOutput.Text),
        ),
        output = SpwInstrumentOutput.Text,
    )

    /** `--stats` writes walk/parse timing to stderr, so this form keeps stderr in the preview. */
    fun performance(consumerRoot: Path, file: Path): SpwCliInvocation {
        val folder = consumerFolder(consumerRoot, file)
        require(',' !in folder) { "spw query --from reads a comma-separated list; the folder name contains a comma." }
        return SpwCliInvocation(
            title = "Spw Query Performance",
            arguments = listOf("query", "--from", folder, "--selector", "pathRefs", "--count", "--stats"),
            output = SpwInstrumentOutput.Text,
            keepsStderr = true,
        )
    }

    /**
     * `spw emit ir`: the EmitDocument (`spw.emit/1`) every host pack is encoded from. It reads the saved
     * file and prints to stdout; the plugin never passes `--out`, so nothing is written.
     */
    fun projection(consumerRoot: Path, file: Path): SpwCliInvocation = SpwCliInvocation(
        title = "Spw Emit IR",
        arguments = listOf("emit", "ir", consumerPath(consumerRoot, file)),
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

    /**
     * `--flag=value` keeps editor text one token: the CLI reads `--text --x` as a missing value and
     * `--expr --help` as a help request, while `--text=--x` and `--expr=--help` read the text.
     */
    private fun inlineFlag(flag: String, text: String): String {
        require(text.isNotEmpty()) { "Spw instruments need text to read." }
        require(text.length <= MAX_INLINE_CHARS) {
            "The selection is ${text.length} characters; inline Spw text is capped at $MAX_INLINE_CHARS. " +
                "Save the file and run the instrument without a selection."
        }
        return "$flag=$text"
    }

    private fun consumerFolder(consumerRoot: Path, file: Path): String {
        val parent = file.toAbsolutePath().normalize().parent
            ?: throw IllegalArgumentException("Spw instruments require a file inside the consumer workspace.")
        return consumerPath(consumerRoot, parent).ifEmpty { "." }
    }

    private fun consumerPath(consumerRoot: Path, file: Path): String {
        val root = consumerRoot.toAbsolutePath().normalize()
        val surface = file.toAbsolutePath().normalize()
        require(surface.startsWith(root)) { "Spw instruments require a file inside the consumer workspace." }
        return root.relativize(surface).toString().replace('\\', '/')
    }

    /** Command-line length stays well under the Windows CreateProcess limit (32,767). */
    internal const val MAX_INLINE_CHARS = 30_000

    private val RENAME_SPEC = Regex("(mark|anchor|case|mood):([^=\\r\\n]+)=([^\\r\\n]+)")
}

private fun String.withTrailingNewline(): String = if (isEmpty() || endsWith('\n')) this else "$this\n"
