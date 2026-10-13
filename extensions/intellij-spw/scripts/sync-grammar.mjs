/**
 * sync-grammar — copy the VS Code TextMate grammar into the IntelliJ plugin.
 *
 * extensions/vscode-spw/syntaxes/spw.tmLanguage.json is the one grammar; the
 * plugin's textmate bundle carries a generated copy of it, so the two editors
 * scope the same text the same way. The copy is the source parsed and written
 * back with a `comment` naming where it came from; edit the source, then run this.
 *
 * Usage, from the repository root:
 *   node extensions/intellij-spw/scripts/sync-grammar.mjs           # write the copy
 *   node extensions/intellij-spw/scripts/sync-grammar.mjs --check   # exit 1 when the copy has drifted
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const REPO = path.resolve(import.meta.dirname, '../../..')
const SOURCE = 'extensions/vscode-spw/syntaxes/spw.tmLanguage.json'
const TARGET = 'extensions/intellij-spw/src/main/resources/textmate/spw.tmLanguage.json'
const SCRIPT = 'extensions/intellij-spw/scripts/sync-grammar.mjs'

const fail = (message) => {
  process.stderr.write(`sync-grammar: ${message}\n`)
  process.exit(1)
}

function render(text) {
  let grammar
  try {
    grammar = JSON.parse(text)
  } catch (error) {
    fail(`${SOURCE} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (grammar.scopeName !== 'source.spw') fail(`${SOURCE} has scopeName ${grammar.scopeName}, expected source.spw`)
  const { $schema, ...rest } = grammar
  const copy = {
    ...($schema ? { $schema } : {}),
    comment: `Generated from ${SOURCE} by ${SCRIPT}. Do not edit; edit the source and rerun the script.`,
    ...rest,
  }
  return `${JSON.stringify(copy, null, 4)}\n`
}

const sourcePath = path.join(REPO, SOURCE)
const targetPath = path.join(REPO, TARGET)
if (!existsSync(sourcePath)) fail(`${SOURCE} is missing`)
const next = render(readFileSync(sourcePath, 'utf8'))

if (process.argv.includes('--check')) {
  const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null
  if (current !== next) fail(`${TARGET} has drifted from ${SOURCE}; run: node ${SCRIPT}`)
  process.stdout.write(`sync-grammar: ${TARGET} matches ${SOURCE}\n`)
} else {
  writeFileSync(targetPath, next)
  process.stdout.write(`sync-grammar: wrote ${TARGET}\n`)
}
