/**
 * A span is a key when it ends in a colon and a character stands before that colon.
 * The colon is not part of the name. The spoken reader and the pivot reader share this.
 */
export function isKeySpan(source: string, start: number, end: number): boolean {
  return end - start > 1 && source[end - 1] === ':'
}
