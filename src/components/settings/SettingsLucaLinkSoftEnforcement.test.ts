import { describe, expect, it, vi, beforeEach } from "vitest";

const { enableSoftEnforcement, disableSoftEnforcement } = vi.hoisted(() => ({
  enableSoftEnforcement: vi.fn(),
  disableSoftEnforcement: vi.fn(),
}));

vi.mock("../../services/lucaLink/manager", () => ({
  lucaLinkManager: {
    governance: {
      enableSoftEnforcement,
      disableSoftEnforcement,
    },
    console: {
      getSoftEnforcementMode: () => "observe-only",
    },
  },
}));

import {
  applyLucaLinkSoftEnforcementProductMode,
  getLucaLinkSecurityModeLabel,
} from "./SettingsLucaLinkTab";

describe("LucaLink soft enforcement product controls", () => {
  beforeEach(() => {
    enableSoftEnforcement.mockReset();
    disableSoftEnforcement.mockReset();
  });

  it("labels product modes clearly", () => {
    expect(getLucaLinkSecurityModeLabel("observe-only")).toBe("Observe-only");
    expect(getLucaLinkSecurityModeLabel("high-risk-only")).toBe(
      "High-risk gates active",
    );
    expect(getLucaLinkSecurityModeLabel("disabled")).toBe("Disabled");
  });

  it("steps up and disables through governance facade", () => {
    applyLucaLinkSoftEnforcementProductMode("high-risk-only");
    expect(enableSoftEnforcement).toHaveBeenCalledWith({
      mode: "high-risk-only",
    });

    applyLucaLinkSoftEnforcementProductMode("observe-only");
    expect(enableSoftEnforcement).toHaveBeenCalledWith({
      mode: "observe-only",
    });

    applyLucaLinkSoftEnforcementProductMode("disabled");
    expect(disableSoftEnforcement).toHaveBeenCalled();
  });
});
