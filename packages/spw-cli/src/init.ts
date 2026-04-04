import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'
import { inspectDoctorTarget, printDoctorReport } from './doctor'
import { applyPresetDefaults, inferSitePreset, parseSitePreset, type SitePreset } from './init-presets'

const green = (str: string) => `\x1b[32m${str}\x1b[0m`
const bold = (str: string) => `\x1b[1m${str}\x1b[0m`
const dim = (str: string) => `\x1b[2m${str}\x1b[0m`
const execFileAsync = promisify(execFile)
const WORKBENCH_GIT_URL = 'https://github.com/spwashi/spw-workbench'

const INIT_TEMPLATE_ROOTS = {
  source: 'packages/spw-cli/templates/init',
  dist: 'templates/init',
} as const

const COMMIT_HOOK_MARKER = 'spw-hook-runtime-resolver-v1'
const REVIEW_SCRIPT_REL = '.agents/skills/spw-commit-review/scripts/poll-review.sh'
const REVIEW_LIB_REL = 'scripts/spw-lib.sh'

export type InitRuntimeContext = {
  mode: 'source' | 'dist'
  packageRoot: string
  templateRoot: string
  toolRoot: string
}

type CopyDirOptions = {
  overwrite?: boolean
}

type HookInstallStatus = 'installed' | 'updated' | 'skipped'

type InitCliOptions = {
  targetDir: string
  preset?: SitePreset
  bootstrap: boolean
}

export async function runSpwInitCli(argv: string[]): Promise<void> {
  const common = parseCommonFlags(normalizeInitArgs(argv))
  const options = parseInitOptions(common.args)

  if (common.flags.help) {
    printInitUsage()
    return
  }

  const runtime = await resolveInitRuntimeContext()
  await installWorkbench(options, runtime)
}

export function printInitUsage(): void {
  printHelpPage({
    title: 'Spw Init',
    usage: [
      'spw init [target-directory]',
      'npm run spw -- init [target-directory]',
      'npm run spw:init -- [target-directory]',
    ],
    sections: [
      {
        title: 'Compatibility',
        lines: [
          'spw install [target-directory]',
          'npm run spw -- install [target-directory]',
          'npm run spw:install -- [target-directory]',
        ],
      },
      {
        title: 'Scaffolds',
        lines: [
          '.spw/index.spw              routing table and surface registry',
          '.spw/mount.spw              studio binding and deployment targets',
          '.spw/workspace.spw          workspace roots and LSP configuration',
          '.spw/origin.spw             generative seed and chromatic palette',
          '.spw/containers.spw         chunking scheme and CSS container mapping',
          '.spw/anchors.spw            cultural precipitation and merchandise readiness',
          '.agents/workflows/commit-review.md',
          '.git/hooks/pre-commit (portable resolver when target is a git repo)',
        ],
      },
      {
        title: 'Options',
        lines: [
          '--bootstrap          initialize git, add .spw/_workbench, and install dependencies when possible',
          '--preset show               show scaffold with studio awareness and season layers',
          '--preset installable-book   alias for show',
          '--preset lore-land          alias for show',
        ],
      },
      {
        title: 'Interop review roots',
        lines: [
          '.spw/_workbench',
          'node_modules/spw-workbench',
          '$SPW_WORKBENCH_ROOT',
        ],
      },
    ],
  })
}

function normalizeInitArgs(argv: string[]): string[] {
  const args = argv.slice(2)
  const [head, ...rest] = args
  if (head === 'init' || head === 'install') return rest
  return args
}

function parseInitOptions(args: string[]): InitCliOptions {
  let targetDir = '.'
  let preset: SitePreset | undefined
  let bootstrap = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--bootstrap') {
      bootstrap = true
      continue
    }
    if (arg === '--preset') {
      const value = args[i + 1]
      if (!value) throw new Error('missing value for --preset')
      preset = parseSitePreset(value)
      i++
      continue
    }
    if (arg.startsWith('--preset=')) {
      preset = parseSitePreset(arg.slice('--preset='.length))
      continue
    }
    if (!arg.startsWith('--')) {
      targetDir = arg
    }
  }

  return { targetDir, preset, bootstrap }
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyDir(src: string, dest: string, options: CopyDirOptions = {}): Promise<void> {
  if (!(await exists(src))) return

  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, options)
      continue
    }

    if (!options.overwrite && (await exists(destPath))) {
      continue
    }

    await fs.copyFile(srcPath, destPath)
  }
}

export async function resolveInitRuntimeContext(fromUrl: string = import.meta.url): Promise<InitRuntimeContext> {
  const startDir = path.dirname(fileURLToPath(fromUrl))

  for (const candidate of ascendDirs(startDir)) {
    const sourceTemplateRoot = path.join(candidate, INIT_TEMPLATE_ROOTS.source)
    const sourceEntry = path.join(candidate, 'packages/spw-cli/src/init.ts')
    if ((await exists(path.join(sourceTemplateRoot, 'base'))) && (await exists(sourceEntry))) {
      return {
        mode: 'source',
        packageRoot: candidate,
        templateRoot: sourceTemplateRoot,
        toolRoot: candidate,
      }
    }

    const distTemplateRoot = path.join(candidate, INIT_TEMPLATE_ROOTS.dist)
    const distEntry = path.join(candidate, 'bin/spw.js')
    if ((await exists(path.join(distTemplateRoot, 'base'))) && (await exists(distEntry))) {
      return {
        mode: 'dist',
        packageRoot: candidate,
        templateRoot: distTemplateRoot,
        toolRoot: candidate,
      }
    }
  }

  throw new Error('unable to locate spw init templates from the current runtime')
}

function ascendDirs(startDir: string): string[] {
  const dirs: string[] = []
  let current = path.resolve(startDir)

  while (true) {
    dirs.push(current)
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return dirs
}

function escapeForBashDoubleQuotes(value: string): string {
  return value.replace(/["\\`$]/g, '\\$&')
}

export function renderCommitHookContent(toolRoot: string): string {
  const fallbackToolRoot = escapeForBashDoubleQuotes(toolRoot)

  return `#!/bin/bash
# Spw Commit Review Gate
# ${COMMIT_HOOK_MARKER}
set -euo pipefail

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
SCRIPT_REL="${REVIEW_SCRIPT_REL}"
LIB_REL="${REVIEW_LIB_REL}"
FALLBACK_TOOL_ROOT="${fallbackToolRoot}"

candidates=()
if [ -n "\${SPW_WORKBENCH_ROOT:-}" ]; then
  candidates+=("\${SPW_WORKBENCH_ROOT}")
fi
candidates+=("$REPO_ROOT/.spw/_workbench" "$REPO_ROOT/node_modules/spw-workbench" "$FALLBACK_TOOL_ROOT")

for tool_root in "\${candidates[@]}"; do
  [ -n "$tool_root" ] || continue
  if [ -f "$tool_root/$SCRIPT_REL" ] && [ -f "$tool_root/$LIB_REL" ]; then
    SPW_REPO_ROOT_OVERRIDE="$REPO_ROOT" \\
    SPW_TOOL_ROOT_OVERRIDE="$tool_root" \\
    bash "$tool_root/$SCRIPT_REL" --scope=staged
    exit $?
  fi
done

cat >&2 <<'EOF'
Spw commit-review hook is installed, but no compatible workbench root was found.
Expected one of:
  - .spw/_workbench
  - node_modules/spw-workbench
  - SPW_WORKBENCH_ROOT=<path>
EOF
exit 1
`
}

async function ensureHook(targetRepoPath: string, toolRoot: string): Promise<HookInstallStatus> {
  const hookPath = path.join(targetRepoPath, '.git', 'hooks', 'pre-commit')
  const hookDir = path.dirname(hookPath)

  if (!(await exists(hookDir))) {
    return 'skipped'
  }

  const hookContent = renderCommitHookContent(toolRoot)

  if (await exists(hookPath)) {
    const existing = await fs.readFile(hookPath, 'utf8')
    if (existing.includes(COMMIT_HOOK_MARKER)) {
      return 'installed'
    }
    if (existing.includes('Spw Commit Review Gate') || existing.includes('spw-commit-review')) {
      await fs.writeFile(hookPath, hookContent)
      await fs.chmod(hookPath, 0o755)
      return 'updated'
    }
    await fs.appendFile(hookPath, `\n${hookContent.replace('#!/bin/bash\n', '')}`)
    await fs.chmod(hookPath, 0o755)
    return 'installed'
  }

  await fs.writeFile(hookPath, hookContent)
  await fs.chmod(hookPath, 0o755)
  return 'installed'
}

async function installPortableScaffold(targetAbs: string, templateRoot: string): Promise<void> {
  await copyDir(path.join(templateRoot, 'base'), targetAbs)
}

export async function seedSiteScaffold(
  targetAbs: string,
  runtime: InitRuntimeContext,
  options: { preset?: SitePreset } = {},
): Promise<{ preset: SitePreset }> {
  await fs.mkdir(targetAbs, { recursive: true })
  await installPortableScaffold(targetAbs, runtime.templateRoot)
  const preset = inferSitePreset(targetAbs, options.preset)
  await applyPresetDefaults(targetAbs, runtime.templateRoot, preset)
  return { preset }
}

export async function applyDoctorFixes(targetDir: string): Promise<void> {
  const runtime = await resolveInitRuntimeContext()
  const targetAbs = path.resolve(process.cwd(), targetDir)
  await seedSiteScaffold(targetAbs, runtime)
  await ensureHook(targetAbs, runtime.toolRoot)
}

async function installWorkbench(options: InitCliOptions, runtime: InitRuntimeContext): Promise<void> {
  const targetAbs = path.resolve(process.cwd(), options.targetDir)
  if (options.bootstrap) {
    await bootstrapSite(targetAbs)
  }

  const workbenchRoot = path.join(targetAbs, '.spw', '_workbench')
  const hasWorkbench = await exists(workbenchRoot)
  const hasWorkbenchDependencies = hasWorkbench && await exists(path.join(workbenchRoot, 'node_modules'))
  console.log(`\n${bold('Spw Init')}\nTarget: ${dim(targetAbs)}\n`)

  const seeded = await seedSiteScaffold(targetAbs, runtime, { preset: options.preset })
  console.log(` ${green('✓')} Portable site scaffold seeded (.spw/index.spw, .spw/workspace.spw, .spw/mount.spw)`)
  if (seeded.preset !== 'default') {
    console.log(` ${green('✓')} Applied ${seeded.preset} preset scaffold`)
  }
  console.log(` ${green('✓')} Review workflow note installed (.agents/workflows/commit-review.md)`)

  const hookStatus = await ensureHook(targetAbs, runtime.toolRoot)
  if (hookStatus === 'skipped') {
    console.log(` ${dim('-')} Skipped commit gate (target is not a git repository)`)
  } else {
    const action = hookStatus === 'updated' ? 'updated' : 'armed'
    console.log(` ${green('✓')} Portable commit gate ${action} via .git/hooks/pre-commit`)
    console.log(
      ` ${dim('-')} Review tooling resolves from .spw/_workbench, node_modules/spw-workbench, $SPW_WORKBENCH_ROOT, or the current ${runtime.mode} runtime`,
    )
  }

  if (hasWorkbench) {
    console.log(` ${green('✓')} Found .spw/_workbench`)
  } else {
    console.log(` ${dim('-')} No .spw/_workbench detected yet`)
    console.log(` ${dim('-')} Add it with: git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench`)
  }

  if (hasWorkbench && !hasWorkbenchDependencies) {
    console.log(` ${dim('-')} Install workbench dependencies: cd .spw/_workbench && npm install`)
  }

  const report = await inspectDoctorTarget(targetAbs)

  console.log(`\n${bold(green('Init Complete.'))}`)
  printDoctorReport(report)
  console.log('Suggested next steps:')
  if (report.status === 'ok') {
    console.log('  1. Open the site root in your editor')
    console.log('  2. Run: npm --prefix .spw/_workbench run spw -- help')
  } else if (!hasWorkbench) {
    console.log('  1. git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench')
    console.log('  2. cd .spw/_workbench && npm install')
    console.log('  3. cd .spw/_workbench && npm run spw:doctor -- ../..')
  } else if (!hasWorkbenchDependencies) {
    console.log('  1. cd .spw/_workbench && npm install')
    console.log('  2. cd .spw/_workbench && npm run spw:doctor -- ../..')
  } else {
    console.log('  1. cd .spw/_workbench && npm run spw:doctor -- ../..')
  }
  console.log('')
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

async function bootstrapSite(targetAbs: string): Promise<void> {
  await fs.mkdir(targetAbs, { recursive: true })
  const gitDir = path.join(targetAbs, '.git')
  if (!(await exists(gitDir))) {
    await runCommand('git', ['init'], targetAbs)
  }

  const workbenchRoot = path.join(targetAbs, '.spw', '_workbench')
  const workbenchPackage = path.join(workbenchRoot, 'package.json')
  if (!(await exists(workbenchRoot))) {
    await ensureDir(path.join(targetAbs, '.spw'))
    await runCommand('git', ['submodule', 'add', WORKBENCH_GIT_URL, '.spw/_workbench'], targetAbs)
  } else if (!(await exists(workbenchPackage))) {
    await runCommand('git', ['submodule', 'update', '--init', '--recursive', '.spw/_workbench'], targetAbs)
  }

  if (await exists(workbenchRoot) && !(await exists(path.join(workbenchRoot, 'node_modules')))) {
    await runCommand(npmExecutable(), ['install'], workbenchRoot)
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  try {
    await execFileAsync(command, args, { cwd })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}: ${message}`)
  }
}

function npmExecutable(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}
