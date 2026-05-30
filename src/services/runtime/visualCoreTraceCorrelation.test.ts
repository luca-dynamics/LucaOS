// PR #147 — VisualCore Governance Trace Correlation: helper tests.
//
// Verifies the correlation/trace ID helpers:
// 1. Generated IDs are well-formed and unique.
// 2. resolve() keeps a valid ID and generates a fresh one otherwise.
// 3. IDs never contain raw URLs, tokens, hashes, or sensitive characters.
// 4. Safe local refs are sanitized (URLs/credentials rejected).
// 5. Compact display label exposes only the opaque ID.

import { describe, expect, it } from "vitest";
import {
  VISUAL_CORE_TRACE_ID_PREFIX,
  formatVisualCoreTraceLabel,
  isVisualCoreTraceId,
  newVisualCoreTraceId,
  resolveVisualCoreTraceId,
  sanitizeVisualCoreLocalRef,
} from "./visualCoreTraceCorrelation";

const TRACE_ID_SHAPE = /^visual-core:[a-z0-9]{4,32}$/;
const SENSITIVE_FRAGMENTS = ["http", "://", "?", "#", "@", "token", "secret", "."];

describe("PR #147 — VisualCore trace correlation helper", () => {
  it("generates well-formed, prefixed IDs", () => {
    const id = newVisualCoreTraceId();
    expect(id.startsWith(`${VISUAL_CORE_TRACE_ID_PREFIX}:`)).toBe(true);
    expect(TRACE_ID_SHAPE.test(id)).toBe(true);
    expect(isVisualCoreTraceId(id)).toBe(true);
  });

  it("generates unique IDs across many calls", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newVisualCoreTraceId()));
    expect(ids.size).toBe(500);
  });

  it("never embeds URL/token/hash/sensitive characters in a generated ID", () => {
    for (let i = 0; i < 200; i++) {
      const random = newVisualCoreTraceId().slice(VISUAL_CORE_TRACE_ID_PREFIX.length + 1);
      for (const fragment of SENSITIVE_FRAGMENTS) {
        expect(random.includes(fragment)).toBe(false);
      }
      expect(/^[a-z0-9]+$/.test(random)).toBe(true);
    }
  });

  it("rejects non-trace-id values via isVisualCoreTraceId", () => {
    expect(isVisualCoreTraceId(undefined)).toBe(false);
    expect(isVisualCoreTraceId("")).toBe(false);
    expect(isVisualCoreTraceId("https://example.com/secret?token=abc")).toBe(false);
    expect(isVisualCoreTraceId("visual-core:UPPER")).toBe(false);
    expect(isVisualCoreTraceId("other:abc123")).toBe(false);
  });

  it("resolve keeps a valid id and replaces invalid/sensitive input with a fresh id", () => {
    const valid = newVisualCoreTraceId();
    expect(resolveVisualCoreTraceId(valid)).toBe(valid);

    const fromUrl = resolveVisualCoreTraceId("https://bank.example.com/login?token=SECRET#h");
    expect(fromUrl).not.toContain("bank.example.com");
    expect(fromUrl).not.toContain("SECRET");
    expect(fromUrl).not.toContain("token");
    expect(isVisualCoreTraceId(fromUrl)).toBe(true);

    expect(isVisualCoreTraceId(resolveVisualCoreTraceId(undefined))).toBe(true);
    expect(isVisualCoreTraceId(resolveVisualCoreTraceId(""))).toBe(true);
  });

  it("sanitizes safe local refs and rejects URLs/credentials", () => {
    expect(sanitizeVisualCoreLocalRef("sandboxed-browser-shell:2026-01-01T00:00:00.000Z:ab12cd")).toBe(
      "sandboxed-browser-shell:2026-01-01T00:00:00.000Z:ab12cd",
    );
    expect(sanitizeVisualCoreLocalRef("https://example.com/page")).toBeUndefined();
    expect(sanitizeVisualCoreLocalRef("user:password@host")).toBeUndefined();
    expect(sanitizeVisualCoreLocalRef("has space")).toBeUndefined();
    expect(sanitizeVisualCoreLocalRef("a?b=c")).toBeUndefined();
    expect(sanitizeVisualCoreLocalRef("")).toBeUndefined();
    expect(sanitizeVisualCoreLocalRef(undefined)).toBeUndefined();
  });

  it("formats a compact display label that exposes only the opaque id", () => {
    const id = newVisualCoreTraceId();
    const random = id.slice(VISUAL_CORE_TRACE_ID_PREFIX.length + 1);
    expect(formatVisualCoreTraceLabel(id)).toBe(`trace: ${random}`);
    expect(formatVisualCoreTraceLabel(undefined)).toBe("trace: —");
    expect(formatVisualCoreTraceLabel("https://x.test/y")).toBe("trace: —");
  });
});
