import { describe, expect, it } from 'vitest'
import { DEFAULT_CONNECTOR_MAP, DEFAULT_OPERATOR_MAP } from './profiles'
import { SPW_FRAME_LINE, multiCharacterMarks, spwWordPattern } from './word-pattern'

describe('the lexer as a POSIX pattern', () => {
  it('keeps every multi-character mark of the operator and connector tables, longest first', () => {
    const marks = multiCharacterMarks()
    for (const mark of [...Object.keys(DEFAULT_OPERATOR_MAP), ...Object.keys(DEFAULT_CONNECTOR_MAP)].filter((m) => m.length > 1)) expect(marks).toContain(mark)
    for (const mark of ['#>', '#:', '#!', '~#', '...']) expect(marks).toContain(mark)
    expect(marks.indexOf('...')).toBeLessThan(marks.indexOf('..'))
    // Every mark is escaped, so none is read as a regex operator.
    const words = new RegExp(`^(?:${spwWordPattern().replace('[^[:space:][:alnum:][:punct:]]+|', '').replace('[^[:space:]]', '\\S')})`)
    for (const mark of marks) expect(`${mark}x`.match(words)?.[0], mark).toBe(mark)
  })

  it('names an unindented line that opens a body, or an anchor, and nothing indented or plain', () => {
    const frame = new RegExp(SPW_FRAME_LINE)
    for (const line of ['^["commits"]{', '!["card"]{', '^gravity{', '?["When a word behaves like a number?"]{', '#>wonder_trial_scales', '~garden[care]{seed}']) expect(frame.test(line), line).toBe(true)
    for (const line of [' ^["nested"]{', '  a: 1', '# a comment', 'plain words {', '#>', '']) expect(frame.test(line), JSON.stringify(line)).toBe(false)
  })
})
