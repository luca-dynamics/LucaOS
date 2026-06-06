import { describe, expect, it } from "vitest";
import {
  createLucaLinkRuntimeSmokeScenario,
  evaluateLucaLinkRuntimeSmokeScenario,
  summarizeLucaLinkRuntimeSmokeScenarios,
  type LucaLinkRuntimeSmokeScenario,
} from "./lucaLinkRuntimeSmokeHarness";

const SCENARIOS: LucaLinkRuntimeSmokeScenario[] = [
  "device-center-snapshot-empty",
  "device-center-snapshot-populated",
  "approval-surface-derivation",
  "handoff-record-lifecycle",
  "bridge-review-lifecycle",
  "adapter-draft-lifecycle",
  "embodied-policy-envelope",
  "guest-session-policy",
  "runtime-enforcement-sample",
  "security-invariant-sample",
];

describe("LucaLink runtime smoke harness", () => {
  it("creates isolated fake scenarios with no runtime service or transport", () => {
    const first = createLucaLinkRuntimeSmokeScenario(
      "device-center-snapshot-empty",
    );
    const second = createLucaLinkRuntimeSmokeScenario(
      "device-center-snapshot-empty",
    );
    first.input.connectedDevices = ["mutated"];

    expect(second.input.connectedDevices).toEqual([]);
    expect(first.prohibitedEffects).toEqual(
      expect.arrayContaining([
        "socket emit",
        "network request",
        "file write",
        "generated-code execution",
        "live probing",
      ]),
    );
  });

  it("passes every built-in model-level scenario", () => {
    const results = SCENARIOS.map(evaluateLucaLinkRuntimeSmokeScenario);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(summarizeLucaLinkRuntimeSmokeScenarios(results)).toEqual({
      total: SCENARIOS.length,
      passed: SCENARIOS.length,
      failed: 0,
      ready: true,
      failedScenarios: [],
    });
  });

  it("reports a modified unsafe expectation as a failure", () => {
    const scenario = createLucaLinkRuntimeSmokeScenario(
      "adapter-draft-lifecycle",
    );
    scenario.expected.canExecute = true;
    const result = evaluateLucaLinkRuntimeSmokeScenario(scenario);

    expect(result.passed).toBe(false);
    expect(result.failures).toContain(
      "Expectation canExecute did not preserve its safe value.",
    );
  });

  it("does not claim readiness for an empty result set", () => {
    expect(summarizeLucaLinkRuntimeSmokeScenarios([])).toMatchObject({
      total: 0,
      ready: false,
    });
  });
});
