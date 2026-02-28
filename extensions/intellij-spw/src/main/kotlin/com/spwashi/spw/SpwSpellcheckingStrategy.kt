package com.spwashi.spw

import com.intellij.openapi.project.DumbAware
import com.intellij.psi.PsiElement
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy
import com.intellij.spellchecker.tokenizer.Tokenizer

class SpwSpellcheckingStrategy : SpellcheckingStrategy(), DumbAware {
    override fun getTokenizer(element: PsiElement): Tokenizer<*> = EMPTY_TOKENIZER
}
