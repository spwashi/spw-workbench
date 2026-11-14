/**
 * Measures of rendered samples, the numbers every law about the brace sound is
 * stated in: how strongly one frequency sounds, how much of a click's energy
 * lies inside a band, its RMS level, how its energy falls over time, and how far
 * apart two clicks' spectra are. A host can hold its own tuning to the same
 * numbers (a click a small speaker can play, kinds a listener could tell apart)
 * without an ear, and none of them says how anything sounds.
 *
 * Arithmetic only; the sample rate is passed, never assumed.
 */

/** Squared magnitude of one frequency in the samples (Goertzel). */
export function power(samples: Float32Array, hertz: number, sampleRate: number): number {
  const w = (2 * Math.PI * hertz) / sampleRate
  const coeff = 2 * Math.cos(w)
  let s1 = 0
  let s2 = 0
  for (const x of samples) {
    const s0 = x + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2)
}

/** How strongly one frequency sounds, per sample: the square root of its power over the length. */
export function amplitude(samples: Float32Array, hertz: number, sampleRate: number): number {
  return Math.sqrt(power(samples, hertz, sampleRate)) / samples.length
}

/** Share of the energy between two frequencies, measured on a 10 Hz grid up to 20 kHz. */
export function bandShare(samples: Float32Array, low: number, high: number, sampleRate: number): number {
  let inside = 0
  let all = 0
  for (let f = 20; f < 20000; f += 10) {
    const p = power(samples, f, sampleRate)
    all += p
    if (f >= low && f <= high) inside += p
  }
  return all ? inside / all : 0
}

/** Root mean square of the samples. */
export function rms(samples: Float32Array): number {
  let sum = 0
  for (const x of samples) sum += x * x
  return Math.sqrt(sum / Math.max(1, samples.length))
}

export const energy = (samples: Float32Array): number => samples.reduce((sum, x) => sum + x * x, 0)

/** Share of the energy in the first `seconds`. */
export function onsetShare(samples: Float32Array, seconds: number, sampleRate: number): number {
  const total = energy(samples)
  return total ? energy(samples.subarray(0, Math.round(seconds * sampleRate))) / total : 0
}

/** The sample by which half the energy has sounded. */
export function halfEnergyAt(samples: Float32Array): number {
  const total = energy(samples)
  let acc = 0
  for (let i = 0; i < samples.length; i++) {
    acc += samples[i]! * samples[i]!
    if (acc >= total / 2) return i
  }
  return samples.length
}

/** Power at log-spaced frequencies from 80 Hz to 8 kHz, scaled to length one. */
export function spectrum(samples: Float32Array, sampleRate: number, bins = 160): number[] {
  const values = Array.from({ length: bins }, (_, i) => power(samples, 80 * 100 ** (i / (bins - 1)), sampleRate))
  const length = Math.hypot(...values)
  return length ? values.map((v) => v / length) : values
}

/** Distance between two spectra scaled to length one: 0 for the same shape, up to √2. */
export const spectralDistance = (a: readonly number[], b: readonly number[]): number => Math.hypot(...a.map((x, i) => x - (b[i] ?? 0)))
