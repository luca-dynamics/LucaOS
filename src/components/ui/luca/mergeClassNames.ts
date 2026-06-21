/**
 * Tiny, dependency-free className joiner for the Luca primitive surfaces.
 * Filters out falsy values so callers can pass conditional classes safely.
 */
export function mergeClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
