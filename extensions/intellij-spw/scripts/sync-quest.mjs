/**
 * sync-quest — copy the quest steps from docs/learn/quest.spw into the plugin.
 *
 * The plugin has no Spw parser in Kotlin, so this script reads quest.spw at
 * development time with spw-seed's loadQuest (the reader every quest host
 * shares) and writes the steps, in order, to src/main/resources/quest/quest.json.
 * The plugin builds its quest.spw scratch file from that JSON.
 *
 * Usage, from the repository root:
 *   node --import tsx extensions/intellij-spw/scripts/sync-quest.mjs           # write quest.json
 *   node --import tsx extensions/intellij-spw/scripts/sync-quest.mjs --check   # exit 1 when quest.json is stale
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { loadQuest } from '@spwashi/spw-seed'

const REPO = path.resolve(import.meta.dirname, '../../..')
const SOURCE = 'docs/learn/quest.spw'
const TARGET = 'extensions/intellij-spw/src/main/resources/quest/quest.json'
const SCRIPT = 'extensions/intellij-spw/scripts/sync-quest.mjs'

const fail = (message) => {
  process.stderr.write(`sync-quest: ${message}\n`)
  process.exit(1)
}

function render(source) {
  let quest
  try {
    quest = loadQuest(source)
  } catch (error) {
    fail(`${SOURCE}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (quest.steps.length === 0) fail(`${SOURCE} lists no steps`)
  const steps = quest.steps.map((step) => ({
    name: step.id,
    scene: step.scene,
    speaker: step.speaker,
    try: step.try,
    then: step.then,
    reads: step.reads,
    notice: step.notice,
    check: step.check,
    grow: step.grow,
  }))
  return `${JSON.stringify({ source: SOURCE, generatedBy: SCRIPT, steps }, null, 2)}\n`
}

const sourcePath = path.join(REPO, SOURCE)
const targetPath = path.join(REPO, TARGET)
if (!existsSync(sourcePath)) fail(`${SOURCE} is missing`)
const next = render(readFileSync(sourcePath, 'utf8'))

if (process.argv.includes('--check')) {
  const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null
  if (current !== next) fail(`${TARGET} is stale; run: node --import tsx ${SCRIPT}`)
  process.stdout.write(`sync-quest: ${TARGET} matches ${SOURCE}\n`)
} else {
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, next)
  process.stdout.write(`sync-quest: wrote ${TARGET}\n`)
}
