package com.spwashi.spw.settings

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import com.intellij.util.ui.UIUtil
import javax.swing.JComponent
import javax.swing.JPanel

class SpwLspConfigurable(private val project: Project) : Configurable {
    private var panel: JPanel? = null
    private var enabledCheckBox: JBCheckBox? = null
    private var commandField: JBTextField? = null
    private var workDirField: TextFieldWithBrowseButton? = null

    override fun getDisplayName(): String = "Spw LSP"

    override fun createComponent(): JComponent {
        if (panel == null) {
            val initialState = SpwLspSettings.getInstance(project).getCurrentState()

            enabledCheckBox = JBCheckBox("Enable Spw LSP", initialState.enabled).apply {
                toolTipText = "Start the Spw language server for .spw files."
                addActionListener { updateEnabledState(isSelected) }
            }
            commandField = JBTextField().apply {
                toolTipText = "Override the LSP command when you cannot use the default launcher contract (for example, \"pnpm run lsp\")."
                emptyText.text = "Default: npm run lsp"
                text = initialState.command
            }
            workDirField = TextFieldWithBrowseButton().apply {
                toolTipText = "Optional working directory for the LSP process."
                val descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
                addBrowseFolderListener(
                    "Select Spw LSP Working Directory",
                    "Choose the repo root that contains package.json with the `lsp` script.",
                    project,
                    descriptor
                )
                text = initialState.workDir
            }

            val helperLabel = JBLabel(
                "Leave fields empty to use defaults. The working directory should contain package.json with an `lsp` script; the launcher then resolves local or lore-remote server sources."
            ).apply {
                foreground = UIUtil.getContextHelpForeground()
                font = UIUtil.getLabelFont(UIUtil.FontSize.SMALL)
            }

            panel = FormBuilder.createFormBuilder()
                .addComponent(enabledCheckBox!!)
                .addLabeledComponent("LSP command", commandField!!)
                .addLabeledComponent("Working directory", workDirField!!)
                .addComponent(helperLabel)
                .panel

            updateEnabledState(initialState.enabled)
        }
        return panel!!
    }

    override fun isModified(): Boolean {
        val settings = SpwLspSettings.getInstance(project)
        val state = settings.getCurrentState()
        return enabledCheckBox?.isSelected != state.enabled ||
            commandField?.text?.trim().orEmpty() != state.command ||
            workDirField?.text?.trim().orEmpty() != state.workDir
    }

    override fun apply() {
        val settings = SpwLspSettings.getInstance(project)
        val updated = settings.getCurrentState().copy(
            enabled = enabledCheckBox?.isSelected ?: true,
            command = commandField?.text?.trim().orEmpty(),
            workDir = workDirField?.text?.trim().orEmpty(),
        )
        settings.updateState(updated)
    }

    override fun reset() {
        val state = SpwLspSettings.getInstance(project).getCurrentState()
        enabledCheckBox?.isSelected = state.enabled
        commandField?.text = state.command
        workDirField?.text = state.workDir
        updateEnabledState(state.enabled)
    }

    override fun disposeUIResources() {
        panel = null
        enabledCheckBox = null
        commandField = null
        workDirField = null
    }

    private fun updateEnabledState(enabled: Boolean) {
        commandField?.isEnabled = enabled
        workDirField?.isEnabled = enabled
        workDirField?.button?.isEnabled = enabled
    }
}
