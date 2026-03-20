#!/usr/bin/env tsx

/**
 * Spw Workbench Installer
 *
 * Scaffolds the .spw semantic kernel, agent skills, and biometric 
 * commit gate into a target repository. 
 *
 * Usage:
 *   npx spw-workbench install <target-directory>
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// Resolve paths (accounting for execution via TSX or compiled JS)
const __filename = process.argv[1] ? path.resolve(process.argv[1]) : fileURLToPath(import.meta.url)
const workbenchRoot = path.resolve(path.dirname(__filename), '..')

// Formatting utilities
const green = (str: string) => `\x1b[32m${str}\x1b[0m`
const bold = (str: string) => `\x1b[1m${str}\x1b[0m`
const dim = (str: string) => `\x1b[2m${str}\x1b[0m`
const err = (str: string) => `\x1b[31;1m${str}\x1b[0m`

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function copyDir(src: string, dest: string) {
  if (!(await exists(src))) return
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

async function ensureHook(targetRepoPath: string) {
  const hookPath = path.join(targetRepoPath, '.git', 'hooks', 'pre-commit')
  const hookDir = path.dirname(hookPath)
  
  if (!(await exists(hookDir))) {
    // Not a git repo, skip hook installation
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

async function install(targetDir: string) {
  const targetAbs = path.resolve(process.cwd(), targetDir)
  console.log(`\n${bold('Spw Workbench Installation')}\nTarget: ${dim(targetAbs)}\n`)

  await fs.mkdir(targetAbs, { recursive: true })

  // 1. Scaffold Kernel
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

  // 2. Deploy Agents
  const agentsDir = path.join(targetAbs, '.agents')
  const skillsDest = path.join(agentsDir, 'skills', 'spw-commit-review')
  const worksflowDest = path.join(agentsDir, 'workflows')
  
  await fs.mkdir(skillsDest, { recursive: true })
  await fs.mkdir(worksflowDest, { recursive: true })

  const sourceSkill = path.join(workbenchRoot, '.agents', 'skills', 'spw-commit-review')
  const sourceWorkflow = path.join(workbenchRoot, '.agents', 'workflows', 'commit-review.md')

  await copyDir(sourceSkill, skillsDest)
  if (await exists(sourceWorkflow)) {
    await fs.copyFile(sourceWorkflow, path.join(worksflowDest, 'commit-review.md'))
  }
  console.log(` ${green('✓')} Agent affordances deployed (.agents)`)

  // 3. Git Hooks
  const hooksArmed = await ensureHook(targetAbs)
  if (hooksArmed) {
    console.log(` ${green('✓')} Biometric Commit Gate armed via .git/hooks/pre-commit`)
  } else {
    console.log(` ${dim('-')} Skipped commit gate (target is not a git repository)`)
  }

  console.log(`\n${bold(green('Installation Complete.'))}\nThe semantic tree is ready to grow.\n`)
}

const target = process.argv[2] || '.'
install(target).catch(e => {
  console.error(`\n ${err('✗')} Installation Failed: ${e.message}\n`)
  process.exit(1)
})
