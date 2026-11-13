import { describe, expect, it } from 'vitest'
import { desugar, lex, parse } from '../index'
import {
  PAIR_LABELS_SCHEMA,
  braceEdges,
  mirrorPairLabel,
  pairLabelsAround,
  scanBraceEdges,
  scanPairLabels,
  type BraceEdge,
  type PairLabelScan,
} from './pair-labels'

const spans = (scan: PairLabelScan): string[] => scan.pairs.map((p) => `${p.kind}${p.label ?? ''}@${p.open.at}:${p.close.at}`)
const named = (edges: readonly BraceEdge[]): string[] => edges.map((e) => `${e.edge}:${e.kind}${e.label ?? ''}`)
const classes = (edges: readonly BraceEdge[]): string[] => edges.map((e) => `${e.kind}${e.label ?? ''}`).sort()
const edgesOf = (text: string): BraceEdge[] => braceEdges(lex(text, { eventPolicy: 'none' }).tokens)

/** A small seeded generator, so a failing law names the seed that broke it. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Labeling = 'none' | 'repeated' | 'mirrored'
const CLOSE_OF = { '{': '}', '[': ']', '(': ')' } as const
const KINDS = ['{', '[', '('] as const

function letters(n: number): string {
  let s = ''
  do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) } while (n > 0)
  return s
}

/**
 * Well-nested text. Every labeled pair gets its own name, and pieces are
 * spaced, so `((` never fuses into an n-range.
 */
function makeNested(seed: number, labelings: readonly Labeling[]): { text: string; pairs: number } {
  const next = rng(seed)
  let count = 0
  const piece = (depth: number): string => {
    if (depth >= 4 || next() < 0.35) return ['seed', 'water', '7', 'k: v', 'a.b'][Math.floor(next() * 5)]
    const kind = KINDS[Math.floor(next() * KINDS.length)]
    const labeling = labelings[Math.floor(next() * labelings.length)]
    const label = `w${letters(count++)}`
    const inner = Array.from({ length: 1 + Math.floor(next() * 3) }, () => piece(depth + 1)).join(' ')
    if (labeling === 'none') return `${kind} ${inner} ${CLOSE_OF[kind]}`
    const close = labeling === 'repeated'
      ? `${CLOSE_OF[kind]}_${label}`
      : `${[...label].reverse().join('')}_${CLOSE_OF[kind]}`
    return `${kind}_${label} ${inner} ${close}`
  }
  const text = Array.from({ length: 2 + Math.floor(next() * 3) }, () => piece(0)).join('\n')
  return { text, pairs: count }
}

/** Lay labeled pairs over a text wherever two gaps fall, so they overlap what is there. */
function overlay(text: string, seed: number, howMany: number): string {
  const next = rng(seed * 7919)
  let out = text
  for (let n = 0; n < howMany; n++) {
    // Not the gap inside `k: v`: a word after a colon is the binding's value, not a label.
    const gaps = [...out.matchAll(/ /g)].map((m) => m.index as number).filter((i) => out[i - 1] !== ':')
    if (gaps.length < 2) break
    const a = gaps[Math.floor(next() * gaps.length)]
    const b = gaps[Math.floor(next() * gaps.length)]
    const [from, to] = a < b ? [a, b] : [b, a]
    if (from === to) continue
    const kind = KINDS[Math.floor(next() * KINDS.length)]
    const label = `s${letters(n)}`
    const close = next() < 0.5 ? `${CLOSE_OF[kind]}_${label}` : `${[...label].reverse().join('')}_${CLOSE_OF[kind]}`
    out = `${out.slice(0, from)} ${kind}_${label} ${out.slice(from + 1, to)} ${close} ${out.slice(to + 1)}`
  }
  return out
}

const ALL: readonly Labeling[] = ['none', 'repeated', 'mirrored']
const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1)

describe('pair labels: what is read', () => {
  it('reads what desugar writes', () => {
    const scan = scanPairLabels(desugar('A{}'))
    expect(scan.schema).toBe(PAIR_LABELS_SCHEMA)
    expect(scan.pairs.map((p) => [p.kind, p.label, p.close.spelling])).toEqual([['{', 'A', 'repeated']])
    expect(scan.whole && scan.tree).toBe(true)
  })

  it('reads a repeated close and a mirrored close as the same label', () => {
    const repeated = scanPairLabels('{_label a b }_label')
    const mirrored = scanPairLabels('{_label a b lebal_}')
    expect(repeated.pairs.map((p) => p.label)).toEqual(['label'])
    expect(mirrored.pairs.map((p) => p.label)).toEqual(['label'])
    expect(mirrored.pairs[0].close.spelling).toBe('mirrored')
    expect(repeated.whole && mirrored.whole).toBe(true)
  })

  it('reads every brace kind, and nests', () => {
    const scan = scanPairLabels('{_spell [_row 1, 2 wor_] (_scene { x } )_scene lleps_}')
    expect(scan.pairs.map((p) => [p.kind, p.label, p.depth])).toEqual([
      ['{', 'spell', 0], ['[', 'row', 1], ['(', 'scene', 1], ['{', undefined, 2],
    ])
    expect(scan.whole && scan.tree).toBe(true)
  })

  it('lets labeled pairs overlap without nesting, and says where they cross', () => {
    for (const source of ['{_A {_B x }_A }_B', '{_A {_B x A_} B_}']) {
      const scan = scanPairLabels(source)
      expect(scan.pairs.map((p) => p.label), source).toEqual(['A', 'B'])
      expect(scan.crossings, source).toEqual([[0, 1]])
      expect(scan.whole, source).toBe(true)
      expect(scan.tree, source).toBe(false)
    }
  })

  it('keeps labels on closes written tight against each other', () => {
    expect(scanPairLabels('{_B {_A x }_A}_B').pairs.map((p) => p.label)).toEqual(['B', 'A'])
    expect(scanPairLabels('{_B {_A x A_}B_}').pairs.map((p) => p.label)).toEqual(['B', 'A'])
  })

  it('leaves a hole, a key, a value, a whole content and a word with its own brace alone', () => {
    for (const source of ['{_}', '{_id: 3}', '{ status: done_}', '{_001}', '{a_}', '{ _label a }', '{ a }_b{ c }']) {
      const scan = scanPairLabels(source)
      expect(scan.pairs.every((p) => p.label === undefined), source).toBe(true)
      expect(scan.whole, source).toBe(true)
    }
  })

  it('leaves a label on one end without a partner, and says what it would pair as by kind', () => {
    // docs/theory/spw labels the open alone on ten surfaces.
    const open = scanPairLabels('{_axes a b }')
    expect(open.pairs).toHaveLength(0)
    expect(named(open.unreleased)).toEqual(['open:{axes'])
    expect(named(open.stray)).toEqual(['close:{'])
    expect(open.loose.map((p) => [p.open.label, p.close.label, p.label])).toEqual([['axes', undefined, undefined]])
    // A leading word that is not a pair label, as a story consumer writes it.
    const scene = scanPairLabels('<once upon a time>(_in "boon.land"){ there was <a cactus> }')
    expect(named(scene.unreleased)).toEqual(['open:(in'])
    expect(named(scene.stray)).toEqual(['close:('])
    expect(scene.loose).toHaveLength(1)
    expect(scanPairLabels('{_a x a_}').loose).toHaveLength(0)
  })

  it('shows why the loose reading is advisory: a bare close can stand in for a missing labeled one', () => {
    const scan = scanPairLabels('{ {_a x } ')
    expect(scan.pairs.map((p) => [p.open.at, p.label])).toEqual([[0, undefined]])
    expect(named(scan.unreleased)).toEqual(['open:{a'])
    expect(scan.loose).toHaveLength(0)
    // With no bare open to take the close, by kind alone the labeled open would take it.
    expect(scanPairLabels('{_a x } ').loose).toHaveLength(1)
  })

  it('does not see braces inside a string or a comment', () => {
    const scan = scanPairLabels('{_a "}_a {" x a_} // }_a')
    expect(spans(scan)).toHaveLength(1)
    expect(scan.whole).toBe(true)
  })

  it('reads a line a story consumer seals with a label and its mirror', () => {
    // The form a mounted consumer's game hands a player to keep; its own reader checks the seal by hand today.
    const line = '^kept[thursday]{_thursday .day["2026-11-27"] .chapter[15] .carrier[porter] *kept_place{ ~warm[4] } yadsruht_}'
    const scan = scanPairLabels(line, { profile: 'prose' })
    const sealed = scan.pairs.find((p) => p.label === 'thursday')
    expect(sealed?.close.spelling).toBe('mirrored')
    expect(sealed?.depth).toBe(0)
    expect(scan.whole && scan.tree).toBe(true)
    expect(parse(line, { lexProfile: 'prose' }).completeness?.complete).toBe(true)
    // Cut short on the way, the open is left waiting from the front and found by nothing from the back.
    const cut = line.slice(0, -10)
    expect(named(scanPairLabels(cut, { profile: 'prose' }).unreleased)).toEqual(['open:{thursday'])
    expect(named(scanPairLabels(cut, { profile: 'prose', direction: 'backward' }).stray)).toEqual(['open:{thursday'])
  })

  it('names the labels around an offset', () => {
    const source = '{_spell { (_ward x draw_) } lleps_}'
    const scan = scanPairLabels(source)
    expect(pairLabelsAround(scan, source.indexOf('x'))).toEqual(['spell', null, 'ward'])
    expect(pairLabelsAround(scan, 0)).toEqual([])
  })
})

describe('pair labels: laws', () => {
  it('reads unlabeled text exactly as plain bracket matching does', () => {
    for (const seed of SEEDS) {
      const { text, pairs } = makeNested(seed, ['none'])
      const scan = scanPairLabels(text)
      expect(scan.pairs, `seed ${seed}`).toHaveLength(pairs)
      const stack: number[] = []
      const plain: string[] = []
      for (let i = 0; i < text.length; i++) {
        if ('{[('.includes(text[i])) stack.push(i)
        else if ('}])'.includes(text[i])) { const open = stack.pop() as number; plain.push(`${text[open]}@${open}:${i}`) }
      }
      expect(spans(scan).sort(), `seed ${seed}`).toEqual(plain.sort())
      expect(scan.tree && scan.whole, `seed ${seed}`).toBe(true)
    }
  })

  it('returns the same pairs from either end, on any text', () => {
    const alphabet = ['{', '}', '[', ']', '(', ')', '{_a ', ' a_}', ' }_a', '(_b ', ' b_)', ' ', 'x', ' k: v ', '"', '\n', '// ']
    for (const seed of SEEDS) {
      const next = rng(seed)
      const texts = [
        overlay(makeNested(seed, ALL).text, seed, 3),
        Array.from({ length: 40 }, () => alphabet[Math.floor(next() * alphabet.length)]).join(''),
      ]
      for (const text of texts) {
        const edges = braceEdges(lex(text, { profile: 'prose', eventPolicy: 'none' }).tokens)
        const forward = scanBraceEdges(edges)
        const backward = scanBraceEdges(edges, 'backward')
        expect(spans(backward), `seed ${seed}\n${text}`).toEqual(spans(forward))
        expect(backward.crossings, `seed ${seed}`).toEqual(forward.crossings)
        expect(backward.loose.map((p) => `${p.open.at}:${p.close.at}`), `seed ${seed}\n${text}`)
          .toEqual(forward.loose.map((p) => `${p.open.at}:${p.close.at}`))
        // What one end leaves waiting is what the other end finds nothing for.
        expect(named(backward.stray), `seed ${seed}\n${text}`).toEqual(named(forward.unreleased))
        expect(named(backward.unreleased), `seed ${seed}\n${text}`).toEqual(named(forward.stray))
        expect(forward.pairs.length * 2 + forward.unreleased.length + forward.stray.length, `seed ${seed}`).toBe(edges.length)
        expect(forward.events, `seed ${seed}`).toHaveLength(edges.length)
        for (const pair of forward.pairs) {
          expect(pair.open.at, `seed ${seed}`).toBeLessThan(pair.close.at)
          expect(pair.open.label, `seed ${seed}`).toBe(pair.close.label)
        }
      }
    }
  })

  it('counts containers and crossings as a pair by pair comparison does', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const scan = scanPairLabels(overlay(makeNested(seed, ALL).text, seed, 4))
      const crossings: Array<[number, number]> = []
      scan.pairs.forEach((p, i) => {
        let depth = 0
        scan.pairs.forEach((q, j) => {
          if (q.open.at < p.open.at && q.close.at > p.close.at) depth++
          if (q.open.at < p.open.at && q.close.at > p.open.at && q.close.at < p.close.at) crossings.push([j, i])
        })
        expect(p.depth, `seed ${seed}`).toBe(depth)
      })
      crossings.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      expect(scan.crossings, `seed ${seed}`).toEqual(crossings)
      expect(scan.tree, `seed ${seed}`).toBe(crossings.length === 0)
    }
  })

  it('leaves the same classes waiting at a cut, whichever side is read', () => {
    let waited = 0
    for (const seed of SEEDS) {
      const text = overlay(makeNested(seed, ALL).text, seed, 3)
      const tokens = lex(text, { eventPolicy: 'none' }).tokens
      const edges = braceEdges(tokens)
      expect(scanBraceEdges(edges).whole, `seed ${seed}\n${text}`).toBe(true)
      // A label touches its brace, so a cut at whitespace never parts them: the edges split as the text does.
      for (const cut of tokens.filter((t) => t.type === 'WHITESPACE').map((t) => t.span.start.offset)) {
        const head = scanBraceEdges(edges.filter((e) => e.at < cut))
        const tail = scanBraceEdges(edges.filter((e) => e.at >= cut), 'backward')
        expect(head.stray.length + tail.stray.length, `seed ${seed} cut ${cut}`).toBe(0)
        expect(classes(tail.unreleased), `seed ${seed} cut ${cut}\n${text}`).toEqual(classes(head.unreleased))
        waited += head.unreleased.length
      }
    }
    expect(waited).toBeGreaterThan(1000)
  })

  it('reads a cut text as it reads the edges on each side of the cut', () => {
    const text = overlay(makeNested(7, ALL).text, 7, 3)
    const tokens = lex(text, { eventPolicy: 'none' }).tokens
    const edges = braceEdges(tokens)
    const cuts = tokens.filter((t) => t.type === 'WHITESPACE').map((t) => t.span.start.offset)
    expect(cuts.length).toBeGreaterThan(4)
    for (const cut of cuts) {
      expect(named(scanPairLabels(text.slice(0, cut)).unreleased))
        .toEqual(named(scanBraceEdges(edges.filter((e) => e.at < cut)).unreleased))
      expect(named(scanPairLabels(text.slice(cut), { direction: 'backward' }).unreleased))
        .toEqual(named(scanBraceEdges(edges.filter((e) => e.at >= cut), 'backward').unreleased))
    }
  })

  it('spells a mirrored close, read leftward, as its open reads rightward', () => {
    for (const label of ['label', 'spell', 'A', 'kept.line', 'two-words', '_x', '2x']) {
      const mirrored = mirrorPairLabel(label)
      expect(mirrored, label).not.toBeNull()
      const open = `{_${label}`
      const close = `${mirrored}}`
      expect([...close].reverse().join('').slice(1)).toBe(open.slice(1))
      expect(scanPairLabels(`${open} x ${close}`).pairs.map((p) => p.label)).toEqual([label])
    }
  })

  it('has no mirror for a label the lexer would split', () => {
    // Read from the right, 2wor_ is a number and then a word.
    expect(mirrorPairLabel('row2')).toBeNull()
    expect(mirrorPairLabel('a-')).toBeNull()
    expect(mirrorPairLabel('')).toBeNull()
    const split = scanPairLabels('{_row2 x 2wor_}')
    expect(split.pairs).toHaveLength(0)
    expect(named(split.unreleased)).toEqual(['open:{row2'])
    expect(named(split.stray)).toEqual(['close:{row'])
  })

  it('loses only its own pair when a labeled close goes missing', () => {
    let tried = 0
    for (const seed of SEEDS) {
      const edges = edgesOf(overlay(makeNested(seed, ['repeated', 'mirrored']).text, seed, 2))
      const whole = scanBraceEdges(edges)
      for (const lost of whole.pairs) {
        tried++
        const broken = edges.filter((e) => e !== lost.close)
        for (const direction of ['forward', 'backward'] as const) {
          const scan = scanBraceEdges(broken, direction)
          const waiting = direction === 'forward' ? scan.unreleased : scan.stray
          expect(waiting.map((e) => e.at), `seed ${seed} ${direction}`).toEqual([lost.open.at])
          expect(spans(scan), `seed ${seed} ${direction}`).toEqual(spans(whole).filter((s) => s !== `${lost.kind}${lost.label}@${lost.open.at}:${lost.close.at}`))
        }
      }
    }
    expect(tried).toBeGreaterThan(300)
  })

  it('shifts every pair outward when a bare close goes missing, which a label prevents', () => {
    const bare = scanPairLabels('{ { { x }   } }'.replace('}   ', '    '))
    expect(bare.pairs.map((p) => p.depth)).toEqual([0, 1])
    expect(bare.unreleased.map((e) => e.at)).toEqual([0])
    const labeled = scanPairLabels('{_a {_b {_c x c_}      a_}')
    expect(labeled.pairs.map((p) => p.label)).toEqual(['a', 'c'])
    expect(named(labeled.unreleased)).toEqual(['open:{b'])
  })

  it('never pairs two different labels, and offers them as a loose pair whose ends differ', () => {
    const scan = scanPairLabels('{_spell x lepls_}')
    expect(scan.pairs).toHaveLength(0)
    expect(named(scan.unreleased)).toEqual(['open:{spell'])
    expect(named(scan.stray)).toEqual(['close:{slpel'])
    expect(scan.loose.map((p) => [p.open.label, p.close.label, p.label])).toEqual([['spell', 'slpel', undefined]])
  })
})

describe('pair labels: beside the parser', () => {
  it('leaves the parse as it was', () => {
    const source = '^card{_face a: 1 }_face\n{_spell ~warm[6] lleps_}'
    const before = JSON.stringify(parse(source).ast)
    scanPairLabels(source)
    scanPairLabels(source, { direction: 'backward' })
    expect(JSON.stringify(parse(source).ast)).toBe(before)
    expect(parse(source).completeness?.complete).toBe(true)
  })
})
