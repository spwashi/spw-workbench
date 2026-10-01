import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { parse, particleBindings, readBias } from '<repo>/packages/spw-seed/src/index.ts'
const dir = process.argv[2]
function walk(n: any, f: (n: any) => void) { if (!n || typeof n !== 'object') return; f(n); for (const [k, v] of Object.entries(n)) { if (k === 'span' || k === 'token') continue; if (Array.isArray(v)) v.forEach((c) => walk(c, f)); else if (v && typeof v === 'object') walk(v, f) } }
for (const f of readdirSync(dir).filter((x) => x.endsWith('.spw')).sort()) {
  const src = readFileSync(path.join(dir, f), 'utf8')
  const out: any = parse(src)
  const errs = out.errors.map((e: any) => `${e.position?.line}:${e.position?.column} ${e.data?.message ?? e.message}`)
  const warns = out.warnings.map((e: any) => `${e.position?.line}:${e.position?.column} ${e.data?.message ?? e.message}`)
  let prose = 0, bias = 0; const counts: Record<string, number> = {}
  const edges: string[] = []
  walk(out.ast, (n) => { if (typeof n.type === 'string') { counts[n.type] = (counts[n.type] ?? 0) + 1; if (n.type === 'Prose' || n.type === 'ProseChunk') prose++ ; if (n.type === 'Operation') { try { const b: any = readBias(n); if (b) { bias++; edges.push(`${b.axis}|${b.sign}|${(b.targets??[]).length}`) } } catch {} } } })
  const binds = out.ast ? particleBindings(out.ast) : []
  const unbound = binds.filter((b: any) => !b.bound).length
  console.log(`${f}: success=${out.success} errors=${errs.length} warnings=${warns.length} proseFallback=${out.completeness?.proseFallback} proseNodes=${prose} particles=${binds.length} unbound=${unbound} bias=${bias} ${edges.join(',')} wildcard=${counts['Wildcard']??0} stream=${counts['Stream']??0} match=${counts['Match']??0}`)
  if (errs.length) console.log('  E ' + errs.join(' | '))
  if (warns.length) console.log('  W ' + warns.join(' | '))
}
