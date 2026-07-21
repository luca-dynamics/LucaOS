import { describe, expect, it } from "vitest";
import {
  normalizeSandboxBrowserAdapterFlags,
  normalizeInvocationReadinessFlags,
} from "./computerUseFeatureFlags";

describe("computerUseFeatureFlags", () => {
  it("accepts canonical sandbox flags", () => {
    expect(
      normalizeSandboxBrowserAdapterFlags({
        sandboxBrowserAdapterEnabled: true,
        browserRuntimeRouterBridgeEnabled: true,
      }),
    ).toEqual({
      sandboxBrowserAdapterEnabled: true,
      browserRuntimeRouterBridgeEnabled: true,
    });
  });

  it("accepts deprecated sandbox aliases", () => {
    expect(
      normalizeSandboxBrowserAdapterFlags({
        enableSandboxBrowserAdapter: true,
        enableBrowserRuntimeRouterBridge: true,
      }),
    ).toEqual({
      sandboxBrowserAdapterEnabled: true,
      browserRuntimeRouterBridgeEnabled: true,
    });
  });

  it("normalizes invocation readiness flags strictly", () => {
    expect(
      normalizeInvocationReadinessFlags({
        sandboxBrowserAdapterEnabled: true,
        browserRuntimeRouterBridgeEnabled: true,
        browserRuntimeRouterDryRunEnabled: true,
        realBrowserRuntimeRouterEnabled: true,
      }),
    ).toEqual({
      sandboxBrowserAdapterEnabled: true,
      browserRuntimeRouterBridgeEnabled: true,
      browserRuntimeRouterDryRunEnabled: true,
      realBrowserRuntimeRouterEnabled: true,
    });
  });
});
