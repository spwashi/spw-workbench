/**
 * Resonance Detector
 *
 * Scans a substrate's event log for emergent coupling between register entries.
 * Runs after A-line pipeline completes — discovers implicit relationships
 * that were not explicitly declared via <> coupling.
 *
 * @spw:portable:runtime[layer=pipeline,system=resonance-detector,extract=candidate,basis=no-dom|pure-analysis] - No DOM or app-specific imports allowed
 * @spw:seed:scaffold[system=resonance-detector,extract=candidate,density=sparse,basis=event-log|pure-analysis] - Event-log scaffold is promising but not yet a standalone kernel
 */

import { Substrate } from './substrate'
import type { RegisterEvent, Resonance } from './substrate'

// ── Detection ───────────────────────────────────────────────────

/**
 * Scan a substrate's event log and detect all resonances.
 */
export function detectResonances(substrate: Substrate | readonly RegisterEvent[]): Resonance[] {
    const events = substrate instanceof Substrate ? substrate.peek() : substrate
    if (events.length < 2) return []

    const resonances: Resonance[] = []

    resonances.push(...detectValueEchoes(events))
    resonances.push(...detectPhaseSyncs(events))
    resonances.push(...detectFrequencyLocks(events))
    resonances.push(...detectImplicitCoupling(events))

    // Deduplicate: same key pair + same type → keep strongest
    return deduplicateResonances(resonances)
}

// ── Value Echo ──────────────────────────────────────────────────

/**
 * Two registers written with identical values → same precipitate in two vessels.
 */
function detectValueEchoes(events: readonly RegisterEvent[]): Resonance[] {
    const resonances: Resonance[] = []
    const writes = events.filter(e => e.kind === 'write')

    // Group by stringified value
    const valueMap = new Map<string, string[]>()
    for (const event of writes) {
        const valKey = stableStringify(event.value)
        const keys = valueMap.get(valKey) ?? []
        if (!keys.includes(event.key)) keys.push(event.key)
        valueMap.set(valKey, keys)
    }

    for (const [valKey, keys] of valueMap) {
        if (keys.length < 2 || valKey === 'undefined' || valKey === 'null') continue
        // Create resonances for all pairs
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                resonances.push({
                    keys: [keys[i], keys[j]],
                    type: 'value-echo',
                    strength: 1.0,
                    evidence: `both contain ${truncate(valKey, 40)}`,
                })
            }
        }
    }

    return resonances
}

// ── Phase Sync ──────────────────────────────────────────────────

/**
 * Two registers advance to the same phase within a tight time window.
 */
function detectPhaseSyncs(events: readonly RegisterEvent[]): Resonance[] {
    const resonances: Resonance[] = []
    const phaseEvents = events.filter(e => e.phase !== undefined)

    // Group by phase
    const phaseMap = new Map<string, { key: string; at: string }[]>()
    for (const event of phaseEvents) {
        const entries = phaseMap.get(event.phase!) ?? []
        // Only keep latest per key
        const existing = entries.findIndex(e => e.key === event.key)
        if (existing >= 0) entries[existing] = { key: event.key, at: event.at }
        else entries.push({ key: event.key, at: event.at })
        phaseMap.set(event.phase!, entries)
    }

    for (const [phase, entries] of phaseMap) {
        if (entries.length < 2) continue
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const timeDiff = Math.abs(
                    new Date(entries[i].at).getTime() - new Date(entries[j].at).getTime()
                )
                // Within 100ms = strong sync; within 1s = weak sync
                const strength = timeDiff < 100 ? 1.0 : timeDiff < 1000 ? 0.5 : 0
                if (strength > 0) {
                    resonances.push({
                        keys: [entries[i].key, entries[j].key],
                        type: 'phase-sync',
                        strength,
                        evidence: `both at phase=${phase} within ${timeDiff}ms`,
                    })
                }
            }
        }
    }

    return resonances
}

// ── Frequency Lock ──────────────────────────────────────────────

/**
 * Two registers with similar write frequency → harmonic vibration.
 */
function detectFrequencyLocks(events: readonly RegisterEvent[]): Resonance[] {
    const resonances: Resonance[] = []
    const writes = events.filter(e => e.kind === 'write')

    // Count writes per key
    const writeCounts = new Map<string, number>()
    for (const event of writes) {
        writeCounts.set(event.key, (writeCounts.get(event.key) ?? 0) + 1)
    }

    const keys = [...writeCounts.keys()]
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            const countA = writeCounts.get(keys[i])!
            const countB = writeCounts.get(keys[j])!
            if (countA < 2 || countB < 2) continue

            const ratio = Math.min(countA, countB) / Math.max(countA, countB)
            // Ratio > 0.8 = strong lock; > 0.5 = moderate
            if (ratio > 0.5) {
                resonances.push({
                    keys: [keys[i], keys[j]],
                    type: 'frequency-lock',
                    strength: ratio,
                    evidence: `write ratio ${countA}:${countB} (${(ratio * 100).toFixed(0)}%)`,
                })
            }
        }
    }

    return resonances
}

// ── Implicit Coupling ───────────────────────────────────────────

/**
 * Value of register A references key of register B → covalent bond.
 */
function detectImplicitCoupling(events: readonly RegisterEvent[]): Resonance[] {
    const resonances: Resonance[] = []
    const writes = events.filter(e => e.kind === 'write')

    // Collect all known keys
    const allKeys = new Set(writes.map(e => e.key))

    // For each write, check if its value contains another key's name
    for (const event of writes) {
        const valStr = stableStringify(event.value)
        for (const otherKey of allKeys) {
            if (otherKey === event.key) continue
            if (valStr.includes(otherKey)) {
                resonances.push({
                    keys: [event.key, otherKey],
                    type: 'implicit-couple',
                    strength: 0.7,
                    evidence: `value of "${event.key}" references "${otherKey}"`,
                })
            }
        }
    }

    return resonances
}

// ── Helpers ─────────────────────────────────────────────────────

function stableStringify(value: unknown): string {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    try {
        return JSON.stringify(value, Object.keys(value as object).sort())
    } catch {
        return String(value)
    }
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) + '…' : s
}

function deduplicateResonances(resonances: Resonance[]): Resonance[] {
    const seen = new Map<string, Resonance>()
    for (const r of resonances) {
        const pairKey = [...r.keys].sort().join('|') + ':' + r.type
        const existing = seen.get(pairKey)
        if (!existing || r.strength > existing.strength) {
            seen.set(pairKey, r)
        }
    }
    return [...seen.values()]
}
