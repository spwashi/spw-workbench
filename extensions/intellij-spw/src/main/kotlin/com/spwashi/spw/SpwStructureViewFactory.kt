package com.spwashi.spw

import com.intellij.ide.structureView.*
import com.intellij.ide.util.treeView.smartTree.TreeElement
import com.intellij.lang.PsiStructureViewFactory
import com.intellij.navigation.ItemPresentation
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.psi.PsiDocumentManager
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
        val lines = text.lineSequence().toList()
        val document = PsiDocumentManager.getInstance(psiFile.project).getDocument(psiFile)
        var fallbackOffset = 0
        for ((index, line) in lines.withIndex()) {
            val lineText = line.trimEnd('\r')
            val lineStartOffset = document?.getLineStartOffset(index) ?: fallbackOffset

            // Headings: # Title
            val heading = SpwLineParsers.parseHeading(lineText)
            if (heading != null) {
                elements.add(
                    SpwStructureNode(
                        label = "§ ${heading.title}",
                        kind = "heading level ${heading.level}",
                        lineNumber = index,
                        lineStartOffset = lineStartOffset,
                        psiFile = psiFile,
                    )
                )
                fallbackOffset += line.length + 1
                continue
            }

            val frame = SpwLineParsers.parseFrame(lineText)
            if (frame != null) {
                elements.add(
                    SpwStructureNode(
                        label = frame.presentation,
                        kind = frame.kind,
                        lineNumber = index,
                        lineStartOffset = lineStartOffset,
                        psiFile = psiFile,
                    )
                )
                fallbackOffset += line.length + 1
                continue
            }

            // Anchors: #>name
            val anchor = SpwLineParsers.parseAnchor(lineText)
            if (anchor != null) {
                elements.add(
                    SpwStructureNode(
                        label = "#>${anchor.name}",
                        kind = "anchor",
                        lineNumber = index,
                        lineStartOffset = lineStartOffset,
                        psiFile = psiFile,
                    )
                )
                fallbackOffset += line.length + 1
                continue
            }

            // Claims: ^claim[c001-brace-symmetry]
            val claim = SpwLineParsers.parseClaimId(lineText)
            if (claim != null) {
                elements.add(
                    SpwStructureNode(
                        label = "⚑ ${claim.id}",
                        kind = "claim",
                        lineNumber = index,
                        lineStartOffset = lineStartOffset,
                        psiFile = psiFile,
                    )
                )
            }

            fallbackOffset += line.length + 1
        }

        return elements.toTypedArray()
    }
}

class SpwStructureNode(
    private val label: String,
    private val kind: String,
    private val lineNumber: Int,
    private val lineStartOffset: Int,
    private val psiFile: PsiFile,
) : StructureViewTreeElement {

    override fun getPresentation(): ItemPresentation {
        return object : ItemPresentation {
            override fun getPresentableText() = label
            override fun getLocationString() = "$kind :${lineNumber + 1}"
            override fun getIcon(unused: Boolean): Icon? = SpwIcons.File
        }
    }

    override fun getValue(): Any = psiFile
    override fun getChildren(): Array<TreeElement> = emptyArray()

    override fun navigate(requestFocus: Boolean) {
        val virtualFile = psiFile.virtualFile ?: return
        OpenFileDescriptor(psiFile.project, virtualFile, lineStartOffset).navigate(requestFocus)
    }

    override fun canNavigate(): Boolean = psiFile.virtualFile != null
    override fun canNavigateToSource(): Boolean = canNavigate()
}
