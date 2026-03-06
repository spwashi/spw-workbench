/**
 * Substrate — a processing context where register events react.
 *
 * The structural substrate (A-line pipeline) is batch and sequential.
 * Additional substrates add event-driven and resonance processing.
 *
 * Vocabulary:
 *   Substrate  — surface where reactions happen
 *   Bind       — attach a handler to a substrate (~ deferral = substrate binding)
 *   Emit       — dispatch a register event to bound handlers
 *   Drain      — consume all accumulated events
 *   Resonance  — emergent coupling discovered between register entries
 *
 * @spw:portable:runtime[layer=pipeline,system=event-substrate,extract=candidate,basis=no-dom|event-log] - No DOM or app-specific imports allowed
 * @spw:seed:starter[system=event-substrate,extract=candidate,next=resonance,density=sparse] - Event substrate is a viable sparse base for later extraction
 */

import type { RuntimeValue, RegisterPhase } from '../state/types'

// ── Event Types ─────────────────────────────────────────────────

export type RegisterEventKind = 'write' | 'couple' | 'phase-advance' | 'mark'

export interface RegisterEvent {
    /** What happened */
    kind: RegisterEventKind
    /** Which register key was affected */
    key: string
    /** Value after the event */
    value: RuntimeValue
    /** Phase at time of event (if applicable) */
    phase?: RegisterPhase
    /** Source/agent that produced this event */
    source?: string
    /** ISO timestamp */
    at: string
    /** For 'couple' events: the other key in the coupling */
    coupledWith?: string
}

// ── Resonance Types ─────────────────────────────────────────────

export type ResonanceType =
    | 'value-echo'       // same value in two registers
    | 'phase-sync'       // two registers reach same phase simultaneously
    | 'frequency-lock'   // similar write frequency
    | 'implicit-couple'  // value of A references key of B

export interface Resonance {
    /** The two register keys that resonate */
    keys: [string, string]
    /** What kind of resonance was detected */
    type: ResonanceType
    /** How strong the resonance is (0–1) */
    strength: number
    /** Human-readable evidence string */
    evidence: string
}

// ── Handler Type ────────────────────────────────────────────────

export type SubstrateHandler = (event: RegisterEvent) => void

// ── Substrate Class ─────────────────────────────────────────────

export class Substrate {
    readonly name: string
    private readonly events: RegisterEvent[] = []
    private readonly bindings = new Map<string, SubstrateHandler[]>()

    constructor(name = 'default') {
        this.name = name
    }

    /**
     * Emit a register event.
     * Logs the event and dispatches to any bound handlers matching the key.
     */
    emit(event: RegisterEvent): void {
        this.events.push(event)

        // Dispatch to exact key bindings
        const handlers = this.bindings.get(event.key)
        if (handlers) {
            for (const handler of handlers) {
                handler(event)
            }
        }

        // Dispatch to wildcard bindings
        const wildcardHandlers = this.bindings.get('*')
        if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
                handler(event)
            }
        }

        // Dispatch to kind-based bindings (e.g., 'write:*', 'couple:*')
        const kindHandlers = this.bindings.get(`${event.kind}:*`)
        if (kindHandlers) {
            for (const handler of kindHandlers) {
                handler(event)
            }
        }
    }

    /**
     * Bind a handler to a pattern.
     *
     * Patterns:
     *   "key"      — exact register key match
     *   "*"        — all events
     *   "write:*"  — all events of a specific kind
     *
     * In Spw terms: ~ deferral is a substrate binding.
     * ~value means "bind this value to the substrate; it resolves when catalyzed."
     */
    bind(pattern: string, handler: SubstrateHandler): void {
        const existing = this.bindings.get(pattern) ?? []
        existing.push(handler)
        this.bindings.set(pattern, existing)
    }

    /**
     * Remove all handlers for a pattern.
     */
    unbind(pattern: string): void {
        this.bindings.delete(pattern)
    }

    /**
     * Drain all accumulated events, returning them and clearing the log.
     */
    drain(): RegisterEvent[] {
        const drained = [...this.events]
        this.events.length = 0
        return drained
    }

    /**
     * Peek at events without consuming them.
     */
    peek(): readonly RegisterEvent[] {
        return this.events
    }

    /**
     * Number of accumulated events.
     */
    get eventCount(): number {
        return this.events.length
    }

    /**
     * Number of active bindings.
     */
    get bindingCount(): number {
        return this.bindings.size
    }
}
