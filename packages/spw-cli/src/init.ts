import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const green = (str: string) => `\x1b[32m${str}\x1b[0m`
const bold = (str: string) => `\x1b[1m${str}\x1b[0m`
const dim = (str: string) => `\x1b[2m${str}\x1b[0m`

const workbenchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export async function runSpwInitCli(argv: string[]): Promise<void> {
  const args = normalizeInitArgs(argv)

  if (args.includes('--help') || args.includes('-h')) {
    printInitUsage()
    return
  }

  const targetDir = args.find((arg) => !arg.startsWith('--')) ?? '.'
  await installWorkbench(targetDir)
}

export function printInitUsage(): void {
  console.log(`
Spw Init

Usage:
  spw init [target-directory]
  npm run spw -- init [target-directory]
  npm run spw:init -- [target-directory]

Compatibility:
  spw install [target-directory]
  npm run spw -- install [target-directory]
  npm run spw:install -- [target-directory]

Scaffolds:
  .spw/workspace.spw
  .spw/index.spw
  .agents/skills/spw-commit-review
  .agents/workflows/commit-review.md
  .git/hooks/pre-commit (when target is a git repo)
`)
}

function normalizeInitArgs(argv: string[]): string[] {
  const args = argv.slice(2)
  const [head, ...rest] = args
  if (head === 'init' || head === 'install') return rest
  return args
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  if (!(await exists(src))) return

  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
      continue
    }

    await fs.copyFile(srcPath, destPath)
  }
}

async function ensureHook(targetRepoPath: string): Promise<boolean> {
  const hookPath = path.join(targetRepoPath, '.git', 'hooks', 'pre-commit')
  const hookDir = path.dirname(hookPath)

  if (!(await exists(hookDir))) {
    return false
  }

  const hookContent = `#!/bin/bash
# Spw Commit Review Gate
# Redirects commit authorization to the local Spw agent skill.

bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged || exit 1
`

  if (await exists(hookPath)) {
    const existing = await fs.readFile(hookPath, 'utf8')
    if (!existing.includes('spw-commit-review')) {
      await fs.appendFile(hookPath, `\n${hookContent.replace('#!/bin/bash\n', '')}`)
    }
  } else {
    await fs.writeFile(hookPath, hookContent)
  }

  await fs.chmod(hookPath, 0o755)
  return true
}

async function installWorkbench(targetDir: string): Promise<void> {
  const targetAbs = path.resolve(process.cwd(), targetDir)
  console.log(`\n${bold('Spw Init')}\nTarget: ${dim(targetAbs)}\n`)

  await fs.mkdir(targetAbs, { recursive: true })

  const spwDir = path.join(targetAbs, '.spw')
  await fs.mkdir(spwDir, { recursive: true })

  const workspaceDoc = `# Workspace Kernel\n#\n#>workspace_root\n#:kernel\n\n^"roots"{\n  @spw: ~"."\n}\n\n^"settings"{\n  ~#language: "spw"\n  ~#dialect: "v0.2.0-alpha"\n}\n`
  const indexDoc = `# Index\n#\n#>spw_index\n#:index\n\n^"dispatch"{\n  workspace: @workspace\n}\n`

  if (!(await exists(path.join(spwDir, 'workspace.spw')))) {
    await fs.writeFile(path.join(spwDir, 'workspace.spw'), workspaceDoc)
  }
  if (!(await exists(path.join(spwDir, 'index.spw')))) {
    await fs.writeFile(path.join(spwDir, 'index.spw'), indexDoc)
  }
  console.log(` ${green('✓')} Semantic Kernel seeded via .spw/workspace.spw`)

  const agentsDir = path.join(targetAbs, '.agents')
  const skillsDest = path.join(agentsDir, 'skills', 'spw-commit-review')
  const workflowDest = path.join(agentsDir, 'workflows')

  await fs.mkdir(skillsDest, { recursive: true })
  await fs.mkdir(workflowDest, { recursive: true })

  const sourceSkill = path.join(workbenchRoot, '.agents', 'skills', 'spw-commit-review')
  const sourceWorkflow = path.join(workbenchRoot, '.agents', 'workflows', 'commit-review.md')

  await copyDir(sourceSkill, skillsDest)
  if (await exists(sourceWorkflow)) {
    await fs.copyFile(sourceWorkflow, path.join(workflowDest, 'commit-review.md'))
  }
  console.log(` ${green('✓')} Agent affordances deployed (.agents)`)

  const hooksArmed = await ensureHook(targetAbs)
  if (hooksArmed) {
    console.log(` ${green('✓')} Biometric Commit Gate armed via .git/hooks/pre-commit`)
  } else {
    console.log(` ${dim('-')} Skipped commit gate (target is not a git repository)`)
  }

  console.log(`\n${bold(green('Init Complete.'))}\nThe semantic tree is ready to grow.\n`)
}
