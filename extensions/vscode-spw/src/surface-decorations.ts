/**
 * Spw surface decorations — make Spw structure semantically visible.
 *
 * ## Exclusion mask
 * String literals and // line comments are masked before any pattern runs.
 * This prevents sigils inside string values from being falsely decorated.
 *
 * ## Compound detection
 * Certain multi-character constructs are detected first and decorated as unified
 * units; constituent characters are then skipped in the operator scan:
 *   ~#word:?  → phasePotential (mint)  — tilde-hash property key
 *   =exp[     → phaseAction (orange)   — experiment slot tag
 *
 * ## Operator phases (one decoration type per sigil)
 *   ?  → phaseWonder     (teal)        — probe / explore
 *   !  → phaseAction     (orange)      — fire / inject
 *   ^  → phaseIntegration (purple)     — synthesis / frame
 *   @  → phaseObserver   (sky blue)    — scope / perspective
 *   ~  → phasePotential  (mint)        — defer / wavefunction  [skipped in compounds]
 *   *  → brace           (gold)        — collapse / crystallize
 *   =  → tierWarm        (amber)       — constraint / bias     [skipped in compounds]
 *   &  → topic           (light blue)  — confluence / merge
 *   $  → phaseMeta       (blue)        — schema reference
 *   %  → operator        (muted teal)  — measure / scalar
 *   #  → [handled by annotation layer — skip here]
 *   .  → [structural punctuation — not decorated]
 *
 * ## Annotation types
 *   ##>   → promptRoot   (purple)  — navigation landmark + left ruler
 *   #!    → intent       (orange)  — injection + left ruler
 *   #:    → lens         (teal)    — probe / measurement + left ruler
 *   #>    → anchor       (red)     — framing + left ruler
 *   #word → topic        (blue)    — generic label
 *
 * ## Semantic constructs
 *   |word   → lens       (teal, italic)   — open pipe label / block type
 *   |^word  → phaseIntegration (purple)   — close pipe label / integration marker
 *   charge: → phaseAction (orange)        — prescriptive key
 *   status: implemented* → phaseWonder    — boon tier
 *   status: partial*     → tierWarm       — in-progress tier
 *   status: proposed*    → phaseMeta      — speculative tier
 *   status: deprecated*  → anchor (red)   — dead tier
 */

import * as vscode from 'vscode'
import type { ProbeCache } from './instruments/probe-cache'

export interface SurfaceDecorationConfig {
  highlightPathRefs: boolean
  highlightAnnotations: boolean
  highlightBraces: boolean
  highlightOperators: boolean
  highlightSemantics: boolean
  refreshMs: number
  geometryOnSave: boolean
  probeCacheMs: number
}

const DEFAULTS: SurfaceDecorationConfig = {
  highlightPathRefs: true,
  highlightAnnotations: true,
  highlightBraces: true,
  highlightOperators: true,
  highlightSemantics: true,
  refreshMs: 120,
  geometryOnSave: false,
  probeCacheMs: 8_000,
}

export function readSurfaceConfig(): SurfaceDecorationConfig {
  const c = vscode.workspace.getConfiguration('spw')
  return {
    highlightPathRefs:   c.get('surface.highlightPathRefs',   DEFAULTS.highlightPathRefs),
    highlightAnnotations: c.get('surface.highlightAnnotations', DEFAULTS.highlightAnnotations),
    highlightBraces:     c.get('surface.highlightBraces',     DEFAULTS.highlightBraces),
    highlightOperators:  c.get('surface.highlightOperators',  DEFAULTS.highlightOperators),
    highlightSemantics:  c.get('surface.highlightSemantics',  DEFAULTS.highlightSemantics),
    refreshMs:      Math.max(40, c.get('compute.decorationRefreshMs', DEFAULTS.refreshMs)),
    geometryOnSave: c.get('compute.geometryOnSave', DEFAULTS.geometryOnSave),
    probeCacheMs:   Math.max(0, c.get('cache.probeTtlMs',     DEFAULTS.probeCacheMs)),
  }
}

// ── Exclusion mask ────────────────────────────────────────────────
/**
 * Returns a byte mask where 1 means "inside a string literal or // comment".
 * All pattern scans gate on this mask to avoid false matches.
 */
function buildExclusionMask(text: string): Uint8Array {
  const mask = new Uint8Array(text.length)
  let i = 0
  while (i < text.length) {
    const ch = text[i]!
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch
      mask[i++] = 1
      while (i < text.length) {
        mask[i] = 1
        if (text[i] === '\\') { i += 2; continue }
        if (text[i++] === q) break
      }
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') mask[i++] = 1
    } else {
      i++
    }
  }
  return mask
}

// ── Compound mask ─────────────────────────────────────────────────
/**
 * Finds compound constructs that should be decorated as unified units.
 * Returns a Uint8Array where positions covered by a compound are marked:
 *   1 = tilde-hash property key (~#word:?)
 *   2 = experiment slot tag (=exp[)
 * Operator scan skips positions marked here.
 */
function buildCompoundMask(text: string, excl: Uint8Array): { mask: Uint8Array; tildeHash: vscode.Range[]; expSlot: vscode.Range[] } {
  const mask = new Uint8Array(text.length)
  const tildeHash: vscode.Range[] = []
  const expSlot: vscode.Range[] = []

  const thRe = /~#[a-zA-Z_]\w*:?/g
  let m: RegExpExecArray | null
  while ((m = thRe.exec(text)) !== null) {
    if (excl[m.index]) continue
    for (let k = m.index; k < m.index + m[0].length; k++) mask[k] = 1
    tildeHash.push(offsetRange(text, m.index, m[0].length))
  }

  const expRe = /=exp\[/g
  while ((m = expRe.exec(text)) !== null) {
    if (excl[m.index]) continue
    // Color only `=exp`, not the `[` (brace layer handles that)
    const len = 4 // `=exp`
    for (let k = m.index; k < m.index + len; k++) mask[k] = 2
    expSlot.push(offsetRange(text, m.index, len))
  }

  return { mask, tildeHash, expSlot }
}

// ── Status tier ───────────────────────────────────────────────────
type StatusTier = 'implemented' | 'partial' | 'proposed' | 'deprecated'

function classifyStatus(value: string): StatusTier | null {
  const v = value.toLowerCase()
  if (v.startsWith('implemented')) return 'implemented'
  if (v.startsWith('partial'))     return 'partial'
  if (v.startsWith('proposed'))    return 'proposed'
  if (v.startsWith('deprecated'))  return 'deprecated'
  return null
}

// ── Helpers ───────────────────────────────────────────────────────
function offsetRange(text: string, start: number, length: number): vscode.Range {
  let line = 0, col = 0
  for (let i = 0; i < start; i++) {
    if (text[i] === '\n') { line++; col = 0 } else { col++ }
  }
  const startPos = new vscode.Position(line, col)
  let eLine = line, eCol = col
  for (let i = start; i < start + length; i++) {
    if (text[i] === '\n') { eLine++; eCol = 0 } else { eCol++ }
  }
  return new vscode.Range(startPos, new vscode.Position(eLine, eCol))
}

function rangeOf(doc: vscode.TextDocument, start: number, length: number): vscode.Range {
  return new vscode.Range(doc.positionAt(start), doc.positionAt(start + length))
}

// ── Decoration factory ────────────────────────────────────────────
function deco(color: string, opts?: { italic?: boolean; bold?: boolean; ruler?: 'left' | 'right' }): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor(color),
    fontWeight: opts?.bold ? '700' : opts?.italic ? '400' : '600',
    fontStyle: opts?.italic ? 'italic' : undefined,
    ...(opts?.ruler === 'left' ? {
      overviewRulerColor: new vscode.ThemeColor(color),
      overviewRulerLane: vscode.OverviewRulerLane.Left,
    } : opts?.ruler === 'right' ? {
      overviewRulerColor: new vscode.ThemeColor(color),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    } : {}),
  })
}

// ── Registration ──────────────────────────────────────────────────
export function registerSurfaceDecorations(
  probeCache: ProbeCache,
  onGeometrySave?: (doc: vscode.TextDocument) => void,
): vscode.Disposable[] {

  // Path refs
  const pathDeco = deco('spw.pathRef', { italic: true, ruler: 'right' })

  // Annotations (per-type, left ruler for orientation)
  const annotDecos = {
    promptRoot: deco('spw.promptRoot', { bold: true, ruler: 'left' }),
    intent:     deco('spw.intent',     { ruler: 'left' }),
    lens:       deco('spw.lens',       { ruler: 'left' }),
    anchor:     deco('spw.anchor',     { ruler: 'left' }),
    topic:      deco('spw.topic'),
  }

  // Braces
  const braceDeco = deco('spw.brace', { bold: true })

  // Operators — one type per sigil phase
  const opDecos = {
    wonder:      deco('spw.phaseWonder'),      // ?
    action:      deco('spw.phaseAction'),      // !
    frame:       deco('spw.phaseIntegration'), // ^ (now purple)
    observer:    deco('spw.phaseObserver'),    // @ (sky blue)
    potential:   deco('spw.phasePotential'),   // ~ (mint)
    collapse:    deco('spw.brace'),            // * (gold — crystallized bound)
    constraint:  deco('spw.tierWarm'),         // = (amber — forcing state)
    merge:       deco('spw.topic'),            // & (light blue — confluence)
    schema:      deco('spw.phaseMeta'),        // $ (blue)
    residual:    deco('spw.operator'),         // % (muted teal — receding)
  }

  // Compounds
  const compoundDecos = {
    tildeHash: deco('spw.phasePotential', { italic: true }), // ~#word: unified key
    expSlot:   deco('spw.phaseAction'),                      // =exp tag
  }

  // Semantics & Valences
  const semanticDecos = {
    pipeLabelOpen:    deco('spw.lens',             { italic: true }), // |word
    pipeLabelClose:   deco('spw.phaseIntegration', { italic: true }), // |^word
    chargeKey:        deco('spw.phaseAction'),                        // charge:
    statusImpl:       deco('spw.valenceBoon'),                        // implemented* (boon)
    statusPartial:    deco('spw.valenceBone'),                        // partial* (bone)
    statusProposed:   deco('spw.phaseMeta'),                          // proposed*
    statusDeprecated: deco('spw.valenceBane'),                       // deprecated* (bane)
    valenceBoon:      deco('spw.valenceBoon',      { bold: true }),   // !boon
    valenceBane:      deco('spw.valenceBane',      { bold: true }),   // !bane
    valenceBone:      deco('spw.valenceBone',      { bold: true }),   // !bone
    valenceBonk:      deco('spw.valenceBonk',      { bold: true }),   // !bonk
    valenceHonk:      deco('spw.valenceHonk',      { bold: true }),   // !honk
  }

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
    const doc  = editor.document
    const text = doc.getText()

    // Build exclusion mask (strings + // comments) first
    const excl = buildExclusionMask(text)

    // Build compound mask + collect compound ranges
    const { mask: compMask, tildeHash: tildeHashRanges, expSlot: expSlotRanges } = buildCompoundMask(text, excl)

    // Track path ref positions to avoid double-decorating @root as operator
    const pathRefOffsets = new Set<number>()

    // ── Path refs ──
    const pathRanges: vscode.DecorationOptions[] = []
    if (cfg.highlightPathRefs) {
      const re = /~(?:"[^"]*"|'[^']*'|<[^>]+>)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        if (excl[m.index]) continue
        pathRanges.push({ range: rangeOf(doc, m.index, m[0].length), hoverMessage: 'Spw path ref' })
        for (let k = m.index; k < m.index + m[0].length; k++) pathRefOffsets.add(k)
      }
      const rootRe = /@[A-Za-z_][\w-]*(?:\/[^\s"'`)\]},;]+)*/g
      while ((m = rootRe.exec(text)) !== null) {
        if (excl[m.index]) continue
        pathRanges.push({ range: rangeOf(doc, m.index, m[0].length), hoverMessage: 'Spw @root ref' })
        for (let k = m.index; k < m.index + m[0].length; k++) pathRefOffsets.add(k)
      }
    }

    // ── Annotations ──
    const annotRanges = { promptRoot: [] as vscode.DecorationOptions[], intent: [], lens: [], anchor: [], topic: [] } as Record<string, vscode.DecorationOptions[]>
    if (cfg.highlightAnnotations) {
      const re = /(?:(##>)|(#!)|(#:)|(#>)|(#[a-zA-Z_]\w*))/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        if (excl[m.index] || compMask[m.index]) continue
        const range = rangeOf(doc, m.index, m[0].length)
        if (m[1])      annotRanges.promptRoot!.push({ range, hoverMessage: 'prompt-root anchor (##>)' })
        else if (m[2]) annotRanges.intent!.push({ range, hoverMessage: 'intent annotation (#!)' })
        else if (m[3]) annotRanges.lens!.push({ range, hoverMessage: 'lens annotation (#:)' })
        else if (m[4]) annotRanges.anchor!.push({ range, hoverMessage: 'anchor annotation (#>)' })
        else if (m[5]) annotRanges.topic!.push({ range, hoverMessage: 'topic annotation' })
      }
    }

    // ── Braces ──
    const braceRanges: vscode.DecorationOptions[] = []
    if (cfg.highlightBraces) {
      for (let i = 0; i < text.length; i++) {
        if (excl[i]) continue
        if ('{}[]()<>'.includes(text[i]!)) braceRanges.push({ range: rangeOf(doc, i, 1) })
      }
    }

    // ── Operators ──
    const opRanges = {
      wonder: [], action: [], frame: [], observer: [],
      potential: [], collapse: [], constraint: [],
      merge: [], schema: [], residual: [],
    } as Record<string, vscode.DecorationOptions[]>

    if (cfg.highlightOperators) {
      for (let i = 0; i < text.length; i++) {
        if (excl[i] || compMask[i] || pathRefOffsets.has(i)) continue
        const ch = text[i]!
        const r  = { range: rangeOf(doc, i, 1) }
        switch (ch) {
          case '?': opRanges.wonder!.push(r);      break
          case '!': opRanges.action!.push(r);      break
          case '^': opRanges.frame!.push(r);       break
          case '@': opRanges.observer!.push(r);    break
          case '~': opRanges.potential!.push(r);   break
          case '*': opRanges.collapse!.push(r);    break
          case '=': opRanges.constraint!.push(r);  break
          case '&': opRanges.merge!.push(r);       break
          case '$': opRanges.schema!.push(r);      break
          case '%': opRanges.residual!.push(r);    break
          // # handled by annotation layer; . excluded (structural noise)
        }
      }
    }

    // ── Semantics ──
    const semRanges = {
      pipeLabelOpen: [], pipeLabelClose: [], chargeKey: [],
      statusImpl: [], statusPartial: [], statusProposed: [], statusDeprecated: [],
      valenceBoon: [], valenceBane: [], valenceBone: [], valenceBonk: [], valenceHonk: [],
    } as Record<string, vscode.DecorationOptions[]>

    if (cfg.highlightSemantics) {
      let m: RegExpExecArray | null

      // Charged valence particles: !boon !bane !bone !bonk !honk
      const valenceRe = /!(boon|bane|bone|bonk|honk)\b/g
      while ((m = valenceRe.exec(text)) !== null) {
        if (excl[m.index]) continue
        const range = rangeOf(doc, m.index, m[0].length)
        const kind = m[1]!
        const hoverMessage = `Spw valence: !${kind}`
        switch (kind) {
          case 'boon': semRanges.valenceBoon!.push({ range, hoverMessage }); break
          case 'bane': semRanges.valenceBane!.push({ range, hoverMessage }); break
          case 'bone': semRanges.valenceBone!.push({ range, hoverMessage }); break
          case 'bonk': semRanges.valenceBonk!.push({ range, hoverMessage }); break
          case 'honk': semRanges.valenceHonk!.push({ range, hoverMessage }); break
        }
      }

      // Pipe labels: |^word (close) vs |word (open)
      const pipeRe = /\|(\^)?([a-zA-Z_]\w*)/g
      while ((m = pipeRe.exec(text)) !== null) {
        if (excl[m.index] || compMask[m.index]) continue
        const range = rangeOf(doc, m.index, m[0].length)
        if (m[1]) semRanges.pipeLabelClose!.push({ range, hoverMessage: `block close |^${m[2]}` })
        else      semRanges.pipeLabelOpen!.push({ range, hoverMessage: `block type |${m[2]}` })
      }

      // charge: key
      const chargeRe = /\bcharge:/g
      while ((m = chargeRe.exec(text)) !== null) {
        if (excl[m.index]) continue
        semRanges.chargeKey!.push({ range: rangeOf(doc, m.index, m[0].length), hoverMessage: 'prescriptive charge' })
      }

      // status: <value>
      const statusRe = /\bstatus:\s*(\S+)/g
      while ((m = statusRe.exec(text)) !== null) {
        if (excl[m.index]) continue
        const val = m[1]!
        const valStart = m.index + m[0].indexOf(val)
        const range = rangeOf(doc, valStart, val.length)
        switch (classifyStatus(val)) {
          case 'implemented': semRanges.statusImpl!.push({ range, hoverMessage: 'status: boon tier' });       break
          case 'partial':     semRanges.statusPartial!.push({ range, hoverMessage: 'status: in-progress' });  break
          case 'proposed':    semRanges.statusProposed!.push({ range, hoverMessage: 'status: speculative' }); break
          case 'deprecated':  semRanges.statusDeprecated!.push({ range, hoverMessage: 'status: dead' });      break
        }
      }
    }

    // ── Apply ──
    editor.setDecorations(pathDeco, pathRanges)
    editor.setDecorations(annotDecos.promptRoot, annotRanges.promptRoot!)
    editor.setDecorations(annotDecos.intent,     annotRanges.intent!)
    editor.setDecorations(annotDecos.lens,       annotRanges.lens!)
    editor.setDecorations(annotDecos.anchor,     annotRanges.anchor!)
    editor.setDecorations(annotDecos.topic,      annotRanges.topic!)
    editor.setDecorations(braceDeco, braceRanges)
    editor.setDecorations(opDecos.wonder,     opRanges.wonder!)
    editor.setDecorations(opDecos.action,     opRanges.action!)
    editor.setDecorations(opDecos.frame,      opRanges.frame!)
    editor.setDecorations(opDecos.observer,   opRanges.observer!)
    editor.setDecorations(opDecos.potential,  opRanges.potential!)
    editor.setDecorations(opDecos.collapse,   opRanges.collapse!)
    editor.setDecorations(opDecos.constraint, opRanges.constraint!)
    editor.setDecorations(opDecos.merge,      opRanges.merge!)
    editor.setDecorations(opDecos.schema,     opRanges.schema!)
    editor.setDecorations(opDecos.residual,   opRanges.residual!)
    editor.setDecorations(compoundDecos.tildeHash, tildeHashRanges.map(range => ({ range })))
    editor.setDecorations(compoundDecos.expSlot,   expSlotRanges.map(range => ({ range })))
    editor.setDecorations(semanticDecos.pipeLabelOpen,    semRanges.pipeLabelOpen!)
    editor.setDecorations(semanticDecos.pipeLabelClose,   semRanges.pipeLabelClose!)
    editor.setDecorations(semanticDecos.chargeKey,        semRanges.chargeKey!)
    editor.setDecorations(semanticDecos.statusImpl,       semRanges.statusImpl!)
    editor.setDecorations(semanticDecos.statusPartial,    semRanges.statusPartial!)
    editor.setDecorations(semanticDecos.statusProposed,   semRanges.statusProposed!)
    editor.setDecorations(semanticDecos.statusDeprecated, semRanges.statusDeprecated!)
    editor.setDecorations(semanticDecos.valenceBoon,      semRanges.valenceBoon!)
    editor.setDecorations(semanticDecos.valenceBane,      semRanges.valenceBane!)
    editor.setDecorations(semanticDecos.valenceBone,      semRanges.valenceBone!)
    editor.setDecorations(semanticDecos.valenceBonk,      semRanges.valenceBonk!)
    editor.setDecorations(semanticDecos.valenceHonk,      semRanges.valenceHonk!)
    editor.setDecorations(semanticDecos.pipeLabelOpen,    semRanges.pipeLabelOpen!)
    editor.setDecorations(semanticDecos.pipeLabelClose,   semRanges.pipeLabelClose!)
    editor.setDecorations(semanticDecos.chargeKey,        semRanges.chargeKey!)
    editor.setDecorations(semanticDecos.statusImpl,       semRanges.statusImpl!)
    editor.setDecorations(semanticDecos.statusPartial,    semRanges.statusPartial!)
    editor.setDecorations(semanticDecos.statusProposed,   semRanges.statusProposed!)
    editor.setDecorations(semanticDecos.statusDeprecated, semRanges.statusDeprecated!)
  }

  schedule()

  const allDecos = [
    pathDeco, braceDeco,
    ...Object.values(annotDecos),
    ...Object.values(opDecos),
    ...Object.values(compoundDecos),
    ...Object.values(semanticDecos),
  ]

  return [
    ...allDecos,
    vscode.window.onDidChangeActiveTextEditor(() => schedule()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'spw') schedule()
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('spw')) { probeCache.clear(); schedule() }
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== 'spw') return
      if (readSurfaceConfig().geometryOnSave && onGeometrySave) onGeometrySave(doc)
    }),
    new vscode.Disposable(() => { if (timer) clearTimeout(timer) }),
  ]
}
