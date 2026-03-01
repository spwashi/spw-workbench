/**
 * Stage-Stepping Pipeline
 *
 * A generator-based pipeline that yields a Precipitant per transformation pass.
 * Each precipitant captures what "fell out" of the stage — input, output,
 * register snapshot, and a human-readable delta summary.
 *
 * Vocabulary:
 *   Stage       — a named transformation pass (desugar, parse, normalize, interpret)
 *   Precipitant — the artifact produced by a stage
 *   Projection  — a view of one stage's output through another stage's lens
 *
 * @spw:portable - No DOM or app-specific imports allowed
 */

import type { SeedNode } from '../../seed/types'
import type { ONFNode } from '../../seed/types/ast/onf'
import type { ParseOutput } from '../../seed/parser'
import type { RegisterSnapshot, RuntimeValue } from '../state/types'
import type { RuntimeInterpretation, RuntimeInterpreterOptions } from '../interpreter/types'
import { parse } from '../../seed/parser'
import { desugar, normalizeToONF } from '../../seed/normalize'
import { interpretSeed } from '../interpreter/interpreter'
import { RegisterBank } from '../state/register-bank'
import type { RunSpwOptions, RunSpwResult, RuntimeIssue } from './types'

// ── Stage Names ─────────────────────────────────────────────────

export type StageName = 'desugar' | 'parse' | 'normalize' | 'interpret'

export const STAGE_ORDER: readonly StageName[] = [
    'desugar',
    'parse',
    'normalize',
    'interpret',
] as const

// ── Precipitant ─────────────────────────────────────────────────

/**
 * A precipitant is what falls out of a transformation stage.
 * Each stage produces exactly one precipitant.
 */
export interface Precipitant<T = unknown> {
    /** Which stage produced this */
    stage: StageName
    /** ISO timestamp of completion */
    at: string
    /** What went into the stage */
    input: unknown
    /** What fell out */
    output: T
    /** Register state snapshot after this stage (only for interpret) */
    registersAfter?: RegisterSnapshot
    /** Human-readable summary of what changed */
    delta: string
}

/**
 * A projection is a collection of precipitants keyed by stage.
 * Allows cross-stage comparison of the same source.
 */
export type PipelineProjection = {
    [K in StageName]?: Precipitant
}

// ── Typed Precipitants ──────────────────────────────────────────

export interface DesugarPrecipitant extends Precipitant<string> {
    stage: 'desugar'
    input: string
    output: string
}

export interface ParsePrecipitant extends Precipitant<ParseOutput<SeedNode>> {
    stage: 'parse'
    input: string
    output: ParseOutput<SeedNode>
}

export interface NormalizePrecipitant extends Precipitant<ONFNode> {
    stage: 'normalize'
    input: SeedNode
    output: ONFNode
}

export interface InterpretPrecipitant extends Precipitant<RuntimeValue> {
    stage: 'interpret'
    input: ONFNode
    output: RuntimeValue
    registersAfter: RegisterSnapshot
}

export type AnyPrecipitant =
    | DesugarPrecipitant
    | ParsePrecipitant
    | NormalizePrecipitant
    | InterpretPrecipitant

// ── Helpers ─────────────────────────────────────────────────────

function nowIso(): string {
    return new Date().toISOString()
}

function parseIssueMessage(event: { data?: unknown }): string {
    const data = event.data as { message?: string } | undefined
    return data?.message ?? 'Parse error'
}

function summarizeDesugar(input: string, output: string): string {
    if (input === output) return 'no sugar rewrites applied'
    const lenDiff = output.length - input.length
    const sign = lenDiff >= 0 ? '+' : ''
    return `desugared (${sign}${lenDiff} chars)`
}

function summarizeParse(output: ParseOutput<SeedNode>): string {
    if (!output.success || !output.ast) {
        return `parse failed: ${output.errors.length} error(s)`
    }
    return `parsed → ${output.ast.type} (${output.events.length} events, ${output.errors.length} errors)`
}

function summarizeNormalize(onf: ONFNode): string {
    const argCount = countONFNodes(onf)
    return `normalized → ONF sigil='${onf.sigil}' (${argCount} nodes)`
}

function countONFNodes(node: ONFNode): number {
    let count = 1
    for (const arg of node.args) {
        count += countONFNodes(arg)
    }
    return count
}

function summarizeInterpret(value: RuntimeValue, snapshot: RegisterSnapshot): string {
    const regCount = Object.keys(snapshot.entries).length
    const valueType = value === null || value === undefined
        ? 'null'
        : Array.isArray(value)
            ? `array(${value.length})`
            : typeof value === 'object'
                ? `record(${Object.keys(value).length})`
                : typeof value
    return `interpreted → ${valueType} (${regCount} registers)`
}

// ── Generator Pipeline ──────────────────────────────────────────

/**
 * Stage-stepping pipeline. Yields a Precipitant after each transformation pass.
 *
 * Usage:
 *   for (const precipitant of runSpwStepped(source)) {
 *     console.log(precipitant.stage, precipitant.delta)
 *   }
 */
export function* runSpwStepped(
    source: string,
    options: RunSpwOptions = {},
): Generator<AnyPrecipitant, RunSpwResult, void> {
    const shouldDesugar = options.desugar ?? true
    const registers = options.registers ?? new RegisterBank()

    // ── Stage 1: Desugar ────────────────────────────────────────
    const desugared = shouldDesugar ? desugar(source) : source

    yield {
        stage: 'desugar',
        at: nowIso(),
        input: source,
        output: desugared,
        delta: summarizeDesugar(source, desugared),
    } satisfies DesugarPrecipitant

    // ── Stage 2: Parse ──────────────────────────────────────────
    const parseOutput = parse(desugared)

    yield {
        stage: 'parse',
        at: nowIso(),
        input: desugared,
        output: parseOutput,
        delta: summarizeParse(parseOutput),
    } satisfies ParsePrecipitant

    // Check for parse failure — return early
    if (!parseOutput.success || !parseOutput.ast || parseOutput.errors.length > 0) {
        const issues: RuntimeIssue[] = parseOutput.errors.map(error => ({
            stage: 'parse',
            message: parseIssueMessage(error),
        }))
        if (issues.length === 0) {
            issues.push({ stage: 'parse', message: 'Parse did not produce executable AST' })
        }
        return {
            success: false,
            source: desugared,
            parse: parseOutput,
            issues,
        }
    }

    // ── Stage 3: Normalize ──────────────────────────────────────
    const onf = normalizeToONF(parseOutput.ast)

    yield {
        stage: 'normalize',
        at: nowIso(),
        input: parseOutput.ast,
        output: onf,
        delta: summarizeNormalize(onf),
    } satisfies NormalizePrecipitant

    // ── Stage 4: Interpret ──────────────────────────────────────
    const runtime = interpretSeed(
        parseOutput.ast,
        { captureTrace: options.captureTrace ?? true },
        registers,
    )

    yield {
        stage: 'interpret',
        at: nowIso(),
        input: onf,
        output: runtime.value,
        registersAfter: runtime.registers,
        delta: summarizeInterpret(runtime.value, runtime.registers),
    } satisfies InterpretPrecipitant

    return {
        success: true,
        source: desugared,
        parse: parseOutput,
        runtime,
    }
}

/**
 * Collect all precipitants from a pipeline run.
 * Returns both the precipitants and the final result.
 */
export function collectPrecipitants(
    source: string,
    options: RunSpwOptions = {},
): { precipitants: AnyPrecipitant[]; result: RunSpwResult } {
    const precipitants: AnyPrecipitant[] = []
    const gen = runSpwStepped(source, options)

    let step = gen.next()
    while (!step.done) {
        precipitants.push(step.value)
        step = gen.next()
    }

    return { precipitants, result: step.value }
}

/**
 * Build a projection map from a set of precipitants.
 */
export function buildProjection(precipitants: AnyPrecipitant[]): PipelineProjection {
    const projection: PipelineProjection = {}
    for (const p of precipitants) {
        projection[p.stage] = p
    }
    return projection
}

// ── Spw Rendering ───────────────────────────────────────────────

/**
 * Render a precipitant's state as an operable Spw expression.
 *
 * Each stage renders differently:
 *   desugar   → identity (already Spw source)
 *   parse     → AST as annotation frame tree
 *   normalize → ONF as canonical σ(args)[reg=...] form
 *   interpret → register entries as $[key] expressions
 */
export function precipitantToSpw(p: AnyPrecipitant): string {
    switch (p.stage) {
        case 'desugar':
            return p.output

        case 'parse':
            return astToSpw(p.output.ast ?? null)

        case 'normalize':
            return onfToSpw(p.output)

        case 'interpret':
            return registersToSpw(p.registersAfter)
    }
}

/**
 * Coagulate an entire projection into a single aggregate Spw frame.
 * Applies the operational sequence: desugar | parse | normalize | interpret
 */
export function projectionToSpw(precipitants: AnyPrecipitant[]): string {
    const lines: string[] = ['^"pipeline"{']
    for (const p of precipitants) {
        const spw = precipitantToSpw(p)
        const indented = spw.split('\n').map(l => `    ${l}`).join('\n')
        lines.push(`  ^"${p.stage}"{`)
        lines.push(`    %[delta] "${p.delta}"`)
        lines.push(indented)
        lines.push(`  }`)
    }
    lines.push('}')
    return lines.join('\n')
}

// ── Spw renderers per stage ─────────────────────────────────────

function astToSpw(ast: SeedNode | null): string {
    if (!ast) return '_ // empty AST'
    return renderAstNode(ast, 0)
}

function renderAstNode(node: SeedNode, depth: number): string {
    const indent = '  '.repeat(depth)
    const type = node.type
    const token = (node as any).token
    const value = token?.value

    // Leaf: render as annotated value
    if (value !== undefined) {
        return `${indent}@${type.toLowerCase()} "${value}"`
    }

    // Branch: render children
    const childKeys = Object.keys(node).filter(
        k => !['type', 'span', 'token'].includes(k)
    )
    if (childKeys.length === 0) {
        return `${indent}#:node #!${type}`
    }

    const lines = [`${indent}^["${type}"]{`]
    for (const key of childKeys) {
        const child = (node as any)[key]
        if (child && typeof child === 'object' && 'type' in child) {
            lines.push(`${indent}  .. @${key}`)
            lines.push(renderAstNode(child, depth + 2))
        } else if (Array.isArray(child)) {
            for (const item of child) {
                if (item && typeof item === 'object' && 'type' in item) {
                    lines.push(renderAstNode(item, depth + 1))
                }
            }
        }
    }
    lines.push(`${indent}}`)
    return lines.join('\n')
}

function onfToSpw(node: ONFNode): string {
    return renderONFNode(node, 0)
}

function renderONFNode(node: ONFNode, depth: number): string {
    const indent = '  '.repeat(depth)
    const reg = node.frames.reg ?? ''
    const value = node.frames.value

    // Build frames annotation
    const frameParts: string[] = []
    if (reg) frameParts.push(`reg=${reg}`)
    if (value !== undefined) frameParts.push(`value="${value}"`)
    const frameStr = frameParts.length > 0 ? `[${frameParts.join(', ')}]` : ''

    // Leaf
    if (node.args.length === 0) {
        return `${indent}${node.sigil}${frameStr}`
    }

    // Branch
    const lines = [`${indent}${node.sigil}${frameStr}{`]
    for (const arg of node.args) {
        lines.push(renderONFNode(arg, depth + 1))
    }
    lines.push(`${indent}}`)
    return lines.join('\n')
}

function registersToSpw(snapshot: RegisterSnapshot): string {
    const entries = Object.entries(snapshot.entries) as [string, any][]
    if (entries.length === 0) return '// no registers'

    const lines: string[] = []
    for (const [key, entry] of entries) {
        const val = entry.value
        const valStr = val === null ? 'null'
            : typeof val === 'string' ? `"${val}"`
                : typeof val === 'number' ? String(val)
                    : JSON.stringify(val)
        const phase = entry.meta?.phases?.current
        const writes = entry.meta?.writes ?? 0
        const meta = [phase && `phase=${phase}`, `w=${writes}`].filter(Boolean).join(', ')
        lines.push(`$["${key}"] ${valStr}  // ${meta}`)
    }
    return lines.join('\n')
}

