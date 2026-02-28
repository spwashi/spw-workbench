package com.spwashi.spw

import com.intellij.lang.ASTNode
import com.intellij.lang.folding.FoldingBuilderEx
import com.intellij.lang.folding.FoldingDescriptor
import com.intellij.openapi.editor.Document
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement

class SpwFoldingBuilder : FoldingBuilderEx() {

    override fun buildFoldRegions(root: PsiElement, document: Document, quick: Boolean): Array<FoldingDescriptor> {
        val descriptors = mutableListOf<FoldingDescriptor>()
        val text = document.text
        val lineCount = document.lineCount

        var lineIndex = 0
        while (lineIndex < lineCount) {
            val lineStart = document.getLineStartOffset(lineIndex)
            val lineEnd = document.getLineEndOffset(lineIndex)
            val lineText = text.substring(lineStart, lineEnd)

            val match = FRAME_LINE_PATTERN.find(lineText)
            if (match != null) {
                // Find opening brace on this line or next
                val braceStart = findOpenBrace(text, lineEnd)
                if (braceStart >= 0) {
                    val braceEnd = findMatchingClose(text, braceStart)
                    if (braceEnd > braceStart) {
                        val endLine = document.getLineNumber(braceEnd)
                        if (endLine > lineIndex) {
                            val range = TextRange(braceStart, braceEnd + 1)
                            val node = root.containingFile?.findElementAt(lineStart)?.node
                            if (node != null) {
                                descriptors.add(FoldingDescriptor(node, range))
                            }
                        }
                    }
                }
            }

            // Heading folding: # Title folds until next heading at same or higher level
            val headingMatch = HEADING_PATTERN.find(lineText)
            if (headingMatch != null) {
                val level = headingMatch.groupValues[1].length
                val foldEnd = findNextHeadingOrEnd(document, text, lineIndex + 1, level, lineCount)
                if (foldEnd > lineIndex + 1) {
                    val startOffset = document.getLineEndOffset(lineIndex)
                    val endOffset = document.getLineEndOffset(foldEnd - 1)
                    if (endOffset > startOffset) {
                        val node = root.containingFile?.findElementAt(lineStart)?.node
                        if (node != null) {
                            descriptors.add(FoldingDescriptor(node, TextRange(startOffset, endOffset)))
                        }
                    }
                }
            }

            lineIndex++
        }

        return descriptors.toTypedArray()
    }

    override fun getPlaceholderText(node: ASTNode): String {
        val text = node.text
        // Try to show frame name in placeholder
        val frameMatch = FRAME_INLINE_PATTERN.find(text)
        return if (frameMatch != null) {
            val name = frameMatch.groupValues[1].ifEmpty {
                frameMatch.groupValues[2].ifEmpty {
                    "${frameMatch.groupValues[3]}[${frameMatch.groupValues[4]}]"
                }
            }
            "{…$name…}"
        } else {
            "{…}"
        }
    }

    override fun isCollapsedByDefault(node: ASTNode): Boolean = false

    private fun findOpenBrace(text: String, fromIndex: Int): Int {
        val searchEnd = minOf(fromIndex + 200, text.length)
        var newlines = 0
        for (i in fromIndex until searchEnd) {
            when (text[i]) {
                '{' -> return i
                '\n' -> {
                    newlines += 1
                    if (newlines > 1) return -1
                }
            }
        }
        return -1
    }

    private fun findMatchingClose(text: String, openIndex: Int): Int {
        var depth = 0
        var inString = false
        var inLineComment = false
        var escaped = false
        for (i in openIndex until text.length) {
            val ch = text[i]

            if (inLineComment) {
                if (ch == '\n') inLineComment = false
                continue
            }

            if (inString) {
                if (escaped) {
                    escaped = false
                    continue
                }
                when (ch) {
                    '\\' -> escaped = true
                    '"' -> inString = false
                }
                continue
            }

            when (ch) {
                '#' -> inLineComment = true
                '"' -> inString = true
                '{' -> depth++
                '}' -> {
                    depth--
                    if (depth == 0) return i
                }
            }
        }
        return -1
    }

    private fun findNextHeadingOrEnd(document: Document, text: String, startLine: Int, level: Int, lineCount: Int): Int {
        for (i in startLine until lineCount) {
            val lineStart = document.getLineStartOffset(i)
            val lineEnd = document.getLineEndOffset(i)
            val lineText = text.substring(lineStart, lineEnd)
            val headingMatch = HEADING_PATTERN.find(lineText)
            if (headingMatch != null && headingMatch.groupValues[1].length <= level) return i
        }
        return lineCount
    }

    companion object {
        private val FRAME_LINE_PATTERN = Regex("""^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|(\w+)\[([^\]]+)\])""")
        private val FRAME_INLINE_PATTERN = Regex("""\^(?:\["([^"]+)"\]|"([^"]+)"|(\w+)\[([^\]]+)\])""")
        private val HEADING_PATTERN = Regex("""^(#{1,3})\s+(.+)""")
    }
}
