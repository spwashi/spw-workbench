/**
 * Structural coupling coordinates shared by the explicit `<>` relation and
 * paired container boundaries.
 *
 * Symmetry lives in the common `kind` / `form` / `ports` interface. Nuance is
 * retained by the discriminated variants:
 *
 *   - `<>` is an operator coupling with positional operands.
 *   - `()`, `[]`, `{}`, `<…>`, `<<…>>`, and `((…))` are boundary couplings
 *     with an interior, occupancy, and payload class.
 *
 * Physical readings such as charge, capacitance, tense, or evaluation policy
 * are intentionally not Seed facts. Tools may add those through named,
 * revisioned profiles without changing the portable structural record.
 *
 * @see docs/theory/spw/operator-brace-composition.spw
 * @see docs/theory/spw/coupling-constructors.spw
 */

/** Structural kind of a coupling constructor. */
export type CouplingKind =
  | 'couple'
  | 'frame'
  | 'body'
  | 'scope'
  | 'capsule'
  | 'stream'
  | 'nrange'

/** Paired boundaries are coupling constructors, but not lexical operators. */
export type PairedBoundaryKind = Exclude<CouplingKind, 'couple'>

/** The lexical/structural form prevents symmetry from erasing kind. */
export type CouplingForm = 'operator' | 'boundary'

export type BoundarySide = 'open' | 'close'

export type OperatorCouplingPort =
  | 'before_operator'
  | 'operand'
  | 'after_operator'

export type BoundaryCouplingPort =
  | 'before_open'
  | 'open_boundary'
  | 'inside'
  | 'close_boundary'
  | 'after_close'

export type CouplingPort = OperatorCouplingPort | BoundaryCouplingPort

/** Whether a paired boundary carries an interior payload. */
export type CouplingOccupancy = 'empty' | 'inhabited'

/**
 * Structural class of a boundary interior after ONF reduction.
 *
 * `space` is reserved for a future trivia-preserving projection. The current
 * AST collapses whitespace-only interiors to `void`.
 */
export type CouplingPayload = 'void' | 'space' | 'act' | 'term' | 'multi'

/** Position of an Act relative to a paired boundary. */
export type ActPlacement = 'interior' | 'prefix' | 'postfix' | 'none'

const OPERATOR_PORTS = [
  'before_operator',
  'operand',
  'after_operator',
] as const satisfies readonly OperatorCouplingPort[]

const BOUNDARY_PORTS = [
  'before_open',
  'open_boundary',
  'inside',
  'close_boundary',
  'after_close',
] as const satisfies readonly BoundaryCouplingPort[]

export interface OperatorCouplingDescriptor {
  kind: 'couple'
  form: 'operator'
  surface: '<>'
  reg: 'couple'
  ports: readonly OperatorCouplingPort[]
}

export interface BoundaryCouplingDescriptor {
  kind: PairedBoundaryKind
  form: 'boundary'
  /** Generic inhabited rendering, not a source reconstruction. */
  surface: string
  /** Generic empty rendering, not proof that a particular source used it. */
  emptySurface: string
  openSurface: string
  closeSurface: string
  reg: string
  ports: readonly BoundaryCouplingPort[]
}

export type CouplingDescriptor =
  | OperatorCouplingDescriptor
  | BoundaryCouplingDescriptor

/**
 * Portable structural descriptors. Kind-specific meaning is deliberately
 * represented by the tag rather than fixed biological or physical labels.
 */
export const COUPLING_DESCRIPTORS = {
  couple: {
    kind: 'couple',
    form: 'operator',
    surface: '<>',
    reg: 'couple',
    ports: OPERATOR_PORTS,
  },
  frame: {
    kind: 'frame',
    form: 'boundary',
    surface: '[…]',
    emptySurface: '[]',
    openSurface: '[',
    closeSurface: ']',
    reg: 'inner',
    ports: BOUNDARY_PORTS,
  },
  body: {
    kind: 'body',
    form: 'boundary',
    surface: '{…}',
    emptySurface: '{}',
    openSurface: '{',
    closeSurface: '}',
    reg: 'around',
    ports: BOUNDARY_PORTS,
  },
  scope: {
    kind: 'scope',
    form: 'boundary',
    surface: '(…)',
    emptySurface: '()',
    openSurface: '(',
    closeSurface: ')',
    reg: 'scope',
    ports: BOUNDARY_PORTS,
  },
  capsule: {
    kind: 'capsule',
    form: 'boundary',
    surface: '<…>',
    // Spacing makes the empty capsule visibly distinct from OPERATOR `<>`.
    emptySurface: '< >',
    openSurface: '<',
    closeSurface: '>',
    reg: 'capsule',
    ports: BOUNDARY_PORTS,
  },
  stream: {
    kind: 'stream',
    form: 'boundary',
    surface: '<<…>>',
    emptySurface: '<<>>',
    openSurface: '<<',
    closeSurface: '>>',
    reg: 'stream',
    ports: BOUNDARY_PORTS,
  },
  nrange: {
    kind: 'nrange',
    form: 'boundary',
    surface: '((…))',
    emptySurface: '(())',
    openSurface: '((',
    closeSurface: '))',
    reg: 'range',
    ports: BOUNDARY_PORTS,
  },
} as const satisfies Record<CouplingKind, CouplingDescriptor>

/** ONF projection for the explicit relation operator. */
export interface OperatorCouplingFrame {
  kind: 'couple'
  form: 'operator'
  surface: '<>'
  /** Number of normalized operands; zero is not boundary emptiness. */
  arity: number
}

/** ONF projection for a paired boundary. */
export interface BoundaryCouplingFrame {
  kind: PairedBoundaryKind
  form: 'boundary'
  occupancy: CouplingOccupancy
  payload: CouplingPayload
  surface: string
  actPlacement?: ActPlacement
}

export type CouplingFrame = OperatorCouplingFrame | BoundaryCouplingFrame

export interface BoundarySurfaceCoordinate {
  kind: PairedBoundaryKind
  form: 'boundary'
  side: BoundarySide
  surface: string
}

/** Evidence posture of a semantic profile; never inferred from its vocabulary. */
export type CouplingProfileStatus = 'interpretive' | 'measured' | 'operational'

export type CouplingDimensionValueType =
  | 'number'
  | 'category'
  | 'boolean'
  | 'text'

export interface CouplingDimensionDefinition {
  id: string
  description: string
  valueType: CouplingDimensionValueType
  unit?: string
  /** Reproducible observation or computation that produces the dimension. */
  method: string
  /** Observation that would count against the proposed interpretation. */
  falsifier: string
}

export interface CouplingPortSemantics {
  role: string
  direction: 'in' | 'out' | 'bidirectional' | 'neutral'
  description: string
}

export interface CouplingDynamicsDefinition {
  operation: string
  input: string
  output: string
  /** S0 pure, S1 read, S2 local write, S3 external effect. */
  effectGrade: 'S0' | 'S1' | 'S2' | 'S3'
  /** Named implementation, experiment, or trace contract supporting the law. */
  evidence: string
}

export interface CouplingKindSemantics {
  kind: CouplingKind
  name: string
  description: string
  portRoles?: Partial<Record<CouplingPort, CouplingPortSemantics>>
  dimensions?: readonly CouplingDimensionDefinition[]
  dynamics?: readonly CouplingDynamicsDefinition[]
}

/**
 * Serializable, revisioned semantics layered over structural coupling facts.
 * `includedKinds` is also the disclosed boundary-set definition: a profile may
 * intentionally omit Capsule when its local "brace" vocabulary excludes angle
 * boundaries.
 */
export interface CouplingSemanticsProfile {
  id: string
  revision: string
  status: CouplingProfileStatus
  includedKinds: readonly CouplingKind[]
  semantics: Partial<Record<CouplingKind, CouplingKindSemantics>>
}

export interface CouplingProfileIssue {
  path: string
  message: string
}

export interface CouplingSemanticsProjection {
  structure: CouplingFrame
  profile: {
    id: string
    revision: string
    status: CouplingProfileStatus
    boundarySet: PairedBoundaryKind[]
  }
  semantics: CouplingKindSemantics | null
  issues: CouplingProfileIssue[]
}

export interface OperatorCouplingFrameOptions {
  arity?: number
}

export interface BoundaryCouplingFrameOptions {
  occupancy?: CouplingOccupancy
  payload?: CouplingPayload
  actPlacement?: ActPlacement
}

export function couplingFrame(
  kind: 'couple',
  options?: OperatorCouplingFrameOptions,
): OperatorCouplingFrame
export function couplingFrame(
  kind: PairedBoundaryKind,
  occupancyOrOptions?: CouplingOccupancy | BoundaryCouplingFrameOptions,
): BoundaryCouplingFrame
export function couplingFrame(
  kind: CouplingKind,
  occupancyOrOptions: CouplingOccupancy | BoundaryCouplingFrameOptions | OperatorCouplingFrameOptions = {},
): CouplingFrame {
  if (kind === 'couple') {
    const options = typeof occupancyOrOptions === 'object'
      ? occupancyOrOptions as OperatorCouplingFrameOptions
      : {}
    return {
      kind,
      form: 'operator',
      surface: '<>',
      arity: Math.max(0, options.arity ?? 0),
    }
  }

  const descriptor = COUPLING_DESCRIPTORS[kind]
  const options: BoundaryCouplingFrameOptions =
    typeof occupancyOrOptions === 'string'
      ? { occupancy: occupancyOrOptions }
      : occupancyOrOptions as BoundaryCouplingFrameOptions
  const occupancy = options.occupancy ?? 'inhabited'

  return {
    kind,
    form: 'boundary',
    occupancy,
    payload: options.payload ?? (occupancy === 'empty' ? 'void' : 'term'),
    surface: occupancy === 'empty' ? descriptor.emptySurface : descriptor.surface,
    ...(options.actPlacement ? { actPlacement: options.actPlacement } : {}),
  }
}

export interface WithCouplingOptions {
  /** Override boundary occupancy. Ignored for the relation operator. */
  occupancy?: CouplingOccupancy
  /** Number of normalized interior values or operator operands. */
  argCount?: number
  /** Override boundary payload classification. */
  payload?: CouplingPayload
  /** ONF values used for automatic boundary payload classification. */
  args?: readonly PayloadArg[]
  /** Act placement relative to a paired boundary. */
  actPlacement?: ActPlacement
}

type PayloadArg = {
  sigil?: string
  frames?: Record<string, unknown>
  args?: readonly PayloadArg[]
}

/**
 * Classify a paired boundary's interior from normalized values.
 * Parameter wrappers are peeled so `[x]` is a term and `[!]` is an Act.
 */
export function classifyPayload(args: readonly PayloadArg[]): CouplingPayload {
  if (args.length === 0) return 'void'
  if (args.length >= 2) return 'multi'

  let only = args[0]
  if (
    only?.sigil === '=' &&
    only.frames?.reg === 'parameter' &&
    Array.isArray(only.args) &&
    only.args.length > 0
  ) {
    only = only.args[0]
  }

  const sigil = only?.sigil
  return sigil && sigil !== '_' ? 'act' : 'term'
}

/** Attach the structural coupling projection without changing register identity. */
export function withCoupling(
  frames: Record<string, unknown>,
  kind: CouplingKind,
  options: WithCouplingOptions = {},
): Record<string, unknown> {
  const descriptor = COUPLING_DESCRIPTORS[kind]
  const reg = typeof frames.reg === 'string' && frames.reg.length > 0
    ? frames.reg
    : descriptor.reg
  const argCount = options.argCount ?? options.args?.length ?? 0

  if (kind === 'couple') {
    return {
      ...frames,
      reg,
      coupling: couplingFrame('couple', { arity: argCount }),
    }
  }

  const occupancy = options.occupancy ?? (argCount === 0 ? 'empty' : 'inhabited')
  const payload = options.payload
    ?? (options.args ? classifyPayload(options.args) : occupancy === 'empty' ? 'void' : 'term')
  const actPlacement = options.actPlacement
    ?? (payload === 'act' ? 'interior' : undefined)

  return {
    ...frames,
    reg,
    coupling: couplingFrame(kind, {
      occupancy,
      payload,
      actPlacement,
    }),
  }
}

export function occupancyFromArgs(args: readonly unknown[]): CouplingOccupancy {
  return args.length === 0 ? 'empty' : 'inhabited'
}

export function couplingDescriptor(kind: CouplingKind): CouplingDescriptor {
  return COUPLING_DESCRIPTORS[kind]
}

/**
 * Resolve the common boundary coordinate for a delimiter surface. Exact token
 * classification still belongs to the lexer; notably, `<>` has no coordinate
 * here because it is the relation operator rather than two boundary tokens.
 */
export function boundaryCoordinateForSurface(
  surface: string,
): BoundarySurfaceCoordinate | undefined {
  for (const descriptor of Object.values(COUPLING_DESCRIPTORS)) {
    if (descriptor.form !== 'boundary') continue
    if (surface === descriptor.openSurface) {
      return { kind: descriptor.kind, form: 'boundary', side: 'open', surface }
    }
    if (surface === descriptor.closeSurface) {
      return { kind: descriptor.kind, form: 'boundary', side: 'close', surface }
    }
  }
  return undefined
}

export function boundarySetForProfile(
  profile: CouplingSemanticsProfile,
): PairedBoundaryKind[] {
  return profile.includedKinds.filter(
    (kind): kind is PairedBoundaryKind => kind !== 'couple',
  )
}

/** Validate profile traceability and prevent roles from attaching to invalid ports. */
export function validateCouplingSemanticsProfile(
  profile: CouplingSemanticsProfile,
): CouplingProfileIssue[] {
  const issues: CouplingProfileIssue[] = []
  if (profile.id.trim().length === 0) {
    issues.push({ path: 'id', message: 'profile id must be non-empty' })
  }
  if (profile.revision.trim().length === 0) {
    issues.push({ path: 'revision', message: 'profile revision must be non-empty' })
  }

  const included = new Set<CouplingKind>()
  for (const [index, kind] of profile.includedKinds.entries()) {
    if (!(kind in COUPLING_DESCRIPTORS)) {
      issues.push({ path: `includedKinds[${index}]`, message: `unknown coupling kind ${String(kind)}` })
    } else if (included.has(kind)) {
      issues.push({ path: `includedKinds[${index}]`, message: `duplicate coupling kind ${kind}` })
    }
    included.add(kind)
  }

  for (const [mapKind, semantics] of Object.entries(profile.semantics)) {
    if (!semantics) continue
    const kind = mapKind as CouplingKind
    const basePath = `semantics.${kind}`
    if (!included.has(kind)) {
      issues.push({ path: basePath, message: 'semantic entry is not present in includedKinds' })
    }
    if (semantics.kind !== kind) {
      issues.push({ path: `${basePath}.kind`, message: `expected ${kind}, received ${semantics.kind}` })
    }
    if (semantics.name.trim().length === 0 || semantics.description.trim().length === 0) {
      issues.push({ path: basePath, message: 'name and description must be non-empty' })
    }

    const allowedPorts = new Set<string>(COUPLING_DESCRIPTORS[kind].ports)
    for (const port of Object.keys(semantics.portRoles ?? {})) {
      if (!allowedPorts.has(port)) {
        issues.push({ path: `${basePath}.portRoles.${port}`, message: `port is not valid for ${kind}` })
      }
    }

    const dimensionIds = new Set<string>()
    for (const [index, dimension] of (semantics.dimensions ?? []).entries()) {
      const dimensionPath = `${basePath}.dimensions[${index}]`
      if (dimensionIds.has(dimension.id)) {
        issues.push({ path: `${dimensionPath}.id`, message: `duplicate dimension ${dimension.id}` })
      }
      dimensionIds.add(dimension.id)
      if (
        dimension.id.trim().length === 0 ||
        dimension.description.trim().length === 0 ||
        dimension.method.trim().length === 0 ||
        dimension.falsifier.trim().length === 0
      ) {
        issues.push({ path: dimensionPath, message: 'dimension fields must be non-empty' })
      }
    }

    for (const [index, dynamics] of (semantics.dynamics ?? []).entries()) {
      if (
        dynamics.operation.trim().length === 0 ||
        dynamics.input.trim().length === 0 ||
        dynamics.output.trim().length === 0 ||
        dynamics.evidence.trim().length === 0
      ) {
        issues.push({
          path: `${basePath}.dynamics[${index}]`,
          message: 'dynamics fields must be non-empty',
        })
      }
      if (profile.status !== 'operational' && dynamics.effectGrade !== 'S0') {
        issues.push({
          path: `${basePath}.dynamics[${index}].effectGrade`,
          message: 'write or external effects require an operational profile',
        })
      }
    }
  }

  return issues
}

/** Project named semantics without changing or replacing the structural frame. */
export function projectCouplingSemantics(
  structure: CouplingFrame,
  profile: CouplingSemanticsProfile,
): CouplingSemanticsProjection {
  const issues = validateCouplingSemanticsProfile(profile)
  const applies = profile.includedKinds.includes(structure.kind)

  return {
    structure,
    profile: {
      id: profile.id,
      revision: profile.revision,
      status: profile.status,
      boundarySet: boundarySetForProfile(profile),
    },
    semantics: applies ? profile.semantics[structure.kind] ?? null : null,
    issues,
  }
}

export function isBoundaryCouplingFrame(
  frame: CouplingFrame,
): frame is BoundaryCouplingFrame {
  return frame.form === 'boundary'
}

function isCouplingKind(value: unknown): value is CouplingKind {
  return typeof value === 'string' && value in COUPLING_DESCRIPTORS
}

/** Read and validate a structural coupling projection from an ONF frame map. */
export function readCouplingFrame(
  frames: Record<string, unknown> | undefined | null,
): CouplingFrame | undefined {
  const raw = frames?.coupling
  if (!raw || typeof raw !== 'object') return undefined

  const candidate = raw as Record<string, unknown>
  if (!isCouplingKind(candidate.kind)) return undefined

  if (candidate.form === 'operator' && candidate.kind === 'couple') {
    if (typeof candidate.arity !== 'number' || candidate.arity < 0) return undefined
    return candidate as unknown as OperatorCouplingFrame
  }

  if (candidate.form === 'boundary' && candidate.kind !== 'couple') {
    const occupancy = candidate.occupancy
    const payload = candidate.payload
    if (occupancy !== 'empty' && occupancy !== 'inhabited') return undefined
    if (!['void', 'space', 'act', 'term', 'multi'].includes(String(payload))) return undefined
    if (typeof candidate.surface !== 'string') return undefined
    return candidate as unknown as BoundaryCouplingFrame
  }

  return undefined
}
