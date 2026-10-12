/**
 * Regenerates the walkthrough data from docs/learn/quest.spw:
 * src/quest/steps.json and walkthrough/<step>.md.
 *
 * Run after the quest changes: `npm run quest:sync` in extensions/vscode-spw.
 * The package.json walkthrough steps are written by hand; the drift test
 * (src/quest/walkthrough.test.ts) says when they no longer match.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { loadQuest } from '@spwashi/spw-seed'
import { renderStepMarkdown } from '../src/quest/quest-step'

const extensionRoot = path.resolve(__dirname, '..')
const questSource = path.resolve(extensionRoot, '../../docs/learn/quest.spw')

const { steps } = loadQuest(readFileSync(questSource, 'utf8'))

writeFileSync(
  path.join(extensionRoot, 'src/quest/steps.json'),
  JSON.stringify({ source: 'docs/learn/quest.spw', steps }, null, 2) + '\n',
)

const walkthroughDir = path.join(extensionRoot, 'walkthrough')
mkdirSync(walkthroughDir, { recursive: true })
for (const step of steps) {
  writeFileSync(path.join(walkthroughDir, `${step.id}.md`), renderStepMarkdown(step))
}

console.log(`quest: wrote src/quest/steps.json and ${steps.length} files under walkthrough/`)
