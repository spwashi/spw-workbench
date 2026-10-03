/**
 * Spw Episode Corpus
 *
 * Reads git history as a Spw corpus. Each commit body may carry one
 * #[episode]{ ~[scene]{} ![change]{} *[verify]{} } block; this parses every
 * block with the seed parser and counts how many are present, parse clean,
 * and carry all three parts. The commit hook only checks that a block
 * exists, so this is the measure of whether history is queryable.
 *
 * Usage: node --import tsx scripts/analyzers/spw-episode-corpus.ts [--failing] [--json] [-- <git log args>]
 *
 * @see docs/design/product/decision-trail.spw — ^["episode_corpus"]
 * @see scripts/commit-review/validate-commit-message.sh
 */

import { execFileSync } from 'node:child_process'
import { parse } from '@spwashi/spw-seed'

const argv = process.argv.slice(2)
const split = argv.indexOf('--')
const flags = new Set(split < 0 ? argv : argv.slice(0, split))
const range = split < 0 ? [] : argv.slice(split + 1)

/** The brace-matched #[episode]{…} block of a commit body, or null. */
function episodeOf(body: string): string | null {
  const start = body.search(/^#\[episode\]\{/m)
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < body.length; i++) {
    if (body[i] === '{') depth++
    else if (body[i] === '}' && --depth === 0) return body.slice(start, i + 1)
  }
  return body.slice(start)
}

const log = execFileSync('git', ['log', '--format=%h%x1f%as%x1f%s%x1f%B%x1e', ...range], { maxBuffer: 1 << 28 }).toString()
const rows = log.split('\x1e').map((r) => r.replace(/^\n/, '')).filter(Boolean).map((r) => {
  const [hash, date, subject, body] = r.split('\x1f')
  const episode = episodeOf(body ?? '')
  if (!episode) return { hash, date, subject, episode: false, clean: false, parts: false, problem: 'no episode block' }
  const out = parse(episode) as any
  const problems = [
    ...(out.errors ?? []).map((e: any) => `error: ${e.data?.message ?? 'unknown'}`),
    ...(out.warnings ?? []).map((w: any) => `warning: ${w.data?.message ?? 'unknown'}`),
    ...(out.completeness?.proseFallback ? ['degraded to prose'] : []),
  ]
  const parts = ['~[scene]', '![change]', '*[verify]'].every((p) => episode.includes(p))
  return { hash, date, subject, episode: true, clean: out.success && problems.length === 0, parts, problem: problems[0] ?? '' }
})

const summary = {
  commits: rows.length,
  first: rows.at(-1)?.date ?? '',
  last: rows[0]?.date ?? '',
  with_episode: rows.filter((r) => r.episode).length,
  parse_clean: rows.filter((r) => r.clean).length,
  all_three_parts: rows.filter((r) => r.clean && r.parts).length,
}

if (flags.has('--json')) {
  console.log(JSON.stringify({ summary, failing: flags.has('--failing') ? rows.filter((r) => r.episode && !r.clean) : undefined }, null, 1))
} else {
  console.log(`${summary.commits} commits, ${summary.first} to ${summary.last}`)
  console.log(`${summary.with_episode} carry an episode block; ${summary.parse_clean} parse clean; ${summary.all_three_parts} parse clean with scene, change, and verify`)
  if (flags.has('--failing')) for (const r of rows.filter((x) => x.episode && !x.clean)) console.log(`  ${r.hash} ${r.date} ${r.problem} — ${r.subject}`)
}
