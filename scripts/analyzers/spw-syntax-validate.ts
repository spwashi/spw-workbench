#!/usr/bin/env tsx
/**
 * Spw Syntax Validator
 *
 * Parses every .spw file through the real Spw parser and reports
 * syntax errors, warnings, and parse health. Connects the doc corpus
 * to the language's own validation pipeline.
 *
 * Usage:
 *   node --import tsx scripts/analyzers/spw-syntax-validate.ts [options] [targets...]
 *
 * Options:
 *   --json             Machine-readable JSON output
 *   --strict           Treat warnings as errors
 *   -v, --verbose      Show passing files
 *   -q, --quiet        Suppress output
 *   --fail-fast        Stop on first error
 *   -e, --exclude <p>  Exclude paths containing substring
 *   -m, --match <p>    Only include paths containing substring
 *   -h, --help         Show help message
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDerivedSurface, parse } from '@spwashi/spw-seed'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileResult {
    file: string
    rel: string
    success: boolean
    tokenCount: number
    errorCount: number
    warningCount: number
    duration: number
    errors: Array<{ line: number; column: number; message: string }>
    warnings: Array<{ line: number; column: number; message: string }>
}

interface Summary {
    totalFiles: number
    passed: number
    failed: number
    warnings: number
    totalTokens: number
    totalDuration: number
    files: FileResult[]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CLIArgs {
    targets: string[]
    json: boolean
    strict: boolean
    verbose: boolean
    quiet: boolean
    failFast: boolean
    help: boolean
    excludes: string[]
    matches: string[]
}

function parseArgs(argv: string[]): CLIArgs {
    const args = argv.slice(2)
    const result: CLIArgs = {
        targets: [], json: false, strict: false,
        verbose: false, quiet: false, failFast: false,
        help: false, excludes: [], matches: []
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg === '--json') { result.json = true; continue }
        if (arg === '--strict') { result.strict = true; continue }
        if (arg === '--verbose' || arg === '-v') { result.verbose = true; continue }
        if (arg === '--quiet' || arg === '-q') { result.quiet = true; continue }
        if (arg === '--fail-fast') { result.failFast = true; continue }
        if (arg === '--help' || arg === '-h') { result.help = true; continue }

        if (arg === '--exclude' || arg === '-e') {
            if (args[i + 1] && !args[i + 1].startsWith('-')) {
                result.excludes.push(args[++i])
            }
            continue
        }
        if (arg.startsWith('--exclude=')) {
            result.excludes.push(arg.substring('--exclude='.length))
            continue
        }

        if (arg === '--match' || arg === '-m') {
            if (args[i + 1] && !args[i + 1].startsWith('-')) {
                result.matches.push(args[++i])
            }
            continue
        }
        if (arg.startsWith('--match=')) {
            result.matches.push(arg.substring('--match='.length))
            continue
        }

        if (!arg.startsWith('-')) {
            result.targets.push(arg)
        }
    }

    if (result.targets.length === 0) {
        result.targets = ['.']
    }

    return result
}

function printHelp(): void {
    console.log(`
Spw Syntax Validator

Usage:
  node --import tsx scripts/analyzers/spw-syntax-validate.ts [options] [targets...]

Targets:
  Files or directories to scan (defaults to current directory).

Options:
  --json              Output results in machine-readable JSON format
  --strict            Treat warnings as errors (exit code 1)
  -v, --verbose       Show all passing files and individual timings
  -q, --quiet         Suppress all output (useful in combination with exit codes)
  --fail-fast         Exit immediately on the first parse error
  -e, --exclude <p>   Exclude paths containing the given substring (can be repeated)
  -m, --match <p>     Only include paths containing the given substring (can be repeated)
  -h, --help          Show this help message

Examples:
  npm run lint:spw                                  # All files
  npm run lint:spw -- docs/theory                   # Only the theory folder
  npm run lint:spw -- --match semantics             # Files mentioning 'semantics'
  npm run lint:spw -- --exclude .agents              # Ignore generated/agent files
  npm run lint:spw -- --fail-fast --strict          # CI fast fail
`)
}

// ---------------------------------------------------------------------------
// File Collection
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', '.agents'])

async function collectSpwFiles(dir: string): Promise<string[]> {
    let entries
    try {
        entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
        return []
    }

    const files: string[] = []

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectSpwFiles(full))
        } else if (entry.isFile() && entry.name.endsWith('.spw') && !isDerivedSurface(entry.name)) {
            files.push(full)
        }
    }

    return files
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function extractMessage(event: { data?: unknown }): string {
    const data = event.data as { message?: string } | undefined
    return data?.message ?? 'Parse error'
}

async function validateFile(filePath: string, repoRoot: string): Promise<FileResult> {
    const content = await fs.readFile(filePath, 'utf8')
    const rel = path.relative(repoRoot, filePath)

    const output = parse(content)

    const errors = output.errors.map(e => ({
        line: e.position.line,
        column: e.position.column,
        message: extractMessage(e),
    }))

    const warnings = output.warnings.map(w => ({
        line: w.position.line,
        column: w.position.column,
        message: extractMessage(w),
    }))

    return {
        file: filePath,
        rel,
        success: output.success,
        tokenCount: output.tokens.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        duration: output.duration,
        errors,
        warnings,
    }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function reportConsole(summary: Summary, verbose: boolean): void {
    const { totalFiles, passed, failed, warnings, totalTokens, totalDuration, files } = summary

    // Failed files
    const failedFiles = files.filter(f => !f.success)
    for (const f of failedFiles) {
        console.error(`\x1b[31m✗\x1b[0m ${f.rel} (${f.errorCount} errors, ${f.tokenCount} tokens, ${f.duration.toFixed(1)}ms)`)
        for (const err of f.errors) {
            console.error(`    \x1b[33m${err.line}:${err.column}\x1b[0m ${err.message}`)
        }
    }

    // Warning files
    const warnFiles = files.filter(f => f.success && f.warningCount > 0)
    if (warnFiles.length > 0) {
        console.warn('')
        for (const f of warnFiles) {
            console.warn(`\x1b[33m⚠\x1b[0m ${f.rel} (${f.warningCount} warnings)`)
            for (const w of f.warnings) {
                console.warn(`    \x1b[33m${w.line}:${w.column}\x1b[0m ${w.message}`)
            }
        }
    }

    // Verbose: show all passing files
    if (verbose) {
        const passedFiles = files.filter(f => f.success && f.warningCount === 0)
        if (passedFiles.length > 0) {
            console.log('')
            for (const f of passedFiles) {
                console.log(`\x1b[32m✓\x1b[0m ${f.rel} (${f.tokenCount} tokens, ${f.duration.toFixed(1)}ms)`)
            }
        }
    }

    // Summary line
    console.log('')
    const statusColor = failed > 0 ? '\x1b[31m' : warnings > 0 ? '\x1b[33m' : '\x1b[32m'
    const statusIcon = failed > 0 ? '✗' : '✓'
    console.log(
        `${statusColor}${statusIcon}\x1b[0m  ` +
        `${totalFiles} files  ` +
        `\x1b[32m${passed} passed\x1b[0m  ` +
        `${failed > 0 ? `\x1b[31m${failed} failed\x1b[0m  ` : ''}` +
        `${warnings > 0 ? `\x1b[33m${warnings} warnings\x1b[0m  ` : ''}` +
        `${totalTokens} tokens  ` +
        `${totalDuration.toFixed(0)}ms`
    )
}

function reportJSON(summary: Summary): void {
    const compact = {
        total: summary.totalFiles,
        passed: summary.passed,
        failed: summary.failed,
        warnings: summary.warnings,
        tokens: summary.totalTokens,
        duration: Math.round(summary.totalDuration),
        failures: summary.files
            .filter(f => !f.success)
            .map(f => ({
                file: f.rel,
                errors: f.errors,
            })),
        warningFiles: summary.files
            .filter(f => f.warningCount > 0)
            .map(f => ({
                file: f.rel,
                warnings: f.warnings,
            })),
    }
    console.log(JSON.stringify(compact, null, 2))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const args = parseArgs(process.argv)

    if (args.help) {
        printHelp()
        return
    }

    const repoRoot = process.cwd()

    // Collect files from all targets
    const allFiles: string[] = []
    for (const target of args.targets) {
        const resolved = path.resolve(repoRoot, target)
        const stat = await fs.stat(resolved)
        if (stat.isDirectory()) {
            allFiles.push(...await collectSpwFiles(resolved))
        } else if (stat.isFile() && resolved.endsWith('.spw')) {
            allFiles.push(resolved)
        }
    }

    if (allFiles.length === 0) {
        if (!args.quiet) console.log('No .spw files found.')
        return
    }

    // Sort for consistent output
    allFiles.sort()

    // Apply filters
    let filteredFiles = allFiles
    if (args.excludes.length > 0) {
        filteredFiles = filteredFiles.filter(f => !args.excludes.some(ex => f.includes(ex)))
    }
    if (args.matches.length > 0) {
        filteredFiles = filteredFiles.filter(f => args.matches.some(m => f.includes(m)))
    }

    if (filteredFiles.length === 0) {
        if (!args.quiet) console.log('No files matched the given filters.')
        return
    }

    // Validate all files
    const results: FileResult[] = []
    for (const file of filteredFiles) {
        try {
            const res = await validateFile(file, repoRoot)
            results.push(res)
            if (args.failFast && !res.success) {
                break
            }
        } catch (err) {
            results.push({
                file,
                rel: path.relative(repoRoot, file),
                success: false,
                tokenCount: 0,
                errorCount: 1,
                warningCount: 0,
                duration: 0,
                errors: [{ line: 0, column: 0, message: `Read/parse crash: ${err}` }],
                warnings: [],
            })
            if (args.failFast) {
                break
            }
        }
    }

    const summary: Summary = {
        totalFiles: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        warnings: results.reduce((sum, r) => sum + r.warningCount, 0),
        totalTokens: results.reduce((sum, r) => sum + r.tokenCount, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        files: results,
    }

    if (!args.quiet) {
        if (args.json) {
            reportJSON(summary)
        } else {
            reportConsole(summary, args.verbose)
        }
    }

    // Exit code
    if (summary.failed > 0) {
        process.exit(1)
    }
    if (args.strict && summary.warnings > 0) {
        process.exit(1)
    }
}

main().catch((err) => {
    console.error('Syntax validation failed:', err)
    process.exit(1)
})
