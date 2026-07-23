/**
 * Render a WorkspaceSnapshot as a self-contained, theme-aware HTML atlas.
 *
 * The visual counterpart to the terminal summary: a map a newcomer can scan to
 * learn a workspace's shape — its dialect gradient, its load-bearing surfaces,
 * what drifts, and how dense the anchor namespace is. Regenerated from a live
 * crawl, so the picture can't drift from the territory. No external assets;
 * the gruvbox palette is the language's own syntax colouring.
 */
import type { WorkspaceSnapshot, RegionDialect } from './atlas'

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function pct(n: number): number {
  return Math.round(n * 1000) / 10
}

function region(r: RegionDialect): string {
  const total = r.deixis + r.case + r.mood + r.aspect || 1
  const seg = (n: number, cls: string): string => `<i class="${cls}" style="width:${pct(n / total)}%"></i>`
  return `
    <div class="region">
      <div class="region-top">
        <span class="region-name">${esc(r.region)}</span>
        <span class="region-files">${r.files} surfaces</span>
        <span class="chip ${r.volatility}">${r.volatility} · ${Math.round(r.aspectShare * 100)}% aspect</span>
      </div>
      <div class="bar">${seg(r.deixis, 'deixis')}${seg(r.case, 'case')}${seg(r.mood, 'mood')}${seg(r.aspect, 'aspect')}</div>
    </div>`
}

function hubRow(h: { path: string; inbound: number }): string {
  const dir = h.path.includes('/') ? h.path.replace(/\/[^/]+$/, '/') : ''
  const base = h.path.slice(dir.length)
  return `<div class="row"><span class="path"><span class="d">${esc(dir)}</span>${esc(base)}</span><span class="val">${h.inbound}<span class="u"> ←</span></span></div>`
}

function orphanRow(p: string): string {
  const dir = p.includes('/') ? p.replace(/\/[^/]+$/, '/') : ''
  const base = p.slice(dir.length)
  const isIndex = p.endsWith('/index.spw') || p === 'index.spw'
  const tag = isIndex ? '<span class="val" style="color:var(--warn)">index</span>' : '<span class="val" style="color:var(--faint)">leaf</span>'
  return `<div class="row"><span class="path"><span class="d">${esc(dir)}</span>${esc(base)}</span>${tag}</div>`
}

function nsRow(group: string, count: number, max: number, cls: string): string {
  return `<div class="ns-row"><span class="k"><b>${esc(group)}</b>_*</span><span class="ns-track"><span class="ns-fill ${cls}" style="width:${pct(count / max)}%"></span></span><span class="cnt">${count}</span></div>`
}

export function renderAtlasHtml(s: WorkspaceSnapshot): string {
  const orphanIndexes = s.orphans.filter((o) => o.endsWith('/index.spw') || o === 'index.spw')
  const topNs = s.namespace.slice(0, 4)
  const nsMax = topNs[0]?.count ?? 1
  const tailCount = s.namespace.slice(4).reduce((sum, g) => sum + g.count, 0)
  const stamp = s.at.slice(0, 10)

  const regionsHtml = s.regions.map(region).join('')
  const hubsHtml = s.hubs.slice(0, 6).map(hubRow).join('')
  const orphansHtml = [
    ...s.orphans.filter((o) => orphanIndexes.includes(o)).slice(0, 4),
    ...s.orphans.filter((o) => !orphanIndexes.includes(o)).slice(0, 2),
  ].map(orphanRow).join('')
  const nsHtml = topNs.map((g, i) => nsRow(g.group, g.count, nsMax, i === 1 ? 'spw' : i > 1 ? 'tail' : '')).join('')
    + (tailCount > 0 ? `<div class="ns-row"><span class="k"><span style="color:var(--faint)">${s.namespace.length - 4} more families</span></span><span class="ns-track"><span class="ns-fill tail" style="width:${pct(tailCount / nsMax)}%"></span></span><span class="cnt">${tailCount}</span></div>` : '')

  const danglingLine = s.dangling.length > 0
    ? `<code>${esc(s.dangling[0]!.from.split('/').pop() ?? '')} → #${esc(s.dangling[0]!.fragment)}</code>`
    : 'none'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spw Workspace Atlas · ${esc(s.ref)}</title>
<style>
:root {
  --bg:#1d2021; --panel:#282828; --panel-2:#32302f; --border:#3c3836; --border-bright:#504945;
  --ink:#ebdbb2; --ink-strong:#fbf1c7; --dim:#a89984; --faint:#928374;
  --deixis:#8ec07c; --case:#83a598; --mood:#fabd2f; --aspect:#d3869b; --warn:#fb4934; --ok:#b8bb26; --accent:#8ec07c;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root { --bg:#f9f5d7; --panel:#f2e5bc; --panel-2:#eee0b7; --border:#e0d3a8; --border-bright:#d5c4a1;
    --ink:#3c3836; --ink-strong:#282828; --dim:#665c54; --faint:#7c6f64;
    --deixis:#427b58; --case:#076678; --mood:#b57614; --aspect:#8f3f71; --warn:#9d0006; --ok:#79740e; --accent:#427b58; }
}
:root[data-theme="dark"] { --bg:#1d2021; --panel:#282828; --panel-2:#32302f; --border:#3c3836; --border-bright:#504945;
  --ink:#ebdbb2; --ink-strong:#fbf1c7; --dim:#a89984; --faint:#928374;
  --deixis:#8ec07c; --case:#83a598; --mood:#fabd2f; --aspect:#d3869b; --warn:#fb4934; --ok:#b8bb26; --accent:#8ec07c; }
:root[data-theme="light"] { --bg:#f9f5d7; --panel:#f2e5bc; --panel-2:#eee0b7; --border:#e0d3a8; --border-bright:#d5c4a1;
  --ink:#3c3836; --ink-strong:#282828; --dim:#665c54; --faint:#7c6f64;
  --deixis:#427b58; --case:#076678; --mood:#b57614; --aspect:#8f3f71; --warn:#9d0006; --ok:#79740e; --accent:#427b58; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--mono); font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased; }
.wrap { max-width:1000px; margin:0 auto; padding:clamp(1.5rem,4vw,4rem) clamp(1rem,4vw,2rem) 6rem; }
.mast { border-bottom:1px solid var(--border-bright); padding-bottom:1.75rem; margin-bottom:2.5rem; }
.eyebrow { font-size:.72rem; letter-spacing:.22em; text-transform:uppercase; color:var(--faint); margin:0 0 .9rem; }
.eyebrow b { color:var(--accent); font-weight:600; }
h1 { font-size:clamp(2rem,6vw,3.4rem); line-height:1.02; margin:0; letter-spacing:-.03em; color:var(--ink-strong); font-weight:700; text-wrap:balance; }
h1 .brace { color:var(--faint); font-weight:400; }
.lede { font-family:var(--sans); font-size:1.05rem; line-height:1.6; color:var(--dim); max-width:62ch; margin:1.1rem 0 0; }
.vitals { display:flex; flex-wrap:wrap; gap:1px; background:var(--border); border:1px solid var(--border); margin:2.5rem 0 3.5rem; }
.vital { flex:1 1 130px; background:var(--panel); padding:1.1rem 1.25rem; }
.vital .n { font-size:2rem; font-weight:700; color:var(--ink-strong); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.vital .n small { font-size:.95rem; color:var(--faint); font-weight:400; }
.vital .l { font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--faint); margin-top:.2rem; }
section { margin:3.5rem 0; }
.sec-head { display:flex; align-items:baseline; gap:.75rem; margin:0 0 1.4rem; }
.sec-head h2 { font-size:1.05rem; letter-spacing:.04em; margin:0; color:var(--ink-strong); font-weight:700; }
.sec-head .idx { font-size:.72rem; color:var(--accent); letter-spacing:.1em; }
.sec-head .note { font-family:var(--sans); font-size:.85rem; color:var(--faint); margin-left:auto; }
.prose { font-family:var(--sans); color:var(--dim); max-width:64ch; font-size:.96rem; }
.prose code, .callout code, footer code { font-family:var(--mono); font-size:.88em; color:var(--accent); background:var(--panel); padding:.05em .35em; border-radius:2px; }
.dkey { display:flex; flex-wrap:wrap; gap:1.1rem; margin-bottom:1.4rem; font-size:.78rem; }
.dkey span { display:inline-flex; align-items:center; gap:.4rem; color:var(--dim); }
.sw { width:11px; height:11px; border-radius:2px; display:inline-block; }
.region { margin-bottom:1.15rem; }
.region-top { display:flex; align-items:baseline; gap:.6rem; margin-bottom:.35rem; }
.region-name { font-weight:700; color:var(--ink-strong); font-size:.95rem; }
.region-files { font-size:.74rem; color:var(--faint); }
.chip { margin-left:auto; font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; padding:.12em .55em; border-radius:2px; border:1px solid transparent; font-weight:600; }
.chip.volatile { color:var(--aspect); border-color:color-mix(in srgb,var(--aspect) 45%,transparent); }
.chip.settled { color:var(--mood); border-color:color-mix(in srgb,var(--mood) 45%,transparent); }
.chip.durable { color:var(--deixis); border-color:color-mix(in srgb,var(--deixis) 45%,transparent); }
.bar { display:flex; height:22px; border-radius:3px; overflow:hidden; border:1px solid var(--border); background:var(--panel); }
.bar i { display:block; height:100%; }
.bar i.deixis { background:var(--deixis); } .bar i.case { background:var(--case); } .bar i.mood { background:var(--mood); } .bar i.aspect { background:var(--aspect); }
.callout { margin-top:1.4rem; border-left:2px solid var(--accent); background:var(--panel); padding:.9rem 1.2rem; font-family:var(--sans); font-size:.9rem; color:var(--dim); }
.callout b { color:var(--ink); font-weight:600; }
.cols { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--border); border:1px solid var(--border); }
@media (max-width:720px) { .cols { grid-template-columns:1fr; } }
.col { background:var(--panel); padding:1.2rem 1.3rem; }
.col h3 { margin:0 0 .9rem; font-size:.78rem; letter-spacing:.12em; text-transform:uppercase; color:var(--faint); display:flex; gap:.5rem; align-items:baseline; }
.col h3 .c { color:var(--ink-strong); }
.rows { display:flex; flex-direction:column; }
.row { display:flex; align-items:baseline; gap:.6rem; padding:.28rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
.row:last-child { border-bottom:0; }
.row .path { color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.row .path .d { color:var(--faint); }
.row .val { margin-left:auto; font-variant-numeric:tabular-nums; color:var(--accent); font-weight:700; }
.row .val .u { color:var(--faint); font-weight:400; font-size:.9em; }
.ns { display:flex; flex-direction:column; gap:.55rem; }
.ns-row { display:grid; grid-template-columns:9rem 1fr 3rem; align-items:center; gap:.8rem; }
.ns-row .k { color:var(--ink); font-size:.85rem; } .ns-row .k b { color:var(--ink-strong); }
.ns-track { height:14px; background:var(--panel); border:1px solid var(--border); border-radius:2px; overflow:hidden; }
.ns-fill { height:100%; background:var(--deixis); } .ns-fill.spw { background:var(--case); } .ns-fill.tail { background:var(--faint); }
.ns-row .cnt { text-align:right; font-variant-numeric:tabular-nums; color:var(--dim); font-size:.82rem; }
footer { margin-top:4rem; padding-top:1.5rem; border-top:1px solid var(--border); color:var(--faint); font-size:.78rem; }
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <p class="eyebrow">generated atlas · <b>${esc(s.ref)}</b> · ${esc(stamp)}</p>
    <h1><span class="brace">^[</span>Workspace Atlas<span class="brace">]</span></h1>
    <p class="lede">A map the workspace draws of itself. Every region has a dialect, every surface a place in the reference graph. Read the marks and the role follows — position predicts property, before you've read a word of prose.</p>
  </header>
  <div class="vitals">
    <div class="vital"><div class="n">${s.surfaces}</div><div class="l">surfaces</div></div>
    <div class="vital"><div class="n">${s.anchors}</div><div class="l">anchors</div></div>
    <div class="vital"><div class="n">${s.regions.length}</div><div class="l">regions</div></div>
    <div class="vital"><div class="n">${s.fragRefs} <small>/ ${s.edges}</small></div><div class="l">deep-links / edges</div></div>
    <div class="vital"><div class="n">${s.orphanCount}</div><div class="l">adrift surfaces</div></div>
  </div>
  <section>
    <div class="sec-head"><span class="idx">01</span><h2>Dialect by region</h2><span class="note">aspect share → volatility</span></div>
    <div class="dkey">
      <span><i class="sw" style="background:var(--deixis)"></i>deixis · navigability</span>
      <span><i class="sw" style="background:var(--case)"></i>case · queryability</span>
      <span><i class="sw" style="background:var(--mood)"></i>mood · assertion</span>
      <span><i class="sw" style="background:var(--aspect)"></i>aspect · volatility</span>
    </div>
    ${regionsHtml}
    <div class="callout"><b>Read it as a gradient.</b> Regions heavy on aspect run hot — deferred state, revised constantly; balanced regions sit cool and durable. A surface's region already tells you how much to trust a cached reading of it.</div>
  </section>
  <section>
    <div class="sec-head"><span class="idx">02</span><h2>Structure</h2><span class="note">what holds it up · what drifts</span></div>
    <div class="cols">
      <div class="col"><h3>Load-bearing <span class="c">· top hubs</span></h3><div class="rows">${hubsHtml}</div></div>
      <div class="col"><h3>Adrift <span class="c">· ${s.orphanCount} surfaces</span></h3><div class="rows">${orphansHtml}</div></div>
    </div>
    ${orphanIndexes.length > 0 ? `<div class="callout"><b>The tell:</b> ${orphanIndexes.length} of the adrift surfaces are <code>index.spw</code> files — entry points nothing links to. An unreferenced index is a discoverability bug the atlas can see and the reader can't.</div>` : ''}
  </section>
  <section>
    <div class="sec-head"><span class="idx">03</span><h2>The anchor namespace</h2><span class="note">${s.anchors} named · ${s.fragRefs} linked</span></div>
    <p class="prose" style="margin-bottom:1.4rem">Anchors are the workspace's addressable points — <code>#&gt;name</code> marks a place, <code>~"file#name"</code> reaches it. Nearly every name already sorts itself into a family.</p>
    <div class="ns">${nsHtml}</div>
    <div class="callout"><b>A namespace, not yet a graph.</b> ${s.anchors} anchors exist; ${s.fragRefs} deep-links use them, ${s.danglingRefs} dangling (${danglingLine}). The addressing is built and largely untaken — the connective tissue is the workspace's largest opportunity, and its most learnable: names already imply the structure the links would make explicit.</div>
  </section>
  <footer>Generated from a live crawl over ${s.surfaces} tracked <code>.spw</code> surfaces at <code>${esc(s.ref)}</code>. Regenerating re-reads the workspace, so the map can't drift from the territory.</footer>
</div>
</body>
</html>`
}
