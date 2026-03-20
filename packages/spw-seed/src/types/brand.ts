/**
 * Branding Utility
 *
 * Provides nominal typing (branding) for primitive types without runtime overhead.
 */

/**
 * Brands a base type with a unique identifier.
 */
export type Brand<K, T> = K & { __brand: T }

/**
 * Casts a value to a branded type.
 * Use sparingly and only at boundaries where the type is known.
 */
export function castToBrand<K, T>(value: K): Brand<K, T> {
  return value as Brand<K, T>
}
