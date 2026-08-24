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
            val foldNode = root.node

            val frame = SpwLineParsers.parseFrame(lineText)
            if (frame != null) {
                // Find opening brace on this line or next
                val frameEnd = lineStart + frame.range.last + 1
                val braceStart = findOpenBrace(text, frameEnd)
                if (braceStart >= 0) {
                    val braceEnd = findMatchingClose(text, braceStart)
                    if (braceEnd > braceStart) {
                        val endLine = document.getLineNumber(braceEnd)
                        if (endLine > lineIndex) {
                            val range = TextRange(braceStart, braceEnd + 1)
                            descriptors.add(
                                FoldingDescriptor(
                                    foldNode,
                                    range,
                                    null,
                                    "{…${frame.name}…}",
                                )
                            )
                        }
                    }
                }
            }

            // Heading folding: # Title folds until next heading at same or higher level
            val heading = SpwLineParsers.parseHeading(lineText)
            if (heading != null) {
                val foldEnd = findNextHeadingOrEnd(document, text, lineIndex + 1, heading.level, lineCount)
                if (foldEnd > lineIndex + 1) {
                    val startOffset = document.getLineEndOffset(lineIndex)
                    val endOffset = document.getLineEndOffset(foldEnd - 1)
                    if (endOffset > startOffset) {
                        descriptors.add(
                            FoldingDescriptor(
                                foldNode,
                                TextRange(startOffset, endOffset),
                                null,
                                "# ${heading.title} …",
                            )
                        )
                    }
                }
            }

            lineIndex++
        }

        return descriptors.toTypedArray()
    }

    override fun getPlaceholderText(node: ASTNode): String {
        return "{…}"
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
        var stringDelimiter: Char? = null
        var inLineComment = false
        var escaped = false
        for (i in openIndex until text.length) {
            val ch = text[i]

            if (inLineComment) {
                if (ch == '\n') inLineComment = false
                continue
            }

            if (stringDelimiter != null) {
                if (escaped) {
                    escaped = false
                    continue
                }
                when (ch) {
                    '\\' -> escaped = true
                    stringDelimiter -> stringDelimiter = null
                }
                continue
            }

            when (ch) {
                '#' -> inLineComment = true
                '"', '\'' -> stringDelimiter = ch
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
            val heading = SpwLineParsers.parseHeading(lineText)
            if (heading != null && heading.level <= level) return i
        }
        return lineCount
    }
}
