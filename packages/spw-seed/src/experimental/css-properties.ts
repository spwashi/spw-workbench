/**
 * A settings line written as CSS custom properties.
 *
 *   ^type{ %body[1rem] %scale[5/4] %h2[@body*@scale^2] %h1[@body*@scale^3] %beat[500ms] %measure[45..75ch] }
 *
 * becomes
 *
 *   --spw-body: 1rem;
 *   --spw-scale: 1.25;
 *   --spw-h2: calc(var(--spw-body) * 1.5625);
 *   --spw-h1: calc(var(--spw-body) * 1.953125);
 *   --spw-beat: 500ms;
 *   --spw-measure: clamp(45ch, 60ch, 75ch);
 *
 * A derived word stays a calc() over the property it names, so changing body in
 * the browser moves h1 and h2 with it; its factor is the number the derivation
 * resolved to. A range becomes clamp() with its midpoint between. A choice is
 * written as its word, a text as a quoted string, and a word the line could not
 * use is left out (its problem is on the line). Nothing here is checked by a
 * browser; the values are only as good as the line.
 *
 * Experimental (spw.css-properties/1).
 */

import { cssNumber } from './quantity'
import type { SettingsLine, SettingsVocabulary } from './settings-line'

export const CSS_PROPERTIES_SCHEMA = 'spw.css-properties/1' as const

export interface CssPropertiesOptions {
  /** Prefix for every property name; default --spw-. */
  prefix?: string
  /** Wrap the declarations in a rule for this selector. */
  selector?: string
}

const propertyName = (prefix: string, word: string): string => `${prefix}${word.replace(/_/g, '-')}`

/** Each known word the line set, as one declaration, in the vocabulary's order. */
export function cssDeclarations(line: SettingsLine, vocabulary: SettingsVocabulary, prefix = '--spw-'): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [word, spec] of Object.entries(vocabulary)) {
    const name = propertyName(prefix, word)
    if (spec.kind === 'quantity') {
      const derivation = line.derivations[word]
      if (derivation) {
        const from = `var(${propertyName(prefix, derivation.from)})`
        out.push([name, derivation.resolved === 1 ? from : `calc(${from} * ${cssNumber(derivation.resolved)})`])
        continue
      }
      const q = line.quantities[word]
      if (!q) continue
      if (q.high !== undefined) {
        const mid = cssNumber((q.value + q.high) / 2)
        out.push([name, `clamp(${cssNumber(q.value)}${q.unit}, ${mid}${q.unit}, ${cssNumber(q.high)}${q.unit})`])
      } else out.push([name, `${cssNumber(q.value)}${q.unit}`])
      continue
    }
    const value = line.values[word]
    if (value === undefined) continue
    if (spec.kind === 'number') out.push([name, cssNumber(value as number)])
    else if (spec.kind === 'choice') out.push([name, String(value)])
    else out.push([name, JSON.stringify(String(value))])
  }
  return out
}

/** The declarations as CSS text, in a rule when a selector is given. */
export function writeCssProperties(line: SettingsLine, vocabulary: SettingsVocabulary, options: CssPropertiesOptions = {}): string {
  const body = cssDeclarations(line, vocabulary, options.prefix ?? '--spw-').map(([name, value]) => `${options.selector ? '  ' : ''}${name}: ${value};`)
  return options.selector ? `${options.selector} {\n${body.join('\n')}\n}` : body.join('\n')
}
