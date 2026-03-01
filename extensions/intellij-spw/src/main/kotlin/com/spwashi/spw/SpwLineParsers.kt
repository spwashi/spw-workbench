package com.spwashi.spw

internal object SpwLineParsers {
    data class HeadingMatch(
        val level: Int,
        val title: String,
        val range: IntRange,
    )

    data class AnchorMatch(
        val name: String,
        val range: IntRange,
    )

    data class FrameMatch(
        val name: String,
        val kind: String,
        val presentation: String,
        val range: IntRange,
    )

    fun parseHeading(lineText: String): HeadingMatch? {
        val match = HEADING_PATTERN.find(lineText) ?: return null
        val hashes = match.groupValues[1]
        val title = match.groupValues[2].trim()
        return HeadingMatch(
            level = hashes.length,
            title = title,
            range = match.range,
        )
    }

    fun parseAnchor(lineText: String): AnchorMatch? {
        val match = ANCHOR_PATTERN.find(lineText) ?: return null
        val name = match.groupValues[1]
        return AnchorMatch(name = name, range = match.range)
    }

    fun parseFrame(lineText: String): FrameMatch? {
        val match = FRAME_PATTERN.find(lineText) ?: return null

        val bracketName = match.groupValues[2]
        if (bracketName.isNotEmpty()) {
            return FrameMatch(
                name = bracketName,
                kind = "frame",
                presentation = "^\"$bracketName\"",
                range = match.range,
            )
        }

        val quotedName = match.groupValues[4]
        if (quotedName.isNotEmpty()) {
            return FrameMatch(
                name = quotedName,
                kind = "frame",
                presentation = "^\"$quotedName\"",
                range = match.range,
            )
        }

        val typedKind = match.groupValues[5]
        val typedName = match.groupValues[6]
        if (typedKind.isNotEmpty()) {
            return FrameMatch(
                name = typedName,
                kind = typedKind,
                presentation = "$typedKind[$typedName]",
                range = match.range,
            )
        }

        return null
    }

    data class ClaimMatch(
        val id: String,
        val range: IntRange,
    )

    fun parseClaimId(lineText: String): ClaimMatch? {
        val match = CLAIM_PATTERN.find(lineText) ?: return null
        val id = match.groupValues[1]
        return ClaimMatch(id = id, range = match.range)
    }

    private val HEADING_PATTERN = Regex("""^\s*(#{1,3})\s+(.+)""")
    private val ANCHOR_PATTERN = Regex("""#>([a-zA-Z_][a-zA-Z0-9_]*)""")

    // Supports:
    // - ^["frame"], ^['frame']
    // - ^"frame", ^'frame'
    // - ^type[name]
    // - optional leading labels: ^[Integration]['frame']
    private val FRAME_PATTERN = Regex(
        """^\s*\^(?:\s*\[[A-Za-z_][A-Za-z0-9_.-]*])*\s*(?:\[\s*(['"])([^'"]+)\1\s*]|(['"])([^'"]+)\3|([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)])"""
    )

    // Claim protocol: ^claim[c001-brace-symmetry]
    private val CLAIM_PATTERN = Regex("""^\s*\^claim\[([^\]]+)]""")
}

