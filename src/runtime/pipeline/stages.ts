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
