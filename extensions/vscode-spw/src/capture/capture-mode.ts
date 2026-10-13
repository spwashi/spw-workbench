/**
 * Spw: Toggle Capture Mode — hides code lenses and inlay hints for Spw files
 * (user-level `[spw]` settings) and restores the prior values when turned off.
 * The saved priors live in globalState, so a reload mid-capture still restores.
 */
import * as vscode from 'vscode'
import {
  captureStatus,
  planCaptureOff,
  planCaptureOn,
  readSavedPriors,
  type CaptureWrite,
} from './capture-plan'

export const TOGGLE_CAPTURE_COMMAND = 'spw.toggleCaptureMode'
const SAVED_PRIORS_KEY = 'spw.captureMode.savedPriors'
const CONTEXT_KEY = 'spw.captureMode'

export function registerCaptureMode(context: vscode.ExtensionContext): vscode.Disposable[] {
  const item = vscode.window.createStatusBarItem('spw.captureMode', vscode.StatusBarAlignment.Left, 39)
  item.name = 'Spw Capture Mode'
  item.command = TOGGLE_CAPTURE_COMMAND
  let busy = false

  const savedPriors = () => readSavedPriors(context.globalState.get(SAVED_PRIORS_KEY))

  const render = (): void => {
    const on = savedPriors() !== undefined
    const status = captureStatus(on)
    item.text = status.text
    item.tooltip = status.tooltip
    void vscode.commands.executeCommand('setContext', CONTEXT_KEY, on)
    const spwActive = vscode.window.activeTextEditor?.document.languageId === 'spw'
    if (on || spwActive) item.show()
    else item.hide()
  }

  const toggle = async (): Promise<void> => {
    if (busy) return
    busy = true
    try {
      const config = vscode.workspace.getConfiguration('editor', { languageId: 'spw' })
      const saved = savedPriors()
      if (saved) {
        await applyWrites(config, planCaptureOff(saved))
        await context.globalState.update(SAVED_PRIORS_KEY, undefined)
        return
      }
      const plan = planCaptureOn(key => config.inspect(key))
      // Save first: if a write fails part-way, toggling again still restores.
      await context.globalState.update(SAVED_PRIORS_KEY, plan.saved)
      await applyWrites(config, plan.writes)
      if (plan.shadowed.length) {
        void vscode.window.showWarningMessage(
          `Workspace settings set ${plan.shadowed.map(key => `editor.${key}`).join(' and ')} for [spw]; they outrank capture mode's user-level setting.`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      void vscode.window.showErrorMessage(`Spw capture mode could not update settings: ${message}`)
    } finally {
      busy = false
      render()
    }
  }

  render()
  return [
    item,
    vscode.commands.registerCommand(TOGGLE_CAPTURE_COMMAND, toggle),
    vscode.window.onDidChangeActiveTextEditor(render),
  ]
}

async function applyWrites(
  config: vscode.WorkspaceConfiguration,
  writes: readonly CaptureWrite[],
): Promise<void> {
  // Sequential: concurrent writes to one settings file can drop each other.
  for (const write of writes) {
    await config.update(write.key, write.value, vscode.ConfigurationTarget.Global, true)
  }
}
