/**
 * Display Handlers — hover, document symbols, workspace symbols, code lens, inlay hints
 *
 * Visual enrichment of .spw documents: hover tooltips, symbol outline,
 * code lens metrics, and inlay hints (path status, brace depth, operator census).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { SIGIL_SEMANTICS } from '../server-index'
import { findPathRefAtPosition } from '../spw-selector'
import { statKind } from '../helpers'
import type {
    LspHover, LspDocumentSymbol, LspSymbolInfo, LspCodeLens, LspInlayHint,
    LspPosition, LspRange,
    HoverParams, DocumentParams, InlayHintParams,
    HandlerDeps,
} from '../types'
import { SK } from '../types'

// ── Hover ───────────────────────────────────────────────────────

export async function hover(params: HoverParams, deps: HandlerDeps): Promise<LspHover | null> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return null

    const source = await deps.getDocumentText(uri)
    if (source === null) return null

    const line = source.split('\n')[pos.line] ?? ''
    const charAtPos = line[pos.character]

    // 1. Annotation hover
    const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
    let annotMatch: RegExpExecArray | null
    while ((annotMatch = annotRe.exec(line)) !== null) {
        const start = annotMatch.index
        const end = start + annotMatch[0].length
        if (pos.character < start || pos.character >= end) continue

        const prefix = annotMatch[1] || ''
        const name = annotMatch[2]
        const kindLabel: Record<string, string> = { '': 'topic', ':': 'lens', '!': 'intent', '>': 'anchor' }
        const kind = kindLabel[prefix] || 'topic'
        const entries = deps.serverIndex.lookupAnnotation(name)
        const fileCount = new Set(entries.map(e => e.file)).size
        const coOccurs = deps.serverIndex.topCoOccurrences(name, 5)

        let md = `**#${prefix}${name}** \u2014 *${kind}*\n\n`
        md += `**${fileCount}** file(s), **${entries.length}** occurrence(s)\n\n`

        if (coOccurs.length > 0) {
            md += `Co-occurs with: ${coOccurs.map(c => `\`#${c.name}\` (${c.count}\u00d7)`).join(', ')}\n\n`
        }

        const seen = new Set<string>()
        for (const entry of entries) {
            const rel = path.relative(deps.workspaceRoot, entry.file)
            if (seen.has(rel) || seen.size >= 5) continue
            seen.add(rel)
            md += `- \`${rel}\`:${entry.line + 1}${entry.sectionLabel ? ` (${entry.sectionLabel})` : ''}\n`
        }
        if (fileCount > 5) md += `- *...and ${fileCount - 5} more*\n`

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
        }
    }

    // 2. Frame hover
    const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/
    const frameMatch = line.match(frameRe)
    if (frameMatch) {
        const frameStart = line.indexOf(frameMatch[0])
        const frameEnd = frameStart + frameMatch[0].length
        if (pos.character >= frameStart && pos.character < frameEnd) {
            const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
            const docPath = deps.pathFromUri(uri)
            const fileAnnotations = docPath ? deps.serverIndex.annotationsForFile(docPath) : []
            const inSection = fileAnnotations.filter(e => e.sectionLabel === frameName)

            let opCounts = ''
            const blockStart = source.indexOf('{', source.indexOf(frameMatch[0]))
            if (blockStart >= 0) {
                const ops: Record<string, number> = {}
                let depth = 1
                for (let i = blockStart + 1; i < source.length && depth > 0; i += 1) {
                    if (source[i] === '{') depth += 1
                    else if (source[i] === '}') depth -= 1
                    else if (depth === 1 && SIGIL_SEMANTICS[source[i]]) {
                        ops[source[i]] = (ops[source[i]] ?? 0) + 1
                    }
                }
                const sorted = Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 6)
                if (sorted.length > 0) {
                    opCounts = sorted.map(([op, n]) => `\`${op}\` (${n}\u00d7)`).join(', ')
                }
            }

            const cacheTier = docPath ? deps.serverIndex.getCacheTierForFile(docPath) : 'warm'
            const projections = docPath ? deps.serverIndex.getProjectionsFromSpecOwner(docPath) : []

            let md = `**^["${frameName}"]** \u2014 *frame*\n\n`
            if (inSection.length > 0) {
                const prefixByKind: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' }
                md += 'Annotations: ' + inSection.map(e => `\`${prefixByKind[e.kind]}${e.name}\``).join(', ') + '\n\n'
            }
            if (opCounts) md += `Operators: ${opCounts}\n\n`
            md += `Cache tier: ${cacheTier}\n`
            if (projections.length > 0) {
                md += `\nProjects to: ${projections.map(p => `\`${p.root}\``).join(', ')}\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: frameStart }, end: { line: pos.line, character: frameEnd } },
            }
        }
    }

    // 3. Selector name hover
    const selectorRe = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g
    let selMatch: RegExpExecArray | null
    while ((selMatch = selectorRe.exec(line)) !== null) {
        const start = selMatch.index
        const end = start + selMatch[0].length
        if (pos.character < start || pos.character >= end) continue

        const selectorDef = deps.serverIndex.getSelectorDef(selMatch[1])
        if (!selectorDef) continue

        let md = `**${selectorDef.name}** \u2014 *selector*\n\n`
        md += `| | |\n|:--|:--|\n`
        md += `| **Include** | ${selectorDef.include.join(', ')} |\n`
        md += `| **Combine** | ${selectorDef.combine} |\n`
        md += `| **Grounding** | ${selectorDef.grounding} |\n`
        md += `| **Defined in** | \`${path.relative(deps.workspaceRoot, selectorDef.file)}\` |\n`

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
        }
    }

    // 4. Wonder block hover
    const wonderRe = /\?\["([^"]+)"\]/
    const wonderMatch = line.match(wonderRe)
    if (wonderMatch) {
        const wStart = line.indexOf(wonderMatch[0])
        const wEnd = wStart + wonderMatch[0].length
        if (pos.character >= wStart && pos.character < wEnd) {
            const questionText = wonderMatch[1]
            const allLines = source.split('\n')
            const bodyLines: string[] = []
            let braceDepth = 0
            const openBrace = line.includes('{')
            if (openBrace) braceDepth = 1
            for (let j = pos.line + 1; j < allLines.length && j < pos.line + 12; j++) {
                const bl = allLines[j]
                if (openBrace) {
                    for (const ch of bl) {
                        if (ch === '{') braceDepth++
                        else if (ch === '}') braceDepth--
                    }
                    bodyLines.push(bl)
                    if (braceDepth <= 0) break
                } else {
                    if (bl.startsWith('  ') || bl.trim() === '') bodyLines.push(bl)
                    else break
                }
            }

            const depthLine = bodyLines.find(l => l.includes('#:depth'))
            const depthMatch = depthLine?.match(/#!([a-z]+)/)
            const lensMatch = depthLine?.match(/\/\/\s*lens:\s*(.+)/)
            const probeLine = bodyLines.find(l => l.includes('!probe{'))
            const probeMatch = probeLine?.match(/!probe\{\s*"([^"]+)"\s*\}/)
            const metricLine = bodyLines.find(l => l.includes('$%['))
            const metricMatch = metricLine?.match(/\$%\[([^\]]+)\]/)

            let md = `**\u2753 Wonder**\n\n`
            md += `> ${questionText}\n\n`
            if (depthMatch) md += `**Depth axis:** ${depthMatch[1]}`
            if (lensMatch) md += ` \u00b7 **Lens:** ${lensMatch[1].trim()}`
            if (depthMatch || lensMatch) md += '\n\n'
            if (metricMatch) md += `**Metrics:** \`$%[${metricMatch[1]}]\`\n\n`
            if (probeMatch) md += `**Probe:** ${probeMatch[1]}\n`

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: wStart }, end: { line: pos.line, character: wEnd } },
            }
        }
    }

    // 5. Layer hover
    const layerRe = /#:layer\s+#!([a-z]+)/
    const layerMatch = line.match(layerRe)
    if (layerMatch) {
        const lStart = line.indexOf(layerMatch[0])
        const lEnd = lStart + layerMatch[0].length
        if (pos.character >= lStart && pos.character < lEnd) {
            const layerName = layerMatch[1]
            const layerDesc: Record<string, string> = {
                grammar: 'Defines parse-time rules, token shapes, and structural invariants. Files in this layer are the language\'s skeleton.',
                semantics: 'Maps structure to meaning \u2014 claims, theories, proofs. Files in this layer carry falsifiable propositions.',
                pragmatics: 'Shapes developer workflow, conventions, tooling. Files in this layer orient attention and reduce friction.',
            }
            const allAnnotations = deps.serverIndex.allAnnotations()
            const layerCount = new Set(
                allAnnotations.filter(a => a.name === layerName && a.kind === 'intent').map(a => a.file)
            ).size

            let md = `**#:layer #!${layerName}** \u2014 *kernel layer*\n\n`
            md += `${layerDesc[layerName] || 'Custom layer.'}\n\n`
            md += `**${layerCount}** file(s) in this layer across the workspace.\n`

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: lStart }, end: { line: pos.line, character: lEnd } },
            }
        }
    }

    // 6. Metric hover
    const metricHoverRe = /\$%\[([^\]]+)\]/
    const metricHoverMatch = line.match(metricHoverRe)
    if (metricHoverMatch) {
        const mStart = line.indexOf(metricHoverMatch[0])
        const mEnd = mStart + metricHoverMatch[0].length
        if (pos.character >= mStart && pos.character < mEnd) {
            const metrics = metricHoverMatch[1].split(',').map(m => m.trim())
            const metricDescs: Record<string, string> = {
                'file.frame_count': 'Number of ^-frames in this file',
                'file.annotation_density': 'Annotations per line (higher = more semantic richness)',
                'file.brace_depth_max': 'Maximum nesting depth of braces',
                'cache.tier': 'Cache temperature tier (hot/warm/cold)',
                'cache.hit_ms': 'Average cache hit latency in milliseconds',
                'cache.hit_ratio': 'Ratio of cache hits to total lookups',
                'registry.entry_count': 'Number of entries in this registry',
                'registry.referrer_count': 'Files that reference this registry',
                'harness.run_count': 'Total probe/eval runs executed',
                'harness.pass_rate': 'Ratio of passing probes to total',
                'runtime.stage': 'Current runtime pipeline stage',
                'runtime.latency_ms': 'End-to-end pipeline latency',
                'lsp.request_count': 'LSP requests served since start',
                'lsp.avg_response_ms': 'Average response time in ms',
                'phase.index': 'Current spirit phase (0-5)',
                'phase.duration_ms': 'Time spent in current phase',
            }

            let md = `**\`$%[${metricHoverMatch[1]}]\`** \u2014 *measurement point*\n\n`

            const state = deps.observableState || {}
            let hasLive = false

            for (const m of metrics) {
                const desc = metricDescs[m] || `Runtime-bindable metric: ${m}`
                const liveValue = state[m]
                if (liveValue !== undefined && liveValue !== null) {
                    md += `- **${m}**: \`${liveValue}\` \u2014 ${desc}\n`
                    hasLive = true
                } else {
                    md += `- **${m}**: ${desc}\n`
                }
            }

            if (hasLive) {
                md += `\n*Live values from \`.spw/state/observable.spw\` (refreshed on save).*\n`
            } else {
                md += `\n*No live values \u2014 populate \`.spw/state/observable.spw\` to bind.*\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: mStart }, end: { line: pos.line, character: mEnd } },
            }
        }
    }

    // 6.5 Fact block hover
    if (line.includes('.{')) {
        const fStart = line.indexOf('.{')
        if (pos.character >= fStart && pos.character < fStart + 2) {
            let md = `**\`.{}\`** \u2014 *Fact Block*\n\n`
            md += `Serialized into the register bus matrix for downstream script access.\n`
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: fStart }, end: { line: pos.line, character: fStart + 2 } },
            }
        }
    }

    // 6.6 Registry qualifier hover
    const regRe = /\[reg=([a-zA-Z0-9_]+)\]/g
    let regMatch: RegExpExecArray | null
    while ((regMatch = regRe.exec(line)) !== null) {
        const rStart = regMatch.index
        const rEnd = rStart + regMatch[0].length
        if (pos.character >= rStart && pos.character < rEnd) {
            let md = `**\`[reg=${regMatch[1]}]\`** \u2014 *Facet Qualifier*\n\n`
            md += `Flags this block for extraction by the layer-check and semantic validation hooks.\n`
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: rStart }, end: { line: pos.line, character: rEnd } },
            }
        }
    }

    // 7. Sigil hover
    if (charAtPos && SIGIL_SEMANTICS[charAtPos]) {
        const sem = SIGIL_SEMANTICS[charAtPos]

        let md = `**\`${charAtPos}\`** \u2014 *${sem.role}*\n\n`
        md += `Physics: ${sem.physics}\n\n`
        md += `Phase: ${sem.phase}\n\n`
        md += `Tuning: ${sem.tuning}\n`
        if (sem.phaseIndex >= 0) {
            md += `\nSpirit sequence: ${deps.serverIndex.getSpiritSequence()}\n`
            md += `Active phase: ${sem.phaseIndex + 1}\n`
        }

        try {
            const trial = deps.trialRunSpw(source, uri)
            if (trial.success) {
                const snapshot = trial.runtime.registers
                const entries = Object.entries(snapshot.entries) as [string, any][]
                const sigil = charAtPos
                const related = entries.filter(([, e]: [string, any]) =>
                    e.meta.descriptor?.name?.toLowerCase().includes(sigil) ||
                    e.meta.provenance?.some((p: string) => p.includes(sigil))
                )
                if (related.length > 0) {
                    md += `\n---\n\n**Runtime** (${entries.length} registers)\n\n`
                    for (const [key, entry] of related.slice(0, 5) as [string, any][]) {
                        const phase = entry.meta.phases?.current ?? '\u2014'
                        const writes = entry.meta.writes
                        md += `- \`${key}\`: phase=${phase}, writes=${writes}\n`
                    }
                } else if (entries.length > 0) {
                    md += `\n---\n\n*Runtime: ${entries.length} register(s) active*\n`
                }
            }
        } catch {
            // Runtime trial failed — don't break hover
        }

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: pos.character }, end: { line: pos.line, character: pos.character + 1 } },
        }
    }

    // 8. Symmetry hover
    const symRe = /(?:\{sym:(D4|Z4)\}|#\[(D4|Z4)\])/
    const symMatch = line.match(symRe)
    if (symMatch) {
        const symStart = line.indexOf(symMatch[0])
        const symEnd = symStart + symMatch[0].length
        if (pos.character >= symStart && pos.character < symEnd) {
            const group = symMatch[1] || symMatch[2]
            let md = `**${group} Symmetry** \u2014 *geometry*\n\n`
            if (group === 'D4') {
                md += `Dihedral group of order 8. Applies 8 geometric transformations (4 rotations, 4 reflections).\n\n`
                md += `- **Mirrors** \`.left\` \u2194 \`.right\`\n`
                md += `- **Register updates** reflect automatically.\n`
            } else if (group === 'Z4') {
                md += `Cyclic group of order 4. Applies 4 rotational states (0\u21921\u21922\u21923\u21920).\n\n`
                md += `- **Cycles** through clock-like evolution.\n`
            }
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: symStart }, end: { line: pos.line, character: symEnd } }
            }
        }
    }

    // 9. @root hover
    const rootRe = /@([A-Za-z_][A-Za-z0-9_]*)/g
    let rootMatch: RegExpExecArray | null
    while ((rootMatch = rootRe.exec(line)) !== null) {
        const rootStart = rootMatch.index
        const rootEnd = rootStart + rootMatch[0].length
        if (pos.character < rootStart || pos.character > rootEnd) continue

        const rootName = rootMatch[1]
        const docPath = deps.pathFromUri(uri)
        const roots = deps.mergeRoots(source, path.dirname(docPath || deps.workspaceRoot))
        const resolved = roots[rootName]
        if (resolved) {
            const rel = path.relative(deps.workspaceRoot, resolved)
            const annotationsUnder = deps.serverIndex.allAnnotations().filter(e =>
                e.file.startsWith(resolved) || e.file.includes(`/${rootName}/`)
            )
            const uniqueFiles = new Set(annotationsUnder.map(e => e.file))
            const lenses = [...new Set(annotationsUnder.filter(e => e.kind === 'lens').map(e => e.name))]

            let md = `**\`@${rootName}\`** \u2192 \`${rel}\`\n\n`
            md += `**${uniqueFiles.size}** file(s), **${annotationsUnder.length}** annotation(s)\n\n`
            if (lenses.length > 0) {
                md += `Lenses: ${lenses.slice(0, 8).map(l => `\`#:${l}\``).join(', ')}\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: rootStart }, end: { line: pos.line, character: rootEnd } },
            }
        }
    }

    // 10. Path peek
    const doc = deps.serverIndex.getDocument(uri)
    if (doc) {
        const hit = findPathRefAtPosition(doc.selectorHits, pos.line, pos.character)
        if (hit) {
            const docPath = deps.pathFromUri(uri)
            if (docPath) {
                const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
                if (resolved) {
                    try {
                        const resolvedKind = await statKind(resolved)
                        const rel = path.relative(deps.workspaceRoot, resolved)
                        if (resolvedKind === 'dir') {
                            const entries = await fs.readdir(resolved, { withFileTypes: true })
                            const visible = entries.filter((entry) => !entry.name.startsWith('.'))
                            const preview = visible.slice(0, 8)
                            const rendered = preview
                                .map((entry) => `- ${entry.isDirectory() ? '[dir]' : '[file]'} \`${entry.name}${entry.isDirectory() ? '/' : ''}\``)
                                .join('\n')

                            let md = `\u2192 \`${rel}/\`\n\n`
                            md += `Directory reference (${visible.length} entry${visible.length === 1 ? '' : 'ies'})`
                            if (rendered) md += `\n\n${rendered}`
                            if (visible.length > preview.length) md += `\n- ...and ${visible.length - preview.length} more`

                            return {
                                contents: { kind: 'markdown', value: md },
                                range: {
                                    start: { line: hit.span.startLine, character: hit.span.startCharacter },
                                    end: { line: hit.span.endLine, character: hit.span.endCharacter },
                                },
                            }
                        }

                        const fileText = await fs.readFile(resolved, 'utf8')
                        const lines = fileText.split('\n').slice(0, 10)
                        const subroot = deps.serverIndex.getSubrootForFile(resolved) || 'workspace'
                        const tier = deps.serverIndex.getCacheTierForFile(resolved)
                        const fileAnnotations = deps.serverIndex.annotationsForFile(resolved)
                        const kinds = new Map<string, number>()
                        for (const a of fileAnnotations) kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1)
                        const kindSummary = [...kinds.entries()].map(([k, n]) => `${n} ${k}`).join(', ')

                        const plane = deps.serverIndex.getWorkspacePlaneForFile(resolved)
                        const category = deps.serverIndex.getCategoryForFile(resolved)
                        const isGenerated = deps.serverIndex.isGeneratedFile(resolved)

                        let md = `\u2192 \`${rel}\`\n\n`
                        const metaParts: string[] = [`Subroot: ${subroot}`, `Cache: ${tier}`]
                        if (plane) metaParts.push(`Plane: ${plane}`)
                        if (category) metaParts.push(`Category: ${category}`)
                        if (isGenerated) metaParts.push('**generated**')
                        md += metaParts.join(' | ')
                        if (kindSummary) md += ` | Annotations: ${kindSummary}`
                        md += '\n\n```spw\n' + lines.join('\n')
                        if (fileText.split('\n').length > 10) md += '\n...'
                        md += '\n```\n'

                        return {
                            contents: { kind: 'markdown', value: md },
                            range: {
                                start: { line: hit.span.startLine, character: hit.span.startCharacter },
                                end: { line: hit.span.endLine, character: hit.span.endCharacter },
                            },
                        }
                    } catch {
                        // file unreadable
                    }
                }
            }
        }
    }

    return null
}

// ── Document Symbols ────────────────────────────────────────────

export function documentSymbols(params: DocumentParams, deps: HandlerDeps): LspDocumentSymbol[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []
    const lines = doc.text.split('\n')

    const symbols: LspDocumentSymbol[] = []
    const stack: Array<{ indent: number; symbol: LspDocumentSymbol }> = []

    const tapRe = /^(\s*)\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/
    const injectRe = /^(\s*)!(?:boon|bone|bane|bonk|honk)?\["([^"]+)"\]/
    const probeRe = /^(\s*)\?\["([^"]+)"\]/
    const configRe = /^(\s*)=([a-zA-Z_]\w*):/
    const annotRe = /^(\s*)#(!|:|>)?([a-zA-Z_]\w*)/

    function addSymbol(sym: LspDocumentSymbol, indent: number): void {
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
        if (stack.length > 0) {
            const parent = stack[stack.length - 1].symbol
            if (!parent.children) parent.children = []
            parent.children.push(sym)
        } else {
            symbols.push(sym)
        }
        stack.push({ indent, symbol: sym })
    }

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        const lr = { start: { line: i, character: 0 }, end: { line: i, character: line.length } }

        const tap = tapRe.exec(line)
        if (tap) {
            const indent = tap[1].length
            const name = tap[2] || tap[3] || tap[4]
            const sr = { start: { line: i, character: tap.index }, end: { line: i, character: tap.index + tap[0].length } }
            addSymbol({ name, detail: 'frame', kind: SK.Module, range: lr, selectionRange: sr }, indent)
            continue
        }

        const inject = injectRe.exec(line)
        if (inject) {
            const indent = inject[1].length
            const sr = { start: { line: i, character: inject.index }, end: { line: i, character: inject.index + inject[0].length } }
            addSymbol({ name: inject[2], detail: 'facet', kind: SK.Event, range: lr, selectionRange: sr }, indent)
            continue
        }

        const probe = probeRe.exec(line)
        if (probe) {
            const indent = probe[1].length
            const sr = { start: { line: i, character: probe.index }, end: { line: i, character: probe.index + probe[0].length } }
            addSymbol({ name: `? ${probe[2]}`, detail: 'probe', kind: SK.Boolean, range: lr, selectionRange: sr }, indent)
            continue
        }

        const config = configRe.exec(line)
        if (config) {
            const indent = config[1].length
            const sr = { start: { line: i, character: config.index }, end: { line: i, character: config.index + config[0].length } }
            addSymbol({ name: `= ${config[2]}`, detail: 'config', kind: SK.Property, range: lr, selectionRange: sr }, indent)
            continue
        }

        const annot = annotRe.exec(line)
        if (annot) {
            const indent = annot[1].length
            const prefix = annot[2] || ''
            const name = annot[3]
            const kindLabel: Record<string, { kind: number; detail: string }> = {
                '': { kind: SK.Key, detail: 'topic' },
                ':': { kind: SK.Enum, detail: 'lens' },
                '!': { kind: SK.Event, detail: 'intent' },
                '>': { kind: SK.Interface, detail: 'anchor' },
            }
            const info = kindLabel[prefix] || kindLabel['']
            const sr = { start: { line: i, character: annot.index }, end: { line: i, character: annot.index + annot[0].length } }
            addSymbol({ name: `#${prefix}${name}`, detail: info.detail, kind: info.kind, range: lr, selectionRange: sr }, indent)
            continue
        }

        // Extend parent range
        if (stack.length > 0) {
            stack[stack.length - 1].symbol.range.end = lr.end
        }
    }

    return symbols
}

// ── Workspace Symbols ───────────────────────────────────────────

export function workspaceSymbols(params: { query?: string }, deps: HandlerDeps): LspSymbolInfo[] {
    const query = (params?.query as string) ?? ''
    if (!query) return []

    const entries = deps.serverIndex.searchAnnotations(query)
    const results: LspSymbolInfo[] = []

    for (const entry of entries.slice(0, 50)) {
        const kindMap: Record<string, number> = { topic: SK.Key, lens: SK.Enum, intent: SK.Event, anchor: SK.Interface }
        const prefixMap: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' }
        results.push({
            name: `${prefixMap[entry.kind]}${entry.name}`,
            kind: kindMap[entry.kind] || SK.Key,
            location: {
                uri: deps.uriFromPath(entry.file),
                range: {
                    start: { line: entry.line, character: 0 },
                    end: { line: entry.line, character: 0 },
                },
            },
            containerName: entry.sectionLabel,
        })
    }

    return results
}

// ── Code Lens ───────────────────────────────────────────────────

export function codeLens(params: DocumentParams, deps: HandlerDeps): LspCodeLens[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const docPath = doc.filePath
    const fileAnnotations = deps.serverIndex.annotationsForFile(docPath)
    const lines = doc.text.split('\n')
    const lenses: LspCodeLens[] = []

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]

        // Frame annotation summary
        const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/)
        if (frameMatch) {
            const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
            const inFrame = fileAnnotations.filter(e => e.sectionLabel === frameName)
            if (inFrame.length > 0) {
                const kindCounts = new Map<string, number>()
                for (const entry of inFrame) kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1)
                const summary = [...kindCounts.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
                lenses.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                    command: { title: `\u25c7 ${summary}`, command: '' },
                })
            }
        }

        // Anchor cross-file refs
        const anchorMatch = line.match(/#>([a-zA-Z_]\w*)/)
        if (anchorMatch) {
            const name = anchorMatch[1]
            const refs = deps.serverIndex.lookupAnnotation(name)
            const otherFiles = refs.filter(e => e.file !== docPath)
            const fileCount = new Set(otherFiles.map(e => e.file)).size
            if (fileCount > 0) {
                lenses.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                    command: { title: `\u2197 ${fileCount} file ref(s)`, command: '' },
                })
            }

            // Runtime register summary
            try {
                const trial = deps.trialRunSpw(doc.text, uri)
                if (trial.success) {
                    const regEntries = trial.runtime.registers.entries as Record<string, any>
                    const regCount = Object.keys(regEntries).length
                    const maxPhaseEntry = (Object.values(regEntries) as any[])
                        .filter((e: any) => e.meta.phases?.current)
                        .sort((a: any, b: any) => {
                            const order = ['lex', 'parse', 'semantic', 'optimize', 'pragmatic']
                            return order.indexOf(b.meta.phases!.current) - order.indexOf(a.meta.phases!.current)
                        })[0]
                    const maxPhase = maxPhaseEntry?.meta.phases?.current ?? '\u2014'
                    lenses.push({
                        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                        command: { title: `\u25c6 ${regCount} reg \u00b7 phase:${maxPhase}`, command: '' },
                    })
                }
            } catch {
                // Runtime trial failed — skip lens
            }
        }

        // Projection spec owner lens
        const projections = deps.serverIndex.getProjectionsFromSpecOwner(docPath)
        if (i === 0 && projections.length > 0) {
            const names = projections.map(p => p.name).join(', ')
            lenses.push({
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                command: { title: `\u2192 projects: ${names}`, command: '' },
            })
        }
    }

    // Projection target lens
    const proj = deps.serverIndex.getProjectionForFile(docPath)
    if (proj) {
        lenses.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: {
                title: `\u2190 generated from ${path.relative(deps.workspaceRoot, path.resolve(deps.workspaceRoot, proj.specOwner.replace(/^\.\//, '')))}`,
                command: '',
            },
        })
    }

    // File metrics banner
    const plane = deps.serverIndex.getWorkspacePlaneForFile(docPath)
    const category = deps.serverIndex.getCategoryForFile(docPath)
    const isGenerated = deps.serverIndex.isGeneratedFile(docPath)

    const frameCount = lines.filter(l => /^\s*\^(?:\["[^"]+"\]|"[^"]+"|\\[[A-Za-z_]\w*\\])/.test(l)).length
    const annotCount = fileAnnotations.length
    let maxBraceDepth = 0
    { let d = 0; for (const l of lines) { for (const c of l) { if (c === '{') d++; else if (c === '}') d = Math.max(0, d - 1); } if (d > maxBraceDepth) maxBraceDepth = d; } }
    const wonderCount = lines.filter(l => /^\s*#>wonder_/.test(l)).length
    const opDist: Record<string, number> = {}
    for (const l of lines) { for (const c of l) { if ('~?!^%&*='.includes(c)) opDist[c] = (opDist[c] || 0) + 1 } }
    const opSummary = Object.entries(opDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([op, n]) => `${op}:${n}`).join(' ')

    const layerLine = lines.find(l => l.includes('#:layer'))
    const layerNameMatch = layerLine?.match(/#!([a-z]+)/)
    const layerLabel = layerNameMatch?.[1]

    if (isGenerated) {
        lenses.unshift({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: { title: '\u26a0 generated surface \u2014 do not hand-edit', command: '' },
        })
    } else {
        const parts: string[] = []
        if (layerLabel) parts.push(layerLabel)
        else if (plane) parts.push(plane)
        if (category) parts.push(category)
        parts.push(`${frameCount}^`)
        parts.push(`${annotCount}#`)
        parts.push(`d${maxBraceDepth}`)
        if (wonderCount > 0) parts.push(`${wonderCount}\u2753`)
        lenses.unshift({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: { title: `\u25c8 ${parts.join(' \u00b7 ')}`, command: '' },
        })
        if (opSummary) {
            lenses.push({
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                command: { title: `\u2261 ${opSummary}`, command: '' },
            })
        }
    }

    return lenses
}

// ── Inlay Hints ─────────────────────────────────────────────────

export async function inlayHints(params: InlayHintParams, deps: HandlerDeps): Promise<LspInlayHint[]> {
    const uri = params?.textDocument?.uri
    const range = params?.range as LspRange | undefined
    if (!uri || !range) return []

    const docPath = deps.pathFromUri(uri)
    if (!docPath) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = source.split('\n')
    const hints: LspInlayHint[] = []
    const fileAnnotations = deps.serverIndex.annotationsForFile(docPath)

    const frameKindsBySection = new Map<string, Map<string, number>>()
    for (const entry of fileAnnotations) {
        if (!entry.sectionLabel) continue
        const byKind = frameKindsBySection.get(entry.sectionLabel) ?? new Map<string, number>()
        byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1)
        frameKindsBySection.set(entry.sectionLabel, byKind)
    }

    // 1) Path status hints
    if (deps.config.inlayHints.paths) {
        for (const hit of doc.selectorHits) {
            const sl = hit.span.startLine
            if (sl < range.start.line || sl > range.end.line) continue

            const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
            const lineText = lines[hit.span.endLine] ?? ''
            const hintAt = Math.min(hit.span.endCharacter + 1, lineText.length)

            if (!resolved) continue

            const cleanResolved = resolved.replace(/#.*$/, '')
            const rel = path.relative(deps.workspaceRoot, cleanResolved)
            const target = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
            const targetClean = target.replace(/#.*$/, '').replace(/^\.\//, '')
            if (rel === targetClean) continue

            hints.push({
                position: { line: hit.span.endLine, character: hintAt },
                label: ` => ${rel}`,
                kind: 2,
                tooltip: `Resolved target: ${cleanResolved}`,
                paddingLeft: true,
            })
        }
    }

    // 2) Annotation density hints
    const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
    if (deps.config.inlayHints.annotations || deps.config.inlayHints.frames) {
        for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo += 1) {
            const line = lines[lineNo] ?? ''

            if (deps.config.inlayHints.frames) {
                const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/)
                if (frameMatch) {
                    const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3] || ''
                    const byKind = frameKindsBySection.get(frameName) ?? new Map<string, number>()
                    const summary = [...byKind.entries()].map(([kind, count]) => `${count} ${kind}`).join(', ')
                    if (summary) {
                        hints.push({
                            position: { line: lineNo, character: line.length },
                            label: ` [${summary}]`,
                            kind: 2,
                            tooltip: 'Frame-local annotation summary.',
                            paddingLeft: true,
                        })
                    }
                }
            }

            if (!deps.config.inlayHints.annotations) continue

            annotRe.lastIndex = 0
            const names: string[] = []
            let match: RegExpExecArray | null
            while ((match = annotRe.exec(line)) !== null) {
                names.push(match[2])
            }

            if (names.length === 0) continue

            const unique = [...new Set(names)]
            const summary = unique
                .slice(0, 2)
                .map((name) => `${name}:${deps.serverIndex.lookupAnnotation(name).length}`)
                .join(', ')

            hints.push({
                position: { line: lineNo, character: line.length },
                label: ` [anno ${summary}${unique.length > 2 ? ', ...' : ''}]`,
                kind: 2,
                tooltip: 'Workspace occurrence counts for annotation names on this line.',
                paddingLeft: true,
            })
        }
    }

    // 3) Brace depth + charge hints
    {
        let depth = 0
        for (let i = 0; i < range.start.line && i < lines.length; i++) {
            for (const c of lines[i]) {
                if (c === '{') depth++
                else if (c === '}') depth = Math.max(0, depth - 1)
            }
        }
        for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
            const line = lines[lineNo]
            const openCount = (line.match(/\{/g) || []).length
            const closeCount = (line.match(/\}/g) || []).length
            const prevDepth = depth
            for (const c of line) {
                if (c === '{') depth++
                else if (c === '}') depth = Math.max(0, depth - 1)
            }
            if (openCount > 0 && depth >= 2) {
                hints.push({
                    position: { line: lineNo, character: line.length },
                    label: ` \u2502d${depth}`,
                    kind: 2,
                    tooltip: `Brace depth: ${depth} (${openCount > closeCount ? '+tension' : openCount < closeCount ? '\u2212discharge' : 'balanced'})`,
                    paddingLeft: true,
                })
            } else if (closeCount > 0 && prevDepth >= 3 && depth < prevDepth) {
                hints.push({
                    position: { line: lineNo, character: line.length },
                    label: ` \u2502d${depth}\u2212`,
                    kind: 2,
                    tooltip: `Discharge: depth ${prevDepth} \u2192 ${depth}`,
                    paddingLeft: true,
                })
            }
        }
    }

    // 4) Operator census on #> anchor lines
    for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
        const line = lines[lineNo]
        if (!/^\s*#>/.test(line)) continue
        const opDist: Record<string, number> = {}
        for (const l of lines) { for (const c of l) { if ('~?!^%&*='.includes(c)) opDist[c] = (opDist[c] || 0) + 1 } }
        const census = Object.entries(opDist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([op, n]) => `${op}:${n}`).join(' ')
        if (census) {
            hints.push({
                position: { line: lineNo, character: line.length },
                label: ` [${census}]`,
                kind: 2,
                tooltip: 'File operator census: operator frequency distribution.',
                paddingLeft: true,
            })
        }
        break
    }

    return hints
}
