// visualCoreTraceCorrelation — PR #147: VisualCore Governance Trace
// Correlation.
//
// Lightweight, audit-safe correlation IDs that let related VisualCore
// governance records (remote command → mode transition → display session →
// browser shell session reference) be traced together.
//
// Hard guarantees — this module NEVER:
//   - changes VisualCore behavior, mode switching, or any policy
//   - adds automation, click/type/scroll, or DOM reading
//   - captures screen / camera / audio, reads files, or uses OCR/vision
//   - touches messaging / wireless / device / external-action execution
//   - derives an ID from a URL, token, hash, secret, or any sensitive value
//
// A correlation ID is a freshly generated, opaque, short identifier of the form
// `visual-core:<random>`. It is never built from caller-supplied content, so it
// can never leak URLs, tokens, hashes, page content, or secrets.

/** Prefix for every VisualCore correlation/trace ID. */
export const VISUAL_CORE_TRACE_ID_PREFIX = "visual-core";

/** Length of the random component (base36) of a generated trace ID. */
const TRACE_ID_RANDOM_LENGTH = 8;

/** Accepted shape: `visual-core:` followed by 4–32 lowercase base36 chars. */
const TRACE_ID_PATTERN = /^visual-core:[a-z0-9]{4,32}$/;

/**
 * Safe local reference IDs (e.g. browser shell session IDs) may be stored as
 * correlation metadata. They must look like opaque local IDs — alphanumeric
 * segments separated by `:`, `-`, or `.` — and must NOT contain URL/scheme,
 * whitespace, or query/credential characters.
 */
const SAFE_LOCAL_REF_PATTERN = /^[A-Za-z0-9._:-]{4,120}$/;
const UNSAFE_REF_FRAGMENTS = ["://", "?", "#", "@", " ", "\t", "\n"];

function randomSegment(): string {
  // Math.random base36 yields [a-z0-9]; concatenate until long enough.
  let out = "";
  while (out.length < TRACE_ID_RANDOM_LENGTH) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, TRACE_ID_RANDOM_LENGTH);
}

/** Generate a fresh, opaque, audit-safe VisualCore correlation/trace ID. */
export function newVisualCoreTraceId(): string {
  return `${VISUAL_CORE_TRACE_ID_PREFIX}:${randomSegment()}`;
}

/** Whether a value is a well-formed VisualCore correlation/trace ID. */
export function isVisualCoreTraceId(value: unknown): value is string {
  return typeof value === "string" && TRACE_ID_PATTERN.test(value);
}

/**
 * Resolve a correlation ID for a record: return the provided ID only if it is a
 * valid, audit-safe trace ID; otherwise generate a fresh one. This guarantees a
 * stored correlationId is never derived from caller-supplied sensitive content.
 */
export function resolveVisualCoreTraceId(value?: string | null): string {
  return isVisualCoreTraceId(value) ? value : newVisualCoreTraceId();
}

/**
 * Sanitize an optional safe-local reference (e.g. a browser shell session ID)
 * before storing it as correlation metadata. Returns the value only when it is
 * an opaque local ID with no URL/scheme/credential characters; otherwise
 * `undefined`. Never returns raw URLs, tokens, hashes, or sensitive values.
 */
export function sanitizeVisualCoreLocalRef(
  value?: string | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (UNSAFE_REF_FRAGMENTS.some((frag) => trimmed.includes(frag))) return undefined;
  if (!SAFE_LOCAL_REF_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Compact display label for a correlation ID, e.g. `trace: a1b2c3`. Falls back
 * to the full short form for non-standard inputs. Never exposes more than the
 * opaque ID itself.
 */
export function formatVisualCoreTraceLabel(value?: string | null): string {
  if (!isVisualCoreTraceId(value)) return "trace: —";
  const random = value.slice(VISUAL_CORE_TRACE_ID_PREFIX.length + 1);
  return `trace: ${random}`;
}
