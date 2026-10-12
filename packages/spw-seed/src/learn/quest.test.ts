import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { QUEST_CHECKS, QuestFormatError, checkLine, checkStep, loadQuest } from './quest'

const QUEST_SPW = fileURLToPath(new URL('../../../../docs/learn/quest.spw', import.meta.url))
const quest = loadQuest(readFileSync(QUEST_SPW, 'utf8'))

describe('loadQuest', () => {
  it('reads the seven steps in file order', () => {
    expect(quest.name).toBe('learn_quest')
    expect(quest.steps.map(step => step.id)).toEqual(['write', 'act', 'hold', 'name', 'point', 'ask', 'grow'])
  })

  it('reads every field as text, with escapes undone', () => {
    const name = quest.steps.find(step => step.id === 'name')!
    expect(name.try).toBe('#>my_notes')
    expect(name.then).toEqual(['noticed = `the same door`'])
    expect(quest.steps.find(step => step.id === 'act')!.then).toEqual(['?door', '!door'])
    expect(quest.steps.find(step => step.id === 'write')!.then).toEqual([])
    for (const step of quest.steps) {
      for (const field of [step.try, step.reads, step.notice, step.check, step.grow]) {
        expect(field.length).toBeGreaterThan(0)
      }
      expect(step.fields.try).toBe(step.try)
    }
  })

  it('carries panel fields when a step sets them and leaves them out when it does not', () => {
    const withPanel = loadQuest(
      '^["steps"]{\n w: .{\n  scene = `(threshold)`\n  speaker = `@you`\n  try = `a`\n  reads = "r"\n  notice = "n"\n  check = "parses"\n  grow = "g"\n }\n}\n^["checks"]{\n parses = "success is true"\n}\n',
    )
    expect(withPanel.steps[0]).toMatchObject({ scene: '(threshold)', speaker: '@you' })
    expect(withPanel.steps[0]!.bubble).toBeUndefined()
    const bare = loadQuest(
      '^["steps"]{\n w: .{\n  try = `a`\n  reads = "r"\n  notice = "n"\n  check = "parses"\n  grow = "g"\n }\n}\n^["checks"]{\n parses = "success is true"\n}\n',
    )
    expect(bare.steps[0]!.scene).toBeUndefined()
  })

  it('describes and implements every check a step names', () => {
    for (const step of quest.steps) {
      expect(quest.checks[step.check], step.check).toBeTypeOf('string')
      expect(QUEST_CHECKS[step.check], step.check).toBeDefined()
    }
  })

  it('refuses a step that names a check no host implements', () => {
    const source = '^["steps"]{\n w: .{\n  try = `a`\n  reads = "r"\n  notice = "n"\n  check = "loose"\n  grow = "g"\n }\n}\n^["checks"]{\n loose = "anything"\n}\n'
    expect(() => loadQuest(source)).toThrow(QuestFormatError)
  })
})

describe('checkStep', () => {
  it('passes every try and then line on its own check', () => {
    for (const step of quest.steps) {
      if (QUEST_CHECKS[step.check]?.kind === 'commands') continue
      expect(checkStep(quest, step.id, step.try, { role: 'try' }).pass, `${step.id} try`).toBe(true)
      for (const line of step.then) {
        expect(checkStep(quest, step.id, line, { role: 'then' }).pass, `${step.id} then ${line}`).toBe(true)
      }
    }
  })

  it.each([
    ['act', 'door'],
    ['act', '~ door'],
    ['hold', 'door[closed]{hinge.frame.key}'],
    ['hold', 'door{hinge, frame}'],
    ['name', 'my_notes'],
    ['point', '~"./yesterday.spw"'],
    ['ask', '?door'],
    ['ask', '?["why"]{ !count{ "doors" } }'],
  ])('fails %s on %j', (stepId, line) => {
    expect(checkStep(quest, stepId, line).pass).toBe(false)
  })

  it('treats tight dots as one part and commas as many', () => {
    const one = checkStep(quest, 'hold', 'door[closed]{hinge.frame.key}')
    const many = checkStep(quest, 'hold', 'door[closed]{hinge, frame, key}')
    expect(one.pass).toBe(false)
    expect(many.pass).toBe(true)
  })

  it('counts @word on the act step', () => {
    expect(checkStep(quest, 'act', '@door').pass).toBe(true)
  })

  it('checks the then shape only when asked for the then line', () => {
    expect(checkStep(quest, 'name', 'noticed = `x`').matched).toBe('then')
    expect(checkStep(quest, 'name', 'noticed = `x`', { role: 'try' }).pass).toBe(false)
    expect(checkStep(quest, 'name', '#>my_notes').matched).toBe('try')
  })

  it('reports the reading by reader name', () => {
    const result = checkStep(quest, 'point', '@yesterday: ~"./yesterday.spw"')
    expect(result.reading.operators.map(mark => mark.name)).toEqual(['perspective', 'potential'])
  })

  it('leaves commands to the host', () => {
    const result = checkStep(quest, 'grow', 'spw lint .spw')
    expect(result.host).toBe('commands')
    expect(result.pass).toBe(false)
  })

  it('requires a parse for every shape', () => {
    expect(checkLine('parses', 'the same door').pass).toBe(true)
    expect(() => checkStep(quest, 'nowhere', 'x')).toThrow(QuestFormatError)
  })
})
