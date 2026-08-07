import type { WorkspaceRootManifestDiagnosticCode } from '@spwashi/spw-seed'

export const SPW_WORKSPACE_MANIFEST_METHOD_V1 = 'spw/workspaceManifest/v1' as const
export const SPW_WORKSPACE_MANIFEST_SCHEMA_VERSION = 1 as const
export const SPW_WORKSPACE_MANIFEST_SURFACE = 'spw.workspaceManifest' as const

export type SpwWorkspaceMode = 'canonical' | 'mounted-consumer' | 'standalone-consumer'
export type SpwWorkspaceRootSource = 'manifest' | 'fallback' | 'blocked'
export type SpwWorkspaceRootRole = 'consumer' | 'canonical' | 'infrastructure' | 'external'
export type SpwWorkspacePathKind = 'directory' | 'file' | 'missing' | 'other' | 'unreadable'

export type SpwWorkspaceManifestReadSource =
  | { kind: 'open-document'; version: number }
  | { kind: 'filesystem' }

export type SpwWorkspaceManifestDiagnosticCode =
  | WorkspaceRootManifestDiagnosticCode
  | 'manifest_unreadable'
  | 'invalid_workbench_root'

interface SpwWorkspaceManifestDiagnosticBase {
  message: string
  sigil?: string
}

export type SpwWorkspaceParserDiagnostic = SpwWorkspaceManifestDiagnosticBase & {
  source: 'parser'
  code: WorkspaceRootManifestDiagnosticCode
}

export type SpwWorkspaceFilesystemDiagnostic = SpwWorkspaceManifestDiagnosticBase & {
  source: 'filesystem'
  code: 'manifest_unreadable'
}

export type SpwWorkspaceAuthorityDiagnostic = SpwWorkspaceManifestDiagnosticBase & {
  source: 'authority'
  code: 'invalid_workbench_root'
}

export type SpwWorkspaceManifestDiagnostic =
  | SpwWorkspaceParserDiagnostic
  | SpwWorkspaceFilesystemDiagnostic
  | SpwWorkspaceAuthorityDiagnostic

export type SpwWorkspaceInvalidManifestDiagnostic =
  | SpwWorkspaceParserDiagnostic
  | SpwWorkspaceAuthorityDiagnostic

interface SpwWorkspaceManifestEvidenceBase {
  uri: string
  diagnostics: SpwWorkspaceManifestDiagnostic[]
}

export interface SpwWorkspaceManifestAbsentEvidence extends SpwWorkspaceManifestEvidenceBase {
  status: 'absent'
  readFrom: { kind: 'filesystem' }
  diagnostics: []
}

export interface SpwWorkspaceManifestValidEvidence extends SpwWorkspaceManifestEvidenceBase {
  status: 'valid'
  readFrom: SpwWorkspaceManifestReadSource
  diagnostics: []
}

export interface SpwWorkspaceManifestInvalidEvidence extends SpwWorkspaceManifestEvidenceBase {
  status: 'invalid'
  readFrom: SpwWorkspaceManifestReadSource
  diagnostics: [SpwWorkspaceInvalidManifestDiagnostic, ...SpwWorkspaceInvalidManifestDiagnostic[]]
}

export interface SpwWorkspaceManifestUnreadableEvidence extends SpwWorkspaceManifestEvidenceBase {
  status: 'unreadable'
  readFrom: { kind: 'filesystem' }
  diagnostics: [SpwWorkspaceFilesystemDiagnostic, ...SpwWorkspaceFilesystemDiagnostic[]]
}

export type SpwWorkspaceManifestEvidence =
  | SpwWorkspaceManifestAbsentEvidence
  | SpwWorkspaceManifestValidEvidence
  | SpwWorkspaceManifestInvalidEvidence
  | SpwWorkspaceManifestUnreadableEvidence

interface SpwWorkspaceIdentityBase {
  consumerUri: string
  spwUri: string
}

export type SpwWorkspaceIdentity =
  | SpwWorkspaceIdentityBase & {
      mode: 'canonical' | 'mounted-consumer'
      workbenchUri: string
    }
  | SpwWorkspaceIdentityBase & {
      mode: 'standalone-consumer'
      workbenchUri: null
    }

export interface SpwWorkspaceRootEvidence {
  sigil: string
  uri: string
  role: SpwWorkspaceRootRole
  kind: SpwWorkspacePathKind
}

interface SpwWorkspaceAuthorityEvidenceBase {
  workspace: SpwWorkspaceIdentity
}

export type SpwWorkspaceAuthorityEvidence =
  | SpwWorkspaceAuthorityEvidenceBase & {
      manifest: SpwWorkspaceManifestValidEvidence
      rootSource: 'manifest'
      roots: [SpwWorkspaceRootEvidence, ...SpwWorkspaceRootEvidence[]]
    }
  | SpwWorkspaceAuthorityEvidenceBase & {
      manifest: SpwWorkspaceManifestAbsentEvidence
      rootSource: 'fallback'
      roots: [SpwWorkspaceRootEvidence, ...SpwWorkspaceRootEvidence[]]
    }
  | SpwWorkspaceAuthorityEvidenceBase & {
      manifest: SpwWorkspaceManifestInvalidEvidence | SpwWorkspaceManifestUnreadableEvidence
      rootSource: 'blocked'
      roots: []
    }

interface SpwWorkspaceManifestHeaderV1 {
  schemaVersion: typeof SPW_WORKSPACE_MANIFEST_SCHEMA_VERSION
  surface: typeof SPW_WORKSPACE_MANIFEST_SURFACE
}

/** URI-first, evidence-bearing workspace identity for editor and agent clients. */
export type SpwWorkspaceManifestV1 = SpwWorkspaceManifestHeaderV1 & SpwWorkspaceAuthorityEvidence

const MANIFEST_DIAGNOSTIC_CODES = {
  parse_error: true,
  missing_roots_frame: true,
  unterminated_roots_frame: true,
  empty_roots_frame: true,
  invalid_root_declaration: true,
  duplicate_root_sigil: true,
  manifest_unreadable: true,
  invalid_workbench_root: true,
} as const satisfies Record<SpwWorkspaceManifestDiagnosticCode, true>

const ROOT_ROLES = {
  consumer: true,
  canonical: true,
  infrastructure: true,
  external: true,
} as const satisfies Record<SpwWorkspaceRootRole, true>

const PATH_KINDS = {
  directory: true,
  file: true,
  missing: true,
  other: true,
  unreadable: true,
} as const satisfies Record<SpwWorkspacePathKind, true>

/** Validate untrusted editor transport data before it enters client state. */
export function parseSpwWorkspaceManifestV1(value: unknown): SpwWorkspaceManifestV1 {
  if (!isSpwWorkspaceManifestV1(value)) {
    throw new Error('Invalid spw.workspaceManifest v1 payload.')
  }
  return value
}

export function isSpwWorkspaceManifestV1(value: unknown): value is SpwWorkspaceManifestV1 {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['schemaVersion', 'surface', 'workspace', 'manifest', 'rootSource', 'roots'])) {
    return false
  }
  const workspace = value.workspace
  if (
    value.schemaVersion !== SPW_WORKSPACE_MANIFEST_SCHEMA_VERSION ||
    value.surface !== SPW_WORKSPACE_MANIFEST_SURFACE ||
    !isWorkspaceIdentity(workspace) ||
    !isManifestEvidence(value.manifest) ||
    !Array.isArray(value.roots) ||
    !value.roots.every(isWorkspaceRoot)
  ) {
    return false
  }

  const rolesMatchMode = value.roots.every((root) =>
    workspace.mode === 'canonical'
      ? root.role === 'canonical' || root.role === 'external'
      : workspace.mode === 'mounted-consumer'
        ? root.role !== 'canonical'
        : root.role === 'consumer' || root.role === 'external',
  )
  if (!rolesMatchMode) return false

  const sigils = new Set(value.roots.map((root) => root.sigil))
  if (sigils.size !== value.roots.length) return false
  if (workspace.mode === 'canonical' && workspace.workbenchUri !== workspace.consumerUri) {
    return false
  }
  if (workspace.mode === 'mounted-consumer' && value.rootSource !== 'blocked') {
    const workbench = value.roots.find((root) => root.sigil === 'workbench')
    if (
      !workbench ||
      workbench.uri !== workspace.workbenchUri ||
      workbench.role !== 'infrastructure'
    ) {
      return false
    }
  }

  if (value.rootSource === 'manifest') {
    return value.manifest.status === 'valid' && value.roots.length > 0
  }
  if (value.rootSource === 'fallback') {
    return value.manifest.status === 'absent' && fallbackMatchesWorkspace(workspace, value.roots)
  }
  if (value.rootSource === 'blocked') {
    return (value.manifest.status === 'invalid' || value.manifest.status === 'unreadable') &&
      value.roots.length === 0
  }
  return false
}

function fallbackMatchesWorkspace(
  workspace: SpwWorkspaceIdentity,
  roots: SpwWorkspaceRootEvidence[],
): boolean {
  const spw = roots.find((root) => root.sigil === 'spw')
  if (!spw || spw.uri !== workspace.spwUri) return false
  if (workspace.mode === 'canonical') {
    return roots.length === 1 && spw.role === 'canonical'
  }
  if (workspace.mode === 'standalone-consumer') {
    return roots.length === 1 && spw.role === 'consumer'
  }
  const workbench = roots.find((root) => root.sigil === 'workbench')
  return roots.length === 2 &&
    spw.role === 'consumer' &&
    workbench?.uri === workspace.workbenchUri &&
    workbench.role === 'infrastructure'
}

function isWorkspaceIdentity(value: unknown): value is SpwWorkspaceIdentity {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['mode', 'consumerUri', 'spwUri', 'workbenchUri'])) return false
  if (!isUri(value.consumerUri) || !isUri(value.spwUri)) return false
  if (value.mode === 'standalone-consumer') return value.workbenchUri === null
  return (value.mode === 'canonical' || value.mode === 'mounted-consumer') &&
    isUri(value.workbenchUri)
}

function isManifestEvidence(value: unknown): value is SpwWorkspaceManifestEvidence {
  if (!isRecord(value) || !isUri(value.uri) || !Array.isArray(value.diagnostics)) {
    return false
  }
  if (!hasOnlyKeys(value, ['status', 'uri', 'readFrom', 'diagnostics'])) return false
  if (!value.diagnostics.every(isManifestDiagnostic)) return false

  if (value.status === 'absent') {
    return isFilesystemRead(value.readFrom) && value.diagnostics.length === 0
  }
  if (value.status === 'valid') {
    return isManifestReadSource(value.readFrom) && value.diagnostics.length === 0
  }
  if (value.status === 'invalid') {
    return isManifestReadSource(value.readFrom) &&
      value.diagnostics.length > 0 &&
      value.diagnostics.every((diagnostic) => diagnostic.source !== 'filesystem')
  }
  if (value.status === 'unreadable') {
    return isFilesystemRead(value.readFrom) &&
      value.diagnostics.length > 0 &&
      value.diagnostics.every((diagnostic) => diagnostic.source === 'filesystem')
  }
  return false
}

function isManifestReadSource(value: unknown): value is SpwWorkspaceManifestReadSource {
  return isFilesystemRead(value) || (
    isRecord(value) &&
    hasOnlyKeys(value, ['kind', 'version']) &&
    value.kind === 'open-document' &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    value.version >= -2_147_483_648 &&
    value.version <= 2_147_483_647
  )
}

function isFilesystemRead(value: unknown): value is { kind: 'filesystem' } {
  return isRecord(value) &&
    hasOnlyKeys(value, ['kind']) &&
    value.kind === 'filesystem'
}

function isManifestDiagnostic(value: unknown): value is SpwWorkspaceManifestDiagnostic {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['source', 'code', 'message', 'sigil'])) return false
  if (
    typeof value.code !== 'string' ||
    !Object.hasOwn(MANIFEST_DIAGNOSTIC_CODES, value.code) ||
    typeof value.message !== 'string' ||
    (value.sigil !== undefined && typeof value.sigil !== 'string')
  ) {
    return false
  }
  if (value.source === 'filesystem') return value.code === 'manifest_unreadable'
  if (value.source === 'authority') return value.code === 'invalid_workbench_root'
  return value.source === 'parser' &&
    value.code !== 'manifest_unreadable' &&
    value.code !== 'invalid_workbench_root'
}

function isWorkspaceRoot(value: unknown): value is SpwWorkspaceRootEvidence {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['sigil', 'uri', 'role', 'kind'])) return false
  return isWorkspaceSigil(value.sigil) &&
    isUri(value.uri) &&
    typeof value.role === 'string' &&
    Object.hasOwn(ROOT_ROLES, value.role) &&
    typeof value.kind === 'string' &&
    Object.hasOwn(PATH_KINDS, value.kind)
}

function isWorkspaceSigil(value: unknown): value is string {
  return typeof value === 'string' &&
    value !== '_' &&
    /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isUri(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
