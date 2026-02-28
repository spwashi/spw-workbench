package com.spwashi.spw

import com.intellij.ide.structureView.*
import com.intellij.ide.util.treeView.smartTree.TreeElement
import com.intellij.lang.PsiStructureViewFactory
import com.intellij.navigation.ItemPresentation
import com.intellij.openapi.editor.Editor
import com.intellij.psi.PsiFile
import javax.swing.Icon

class SpwStructureViewFactory : PsiStructureViewFactory {
    override fun getStructureViewBuilder(psiFile: PsiFile): StructureViewBuilder {
        return object : TreeBasedStructureViewBuilder() {
            override fun createStructureViewModel(editor: Editor?): StructureViewModel {
                return SpwStructureViewModel(psiFile)
            }
        }
    }
}

class SpwStructureViewModel(file: PsiFile) :
    StructureViewModelBase(file, SpwStructureViewElement(file))

class SpwStructureViewElement(private val psiFile: PsiFile) : StructureViewTreeElement {

    override fun getValue() = psiFile
    override fun navigate(requestFocus: Boolean) = psiFile.navigate(requestFocus)
    override fun canNavigate() = psiFile.canNavigate()
    override fun canNavigateToSource() = psiFile.canNavigateToSource()

    override fun getPresentation(): ItemPresentation {
        return object : ItemPresentation {
            override fun getPresentableText() = psiFile.name
            override fun getLocationString(): String? = null
            override fun getIcon(unused: Boolean): Icon? = SpwIcons.File
        }
    }

    override fun getChildren(): Array<TreeElement> {
        val text = psiFile.text
        val elements = mutableListOf<TreeElement>()

        // Scan for structure patterns
        val lines = text.split("\n")
        for ((index, line) in lines.withIndex()) {
            // Headings: # Title
            val headingMatch = Regex("""^(#{1,3})\s+(.+)""").find(line)
            if (headingMatch != null) {
                val level = headingMatch.groupValues[1].length
                val title = headingMatch.groupValues[2].trim()
                elements.add(SpwStructureNode("§ $title", "heading level $level", index, psiFile))
                continue
            }

            // Frames: ^["name"] or ^"name"
            val frameMatch = Regex("""^\s*\^(?:\["([^"]+)"\]|"([^"]+)")""").find(line)
            if (frameMatch != null) {
                val name = frameMatch.groupValues[1].ifEmpty { frameMatch.groupValues[2] }
                elements.add(SpwStructureNode("^\"$name\"", "frame", index, psiFile))
                continue
            }

            // Typed blocks: ^subroot[name], ^property[name], ^metric[name], etc
            val typedMatch = Regex("""^\s*\^(\w+)\[([^\]]+)\]""").find(line)
            if (typedMatch != null) {
                val type = typedMatch.groupValues[1]
                val name = typedMatch.groupValues[2]
                elements.add(SpwStructureNode("$type[$name]", type, index, psiFile))
                continue
            }

            // Anchors: #>name
            val anchorMatch = Regex("""#>([a-zA-Z_][a-zA-Z0-9_]*)""").find(line)
            if (anchorMatch != null) {
                val name = anchorMatch.groupValues[1]
                elements.add(SpwStructureNode("#>$name", "anchor", index, psiFile))
            }
        }

        return elements.toTypedArray()
    }
}

class SpwStructureNode(
    private val label: String,
    private val kind: String,
    private val lineNumber: Int,
    private val psiFile: PsiFile,
) : TreeElement {

    override fun getPresentation(): ItemPresentation {
        return object : ItemPresentation {
            override fun getPresentableText() = label
            override fun getLocationString() = "$kind :${lineNumber + 1}"
            override fun getIcon(unused: Boolean): Icon? = SpwIcons.File
        }
    }

    override fun getChildren(): Array<TreeElement> = emptyArray()
}
