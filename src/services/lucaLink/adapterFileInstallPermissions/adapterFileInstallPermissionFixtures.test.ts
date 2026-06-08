import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS,
  LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_REQUESTS,
  LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_READINESS_FIXTURE,
} from "./adapterFileInstallPermissionFixtures";

describe("adapter file/install permission fixtures", () => {
  it("provides read-only decisions for each modeled status", () => {
    expect(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.map((item) => item.status)).toEqual([
      "ready_for_review",
      "approval_required",
      "blocked",
      "unsupported",
    ]);
    expect(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_REQUESTS.every((item) => item.sideEffectsPerformed === false && item.writeEnabled === false && item.installEnabled === false)).toBe(true);
    expect(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.every((item) => (
      item.sideEffectsPerformed === false
      && item.executionEnabled === false
      && item.canExecute === false
      && item.readyForExecution === false
      && item.writeEnabled === false
      && item.installEnabled === false
      && item.readyForLiveSend === false
      && item.liveCollectionEnabled === false
    ))).toBe(true);
  });

  it("keeps readiness non-executing and non-writing", () => {
    expect(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_READINESS_FIXTURE).toMatchObject({
      totalRequests: 4,
      readyForReviewCount: 1,
      approvalRequiredCount: 1,
      blockedCount: 1,
      unsupportedCount: 1,
      readyForExecution: false,
      executionEnabled: false,
      canExecute: false,
      writeEnabled: false,
      installEnabled: false,
      readyForLiveSend: false,
      liveCollectionEnabled: false,
      sideEffectsPerformed: false,
    });
  });
});
