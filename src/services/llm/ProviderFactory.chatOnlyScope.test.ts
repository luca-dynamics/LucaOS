import { describe, expect, it } from "vitest";
import {
  isProviderHubRuntimeRouteSelectionActiveForTask,
} from "./ProviderFactory";

describe("isProviderHubRuntimeRouteSelectionActiveForTask", () => {
  it("is off when global selection is disabled", () => {
    expect(
      isProviderHubRuntimeRouteSelectionActiveForTask(
        { providerHub: { runtimeRouteSelectionEnabled: false } },
        "chat",
      ),
    ).toBe(false);
  });

  it("defaults to chat_only: chat yes, code/fast_reply no", () => {
    const settings = {
      providerHub: {
        runtimeRouteSelectionEnabled: true,
        runtimeRouteKillSwitchEnabled: false,
        runtimeRouteSelectionTaskScope: "chat_only" as const,
      },
    };
    expect(isProviderHubRuntimeRouteSelectionActiveForTask(settings, "chat")).toBe(
      true,
    );
    expect(
      isProviderHubRuntimeRouteSelectionActiveForTask(settings, "code"),
    ).toBe(false);
    expect(
      isProviderHubRuntimeRouteSelectionActiveForTask(settings, "fast_reply"),
    ).toBe(false);
    expect(
      isProviderHubRuntimeRouteSelectionActiveForTask(settings, "long_context"),
    ).toBe(false);
  });

  it("allows all tasks when scope is all", () => {
    const settings = {
      providerHub: {
        runtimeRouteSelectionEnabled: true,
        runtimeRouteKillSwitchEnabled: false,
        runtimeRouteSelectionTaskScope: "all" as const,
      },
    };
    expect(isProviderHubRuntimeRouteSelectionActiveForTask(settings, "chat")).toBe(
      true,
    );
    expect(isProviderHubRuntimeRouteSelectionActiveForTask(settings, "code")).toBe(
      true,
    );
  });

  it("kill switch wins over enabled + chat scope", () => {
    expect(
      isProviderHubRuntimeRouteSelectionActiveForTask(
        {
          providerHub: {
            runtimeRouteSelectionEnabled: true,
            runtimeRouteKillSwitchEnabled: true,
            runtimeRouteSelectionTaskScope: "chat_only",
          },
        },
        "chat",
      ),
    ).toBe(false);
  });
});
