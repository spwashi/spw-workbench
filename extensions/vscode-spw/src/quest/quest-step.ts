/**
 * One quest step as the walkthrough shows and opens it. Pure: no vscode
 * import, so the drift test and the sync script see exactly what ships.
 */

/** A step as spw-seed's loadQuest reads it from docs/learn/quest.spw. */
export interface QuestStep {
  id: string
  try: string
  then: string[]
  reads: string
  notice: string
  check: string
  grow: string
}

/** The walkthrough's buttons call this with the step id. */
export const TRY_STEP_COMMAND = 'spw.quest.tryStep'

/**
 * Completion is per step. A walkthrough `onCommand` event ignores arguments,
 * so it would tick every step at once; each step listens for its own key.
 */
export function triedContextKey(stepId: string): string {
  return `spw.quest.tried.${stepId}`
}

/** The step whose try line is a shell command; the walkthrough runs it in a terminal. */
export const TERMINAL_STEP_ID = 'grow'

/** Where the workbench sits when a repository mounts it. */
export const MOUNTED_WORKBENCH = '.spw/_workbench'

/** The grow step's try line in its mounted form, typed into the terminal but not run. */
export const MOUNTED_GROW_COMMAND = [
  `npm --prefix ${MOUNTED_WORKBENCH} run spw -- lint .spw`,
  `npm --prefix ${MOUNTED_WORKBENCH} run spw -- resolve --from .spw`,
].join(' && ')

export const QUICK_START_URL = 'https://github.com/spwashi/spw-workbench/blob/main/docs/runtime/md/quick-start.md'
export const INSTALL_URL = 'https://spw.quest/install'

/** The text a step's scratch file opens with: the try line, then each then line. */
export function stepDocumentText(step: Pick<QuestStep, 'try' | 'then'>): string {
  return [step.try, ...step.then].join('\n') + '\n'
}

export function renderStepMarkdown(step: QuestStep): string {
  const fence = step.id === TERMINAL_STEP_ID ? 'sh' : 'spw'
  const parts = [
    '**Try**',
    codeBlock(fence, [step.try]),
    ...(step.then.length > 0 ? ['**Then**', codeBlock(fence, step.then)] : []),
    `**Reads.** ${step.reads}`,
    `**Notice.** ${step.notice}`,
    `**Grow.** ${step.grow}`,
    ...(step.id === TERMINAL_STEP_ID ? mountedNotes() : []),
  ]
  return parts.join('\n\n') + '\n'
}

function mountedNotes(): string[] {
  return [
    `**In this workspace.** When \`${MOUNTED_WORKBENCH}\` is present, the step's button opens a terminal at the workspace with these commands typed in. Press Enter to run them:`,
    codeBlock('sh', [MOUNTED_GROW_COMMAND]),
    `Without a mounted workbench, start with the [quick start](${QUICK_START_URL}) or [spw.quest/install](${INSTALL_URL}).`,
  ]
}

function codeBlock(language: string, lines: string[]): string {
  return ['```' + language, ...lines, '```'].join('\n')
}
