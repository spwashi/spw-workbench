package com.spwashi.spw

import com.intellij.codeInsight.template.TemplateActionContext
import com.intellij.codeInsight.template.TemplateContextType

class SpwTemplateContext : TemplateContextType("Spw") {
    override fun isInContext(context: TemplateActionContext): Boolean {
        return context.file.name.endsWith(".spw")
    }
}
