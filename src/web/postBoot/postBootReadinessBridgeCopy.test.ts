import { describe, expect, it } from "vitest";

import {
  type PostBootReadinessBridgeCopy,
  resolvePostBootReadinessBridgeCopy,
} from "./postBootReadinessBridgeCopy";
import type { WebPostBootUserState } from "./webPostBootState";

const activeStates: WebPostBootUserState[] = [
  "new_user",
  "returning_user",
  "partial_setup",
  "permission_attention",
];

function userFacingText(copy: PostBootReadinessBridgeCopy): string {
  return [
    copy.title,
    copy.supportingCopy,
    ...copy.readinessLines,
    copy.primaryCta,
    copy.secondaryCta,
    copy.detailsLabel,
  ]
    .filter(Boolean)
    .join("\n");
}

describe("resolvePostBootReadinessBridgeCopy", () => {
  it("returns pending/loading copy", () => {
    const copy = resolvePostBootReadinessBridgeCopy({ state: "pending" });

    expect(copy).toMatchObject({
      title: "Preparing your LucaOS environment",
      supportingCopy:
        "Luca is checking what this device needs before continuing.",
      readinessLines: [
        "Checking your preferences",
        "Restoring memory boundaries",
        "Preparing safe tool access",
      ],
      autoContinueTone: "pending",
    });
  });

  it.each(activeStates)("returns copy for %s", (state) => {
    const copy = resolvePostBootReadinessBridgeCopy({ state });

    expect(copy.title).toBeTruthy();
    expect(copy.supportingCopy).toBeTruthy();
    expect(copy.readinessLines.length).toBeGreaterThan(0);
  });

  it("returns first-run copy for new users", () => {
    const copy = resolvePostBootReadinessBridgeCopy({ state: "new_user" });

    expect(copy.primaryCta).toBe("Continue");
    expect(copy.readinessLines).toContain("Ready to continue");
  });

  it("uses calm returning-user language", () => {
    const copy = resolvePostBootReadinessBridgeCopy({
      state: "returning_user",
    });

    expect(copy.title).toBe("Welcome back");
    expect(copy.supportingCopy).toBe("LucaOS is restoring your workspace.");
    expect(copy.primaryCta).toBe("Enter LucaOS");
  });

  it("uses recoverable language for partial setup rather than failure language", () => {
    const text = userFacingText(
      resolvePostBootReadinessBridgeCopy({ state: "partial_setup" }),
    ).toLowerCase();

    expect(text).toContain("pick up where you left off");
    expect(text).toContain("continue setup");
    expect(text).not.toMatch(/failed|failure|error|crash|broken|blocked/);
  });

  it("uses actionable permission language for voice attention", () => {
    const text = userFacingText(
      resolvePostBootReadinessBridgeCopy({ state: "permission_attention" }),
    ).toLowerCase();

    expect(text).toContain("review voice access");
    expect(text).toContain("microphone access");
    expect(text).toContain("continue without voice");
  });

  it("does not imply secure setup is complete in Web Safe Mode", () => {
    const copy = resolvePostBootReadinessBridgeCopy({
      state: "returning_user",
      webSafeMode: true,
    });
    const text = userFacingText(copy).toLowerCase();

    expect(copy.readinessLines).toContain("Ready to continue in preview mode");
    expect(text).not.toContain("secure setup is complete");
    expect(text).not.toContain("protected local memory is ready");
  });

  it("does not include banned normal/default wording", () => {
    const bannedTerms = [
      "protocol",
      "directive",
      "kernel",
      "sovereign",
      "operator",
      "runtime",
      "provisioning",
      "calibration",
      "cognitive core",
    ];
    const text = [
      userFacingText(resolvePostBootReadinessBridgeCopy({ state: "pending" })),
      ...activeStates.map((state) =>
        userFacingText(resolvePostBootReadinessBridgeCopy({ state })),
      ),
    ].join("\n").toLowerCase();

    for (const term of bannedTerms) {
      expect(text).not.toContain(term);
    }
  });

  it("does not include secret-related terms", () => {
    const secretTerms = [
      "MASTER_KEY_HEX",
      "LUCA_VAULT_KEY",
      "master key value",
      "fallback key",
    ];
    const text = activeStates
      .map((state) => userFacingText(resolvePostBootReadinessBridgeCopy({ state })))
      .join("\n");

    for (const term of secretTerms) {
      expect(text).not.toContain(term);
    }
  });

  it("does not introduce DOM/global mutation strings", () => {
    const mutationTerms = [
      "document.documentElement",
      "style.setProperty",
      "document.body",
      "body.style",
      'document.querySelector("html")',
    ];
    const text = activeStates
      .map((state) => userFacingText(resolvePostBootReadinessBridgeCopy({ state })))
      .join("\n");

    for (const term of mutationTerms) {
      expect(text).not.toContain(term);
    }
  });

  it("does not introduce Flow motion strings", () => {
    const motionTerms = [
      "@keyframes",
      "animation:",
      "requestAnimationFrame",
      "setInterval",
      "setTimeout",
      "parallax",
    ];
    const text = activeStates
      .map((state) => userFacingText(resolvePostBootReadinessBridgeCopy({ state })))
      .join("\n");

    for (const term of motionTerms) {
      expect(text).not.toContain(term);
    }
  });
});
