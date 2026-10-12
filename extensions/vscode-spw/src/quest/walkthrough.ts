/**
 * The Get started walkthrough (contributes.walkthroughs `spw.quest`).
 *
 * `spw.quest.tryStep` opens a step's lines in a scratch .spw file under the
 * extension's global storage. A file, not an untitled buffer: the language
 * client and server only read `file:` documents, and this way hover, outline
 * and diagnostics are live. The grow step types the mounted lint and resolve
 * commands into a terminal and leaves Enter to the user.
 *
 * Step data comes from steps.json, generated from docs/learn/quest.spw.
 */
import * as vscode from 'vscode'
import questData from './steps.json'
import {
  INSTALL_URL,
  MOUNTED_GROW_COMMAND,
  MOUNTED_WORKBENCH,
  QUICK_START_URL,
  TERMINAL_STEP_ID,
  TRY_STEP_COMMAND,
  stepDocumentText,
  triedContextKey,
  type QuestStep,
} from './quest-step'

const steps: readonly QuestStep[] = questData.steps

export function registerQuestWalkthrough(context: vscode.ExtensionContext): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(TRY_STEP_COMMAND, async (stepId?: unknown) => {
      const step = steps.find((candidate) => candidate.id === stepId) ?? await pickStep()
      if (!step) return
      if (step.id === TERMINAL_STEP_ID) await typeGrowCommands()
      else await openStepFile(context, step)
      await vscode.commands.executeCommand('setContext', triedContextKey(step.id), true)
    }),
  ]
}

async function pickStep(): Promise<QuestStep | undefined> {
  const picked = await vscode.window.showQuickPick(
    steps.map((step) => ({ label: step.id, description: step.try, step })),
    { placeHolder: 'Which quest step?' },
  )
  return picked?.step
}

async function openStepFile(context: vscode.ExtensionContext, step: QuestStep): Promise<void> {
  const folder = vscode.Uri.joinPath(context.globalStorageUri, 'quest')
  const file = vscode.Uri.joinPath(folder, `${step.id}.spw`)
  const open = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === file.toString())
  if (!open) {
    await vscode.workspace.fs.createDirectory(folder)
    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(stepDocumentText(step)))
  }
  const doc = open ?? await vscode.workspace.openTextDocument(file)
  await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preview: false })
}

async function typeGrowCommands(): Promise<void> {
  const root = await mountedWorkspaceFolder()
  if (!root) {
    const choice = await vscode.window.showInformationMessage(
      `This workspace has no ${MOUNTED_WORKBENCH}. The quick start shows how to mount the workbench.`,
      'Open quick start',
      'spw.quest/install',
    )
    if (choice === 'Open quick start') await vscode.env.openExternal(vscode.Uri.parse(QUICK_START_URL))
    if (choice === 'spw.quest/install') await vscode.env.openExternal(vscode.Uri.parse(INSTALL_URL))
    return
  }
  const terminal = vscode.window.createTerminal({ name: 'Spw quest: grow', cwd: root.uri })
  terminal.show()
  // No newline: the commands wait at the prompt until the user presses Enter.
  terminal.sendText(MOUNTED_GROW_COMMAND, false)
}

async function mountedWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, MOUNTED_WORKBENCH))
      if (stat.type & vscode.FileType.Directory) return folder
    } catch {
      // Not mounted in this folder.
    }
  }
  return undefined
}
