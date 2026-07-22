export interface DecodedQuotedValue {
  value: string
  nextOffset: number
}

/** Decode one single-, double-, or backtick-quoted value with Spw escape rules. */
export function readDecodedQuotedValue(
  input: string,
  offset: number,
): DecodedQuotedValue | null {
  const quote = input[offset]
  if (quote !== '"' && quote !== "'" && quote !== '`') return null

  let value = ''
  let cursor = offset + 1
  while (cursor < input.length) {
    const char = input[cursor]
    if (char === quote) return { value, nextOffset: cursor + 1 }
    if (char === '\\') {
      if (cursor + 1 >= input.length) return null
      value += input[cursor + 1]
      cursor += 2
      continue
    }
    value += char
    cursor += 1
  }
  return null
}

/** Decode a complete quoted token; preserve non-quoted or malformed values. */
export function decodeQuotedToken(value: string): string {
  const decoded = readDecodedQuotedValue(value, 0)
  return decoded?.nextOffset === value.length ? decoded.value : value
}
