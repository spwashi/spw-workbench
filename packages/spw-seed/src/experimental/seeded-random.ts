/**
 * A seeded random for laws over generated input: the Park–Miller generator, so
 * a test that draws from it draws the same values on every run and machine.
 * Not for anything that must be unpredictable.
 */
export function seededRandom(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
