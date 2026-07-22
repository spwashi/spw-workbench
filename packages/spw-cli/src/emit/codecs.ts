/**
 * Host codecs: EmitDocument → HostPacket
 */

import type { EmitDocument, EmitHost, EmitMeasure, HostPacket } from './types'
import { estimateSentences, holdPositive } from './positive-ground'
import { phrasesForDims } from './registers'
import { measureContinuity } from './continuity'

export function encodeHost(ir: EmitDocument, host: EmitHost): HostPacket {
  const base = measureDocument(ir)
  switch (host) {
    case 'json':
      return {
        host,
        fields: { ir: JSON.stringify(ir, null, 2) },
        text: JSON.stringify(ir, null, 2),
        measure: attachContinuity(base, ir, JSON.stringify(ir)),
      }
    case 'mj':
      return encodeMj(ir, base)
    case 'web_copy':
      return encodeWebCopy(ir, base)
    case 'eng_note':
      return encodeEngNote(ir, base)
    case 'brief':
      return encodeBrief(ir, base)
    case 'copy':
      return encodeCopy(ir, base)
    case 'audio':
      return encodeAudio(ir, base)
    case 'social':
      return encodeSocial(ir, base)
    case 'plain':
    default:
      return encodePlain(ir, base)
  }
}

function measureDocument(ir: EmitDocument): EmitMeasure {
  const corpus = [...Object.values(ir.traits), ...Object.values(ir.slots)].join('\n')
  const pos = holdPositive(corpus)
  return {
    hold_positive: pos.ok,
    negation_spine_hits: pos.hits,
    trait_count: Object.keys(ir.traits).length,
    slot_count: Object.keys(ir.slots).length,
    sentence_estimate: estimateSentences(corpus),
    warnings: [...ir.meta.warnings, ...pos.warnings],
    continuity: measureContinuity(corpus, ir.anchors),
  }
}

function attachContinuity(base: EmitMeasure, ir: EmitDocument, text: string): EmitMeasure {
  const pos = holdPositive(text)
  const continuity = measureContinuity(text, ir.anchors)
  return {
    ...base,
    hold_positive: pos.ok,
    negation_spine_hits: pos.hits,
    sentence_estimate: estimateSentences(text),
    warnings: [
      ...base.warnings.filter(
        (w) => !w.startsWith('positive_ground:') && !w.startsWith('continuity:'),
      ),
      ...pos.warnings,
      ...continuity.warnings,
    ],
    continuity,
  }
}

function primaryBody(ir: EmitDocument): string {
  return (
    ir.slots.final_prompt ??
    ir.slots.body ??
    ir.slots.text ??
    ir.slots.short_prompt ??
    ir.slots.summary ??
    ''
  )
}

function encodePlain(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const parts: string[] = []
  const body = primaryBody(ir)
  if (body) parts.push(body)
  else {
    const lines: string[] = []
    for (const [k, v] of Object.entries(ir.traits)) {
      lines.push(`${k}: ${v}`)
    }
    const tone = phrasesForDims(ir.dims)
    if (tone.length) lines.push(`register texture: ${tone.join('; ')}`)
    if (ir.slots.summary) lines.push(ir.slots.summary)
    parts.push(lines.join('\n'))
  }

  const text = parts.filter(Boolean).join('\n\n').trim()
  return {
    host: 'plain',
    text,
    fields: { text },
    measure: attachContinuity(measure, ir, text),
  }
}

function encodeMj(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const tone = phrasesForDims(ir.dims, 4)
  let short = ir.slots.short_prompt ?? ''
  let final = ir.slots.final_prompt ?? primaryBody(ir)
  if (tone.length && final && !final.includes(tone[0]!)) {
    final = `${final.trim()} ${tone.join(', ')}.`
  }
  if (!short && final) {
    short = final.split(/(?<=\.)\s+/)[0] ?? final.slice(0, 280)
  }
  const negative = ir.slots.negative_prompt ?? ''
  const flags = ir.slots.flags ?? ''
  const fields: Record<string, string> = {
    short_prompt: short,
    final_prompt: final,
    negative_prompt: negative,
    flags,
  }
  if (ir.register) fields.register = ir.register
  const text = [
    short && `SHORT:\n${short}`,
    final && `FINAL:\n${final}`,
    negative && `NEGATIVE:\n${negative}`,
    flags && `FLAGS:\n${flags}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    host: 'mj',
    text,
    fields,
    measure: attachContinuity(measure, ir, `${short}\n${final}`),
  }
}

function encodeWebCopy(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const claim = ir.traits.claim ?? ir.slots.summary ?? ''
  const proof = ir.traits.proof ?? ''
  const door = ir.traits.door ?? ''
  const body = primaryBody(ir) || composeWebBody(claim, proof, door, ir)
  const fields = { claim, proof, door, body }
  const text = [claim && `# ${claim}`, proof, body, door && `→ ${door}`].filter(Boolean).join('\n\n')
  return {
    host: 'web_copy',
    text,
    fields,
    measure: attachContinuity(measure, ir, text),
  }
}

function composeWebBody(claim: string, proof: string, door: string, ir: EmitDocument): string {
  const tone = phrasesForDims(ir.dims, 3)
  const bits = [claim, proof, tone.length ? tone.join(', ') : '', door].filter(Boolean)
  return bits.join(' ')
}

function encodeEngNote(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const lines: string[] = []
  if (ir.register) lines.push(`register: #${ir.register}`)
  for (const [k, v] of Object.entries(ir.traits)) {
    lines.push(`${k}: ${v}`)
  }
  const body = primaryBody(ir)
  if (body) lines.push('', body)
  const acceptance = ir.traits.acceptance ?? ir.traits.door ?? ''
  if (acceptance) lines.push('', `acceptance: ${acceptance}`)
  const text = lines.join('\n').trim()
  return {
    host: 'eng_note',
    text,
    fields: {
      body: text,
      ...(ir.traits as Record<string, string>),
    },
    measure: attachContinuity(measure, ir, text),
  }
}

/** Production brief: goal / audience / claim / acceptance. */
function encodeBrief(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const goal = ir.traits.goal ?? ''
  const audience = ir.traits.audience ?? ''
  const claim = ir.traits.claim ?? ''
  const proof = ir.traits.proof ?? ''
  const door = ir.traits.door ?? ''
  const acceptance = ir.traits.acceptance ?? ''
  const title = ir.traits.title ?? ir.traits.working_title ?? ''
  const taste = ir.traits.taste ?? ''
  const register = ir.register ? `#${ir.register}` : ''

  const fields: Record<string, string> = {
    title,
    goal,
    audience,
    claim,
    proof,
    door,
    acceptance,
    taste,
    register,
  }

  const sections = [
    title && `## ${title}`,
    goal && `Goal\n${goal}`,
    audience && `Audience\n${audience}`,
    claim && `Claim\n${claim}`,
    proof && `Proof\n${proof}`,
    door && `Door\n${door}`,
    taste && `Taste\n${taste}`,
    acceptance && `Acceptance\n${acceptance}`,
    register && `Register\n${register}`,
  ].filter(Boolean)

  const text = sections.join('\n\n').trim()
  return {
    host: 'brief',
    text,
    fields,
    measure: attachContinuity(measure, ir, text),
  }
}

/** Long-form copy: headline / dek / body / door. */
function encodeCopy(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const headline = ir.slots.headline ?? ir.traits.claim ?? ''
  const dek = ir.slots.dek ?? ir.traits.proof ?? ''
  const body = ir.slots.body ?? ir.slots.final_prompt ?? ir.slots.text ?? ''
  const door = ir.traits.door ?? ir.slots.cta ?? ''
  const title = ir.traits.title ?? ''
  const fields = { title, headline, dek, body, door }
  const text = [
    title && `Title: ${title}`,
    headline && `# ${headline}`,
    dek && dek,
    body && body,
    door && `→ ${door}`,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim()
  return {
    host: 'copy',
    text,
    fields,
    measure: attachContinuity(measure, ir, text),
  }
}

/** Spoken / VO / song: cold open, spine, cta, duration. */
function encodeAudio(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const cold = ir.slots.cold_open ?? ir.slots.hook ?? ''
  const spine = ir.slots.body ?? ir.slots.final_prompt ?? ir.slots.beat ?? ir.slots.text ?? ''
  const cta = ir.slots.cta ?? ir.traits.door ?? ''
  const duration = ir.slots.duration ?? ''
  const title = ir.traits.title ?? ''
  const claim = ir.traits.claim ?? ''
  const fields = { title, claim, cold_open: cold, spine, cta, duration }
  const text = [
    title && `TITLE: ${title}`,
    duration && `DURATION: ${duration}`,
    cold && `COLD OPEN:\n${cold}`,
    spine && `SPINE:\n${spine}`,
    cta && `CTA:\n${cta}`,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim()
  return {
    host: 'audio',
    text,
    fields,
    measure: attachContinuity(measure, ir, text),
  }
}

/** Short social: hook / body / door. */
function encodeSocial(ir: EmitDocument, measure: EmitMeasure): HostPacket {
  const hook = ir.slots.hook ?? ir.slots.short_prompt ?? ir.traits.claim ?? ''
  const body =
    ir.slots.body ??
    ir.slots.text ??
    ir.slots.final_prompt ??
    [ir.traits.claim, ir.traits.proof].filter(Boolean).join(' ')
  const door = ir.traits.door ?? ir.slots.cta ?? ''
  const channel = ir.slots.channel ?? ''
  const hashtag = ir.slots.hashtag ?? ''
  const fields = { hook, body, door, channel, hashtag }
  const text = [hook, body, door, hashtag].filter(Boolean).join('\n\n').trim()
  return {
    host: 'social',
    text,
    fields,
    measure: attachContinuity(measure, ir, text),
  }
}
