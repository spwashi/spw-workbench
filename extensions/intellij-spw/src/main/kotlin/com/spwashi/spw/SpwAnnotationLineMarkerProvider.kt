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
        val anchor = SpwLineParsers.parseAnchor(lineText)
        if (anchor != null) {
            val anchorStart = context.startOffset + anchor.range.first
            val anchorEndExclusive = context.startOffset + anchor.range.last + 1
            if (offset in anchorStart until anchorEndExclusive && (text.contains("#>") || text.contains(anchor.name))) {
                return LineMarkerInfo(
                    element,
                    element.textRange,
                    AllIcons.Gutter.ImplementedMethod,
                    { "Anchor: #>${anchor.name} — navigate to references" },
                    null,
                    GutterIconRenderer.Alignment.LEFT,
                    { "Anchor #>${anchor.name}" }
                )
            }
        }

        // Frame marker: ^['name'], ^["name"], ^"name", ^type[name]
        val frame = SpwLineParsers.parseFrame(lineText)
        if (frame != null) {
            val frameStart = context.startOffset + frame.range.first
            val frameEndExclusive = context.startOffset + frame.range.last + 1
            if (offset in frameStart until frameEndExclusive && text.contains("^")) {
                return LineMarkerInfo(
                    element,
                    element.textRange,
                    AllIcons.Nodes.Tag,
                    { "${frame.kind}: ${frame.presentation}" },
                    null,
                    GutterIconRenderer.Alignment.LEFT,
                    { frame.presentation }
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

}
