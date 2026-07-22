/**
 * Abstract field dynamics on discrete sites.
 *
 * Portable probes for coupling, decay, flux, cascades, capacity, and affinity.
 * Domain-agnostic by design — use for any multi-locus, multi-carrier model
 * (linguistic ensembles, production continuity, PE salience, …).
 *
 * @see docs/theory/spw/field-dynamics.spw
 * @see packages/spw-seed/src/math/graph.ts
 */

import { adjacencyList, type DirectedGraph } from './graph'

/** Scalar amplitude per site id. */
export type FieldState = Record<string, number>

/** Named carrier with free amplitude and optional site bias. */
export interface Carrier {
  id: string
  free: number
  /** Preferential site weights (affinity); missing sites = 0 */
  affinity?: Record<string, number>
}

/** Binding site with capacity and optional base affinity scale. */
export interface BindingSite {
  id: string
  capacity: number
  /** Multiplier on carrier affinity (default 1) */
  receptivity?: number
}

export function zeros(sites: string[]): FieldState {
  const s: FieldState = {}
  for (const id of sites) s[id] = 0
  return s
}

export function cloneField(state: FieldState): FieldState {
  return { ...state }
}

export function fieldNorm(state: FieldState, p = 2): number {
  const vals = Object.values(state)
  if (p === Infinity) return vals.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  let acc = 0
  for (const v of vals) acc += Math.pow(Math.abs(v), p)
  return Math.pow(acc, 1 / p)
}

export function fieldSum(state: FieldState): number {
  return Object.values(state).reduce((a, b) => a + b, 0)
}

/** Exponential decay: u ← u * exp(-λ Δt). λ from half-life via halfLifeToRate. */
export function decayField(state: FieldState, rate: number, dt = 1): FieldState {
  const f = Math.exp(-Math.max(0, rate) * dt)
  const out: FieldState = {}
  for (const [k, v] of Object.entries(state)) out[k] = v * f
  return out
}

/** Convert half-life T½ to decay rate λ (continuous). */
export function halfLifeToRate(halfLife: number): number {
  if (halfLife <= 0) return Number.POSITIVE_INFINITY
  return Math.LN2 / halfLife
}

/**
 * Graph diffusion step (explicit Euler).
 * Undirected (default): treat each edge once with conductance w; mass conserved.
 *   exchange = κ Δt w (u_j - u_i); u_i += exchange; u_j -= exchange
 * Directed: u_i ← u_i + κ Δt Σ_{i→j} w (u_j - u_i)  (may not conserve mass)
 */
export function diffuseField(
  g: DirectedGraph,
  state: FieldState,
  kappa: number,
  dt = 1,
  opts: { symmetric?: boolean } = {},
): FieldState {
  const symmetric = opts.symmetric !== false
  const u = cloneField(state)
  for (const n of g.nodes) if (u[n] == null) u[n] = 0

  if (symmetric) {
    const next = cloneField(u)
    const seen = new Set<string>()
    for (const e of g.edges) {
      const key = e.from < e.to ? `${e.from}\0${e.to}` : `${e.to}\0${e.from}`
      if (seen.has(key)) continue
      seen.add(key)
      const w = e.weight ?? 1
      const ui = next[e.from] ?? 0
      const uj = next[e.to] ?? 0
      const exchange = kappa * dt * w * (uj - ui)
      next[e.from] = ui + exchange
      next[e.to] = uj - exchange
    }
    return next
  }

  const adj = adjacencyList(g)
  const next = cloneField(u)
  for (const n of g.nodes) {
    let delta = 0
    for (const e of adj.get(n) ?? []) {
      const w = e.weight ?? 1
      delta += w * ((u[e.to] ?? 0) - (u[n] ?? 0))
    }
    next[n] = (u[n] ?? 0) + kappa * dt * delta
  }
  return next
}

/**
 * Conserved transfer along an edge: move `amount` (clamped) from → to.
 */
export function transfer(
  state: FieldState,
  from: string,
  to: string,
  amount: number,
): FieldState {
  const out = cloneField(state)
  const avail = Math.max(0, out[from] ?? 0)
  const a = Math.max(0, Math.min(amount, avail))
  out[from] = avail - a
  out[to] = (out[to] ?? 0) + a
  return out
}

/**
 * Flux magnitude from permeability and gradient (downstream - upstream).
 * Positive means flow toward higher sink (or use signed as needed).
 */
export function flux(permeability: number, upstream: number, downstream: number): number {
  return permeability * (downstream - upstream)
}

/**
 * Cascade stages: each stage amplifies residual input then decays.
 * returns amplitude at each stage after `steps` micro-updates (default 1).
 */
export function cascadeChain(
  input: number,
  stages: Array<{ gain: number; decay?: number }>,
  steps = 1,
): number[] {
  let x = input
  const out: number[] = []
  for (const st of stages) {
    for (let s = 0; s < steps; s++) {
      x = st.gain * x
      if (st.decay != null && st.decay > 0) x *= Math.exp(-st.decay)
    }
    out.push(x)
  }
  return out
}

/**
 * Capacity-limited step (logistic): x ← x + r x (1 - x/K) Δt
 */
export function capacityStep(x: number, capacity: number, rate: number, dt = 1): number {
  if (capacity <= 0) return 0
  const nx = x + rate * x * (1 - x / capacity) * dt
  return Math.max(0, nx)
}

/**
 * Competitive affinity binding: allocate each carrier's free mass to sites
 * proportional to affinity×receptivity, capped by remaining capacity.
 * Greedy by descending affinity product (stable, deterministic).
 */
export function affinityAllocate(
  carriers: Carrier[],
  sites: BindingSite[],
): {
  bound: Record<string, Record<string, number>> // carrier → site → amount
  occupancy: FieldState
  free: Record<string, number>
} {
  const capLeft: FieldState = {}
  for (const s of sites) capLeft[s.id] = Math.max(0, s.capacity)
  const bound: Record<string, Record<string, number>> = {}
  const free: Record<string, number> = {}

  type Offer = { carrier: string; site: string; score: number; want: number }
  const offers: Offer[] = []
  for (const c of carriers) {
    bound[c.id] = {}
    free[c.id] = Math.max(0, c.free)
    for (const s of sites) {
      const aff = (c.affinity?.[s.id] ?? 0) * (s.receptivity ?? 1)
      if (aff <= 0 || free[c.id] === 0) continue
      offers.push({ carrier: c.id, site: s.id, score: aff, want: free[c.id]! })
    }
  }
  offers.sort((a, b) => b.score - a.score || a.carrier.localeCompare(b.carrier) || a.site.localeCompare(b.site))

  for (const o of offers) {
    const left = free[o.carrier] ?? 0
    const room = capLeft[o.site] ?? 0
    if (left <= 0 || room <= 0) continue
    const take = Math.min(left, room)
    free[o.carrier] = left - take
    capLeft[o.site] = room - take
    bound[o.carrier]![o.site] = (bound[o.carrier]![o.site] ?? 0) + take
  }

  const occupancy: FieldState = {}
  for (const s of sites) {
    occupancy[s.id] = s.capacity - (capLeft[s.id] ?? 0)
  }
  return { bound, occupancy, free }
}

/**
 * Ensemble mix: weighted sum of field states (normalize weights if requested).
 */
export function mixFields(
  parts: Array<{ weight: number; state: FieldState }>,
  opts: { normalize?: boolean } = {},
): FieldState {
  let wsum = parts.reduce((a, p) => a + p.weight, 0)
  if (opts.normalize && wsum > 0) {
    /* use wsum */
  } else {
    wsum = 1
  }
  const keys = new Set<string>()
  for (const p of parts) for (const k of Object.keys(p.state)) keys.add(k)
  const out: FieldState = {}
  for (const k of keys) {
    let v = 0
    for (const p of parts) {
      const w = opts.normalize && wsum > 0 ? p.weight / wsum : p.weight
      v += w * (p.state[k] ?? 0)
    }
    out[k] = v
  }
  return out
}

/**
 * One “show beat”: decay → optional diffuse → optional inject.
 * Useful as a discrete production / narrative clock without domain nouns.
 */
export function fieldBeat(
  g: DirectedGraph | null,
  state: FieldState,
  opts: {
    decayRate?: number
    kappa?: number
    dt?: number
    inject?: FieldState
  } = {},
): FieldState {
  const dt = opts.dt ?? 1
  let s = opts.decayRate != null ? decayField(state, opts.decayRate, dt) : cloneField(state)
  if (g && opts.kappa != null && opts.kappa !== 0) {
    s = diffuseField(g, s, opts.kappa, dt, { symmetric: true })
  }
  if (opts.inject) {
    for (const [k, v] of Object.entries(opts.inject)) {
      s[k] = (s[k] ?? 0) + v
    }
  }
  return s
}

/** Conserved mass check within tolerance (for transfer tests). */
export function massConserved(a: FieldState, b: FieldState, tol = 1e-9): boolean {
  return Math.abs(fieldSum(a) - fieldSum(b)) <= tol
}
