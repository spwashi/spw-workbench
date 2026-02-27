package com.spwashi.spw.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.StoragePathMacros
import com.intellij.openapi.project.Project

@State(
    name = "SpwLspSettings",
    storages = [Storage(StoragePathMacros.WORKSPACE_FILE)]
)
@Service(Service.Level.PROJECT)
class SpwLspSettings : PersistentStateComponent<SpwLspSettings.State> {
    data class State(
        var enabled: Boolean = true,
        var command: String = "",
        var workDir: String = "",
    )

    private var myState: State = State()
    
    override fun getState(): State = myState

    override fun loadState(state: State) {
        this.myState = state
    }

    fun updateState(updated: State) {
        myState = updated
    }
    
    fun getCurrentState(): State = myState.copy()

    companion object {
        fun getInstance(project: Project): SpwLspSettings = project.getService(SpwLspSettings::class.java)
    }
}
