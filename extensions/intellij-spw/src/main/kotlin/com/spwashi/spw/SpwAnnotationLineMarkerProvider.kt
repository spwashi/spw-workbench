package com.spwashi.spw

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.codeInsight.daemon.LineMarkerProvider
import com.intellij.icons.AllIcons
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.psi.PsiElement

class SpwAnnotationLineMarkerProvider : LineMarkerProvider {

    override fun getLineMarkerInfo(element: PsiElement): LineMarkerInfo<*>? {
        // Only process leaf elements to avoid duplicate markers
        if (element.children.isNotEmpty()) return null

        val text = element.text ?: return null
        val file = element.containingFile ?: return null
        val contents = file.viewProvider.contents
        val offset = element.textRange.startOffset
        val context = lineContext(contents, offset) ?: return null
        val lineText = context.text

        // Anchor marker: #>name
        val anchorMatch = ANCHOR_PATTERN.find(lineText)
        if (anchorMatch != null) {
            val name = anchorMatch.groupValues[1]
            val anchorStart = context.startOffset + anchorMatch.range.first
            val anchorEndExclusive = context.startOffset + anchorMatch.range.last + 1
            if (offset in anchorStart until anchorEndExclusive && (text.contains("#>") || text.contains(name))) {
                return LineMarkerInfo(
                    element,
                    element.textRange,
                    AllIcons.Gutter.ImplementedMethod,
                    { "Anchor: #>$name — navigate to references" },
                    null,
                    GutterIconRenderer.Alignment.LEFT,
                    { "Anchor #>$name" }
                )
            }
        }

        // Frame marker: ^["name"] or ^"name"
        val frameMatch = FRAME_PATTERN.find(lineText)
        if (frameMatch != null) {
            val name = frameMatch.groupValues[1].ifEmpty { frameMatch.groupValues[2] }
            val frameStart = context.startOffset + frameMatch.range.first
            val frameEndExclusive = context.startOffset + frameMatch.range.last + 1
            if (offset in frameStart until frameEndExclusive && (text.contains("^") || text.startsWith("\""))) {
                return LineMarkerInfo(
                    element,
                    element.textRange,
                    AllIcons.Nodes.Tag,
                    { "Frame: ^\"$name\"" },
                    null,
                    GutterIconRenderer.Alignment.LEFT,
                    { "Frame ^\"$name\"" }
                )
            }
        }

        return null
    }

    private fun lineContext(contents: CharSequence, offset: Int): LineContext? {
        if (offset < 0 || offset > contents.length) return null

        var lineStart = offset
        while (lineStart > 0 && contents[lineStart - 1] != '\n') {
            lineStart -= 1
        }

        var lineEnd = offset
        while (lineEnd < contents.length && contents[lineEnd] != '\n') {
            lineEnd += 1
        }

        val text = contents.subSequence(lineStart, lineEnd).toString()
        return LineContext(lineStart, lineEnd, text)
    }

    private data class LineContext(
        val startOffset: Int,
        val endOffset: Int,
        val text: String,
    )

    companion object {
        private val ANCHOR_PATTERN = Regex("""#>([a-zA-Z_][a-zA-Z0-9_]*)""")
        private val FRAME_PATTERN = Regex("""^\s*\^(?:\["([^"]+)"\]|"([^"]+)")""")
    }
}
