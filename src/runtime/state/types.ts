export type RegisterAccessMode =
  | 'kinetic'
  | 'structural'
  | 'deferred'
  | 'conditional'
  | 'resolved'
  | 'property'
  | 'perspective'
  | 'category'
  | 'confluent'
  | 'material'
  | 'ratio'
  | 'context'

export type ContainerAffinity =
  | 'void'
  | 'promote'
  | 'block'
  | 'conditional'
  | 'value'
  | 'property'
  | 'perspective'
  | 'category'
  | 'merge'
  | 'meta'
  | 'scalar'
  | 'stream'
  | 'capsule'

export interface RegisterDescriptor {
  name: string
  accessMode: RegisterAccessMode
  containerAffinity: ContainerAffinity
}

export type RuntimeScalar = string | number | boolean | null

export interface RuntimeRecord {
  [key: string]: RuntimeValue
}

export interface ScopeFrame {
  observer: string
  value: RuntimeValue
  capturedAt: string
}

export interface RuntimePacket {
  kind: 'selection' | 'node' | 'landmark' | 'html' | 'operator' | 'runtime'
  concept?: string
  scene?: string
  mode?: string
  definition?: string
  sourceRef?: string
  payload?: RuntimeValue
  tags?: string[]
}

export type RuntimeValue = RuntimeScalar | RuntimeRecord | RuntimeValue[] | RuntimePacket | ScopeFrame | undefined

export interface RegisterMeta {
  key: string
  descriptor: RegisterDescriptor
  writes: number
  lastUsedAt: string
  immutable: boolean
  provenance: string[]
  lenses: string[]
}

export interface RegisterEntry {
  key: string
  value: RuntimeValue
  meta: RegisterMeta
}

export interface RegisterWriteOptions {
  source?: string
  immutable?: boolean
  descriptor?: Partial<RegisterDescriptor>
  force?: boolean
}

export interface RegisterSnapshot {
  activeKey: string
  entries: Record<string, RegisterEntry>
  lensIndex: Record<string, string[]>
}
