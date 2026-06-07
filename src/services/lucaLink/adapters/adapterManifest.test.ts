import { describe, expect, it } from "vitest";
import {
  listAdapterManifestBlockers,
  listAdapterManifestWarnings,
  validateLucaLinkAdapterManifest,
} from "./adapterManifest";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "./adapterSandboxFixtures";

function fixture(overrides: Record<string, unknown> = {}) {
  return { ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE, ...overrides };
}

describe("LucaLink adapter manifest validation", () => {
  it("accepts a complete safe declarative manifest", () => {
    expect(validateLucaLinkAdapterManifest(fixture())).toEqual({
      valid: true,
      blockers: [],
      warnings: [],
    });
  });

  it("catches missing required fields", () => {
    const result = validateLucaLinkAdapterManifest(
      fixture({ id: "", name: "", version: "", entrypointRef: "" }),
    );
    expect(result.valid).toBe(false);
    expect(result.blockers.join(" ")).toMatch(/id is required/i);
    expect(result.blockers.join(" ")).toMatch(/name is required/i);
    expect(result.blockers.join(" ")).toMatch(/version is required/i);
    expect(result.blockers.join(" ")).toMatch(/entrypointRef is required/i);
  });

  it("blocks hidden prompts, private reasoning, raw code, and credentials", () => {
    const blockers = listAdapterManifestBlockers(
      fixture({
        systemPrompt: "hidden instruction",
        privateReasoning: "do not expose",
        rawCodePayload: "function run() { return eval('unsafe'); }",
        clientSecret: "client_secret=super-secret-value",
      }),
    );
    expect(blockers.join(" ")).toMatch(/forbidden manifest field/i);
    expect(blockers.join(" ")).toMatch(/raw or generated code payload/i);
    expect(blockers.join(" ")).toMatch(/credential, token, secret/i);
  });

  it("blocks credential-like and executable capabilities", () => {
    const blockers = listAdapterManifestBlockers(
      fixture({
        requestedCapabilities: [
          "credential.access",
          "shell.execute",
          "generated-code.execute",
        ],
      }),
    );
    expect(blockers.join(" ")).toMatch(/credential\.access/i);
    expect(blockers.join(" ")).toMatch(/shell\.execute/i);
    expect(blockers.join(" ")).toMatch(/generated-code\.execute/i);
  });

  it("warns when integrity and provenance are missing", () => {
    const warnings = listAdapterManifestWarnings(
      fixture({ integrity: undefined, provenance: undefined }),
    );
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/integrity metadata is missing/i),
        expect.stringMatching(/provenance metadata is missing/i),
      ]),
    );
  });
});
