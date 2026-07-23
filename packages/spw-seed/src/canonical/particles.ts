/**
 * Particle bindings — where deixis points and case classifies.
 *
 * A particle binds to the expression that follows it in its sequence. Stacks
 * compose: a run of particle-led lines (`#>spw_index`, then `#:index #!canon`)
 * all bind to the first non-particle-led expression after the run — the
 * header-stack pattern that opens nearly every canonical surface.
 *
 * The binding is derived from adjacency, never stored in the tree, so the
 * relation stays true under edits. This is the seed API the index/export
 * table builds on: `#>name` → bound node is what `~"file#name"` resolves to.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */
import type { ASTNode } from '../types/ast'
import type { ExpressionNode, ParticleNode, SequenceNode } from '../types/ast/nodes'

export interface ParticleBinding {
  particle: ParticleNode
  /** First content node after the particle's run; null at tail. */
  bound: ASTNode | null
}

function isParticleLed(expr: ExpressionNode): boolean {
  return expr.terms.length > 0 && expr.terms[0]!.type === 'Particle'
}

function isBoundarylessOp(node: ASTNode | undefined): boolean {
  if (!node || node.type !== 'Operation') return false
  const op = node as { frame?: unknown; body?: unknown; subject?: unknown; linePayload?: unknown }
  return !op.frame && !op.body && !op.subject && !op.linePayload
}

/**
 * Marks continue a particle run without becoming its target: particle-led
 * lines, boundary-less operator marks (`#!canon` mood and its split residue,
 * `!boon` valence tags), and whitespace-only prose. Anything boundaried
 * (`#[…]` set, `^…{…}` frame, `?…{…}` probe) is content — a target.
 * The boundary-less test doubles as the first noise detector: the census
 * counts these to separate deliberate mood marks from underspecified ones.
 */
function isMarkLike(item: ASTNode): boolean {
  if (item.type === 'Expression') {
    const expr = item as ExpressionNode
    if (isParticleLed(expr)) return true
    return isBoundarylessOp(expr.terms[0])
  }
  if (item.type === 'ProseChunk') {
    return ((item as { text?: string }).text ?? '').trim() === ''
  }
  return isBoundarylessOp(item)
}

function particlesOf(item: ASTNode): ParticleNode[] {
  if (item.type !== 'Expression') return []
  return (item as ExpressionNode).terms.filter((t): t is ParticleNode => t.type === 'Particle')
}

/**
 * Scan one ordered item list — a Sequence's expressions or a Prose node's
 * chunks — binding each particle run to the first content item after it.
 */
function bindItems(items: readonly ASTNode[], out: ParticleBinding[]): void {
  for (let i = 0; i < items.length; i += 1) {
    const particles = particlesOf(items[i]!)
    if (particles.length === 0) continue

    let bound: ASTNode | null = null
    for (let j = i + 1; j < items.length; j += 1) {
      if (!isMarkLike(items[j]!)) {
        bound = items[j]!
        break
      }
    }
    for (const particle of particles) {
      out.push({ particle, bound })
    }
  }
}

/** Collect every particle binding under a root (walks sequences and prose). */
export function particleBindings(root: ASTNode): ParticleBinding[] {
  const out: ParticleBinding[] = []
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      stack.push(...node)
      continue
    }
    if (!node || typeof node !== 'object') continue
    const typed = node as ASTNode & Record<string, unknown>
    if (typed.type === 'Sequence') {
      bindItems((typed as unknown as SequenceNode).expressions, out)
    } else if (typed.type === 'Prose') {
      bindItems((typed as unknown as { chunks: ASTNode[] }).chunks, out)
    }
    for (const key of Object.keys(typed)) {
      if (key === 'span' || key === 'token') continue
      stack.push(typed[key])
    }
  }
  return out
}

/**
 * How many marks of each aim a surface carries — its dialect signature.
 *
 * The four aims measure different things about a surface, so the mix reads as
 * a profile rather than a score: deixis is navigability (how addressable it
 * is), case is queryability, mood is assertion richness, and aspect is
 * volatility — `~#` marks are deferred state, so a surface dense in them is
 * one whose content expires.
 *
 * Aspect still lives on the legacy Annotation node rather than the particle
 * family, so it is counted from the source. Pass the source to include it.
 */
export interface ParticleMix {
  deixis: number
  case: number
  mood: number
  aspect: number
}

const ASPECT_MARK = /~#[A-Za-z_]/g

export function particleMix(root: ASTNode | null, source = ''): ParticleMix {
  const mix: ParticleMix = { deixis: 0, case: 0, mood: 0, aspect: 0 }
  mix.aspect = (source.match(ASPECT_MARK) ?? []).length
  if (!root) return mix

  for (const binding of particleBindings(root)) {
    switch (binding.particle.aim) {
      case '>': mix.deixis += 1; break
      case ':': mix.case += 1; break
      default: mix.mood += 1
    }
  }
  return mix
}

/** Total marks in a mix — the denominator for density questions. */
export function particleMixTotal(mix: ParticleMix): number {
  return mix.deixis + mix.case + mix.mood + mix.aspect
}

/** The deixis (anchor) table of a tree: name → binding, first wins per name. */
export function deixisTable(root: ASTNode): Map<string, ParticleBinding> {
  const table = new Map<string, ParticleBinding>()
  for (const binding of particleBindings(root)) {
    if (binding.particle.aim !== '>') continue
    const name = binding.particle.name.value
    if (!table.has(name)) table.set(name, binding)
  }
  return table
}
