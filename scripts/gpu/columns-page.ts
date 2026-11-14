#!/usr/bin/env tsx
/**
 * A WebGPU page that draws a .spw file's parse tree, tuned live by a settings line
 * — `npm run gpu:page -- <file.spw> [--out dir] [--shader '^shader{ … }']`.
 *
 * One rectangle per node: across, where the node is written in the source; down,
 * how deep it sits; its colour from its kind and its word. The rows are the
 * file's parse columns widened to u32 (seed experimental/columns/gpu-pack), inlined into
 * the page, so the page needs no parser. The ^shader line in the page's text
 * field is read by seed's readSettingsLine and packed by packUniforms into the
 * uniform buffer the shader declares with wgslStruct, both bundled in, so the
 * vocabulary, the struct and the buffer come from one table:
 *
 *   %zoom[1..32]  %pan[-1..1]  %hue[0..1]  %gap[0..0.8]  =palette[ink|dusk|meadow]  =color[kind|word|depth]
 *
 * Writes index.html (one file, nothing to serve) to --out, by default
 * .spw/gen/session/gpu, which git ignores.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { columnsToGpu, parseColumns, uniformLayout, wgslStruct, WGSL_ROW, type SettingsVocabulary } from '../../packages/spw-seed/src/index'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}
const file = args.find((a, i) => !a.startsWith('--') && !['--out', '--shader'].includes(args[i - 1] ?? ''))
if (!file) {
  console.error("usage: npm run gpu:page -- <file.spw> [--out dir] [--shader '^shader{ … }']")
  process.exit(2)
}
const out = path.resolve(flag('--out') ?? path.join(root, '.spw', 'gen', 'session', 'gpu'))
const firstLine = flag('--shader') ?? '^shader{ %zoom[1] %pan[0] %hue[0.08] %gap[0.15] =palette[dusk] =color[kind] }'

export const SHADER_WORDS: SettingsVocabulary = {
  zoom: { kind: 'number', range: [1, 32], says: 'how far in across the source' },
  pan: { kind: 'number', range: [-1, 1], says: 'where across the source the view sits' },
  hue: { kind: 'number', range: [0, 1], says: 'turns every colour round the wheel' },
  gap: { kind: 'number', range: [0, 0.8], says: 'space between depths, as a share of a row' },
  palette: { kind: 'choice', choices: ['ink', 'dusk', 'meadow'], says: 'lightness and saturation' },
  color: { kind: 'choice', choices: ['kind', 'word', 'depth'], says: 'what a node is coloured by' },
}

const text = await fs.readFile(path.resolve(file), 'utf8')
const tree = parseColumns(text)
if (!tree) {
  console.error(`gpu:page: the parser returned no tree for ${file}`)
  process.exit(1)
}
const gpu = columnsToGpu(tree, text.length)
const layout = uniformLayout(SHADER_WORDS, { zoom: 1, gap: 0.15, palette: 'dusk', color: 'kind' })

const WGSL = `${wgslStruct('Tune', layout)}

struct Frame {
  length: f32,
  depths: f32,
  kinds: f32,
  _pad: f32,
}

${WGSL_ROW}

@group(0) @binding(0) var<uniform> tune: Tune;
@group(0) @binding(1) var<uniform> frame: Frame;
@group(0) @binding(2) var<storage, read> rows: array<Row>;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

fn hsl(h: f32, s: f32, l: f32) -> vec3f {
  let k = (vec3f(0.0, 8.0, 4.0) + h * 12.0) % 12.0;
  let a = s * min(l, 1.0 - l);
  return l - a * max(min(min(k - 3.0, 9.0 - k), vec3f(1.0)), vec3f(-1.0));
}

@vertex
fn vs(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Out {
  let r = rows[i];
  let corner = vec2f(f32(v & 1u), f32((v >> 1u) & 1u));
  let x0 = f32(r.start) / frame.length;
  let x1 = f32(max(r.end, r.start + 1u)) / frame.length;
  let x = (mix(x0, x1, corner.x) - 0.5 - tune.pan * 0.5) * tune.zoom + 0.5;
  let row = 1.0 / frame.depths;
  let y = (f32(r.depth) + corner.y * (1.0 - tune.gap)) * row;
  var shade = f32(r.kind) / frame.kinds;
  if (tune.color == 1u) { shade = f32(r.word % 4093u) / 4093.0; }
  if (tune.color == 2u) { shade = f32(r.depth) / frame.depths; }
  var s = 0.55;
  var l = 0.5;
  if (tune.palette == 0u) { s = 0.15; l = 0.32; }
  if (tune.palette == 2u) { s = 0.6; l = 0.62; }
  var out: Out;
  out.position = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.color = vec4f(hsl(fract(shade + tune.hue), s, l), 1.0);
  return out;
}

@fragment
fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}
`

// The page's own code: read the line, pack it, draw. Bundled with seed's settings reader and packer.
const entry = path.join(out, 'page-entry.ts')
await fs.mkdir(out, { recursive: true })
await fs.writeFile(
  entry,
  `import { readSettingsLine } from ${JSON.stringify(path.join(root, 'packages/spw-seed/src/experimental/settings-line.ts'))}
import { packUniforms, uniformLayout } from ${JSON.stringify(path.join(root, 'packages/spw-seed/src/experimental/columns/gpu-pack.ts'))}
const DATA = (globalThis as any).SPW_GPU_DATA
const words = DATA.words
const layout = uniformLayout(words, DATA.defaults)
// The rows arrive as base64 of their bytes: decode bytes, never one element per character.
const rowBytes = Uint8Array.from(atob(DATA.rows), (c) => c.charCodeAt(0))
const status = document.querySelector('#status')!
const problems = document.querySelector('#problems')!
const input = document.querySelector('#line') as HTMLInputElement
async function main() {
  const gpu = (navigator as any).gpu
  if (!gpu) { status.textContent = 'This browser has no WebGPU, so nothing is drawn. The rows and the shader are below.'; return }
  const adapter = await gpu.requestAdapter()
  const device = await adapter.requestDevice()
  const canvas = document.querySelector('canvas')!
  const context = canvas.getContext('webgpu') as any
  const format = gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })
  const module = device.createShaderModule({ code: DATA.wgsl })
  const info = await module.getCompilationInfo()
  for (const m of info.messages) console.warn('wgsl', m.type, m.lineNum, m.message)
  const pipeline = device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-strip' } })
  const store = device.createBuffer({ size: Math.max(32, rowBytes.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
  device.queue.writeBuffer(store, 0, rowBytes)
  const tune = device.createBuffer({ size: layout.size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const frame = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  device.queue.writeBuffer(frame, 0, new Float32Array([DATA.length, DATA.maxDepth + 1, DATA.kinds, 0]))
  const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: tune } }, { binding: 1, resource: { buffer: frame } }, { binding: 2, resource: { buffer: store } }] })
  const draw = () => {
    const began = performance.now()
    const line = readSettingsLine(input.value, words)
    problems.textContent = line.problems.map((p: any) => p.problem + ' ' + p.word + (p.written !== undefined ? ' (' + p.written + ')' : '')).join(' · ') || 'read whole'
    device.queue.writeBuffer(tune, 0, packUniforms(line, layout, words))
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', clearValue: { r: 0.06, g: 0.06, b: 0.08, a: 1 }, storeOp: 'store' }] })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, group)
    pass.draw(4, DATA.nodes)
    pass.end()
    device.queue.submit([encoder.finish()])
    status.textContent = DATA.nodes + ' nodes drawn; the line was read and packed in ' + (performance.now() - began).toFixed(2) + ' ms'
  }
  input.addEventListener('input', draw)
  draw()
}
main().catch((e) => { status.textContent = 'WebGPU failed: ' + e })
`,
)
const bundled = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', target: 'es2022', minify: true, logLevel: 'silent' })
await fs.rm(entry)
const script = bundled.outputFiles[0]!.text

const data = {
  words: SHADER_WORDS,
  defaults: { zoom: 1, gap: 0.15, palette: 'dusk', color: 'kind' },
  rows: Buffer.from(gpu.rows.buffer, gpu.rows.byteOffset, gpu.rows.byteLength).toString('base64'),
  nodes: gpu.nodes,
  maxDepth: gpu.maxDepth,
  length: Math.max(1, gpu.length),
  kinds: gpu.kinds.length,
  wgsl: WGSL,
}
const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const words = Object.entries(SHADER_WORDS)
  .map(([w, s]) => `<li><code>${s.kind === 'number' ? '%' : '='}${w}</code> ${s.kind === 'number' ? `${s.range[0]} to ${s.range[1]}` : s.kind === 'choice' ? s.choices.join(' | ') : ''}: ${s.says ?? ''}</li>`)
  .join('')
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(path.basename(file))} — parse tree on the GPU</title>
<style>
:root { color-scheme: dark; --ink: #e8e6e1; --dim: #9a978f; --bg: #0f0f14; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--ink); font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
canvas { width: 100%; height: 46vh; display: block; border-radius: 6px; background: #101016; }
label, #status, #problems { display: block; margin: 8px 0; }
input { width: 100%; box-sizing: border-box; font: 14px ui-monospace, monospace; padding: 8px; background: #17171f; color: var(--ink); border: 1px solid #2c2c38; border-radius: 4px; }
#status, #problems, ul { color: var(--dim); }
pre { max-height: 30vh; overflow: auto; background: #14141b; padding: 8px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<main>
<h1>${escape(path.basename(file))}</h1>
<p>One rectangle per node of the parse tree: across, where it is written; down, how deep it sits. ${gpu.nodes} nodes, ${gpu.maxDepth + 1} depths.</p>
<canvas width="1600" height="700" aria-label="The parse tree of ${escape(path.basename(file))}, one rectangle per node"></canvas>
<label for="line">Tune it with one line of Spw</label>
<input id="line" value="${escape(firstLine)}" spellcheck="false" autocomplete="off">
<p id="problems" aria-live="polite"></p>
<p id="status" aria-live="polite"></p>
<ul>${words}</ul>
<details><summary>The shader (its Tune struct is written from the same table the line is read with)</summary><pre>${escape(WGSL)}</pre></details>
<details><summary>The source</summary><pre>${escape(text)}</pre></details>
</main>
<script>window.SPW_GPU_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};</script>
<script>${script}</script>
</body>
</html>
`
await fs.writeFile(path.join(out, 'index.html'), html)
console.log(`${gpu.nodes} nodes, ${gpu.maxDepth + 1} depths, ${(html.length / 1024).toFixed(0)} KB → ${path.join(out, 'index.html')}`)
