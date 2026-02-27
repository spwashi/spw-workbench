import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

interface ServerTarget {
    scriptPath: string
    workDir: string
    source: 'env' | 'local' | 'lore-remote'
}

function resolveWorkDirFromScript(scriptPath: string): string {
    let current = path.dirname(scriptPath)
    for (let i = 0; i < 6; i += 1) {
        const packageJson = path.join(current, 'package.json')
        if (existsSync(packageJson)) {
            return current
        }
        const next = path.dirname(current)
        if (next === current) break
        current = next
    }
    return process.cwd()
}

function isRemoteGitUrl(value: string): boolean {
    return (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('ssh://') ||
        value.startsWith('git@')
    )
}

function resolveLoreRemoteRoot(baseDir: string): string | null {
    const probe = spawnSync('git', ['-C', baseDir, 'config', '--get', 'remote.lore.url'], {
        encoding: 'utf8',
    })
    if (probe.status !== 0) return null

    const raw = probe.stdout.trim()
    if (!raw || isRemoteGitUrl(raw)) return null

    if (raw.startsWith('file://')) {
        try {
            const parsed = new URL(raw)
            const absolute = fileURLToPath(parsed)
            return existsSync(absolute) ? absolute : null
        } catch {
            return null
        }
    }

    const absolute = path.isAbsolute(raw) ? raw : path.resolve(baseDir, raw)
    return existsSync(absolute) ? absolute : null
}

function resolveServerTarget(baseDir: string): ServerTarget | null {
    const explicit = process.env.SPW_LSP_SERVER_PATH?.trim()
    if (explicit) {
        const absolute = path.isAbsolute(explicit) ? explicit : path.resolve(baseDir, explicit)
        if (existsSync(absolute)) {
            return { scriptPath: absolute, workDir: resolveWorkDirFromScript(absolute), source: 'env' }
        }
    }

    const local = path.join(baseDir, 'scripts', 'lsp', 'stdio-server.ts')
    if (existsSync(local)) {
        return { scriptPath: local, workDir: baseDir, source: 'local' }
    }

    const loreRoot = resolveLoreRemoteRoot(baseDir)
    if (!loreRoot) return null

    const loreScript = path.join(loreRoot, 'scripts', 'lsp', 'stdio-server.ts')
    if (!existsSync(loreScript)) return null

    return { scriptPath: loreScript, workDir: loreRoot, source: 'lore-remote' }
}

const cwd = process.cwd()
const selfPath = fileURLToPath(import.meta.url)
const target = resolveServerTarget(cwd)

if (!target) {
    console.error('Spw LSP bridge could not resolve a server entrypoint.')
    console.error('Checked: SPW_LSP_SERVER_PATH, ./scripts/lsp/stdio-server.ts, and git remote.lore.url.')
    process.exit(1)
}

if (path.resolve(target.scriptPath) === path.resolve(selfPath)) {
    console.error(`Spw LSP bridge resolved to itself (${selfPath}), refusing to recurse.`)
    process.exit(1)
}

const child = spawn(process.execPath, ['--import', 'tsx', target.scriptPath], {
    cwd: target.workDir,
    env: {
        ...process.env,
        SPW_LSP_SOURCE: target.source,
    },
    stdio: 'inherit',
})

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal)
        return
    }
    process.exit(code ?? 0)
})
