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
        val lineText = element.containingFile?.text?.let { fileText ->
            val offset = element.textRange.startOffset
            val lineStart = fileText.lastIndexOf('\n', offset - 1) + 1
            val lineEnd = fileText.indexOf('\n', offset).let { if (it < 0) fileText.length else it }
            fileText.substring(lineStart, lineEnd)
        } ?: return null

        // Anchor marker: #>name
        val anchorMatch = Regex("""#>([a-zA-Z_][a-zA-Z0-9_]*)""").find(lineText)
        if (anchorMatch != null && element.textRange.startOffset <= element.containingFile!!.text.indexOf(anchorMatch.value, element.textRange.startOffset - lineText.length) + anchorMatch.value.length) {
            val name = anchorMatch.groupValues[1]
            if (text.contains("#>") || text.contains(name)) {
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
        val frameMatch = Regex("""^\s*\^(?:\["([^"]+)"\]|"([^"]+)")""").find(lineText)
        if (frameMatch != null && (text.contains("^") || text.startsWith("\""))) {
            val name = frameMatch.groupValues[1].ifEmpty { frameMatch.groupValues[2] }
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

        return null
    }
}
