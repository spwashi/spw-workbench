/**
 * Spw surface decorations — make Spw structure distinct from surrounding host code.
 *
 * Configurable layers (Settings → Spw → Surface):
 *   path refs, annotations, braces, operators
 *
 * Compute/cache (Settings → Spw → Compute / Cache):
 *   throttle for decoration refresh; optional geometry refresh on save
 */

import * as vscode from 'vscode'

export interface SurfaceDecorationConfig {
  highlightPathRefs: boolean
  highlightAnnotations: boolean
  highlightBraces: boolean
  highlightOperators: boolean
  refreshMs: number
  geometryOnSave: boolean
  probeCacheMs: number
}

const DEFAULTS: SurfaceDecorationConfig = {
  highlightPathRefs: true,
  highlightAnnotations: true,
  highlightBraces: true,
  highlightOperators: false,
  refreshMs: 120,
  geometryOnSave: false,
  probeCacheMs: 8_000,
}

export function readSurfaceConfig(): SurfaceDecorationConfig {
  const c = vscode.workspace.getConfiguration('spw')
  return {
    highlightPathRefs: c.get('surface.highlightPathRefs', DEFAULTS.highlightPathRefs),
    highlightAnnotations: c.get('surface.highlightAnnotations', DEFAULTS.highlightAnnotations),
    highlightBraces: c.get('surface.highlightBraces', DEFAULTS.highlightBraces),
    highlightOperators: c.get('surface.highlightOperators', DEFAULTS.highlightOperators),
    refreshMs: Math.max(40, c.get('compute.decorationRefreshMs', DEFAULTS.refreshMs)),
    geometryOnSave: c.get('compute.geometryOnSave', DEFAULTS.geometryOnSave),
    probeCacheMs: Math.max(0, c.get('cache.probeTtlMs', DEFAULTS.probeCacheMs)),
  }
}

/** Simple TTL cache for expensive client probes (geometry / frequency). */
export class ProbeCache {
  private readonly map = new Map<string, { at: number; value: unknown }>()

  constructor(private ttlMs: number) {}

  setTtl(ms: number): void {
    this.ttlMs = ms
  }

  get<T>(key: string): T | undefined {
    if (this.ttlMs <= 0) return undefined
    const hit = this.map.get(key)
    if (!hit) return undefined
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(key)
      return undefined
    }
    return hit.value as T
  }

  set(key: string, value: unknown): void {
    if (this.ttlMs <= 0) return
    this.map.set(key, { at: Date.now(), value })
  }

  clear(): void {
    this.map.clear()
  }
}

export function registerSurfaceDecorations(
  probeCache: ProbeCache,
  onGeometrySave?: (doc: vscode.TextDocument) => void,
): vscode.Disposable[] {
  const pathDeco = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor('spw.pathRef'),
    fontStyle: 'italic',
    overviewRulerColor: new vscode.ThemeColor('spw.pathRef'),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  })
  const annotDeco = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor('spw.annotation'),
    fontWeight: '600',
  })
  const braceDeco = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor('spw.brace'),
    fontWeight: '700',
  })
  const opDeco = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor('spw.operator'),
    fontWeight: '600',
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let cfg = readSurfaceConfig()
  probeCache.setTtl(cfg.probeCacheMs)

  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => refreshAll(), cfg.refreshMs)
  }

  const refreshAll = (): void => {
    cfg = readSurfaceConfig()
    probeCache.setTtl(cfg.probeCacheMs)
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.languageId === 'spw') apply(editor)
    }
  }

  const apply = (editor: vscode.TextEditor): void => {
    const text = editor.document.getText()
    const pathRanges: vscode.DecorationOptions[] = []
    const annotRanges: vscode.DecorationOptions[] = []
    const braceRanges: vscode.DecorationOptions[] = []
    const opRanges: vscode.DecorationOptions[] = []

    if (cfg.highlightPathRefs) {
      const re = /~(?:"[^"]*"|'[^']*'|<[^>]+>)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        pathRanges.push({
          range: rangeOf(editor.document, m.index, m[0].length),
          hoverMessage: 'Spw path ref (surface)',
        })
      }
      const rootRe = /@[A-Za-z_][\w-]*(?:\/[^\s"'`)\]},;]+)*/g
      while ((m = rootRe.exec(text)) !== null) {
        pathRanges.push({
          range: rangeOf(editor.document, m.index, m[0].length),
          hoverMessage: 'Spw @root ref (surface)',
        })
      }
    }

    if (cfg.highlightAnnotations) {
      const re = /(?:##>|#!|#:|#>|#)[a-zA-Z_][\w]*/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        annotRanges.push({
          range: rangeOf(editor.document, m.index, m[0].length),
          hoverMessage: 'Spw annotation (surface)',
        })
      }
    }

    if (cfg.highlightBraces) {
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]!
        if ('{}[]()<>'.includes(ch)) {
          braceRanges.push({
            range: rangeOf(editor.document, i, 1),
            hoverMessage: 'Spw bound (geometry)',
          })
        }
      }
    }

    if (cfg.highlightOperators) {
      const ops = new Set(['^', '!', '?', '~', '*', '=', '@', '#', '.', '&', '$', '%'])
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]!
        if (ops.has(ch)) {
          opRanges.push({
            range: rangeOf(editor.document, i, 1),
            hoverMessage: 'Spw operator (geometry)',
          })
        }
      }
    }

    editor.setDecorations(pathDeco, pathRanges)
    editor.setDecorations(annotDeco, annotRanges)
    editor.setDecorations(braceDeco, braceRanges)
    editor.setDecorations(opDeco, opRanges)
  }

  schedule()

  return [
    pathDeco,
    annotDeco,
    braceDeco,
    opDeco,
    vscode.window.onDidChangeActiveTextEditor(() => schedule()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'spw') schedule()
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('spw')) {
        probeCache.clear()
        schedule()
      }
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== 'spw') return
      const c = readSurfaceConfig()
      if (c.geometryOnSave && onGeometrySave) onGeometrySave(doc)
    }),
    new vscode.Disposable(() => {
      if (timer) clearTimeout(timer)
    }),
  ]
}

function rangeOf(doc: vscode.TextDocument, start: number, length: number): vscode.Range {
  const s = doc.positionAt(start)
  const e = doc.positionAt(start + length)
  return new vscode.Range(s, e)
}
