// Prototype of proposed spw-cut-gate.ts additions (V voice, M marginalia, A arcs, R recipes, L legibility extensions).
// Read-only; prints findings. Mirrors the gate's helpers so each check can be pasted into pass 2.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { parse } from '<repo>/packages/spw-seed/src/index.ts'
import { COMMANDS } from '<repo>/packages/spw-cli/src/commands.ts'

const REPO = '<repo>'
const SYSTEM_CLOCKS = new Set(['beat', 'pulse', 'epoch', 'request_epoch', 'session_beat', 'format_pulse'])
const CANON = new Set(COMMANDS.map((c: any) => c.name))
const ALIAS = new Set(COMMANDS.flatMap((c: any) => c.aliases ?? []))
const cut = path.resolve(process.argv[2])
const list = (d: string): string[] => readdirSync(d).flatMap((e) => { const f = path.join(d, e); return statSync(f).isDirectory() ? list(f) : f.endsWith('.spw') && !f.endsWith('.expanded.spw') ? [f] : [] }).sort()
const vocab = new Map<string, Set<string>>()
for (const l of readFileSync(path.join(cut, 'vocabulary.spw'), 'utf8').split('\n')) {
  const m = /^\s*([a-z_]+):\s*#\[(.*)\]\s*$/.exec(l); if (m) vocab.set(m[1], new Set(m[2].split(/[,;]/).map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean)))
}
const out: string[] = []
const add = (f: string, lvl: string, line: number, id: string, msg: string) => out.push(`${lvl === 'fail' ? 'x' : '!'} ${path.relative(cut, f)}:${line} ${id} ${msg}`)
function walk(n: any, v: (n: any) => void) { if (!n || typeof n !== 'object') return; if (typeof n.type === 'string' && n.span) v(n); for (const [k, c] of Object.entries(n)) { if (k === 'span' || k === 'token') continue; if (Array.isArray(c)) c.forEach((x) => walk(x, v)); else if (c && typeof c === 'object') walk(c, v) } }
function body(src: string, name: string): { text: string; line: number }[] {
  const res: { text: string; line: number }[] = []; const re = new RegExp(`\\^\\[?"${name}"\\]?\\s*\\{`, 'g'); let m
  while ((m = re.exec(src))) { let d = 0, q = false; for (let i = m.index + m[0].length - 1; i < src.length; i++) { const ch = src[i]; if (ch === '"' && src[i - 1] !== '\\') q = !q; if (q) continue; if (ch === '{') d++; else if (ch === '}' && --d === 0) { res.push({ text: src.slice(m.index + m[0].length, i), line: src.slice(0, m.index).split('\n').length }); break } } }
  return res
}
const ln = (src: string, n: any) => src.slice(0, n.span.start.offset).split('\n').length
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const anon = new Map<string, string[]>()
const probes = new Map<string, string[]>()
for (const f of list(cut)) {
  const src = readFileSync(f, 'utf8'); const lines = src.split('\n'); const ast: any = parse(src).ast
  const isReg = f.includes('/registries/')
  // V1-V3: cold_open present, short, carries every continuity phrase after the bar
  for (const e of body(src, 'emit')) {
    const co = /^\s*cold_open:\s*"([^"]*)"/m.exec(e.text); const cont = /^\s*continuity:\s*"([^"]*)"/m.exec(e.text)
    if (!co) { add(f, 'warn', e.line, 'V1', 'emit card has no cold_open say line'); continue }
    if (words(co[1]) > 25) add(f, 'fail', e.line, 'V2', `cold_open is ${words(co[1])} words; at most 25`)
    const phrases = cont ? (cont[1].split('|')[1] ?? '').split(',').map((p) => p.trim().toLowerCase()).filter(Boolean) : []
    for (const p of phrases) if (!co[1].toLowerCase().includes(p)) add(f, 'fail', e.line, 'V3', `cold_open lacks continuity phrase "${p}"`)
  }
  // V4: say lines carry no digits (numbers stay in the claim frame)
  for (const e of body(src, 'emit')) { const co = /^\s*cold_open:\s*"([^"]*)"/m.exec(e.text); if (co && /\d/.test(co[1])) add(f, 'fail', e.line, 'V4', 'cold_open carries a number; numbers stay in the claim frame') }
  // M1-M2: appositions from the tree (strings and # lines never count)
  walk(ast, (n) => {
    if (n.type !== 'Annotation' || !n.apposition) return
    const line = ln(src, n)
    if (n.apposition.anonymous) { const k = String(n.apposition.body).trim().toLowerCase().replace(/\s+/g, ' '); anon.set(k, [...(anon.get(k) ?? []), `${path.relative(cut, f)}:${line}`]) }
    if (n.name?.value === 'say' && /\d/.test(String(n.apposition.body))) add(f, 'fail', line, 'V4', '~#say(...) carries a number; numbers stay in the claim frame')
    if (n.apposition.anonymous) return
    else if (vocab.has('reading') && !vocab.get('reading')!.has(n.name?.value)) add(f, 'fail', line, 'M2', `~#${n.name?.value}(...) is not a reading name in vocabulary.spw`)
  })
  // M3: a reading written on a # line is invisible to the tree
  lines.forEach((l, i) => { if (/^\s*#(\s|$)/.test(l) && /~#[a-z_]*\(/.test(l)) add(f, 'warn', i + 1, 'M3', 'apposition on a # line; the tree drops it') })
  // M4: links stay inside the cut or point at repo canon (.spw/, docs/); never at a reader root
  walk(ast, (n) => {
    if (n.type !== 'PathRef') return
    const raw = String(n.path?.token?.value ?? '').replace(/^"|"$/g, '').split('#')[0]; if (!raw) return
    const local = path.resolve(path.dirname(f), raw)
    const rootRel = !raw.startsWith('.') || /^\.(spw|agents)\//.test(raw)
    if (rootRel) { if (/(^|\/)readings\//.test(raw)) add(f, 'fail', ln(src, n), 'M4', `link ~"${raw}" points at a reader root`); return }
    if (!local.startsWith(cut + path.sep)) add(f, 'fail', ln(src, n), 'M4', `relative link ~"${raw}" climbs out of the cut; write it root-relative`)
  })
  // A1-A3: arc frames
  for (const a of body(src, 'arc')) {
    for (const k of ['clock', 'archetype', 'steps', 'counts', 'limit']) if (!new RegExp(`^\\s*${k}:`, 'm').test(a.text)) add(f, 'fail', a.line, 'A1', `^["arc"] missing ${k}:`)
    const ck = /^\s*clock:\s*#([a-z_]+)/m.exec(a.text)
    if (ck && (!vocab.get('clock')?.has(ck[1]) || SYSTEM_CLOCKS.has(ck[1]))) add(f, 'fail', a.line, 'A2', `clock #${ck[1]} is not an arc clock in vocabulary.spw`)
    if (!/^\s*steps:\s*<</m.test(a.text)) add(f, 'fail', a.line, 'A3', 'steps must be one << a ; b >> schedule')
    if (!/^\s*feeds:/m.test(body(src, 'edges')[0]?.text ?? '')) add(f, 'warn', a.line, 'A4', 'arc has no feeds edge to the next arc')
  }
  // A5: trail stops alternate; every ? step is followed by ~<prediction>
  walk(ast, (n) => {
    if (n.type !== 'Binding' || n.key?.token?.value !== 'stops') return
    const s = n.value?.terms?.[0] ?? n.value?.items?.[0] ?? n.value
    const seq = s?.type === 'Stream' ? (s.sequence?.expressions ?? []) : null
    if (!seq) { add(f, 'fail', ln(src, n), 'A5', 'stops must be a << >> schedule'); return }
    const flat = seq.map((x: any) => x?.terms ?? x?.items ?? [x]).flat()
    flat.forEach((x: any, i: number) => { if (x?.type === 'Operation' && x.operator?.value === '?' && !(flat[i + 1]?.type === 'Operation' && flat[i + 1].operator?.value === '~')) add(f, 'fail', ln(src, x), 'A5', '? step without a following ~<prediction>') })
  })
  for (const m of src.matchAll(/!probe\{\s*"([^"]+)"/g)) { const k = m[1].toLowerCase(); probes.set(k, [...(probes.get(k) ?? []), `${path.relative(cut, f)}:${src.slice(0, m.index).split('\n').length}`]) }
  // R1: commands named in recipes and next cards are canonical, with no placeholders
  lines.forEach((l, i) => {
    const m = /^\s*(?:command|~#command|~#run):\s*"spw ([a-z-]+)([^"]*)"/.exec(l); if (!m) return
    if (ALIAS.has(m[1])) add(f, 'fail', i + 1, 'R1', `spw ${m[1]} is an alias; name the canonical command`)
    else if (!CANON.has(m[1])) add(f, 'fail', i + 1, 'R1', `spw ${m[1]} is not a command`)
    if (/<[a-z]+>/.test(m[2])) add(f, 'fail', i + 1, 'R1', 'placeholder in a command; fill in the real path')
  })
  for (const r of body(src, 'recipes')) for (const k of r.text.matchAll(/^\s*kind:\s*#([a-z_]+)/gm)) if (!vocab.get('transform')?.has(k[1])) add(f, 'fail', r.line, 'R2', `recipe kind #${k[1]} not in vocabulary.spw`)
  // L8x: apostrophe or non-ASCII outside strings, including apposition bodies (generalizes gate :262-264)
  lines.forEach((l, i) => { if (/^\s*#(\s|$)/.test(l)) { if (/'/.test(l)) add(f, 'warn', i + 1, 'L8', 'apostrophe in a # line'); return } const c = l.replace(/"(?:[^"\\]|\\.)*"/g, '""'); if (/'|[^\x00-\x7f]/.test(c)) add(f, 'fail', i + 1, 'L8', 'apostrophe or non-ASCII outside a string') })
  void isReg
}
for (const [k, at] of anon) if (at.length > 1) out.push(`! M1 anonymous reading recurs ${at.length}x (${at.join(', ')}); name it: ${k.slice(0, 50)}`)
for (const [k, at] of probes) if (at.length > 1) out.push(`x V5 probe string repeats ${at.length}x (${at.join(', ')}): ${k.slice(0, 50)}`)
console.log(out.join('\n') || '(no findings)')
console.log(`-- ${list(cut).length} files`)
