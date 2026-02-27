package com.spwashi.spw

import com.intellij.lang.Language
import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

object SpwLanguage : Language("Spw")

object SpwFileType : LanguageFileType(SpwLanguage) {
    override fun getName() = "Spw"
    override fun getDescription() = "Spw language file"
    override fun getDefaultExtension() = "spw"
    override fun getIcon(): Icon? = SpwIcons.File
}

object SpwIcons {
    val File: Icon = IconLoader.getIcon("/icons/spwFile.svg", SpwIcons::class.java)
}
