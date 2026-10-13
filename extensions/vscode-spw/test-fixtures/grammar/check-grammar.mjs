#!/usr/bin/env node
/**
 * check-grammar — hold the Spw TextMate grammar valid and its scopes honest.
 *
 * Three layers; each runs when its engine is present and the report says which ran:
 *   1. json      both grammars parse; the IntelliJ copy equals what sync-grammar.mjs renders.
 *   2. regex     every match/begin/end/while compiles under JavaScript RegExp (Oniguruma-only
 *                forms translated first); with `ruby` on PATH, also under Onigmo, the
 *                Oniguruma fork Ruby ships.
 *   3. tokenize  when vscode-textmate and vscode-oniguruma resolve — from the repo's
 *                node_modules, or from a node_modules directory named by SPW_TEXTMATE_MODULES —
 *                tokenize fixture.spw with the real engine and assert the scopes in EXPECT.
 *
 * Usage, from the repository root:
 *   node extensions/vscode-spw/test-fixtures/grammar/check-grammar.mjs
 *   SPW_TEXTMATE_MODULES=<dir>/node_modules node extensions/vscode-spw/test-fixtures/grammar/check-grammar.mjs
 * Exit 1 on any failure.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const HERE = import.meta.dirname
const REPO = path.resolve(HERE, '../../../..')
const GRAMMAR = 'extensions/vscode-spw/syntaxes/spw.tmLanguage.json'
const INTELLIJ = 'extensions/intellij-spw/src/main/resources/textmate/spw.tmLanguage.json'
const SYNC = 'extensions/intellij-spw/scripts/sync-grammar.mjs'
const FIXTURE = path.join(HERE, 'fixture.spw')

/**
 * [line (1-based), needle, expectation]. The needle is found in that fixture line
 * (`nth` picks a later occurrence). `has`: every token over the needle carries each
 * scope (a scope matches itself or any dotted extension). `not`: no token over the
 * needle carries a scope with that prefix. `single`: the needle is exactly one token.
 */
const EXPECT = [
  // Rule 1 — comments: hash-space, hash alone, slash-slash; particles are not comments.
  [1, 'Grammar fixture', { has: ['comment.line.hash.spw'] }],
  [2, '#', { has: ['comment.line.hash.spw'], not: ['keyword'] }],
  [3, '1. numbered', { has: ['comment.line.hash.spw'], not: ['constant', 'punctuation', 'keyword'] }],
  [4, '====', { has: ['comment.line.separator.spw'], not: ['keyword'] }],
  [5, '~sigils .dots and 42', { has: ['comment.line.double-slash.spw'], not: ['keyword', 'constant'] }],
  [6, '# indented', { has: ['comment.line.hash.spw'] }],
  [7, '~"./toc.spw"', { has: ['entity.name.type.path-ref.spw'] }],
  [7, '# trailing hash comment', { has: ['comment.line.hash.spw'], single: true }],
  [8, '#>anchor', { has: ['entity.name.tag.annotation.anchor.spw'], not: ['comment'] }],
  [8, '#:layer', { has: ['entity.name.tag.annotation.lens.spw'], not: ['comment'] }],
  [8, '#!mood', { has: ['entity.name.tag.annotation.intent.spw'], not: ['comment'] }],
  [8, '#', { nth: 4, has: ['keyword.operator.spw.vibration'], not: ['comment'] }],
  // Rule 2 — plan stream entries.
  [9, '>>', { has: ['meta.stream.entry.spw', 'keyword.operator.stream-out.spw'] }],
  [9, '2026-10-12 14:31', { has: ['constant.numeric.date.spw', 'meta.stream.timestamp.spw'], single: true }],
  [9, 'decide', { has: ['keyword.other.stream-action.spw.decide'], single: true }],
  [9, '—', { has: ['punctuation.separator.em-dash.spw'] }],
  [9, 'prose stays quiet: ~x .y #z 42 "q', { has: ['meta.stream.prose.spw'], not: ['keyword', 'constant', 'string', 'comment', 'punctuation'], single: true }],
  [10, '2026-07-27', { has: ['constant.numeric.date.spw'], single: true }],
  [10, 'observe', { has: ['keyword.other.stream-action.spw.observe'] }],
  [10, 'date-only form', { has: ['meta.stream.prose.spw'] }],
  [11, 'commit', { has: ['meta.stream.type.other.spw'], not: ['keyword'] }],
  [12, '"2026-07-27"', { has: ['meta.stream.timestamp.spw'], not: ['constant', 'string'] }],
  [12, '"implement: quoted legacy form"', { has: ['meta.stream.prose.spw'], not: ['keyword', 'string'] }],
  // Rule 3 — commit lines: planned vs landed, hash as commit-ref.
  [13, '~', { has: ['meta.commit.planned.spw', 'keyword.operator.spw.potential'] }],
  [13, 'planned_name', { has: ['meta.commit.planned.spw', 'entity.name.commit.planned.spw'], single: true }],
  [13, '[', { has: ['punctuation.definition.spw.mode'] }],
  [14, '.', { has: ['meta.commit.landed.spw', 'keyword.operator.spw.ground'] }],
  [14, 'landed_name', { has: ['meta.commit.landed.spw', 'entity.name.commit.landed.spw'], single: true }],
  [14, '551bb419', { has: ['constant.other.commit-ref.spw'], not: ['constant.numeric'], single: true }],
  [14, '(', { has: ['punctuation.definition.spw.scene'] }],
  // Rule 4 — tight dots: one identifier; a dot before a word or brace is the ground operator.
  [15, 'hinge.frame.key', { has: ['meta.identifier.qualified.spw'], not: ['punctuation'], single: true }],
  [16, '.', { has: ['keyword.operator.spw.ground', 'keyword.operator.sigil.ground.spw'], single: true }],
  [16, 'door', { has: ['meta.identifier.spw'], single: true }],
  [16, '.', { nth: 2, has: ['keyword.operator.spw.ground'], single: true }],
  // Rule 5 — operator roles (existing sigil scopes kept beside them).
  [17, '~a', { has: ['keyword.operator.sigil.potential.spw', 'keyword.operator.spw.potential'] }],
  [17, '?b', { has: ['keyword.operator.sigil.wonder.spw', 'keyword.operator.spw.wonder'] }],
  [17, '!', { has: ['keyword.operator.sigil.action.spw', 'keyword.operator.spw.action'] }],
  [17, '*', { has: ['keyword.operator.sigil.value.spw', 'keyword.operator.spw.value'] }],
  [17, '^e', { has: ['keyword.operator.sigil.integration.spw', 'keyword.operator.spw.ascension'] }],
  [17, '#', { has: ['keyword.operator.sigil.schema.spw', 'keyword.operator.spw.vibration'] }],
  [17, '@g', { has: ['keyword.operator.sigil.perspective.spw', 'keyword.operator.spw.perspective'] }],
  [17, '&h', { has: ['keyword.operator.sigil.subject.spw', 'keyword.operator.spw.subject'] }],
  [17, '=', { has: ['keyword.operator.sigil.set.spw', 'keyword.operator.spw.configuration'] }],
  [17, '%', { has: ['keyword.operator.sigil.measure.spw', 'keyword.operator.spw.measure'] }],
  [17, '$', { has: ['keyword.operator.sigil.introspection.spw', 'keyword.operator.spw.substrate'] }],
  [17, '<>', { has: ['keyword.operator.spw.coupling'], single: true }],
  [18, '<', { has: ['punctuation.definition.angle.open.spw', 'punctuation.definition.spw.concept'] }],
  [18, '>', { has: ['punctuation.definition.angle.close.spw', 'punctuation.definition.spw.concept'] }],
  [18, '(', { has: ['punctuation.definition.paren.spw', 'punctuation.definition.spw.scene'] }],
  [18, ')', { has: ['punctuation.definition.spw.scene'] }],
  [18, '[', { has: ['punctuation.definition.bracket.spw', 'punctuation.definition.spw.mode'] }],
  [18, '{', { has: ['punctuation.definition.brace.spw', 'punctuation.definition.spw.definition'] }],
  [18, '}', { has: ['punctuation.definition.spw.definition'] }],
  // Strings end at the line end, as the lexer reads them, so the next line's comment holds.
  [19, 'unterminated string', { has: ['string.quoted.double.spw'] }],
  [20, 'still a comment', { has: ['comment.line.hash.spw'], not: ['string'] }],
  [21, '!=', { has: ['keyword.operator.comparison.spw'], not: ['keyword.operator.spw.action'], single: true }],
]

const failures = []
const notes = []
const fail = (message) => failures.push(message)

// ── 1. json ──────────────────────────────────────────────────────────────
function readJson(rel) {
  const file = path.join(REPO, rel)
  if (!existsSync(file)) return fail(`${rel} is missing`)
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return fail(`${rel} is not valid JSON: ${error.message}`)
  }
}
const grammar = readJson(GRAMMAR)
const intellij = readJson(INTELLIJ)
if (grammar && intellij) {
  const sync = spawnSync(process.execPath, [path.join(REPO, SYNC), '--check'], { encoding: 'utf8' })
  if (sync.status !== 0) fail(`IntelliJ copy drifted: ${(sync.stderr || sync.stdout).trim()}`)
  else notes.push('json: both grammars parse; IntelliJ copy matches sync-grammar output')
}

// ── 2. regex ─────────────────────────────────────────────────────────────
/** Collect every regex in the grammar with a readable location. */
function collectRegexes(node, where, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectRegexes(item, `${where}[${i}]`, out))
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (['match', 'begin', 'end', 'while'].includes(key) && typeof value === 'string') {
        out.push({ where: `${where}.${key}`, source: value })
      } else {
        collectRegexes(value, `${where}.${key}`, out)
      }
    }
  }
  return out
}

/** Oniguruma forms JavaScript lacks, rewritten to the nearest JavaScript form. */
function toJavaScript(source) {
  let translated = source
    .replace(/\\h/g, '[0-9A-Fa-f]')
    .replace(/\\A/g, '^')
    .replace(/\\[zZ]/g, '$')
    .replace(/\\G/g, '')
    .replace(/\(\?>/g, '(?:')
    .replace(/([*+?}])\+/g, '$1')
  if (/\(\?[imx-]+[):]/.test(translated)) return null
  return translated
}

if (grammar) {
  const regexes = collectRegexes(grammar, 'grammar', [])
  let translated = 0
  for (const { where, source } of regexes) {
    const js = toJavaScript(source)
    if (js === null) {
      notes.push(`regex: ${where} uses inline Oniguruma options; JavaScript check skipped`)
      continue
    }
    if (js !== source) translated++
    try {
      new RegExp(js, 'u')
    } catch {
      try {
        new RegExp(js)
      } catch (error) {
        fail(`regex ${where} does not compile in JavaScript: ${error.message}\n    ${source}`)
      }
    }
  }
  notes.push(`regex: ${regexes.length} patterns compile under JavaScript RegExp (${translated} after translation)`)

  const ruby = spawnSync('ruby', ['-e', [
    'require "json"',
    'bad = 0',
    'JSON.parse(STDIN.read).each { |r| begin; Regexp.new(r["source"]); rescue RegexpError => e; bad += 1; puts "#{r["where"]}: #{e.message}"; end }',
    'exit(bad.zero? ? 0 : 1)',
  ].join('\n')], { input: JSON.stringify(regexes), encoding: 'utf8' })
  if (ruby.error) notes.push('regex: ruby not found; Onigmo compile check skipped')
  else if (ruby.status !== 0) fail(`regex does not compile under Onigmo (ruby):\n${ruby.stdout}${ruby.stderr}`)
  else notes.push(`regex: ${regexes.length} patterns compile under Onigmo (ruby ${spawnSync('ruby', ['-e', 'print RUBY_VERSION'], { encoding: 'utf8' }).stdout})`)
}

// ── 3. tokenize ──────────────────────────────────────────────────────────
function resolveEngine() {
  const roots = [process.env.SPW_TEXTMATE_MODULES, path.join(REPO, 'node_modules'), path.join(REPO, 'extensions/vscode-spw/node_modules')]
  for (const root of roots.filter(Boolean)) {
    const require = createRequire(path.join(root, 'noop.js'))
    try {
      const textmate = require.resolve('vscode-textmate', { paths: [root] })
      const oniguruma = require.resolve('vscode-oniguruma', { paths: [root] })
      return { require, textmate, oniguruma, root }
    } catch {
      // try the next root
    }
  }
  return null
}

async function tokenizeFixture(engine) {
  const vsctm = engine.require(engine.textmate)
  const onig = engine.require(engine.oniguruma)
  const wasm = readFileSync(path.join(path.dirname(engine.oniguruma), 'onig.wasm')).buffer
  await onig.loadWASM(wasm)
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new onig.OnigScanner(patterns),
      createOnigString: (text) => new onig.OnigString(text),
    }),
    loadGrammar: async (scopeName) => (scopeName === 'source.spw' ? vsctm.parseRawGrammar(readFileSync(path.join(REPO, GRAMMAR), 'utf8'), 'spw.tmLanguage.json') : null),
  })
  const tm = await registry.loadGrammar('source.spw')
  let stack = vsctm.INITIAL
  return readFileSync(FIXTURE, 'utf8').split('\n').map((text) => {
    const result = tm.tokenizeLine(text, stack)
    stack = result.ruleStack
    return { text, tokens: result.tokens }
  })
}

const scopeMatches = (scope, want) => scope === want || scope.startsWith(`${want}.`)

function checkExpectations(lines) {
  for (const [lineNo, needle, spec] of EXPECT) {
    const line = lines[lineNo - 1]
    const label = `line ${lineNo} ${JSON.stringify(needle)}`
    if (!line) { fail(`${label}: fixture has no such line`); continue }
    let start = -1
    for (let n = 0; n < (spec.nth ?? 1); n++) start = line.text.indexOf(needle, start + 1)
    if (start < 0) { fail(`${label}: needle not in fixture line`); continue }
    const end = start + needle.length
    const over = line.tokens.filter((t) => t.startIndex < end && t.endIndex > start)
    const show = () => over.map((t) => `${JSON.stringify(line.text.slice(t.startIndex, t.endIndex))} ${t.scopes.slice(1).join(' ')}`).join(' | ')
    for (const want of spec.has ?? []) {
      if (!over.every((t) => t.scopes.some((s) => scopeMatches(s, want)))) fail(`${label}: expected ${want}; got ${show()}`)
    }
    for (const avoid of spec.not ?? []) {
      if (over.some((t) => t.scopes.some((s) => scopeMatches(s, avoid)))) fail(`${label}: expected no ${avoid}; got ${show()}`)
    }
    if (spec.single && !(over.length === 1 && over[0].startIndex === start && over[0].endIndex === end)) {
      fail(`${label}: expected one token; got ${show()}`)
    }
  }
}

const engine = resolveEngine()
if (!engine) {
  notes.push('tokenize: vscode-textmate/vscode-oniguruma not found; scope assertions UNVERIFIED (set SPW_TEXTMATE_MODULES)')
} else if (grammar) {
  const lines = await tokenizeFixture(engine)
  checkExpectations(lines)
  if (process.argv.includes('--dump')) {
    lines.forEach((line, i) => {
      process.stdout.write(`${i + 1}: ${line.text}\n`)
      for (const t of line.tokens) process.stdout.write(`    ${JSON.stringify(line.text.slice(t.startIndex, t.endIndex))} ${t.scopes.slice(1).join(' ')}\n`)
    })
  }
  notes.push(`tokenize: ${EXPECT.length} scope expectations checked against fixture.spw with vscode-textmate`)
}

for (const note of notes) process.stdout.write(`check-grammar: ${note}\n`)
if (failures.length) {
  for (const message of failures) process.stderr.write(`check-grammar: FAIL ${message}\n`)
  process.exit(1)
}
process.stdout.write('check-grammar: ok\n')
