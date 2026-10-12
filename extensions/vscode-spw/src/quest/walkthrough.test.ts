import { readFileSync } from 'node:fs'
import { loadQuest, parse } from '@spwashi/spw-seed'
import { describe, expect, it } from 'vitest'
import {
  TERMINAL_STEP_ID,
  TRY_STEP_COMMAND,
  renderStepMarkdown,
  stepDocumentText,
  triedContextKey,
} from './quest-step'
import questData from './steps.json'

// Fix any failure here with `npm run quest:sync` in extensions/vscode-spw,
// then update the package.json walkthrough steps by hand if ids changed.

const extensionFile = (relative: string): string =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

const quest = loadQuest(readFileSync(new URL('../../../../docs/learn/quest.spw', import.meta.url), 'utf8')).steps

interface WalkthroughStep {
  id: string
  description: string
  media: { markdown?: string }
  completionEvents?: string[]
}

const manifest = JSON.parse(extensionFile('package.json')) as {
  activationEvents: string[]
  contributes: { walkthroughs: Array<{ id: string; steps: WalkthroughStep[] }> }
}
const walkthrough = manifest.contributes.walkthroughs.find((entry) => entry.id === 'spw.quest')

/** The lines of each fenced code block, in order. */
function fencedBlocks(markdown: string): string[][] {
  const blocks: string[][] = []
  let open: string[] | null = null
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      if (open) { blocks.push(open); open = null } else { open = [] }
    } else if (open) {
      open.push(line)
    }
  }
  return blocks
}

describe('Get started walkthrough against docs/learn/quest.spw', () => {
  it('reads the seven quest steps in order with spw-seed', () => {
    expect(quest.map((step) => step.id)).toEqual(['write', 'act', 'hold', 'name', 'point', 'ask', 'grow'])
  })

  it('has one walkthrough step per quest step, in order, with the step keys as ids', () => {
    expect(walkthrough).toBeDefined()
    expect(walkthrough!.steps.map((step) => step.id)).toEqual(quest.map((step) => step.id))
  })

  it('wires each step to its markdown, its try button and its own completion key', () => {
    for (const step of walkthrough!.steps) {
      expect(step.media.markdown).toBe(`walkthrough/${step.id}.md`)
      expect(step.description).toContain(
        `(command:${TRY_STEP_COMMAND}?${encodeURIComponent(JSON.stringify([step.id]))})`,
      )
      expect(step.completionEvents).toEqual([`onContext:${triedContextKey(step.id)}`])
    }
    expect(manifest.activationEvents).toContain(`onCommand:${TRY_STEP_COMMAND}`)
  })

  it('carries each try line, and each then line, verbatim in the step markdown', () => {
    for (const step of quest) {
      const blocks = fencedBlocks(extensionFile(`walkthrough/${step.id}.md`))
      expect(blocks[0], `${step.id}: try`).toEqual([step.try])
      if (step.then.length > 0) expect(blocks[1], `${step.id}: then`).toEqual(step.then)
    }
  })

  it('renders reads, notice and grow from the source, and ships the same step data', () => {
    for (const step of quest) {
      expect(extensionFile(`walkthrough/${step.id}.md`), step.id).toBe(renderStepMarkdown(step))
    }
    expect(questData.steps).toEqual(quest)
  })

  it('opens a scratch document that parses for every editor step', () => {
    for (const step of quest.filter((candidate) => candidate.id !== TERMINAL_STEP_ID)) {
      expect(parse(stepDocumentText(step)).success, step.id).toBe(true)
    }
  })
})
