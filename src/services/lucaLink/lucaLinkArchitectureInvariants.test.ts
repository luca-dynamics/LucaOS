import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS,
  LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS,
  LUCA_LINK_HOST_AWARE_COPY_GUIDELINES,
  LUCA_LINK_MODEL_ONLY_MODULES,
  LUCA_LINK_RESERVED_CREATOR_TERMS,
} from "./lucaLinkArchitectureInvariants";

describe("lucaLinkArchitectureInvariants", () => {
  it("exports frozen static invariant lists", () => {
    expect(LUCA_LINK_RESERVED_CREATOR_TERMS).toEqual(["Origin", "origin"]);
    expect(LUCA_LINK_MODEL_ONLY_MODULES).toContain("lucaLinkAdapterDrafts.ts");
    expect(LUCA_LINK_MODEL_ONLY_MODULES).toContain(
      "lucaLinkLinkedHostRegistry.ts",
    );
    expect(LUCA_LINK_MODEL_ONLY_MODULES).toContain(
      "lucaLinkRuntimeQaChecklist.ts",
    );
    expect(LUCA_LINK_MODEL_ONLY_MODULES).toContain(
      "lucaLinkRuntimeSmokeHarness.ts",
    );
    expect(LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS).toContain("fetch(");
    expect(LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS).toContain(
      "Install adapter",
    );
    expect(LUCA_LINK_HOST_AWARE_COPY_GUIDELINES).toContain("Primary Host");

    expect(Object.isFrozen(LUCA_LINK_RESERVED_CREATOR_TERMS)).toBe(true);
    expect(Object.isFrozen(LUCA_LINK_MODEL_ONLY_MODULES)).toBe(true);
    expect(Object.isFrozen(LUCA_LINK_FORBIDDEN_MODEL_RUNTIME_PATTERNS)).toBe(
      true,
    );
    expect(
      Object.isFrozen(LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS),
    ).toBe(true);
    expect(Object.isFrozen(LUCA_LINK_HOST_AWARE_COPY_GUIDELINES)).toBe(true);
  });
});
