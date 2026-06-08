import { describe, expect, it } from "vitest";
import { LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT } from "../display";
import { LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE } from "../sensors";
import { LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS } from "../transportPermissions";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS } from "../adapterFileInstallPermissions";
import { evaluateLucaLinkDryRunHandoffPolicy } from "./dryRunHandoffPolicy";

const transport = (status: string) => LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === status)!;
const fileDecision = (status: string) => LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.find((item) => item.status === status)!;

describe("LucaLink dry-run handoff policy", () => {
  it("maps preview and approval governance without runtime authority", () => {
    expect(evaluateLucaLinkDryRunHandoffPolicy({ transportPermissionDecision: transport("allowed_preview") }).status).toBe("ready_for_review");
    expect(evaluateLucaLinkDryRunHandoffPolicy({ transportPermissionDecision: transport("blocked") }).status).toBe("blocked");
    expect(evaluateLucaLinkDryRunHandoffPolicy({ displayIntent: LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT }).status).toBe("approval_required");
    expect(evaluateLucaLinkDryRunHandoffPolicy({ sensorSnapshot: LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE }).status).toBe("ready_for_review");
  });

  it.each(["ready_for_review", "blocked", "unsupported"])("maps file/install %s", (status: string) => {
    expect(evaluateLucaLinkDryRunHandoffPolicy({ adapterFileInstallDecision: fileDecision(status) }).status).toBe(status);
  });

  it("blocks inputs that do not prove they are side-effect free", () => {
    const unsafe = { ...transport("allowed_preview"), sideEffectsPerformed: true };
    expect(evaluateLucaLinkDryRunHandoffPolicy({ transportPermissionDecision: unsafe as never }).status).toBe("blocked");
  });
});
