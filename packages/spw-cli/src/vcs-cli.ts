/**
 * spw vcs — what the version-control system holds, and a command run at a revision.
 *
 *   spw vcs                     kind, root, head, default branch, and every changed or untracked path with its age
 *   spw vcs --since 2h          only paths changed on disk in the last two hours (or since 21:30): what this session touched
 *   spw vcs at <rev> -- <cmd>   run a command in a clean checkout of <rev>, then remove the checkout
 *
 * The adapter is vcs.ts.
 */

import { VCS_SCHEMA, at, defaultBranch, detectVcs, gitReady, head, status, type StatusEntry } from './vcs'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { meta } from './view'

export function printVcsHelp(): void {
  printHelpPage({
    title: 'Spw VCS — what version control holds here, and a command run at a revision',
    usage: [
      'spw vcs [--since <30m|2h|1d|HH:MM>] [--json]',
      'spw vcs at <rev> [--keep] -- <command> [args…]',
      'spw vcs at HEAD -- node --import tsx scripts/release/build-parser-release.ts --release 2026.11.13 --out {origin}/release/parser',
    ],
    sections: [
      {
        title: 'Status',
        lines: [
          'Kind (git, jj, none), root, head and its branch, the default branch, then every changed or untracked path, staged or not, with how long ago it changed on disk.',
          '--since <when>         Only paths changed since then: 30m, 2h, 1d, or a clock time today (21:30). Other sessions\' files fall away, which is what to stage.',
          '--json                 Everything as JSON',
        ],
      },
      {
        title: 'At a revision',
        lines: [
          'at <rev> -- <command>  Check out <rev> clean under .claude/worktrees/, run the command there, remove the checkout. Exits with the command\'s code.',
          '                       Untracked and uncommitted files in this checkout do not reach it, so a build or a test reads exactly <rev>.',
          '                       @spwashi/* packages resolve to the checkout\'s own copies; other dependencies come from this checkout\'s node_modules.',
          '{origin} / {checkout}  Replaced in the command\'s arguments with this workspace\'s root and the checkout\'s; also SPW_VCS_ORIGIN, SPW_VCS_CHECKOUT, SPW_VCS_REVISION.',
          '--keep                 Leave the checkout and print where it is (remove it with git worktree remove).',
        ],
      },
      {
        title: 'jj',
        lines: [
          'A .jj workspace is detected. With a .git beside it (colocated) everything here works through git; without one, the gaps are named. jj has no commit hooks, so the commit gate runs only through git.',
        ],
      },
    ],
  })
}

/** 30m, 2h, 1d, or a clock time today (21:30); null when unreadable. */
export function readSince(text: string, now = new Date()): Date | null {
  const span = text.match(/^(\d+(?:\.\d+)?)(m|h|d)$/)
  if (span) return new Date(now.getTime() - Number(span[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[span[2] as 'm' | 'h' | 'd'])
  const clock = text.match(/^(\d{1,2}):(\d{2})$/)
  if (clock) {
    const at = new Date(now)
    at.setHours(Number(clock[1]), Number(clock[2]), 0, 0)
    return at
  }
  return null
}

const age = (modified: Date | null, now: Date): string => {
  if (!modified) return 'gone'
  const minutes = Math.max(0, Math.round((now.getTime() - modified.getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

export async function runSpwVcsCli(args: string[]): Promise<void> {
  const vcs = detectVcs(process.cwd())
  if (args[0] === 'at') {
    const split = args.indexOf('--')
    const before = split >= 0 ? args.slice(1, split) : args.slice(1)
    const command = split >= 0 ? args.slice(split + 1) : []
    const rev = before.find((a) => !a.startsWith('--'))
    if (!rev) throw new Error('spw vcs at: name a revision: spw vcs at HEAD -- <command>')
    const keep = before.includes('--keep')
    const result = await at(vcs, rev, command, { keep })
    meta(`# spw vcs at ${result.revision.slice(0, 12)}  exit=${result.exitCode}${result.kept ? `  kept at ${result.checkout}` : ''}`)
    process.exitCode = result.exitCode
    return
  }

  const now = new Date()
  const sinceAt = args.indexOf('--since')
  const since = sinceAt >= 0 ? readSince(args[sinceAt + 1] ?? '', now) : null
  if (sinceAt >= 0 && !since) throw new Error(`spw vcs: --since takes 30m, 2h, 1d or a clock time, not ${JSON.stringify(args[sinceAt + 1] ?? '')}`)

  const ready = gitReady(vcs)
  const headInfo = ready ? head(vcs.root) : null
  const entries: StatusEntry[] = ready ? status(vcs.root) : []
  const shown = since ? entries.filter((e) => e.modified && e.modified >= since) : entries
  const data = {
    schema: VCS_SCHEMA,
    kind: vcs.kind,
    root: vcs.root,
    colocated: vcs.colocated,
    head: headInfo,
    defaultBranch: ready ? defaultBranch(vcs.root) : null,
    since: since?.toISOString() ?? null,
    paths: shown.map((e) => ({ path: e.path, code: e.code, tracked: e.tracked, staged: e.staged, modified: e.modified?.toISOString() ?? null })),
    gaps: vcs.gaps,
  }
  if (args.includes('--json')) {
    console.log(formatJsonEnvelope('vcs', data, { paths: shown.length, of: entries.length }))
    return
  }
  const tracked = shown.filter((e) => e.tracked).length
  meta(`# spw vcs  ${vcs.kind}${vcs.colocated ? ' (colocated with git)' : ''}  root=${vcs.root ?? '-'}${headInfo ? `  head=${headInfo.short}${headInfo.branch ? ` (${headInfo.branch})` : ' (detached)'}` : ''}${data.defaultBranch ? `  default=${data.defaultBranch}` : ''}`)
  console.log(`${shown.length} path${shown.length === 1 ? '' : 's'}${since ? ` changed since ${since.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}: ${tracked} tracked, ${shown.length - tracked} untracked${since ? ` (${entries.length - shown.length} older left out)` : ''}`)
  for (const e of shown) console.log(`  ${e.code.replace(/ /g, '.')}  ${age(e.modified, now).padStart(4)}  ${e.path}`)
  for (const gap of vcs.gaps) console.log(`gap: ${gap}`)
}
