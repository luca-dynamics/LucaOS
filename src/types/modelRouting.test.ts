import { describe, expect, it } from "vitest";
import {
  hasUsableSecret,
  isRedactedSecret,
  normalizeModelMode,
} from "./modelRouting";

describe("modelRouting contracts", () => {
  it("normalizes legacy settings providers into canonical modes", () => {
    expect(normalizeModelMode("local-luca")).toBe("local");
    expect(normalizeModelMode("cloud-managed")).toBe("luca-prime");
    expect(normalizeModelMode("byok")).toBe("byok");
    expect(normalizeModelMode(undefined)).toBe("local");
  });

  it("does not treat redacted secrets as usable keys", () => {
    expect(isRedactedSecret("[SECURED]")).toBe(true);
    expect(hasUsableSecret("[SECURED]")).toBe(false);
    expect(hasUsableSecret("sk-live-value")).toBe(true);
  });
});
