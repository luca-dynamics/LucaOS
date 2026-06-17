import { describe, expect, it } from "vitest";
import { LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN } from "../adapters";
import { LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES, LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE } from "./dryRunHandoffFixtures";
import { createLucaLinkDryRunHandoffSimulation } from "./dryRunHandoffSimulator";

const disabled = {
  dryRunOnly: true,
  sideEffectsPerformed: false,
  handoffEnabled: false,
  transportSendEnabled: false,
  adapterExecutionEnabled: false,
  displayOpenEnabled: false,
  sensorCollectionEnabled: false,
  fileWriteEnabled: false,
  installEnabled: false,
};

describe("LucaLink dry-run handoff simulator", () => {
  it("builds deterministic steps and keeps preview transport unsendable", () => {
    expect(LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE).toMatchObject({ status: "ready_for_review", ...disabled });
    expect(LUCA_LINK_DRY_RUN_TRANSPORT_ALLOWED_FIXTURE.simulatedSteps.map((step) => step.label)).toEqual([
      "Inspect LucaLink handoff request", "Scope source and target host", "Check adapter/display/sensor/file-install models",
      "Check transport permission decision", "Route approval path", "Preview transport only", "Skip live send",
      "Skip adapter execution", "Skip display open/cast", "Skip sensor collection", "Skip file write/install",
      "Verify dry-run result", "Create audit summary",
    ]);
  });

  it("keeps adapter sandbox plans non-executable", () => {
    expect(createLucaLinkDryRunHandoffSimulation({ adapterPlan: LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN, now: "2026-06-08T12:00:00Z" })).toMatchObject({ adapterExecutionEnabled: false, sideEffectsPerformed: false });
  });

  it("keeps every fixture authority flag false", () => {
    expect(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES.every((simulation) => Object.entries(disabled).every(([key, value]) => simulation[key as keyof typeof simulation] === value))).toBe(true);
  });
});
