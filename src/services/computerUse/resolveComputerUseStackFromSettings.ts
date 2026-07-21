/**
 * Build a computer-use stack from Luca settings (safe defaults).
 */

import {
  createRealSandboxComputerUseStack,
  type CreateRealSandboxComputerUseStackOptions,
  type RealSandboxComputerUseStack,
  type RealSandboxDriverKind,
} from "../browserRuntime/createRealSandboxComputerUseStack";
import { hasElectronSandboxIpc, resolveElectronSandboxInvoke } from "../browserRuntime/resolveElectronSandboxInvoke";
import type { LucaSettings } from "../settingsService";

export type ComputerUseSettingsSlice = NonNullable<LucaSettings["computerUse"]>;

export function getComputerUseSettings(
  settings: Pick<LucaSettings, "computerUse"> | null | undefined,
): Required<ComputerUseSettingsSlice> {
  const cu = settings?.computerUse ?? {};
  return {
    realSandboxEnabled: cu.realSandboxEnabled === true,
    driverKind: cu.driverKind ?? "auto",
    headless: cu.headless !== false,
    enableMissionTapeSink: cu.enableMissionTapeSink === true,
  };
}

export function resolveDriverKindFromSettings(
  settings: Pick<LucaSettings, "computerUse"> | null | undefined,
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): RealSandboxDriverKind {
  const { realSandboxEnabled, driverKind } = getComputerUseSettings(settings);
  if (!realSandboxEnabled) return "injected"; // unused when disabled

  if (driverKind === "playwright") return "playwright";
  if (driverKind === "electron_sandbox") return "electron_sandbox";

  // auto
  if (hasElectronSandboxIpc(win)) return "electron_sandbox";
  return "playwright";
}

export async function resolveComputerUseStackFromSettings(
  settings: Pick<LucaSettings, "computerUse"> | null | undefined,
  overrides: CreateRealSandboxComputerUseStackOptions = {},
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): Promise<RealSandboxComputerUseStack> {
  const cu = getComputerUseSettings(settings);
  const enabled = overrides.enabled ?? cu.realSandboxEnabled;

  if (!enabled) {
    return createRealSandboxComputerUseStack({
      ...overrides,
      enabled: false,
      enableMissionTapeSink: overrides.enableMissionTapeSink ?? cu.enableMissionTapeSink,
    });
  }

  const driverKind =
    overrides.driverKind ??
    (overrides.driver ? "injected" : resolveDriverKindFromSettings(settings, win));

  const electron =
    overrides.electron ??
    (driverKind === "electron_sandbox"
      ? (() => {
          const resolved = resolveElectronSandboxInvoke(win);
          if (!resolved.ok || !resolved.invoke) {
            throw new Error(
              resolved.reason ??
                "computerUse.driverKind is electron_sandbox but IPC is unavailable.",
            );
          }
          return { invoke: resolved.invoke };
        })()
      : undefined);

  return createRealSandboxComputerUseStack({
    ...overrides,
    enabled: true,
    driverKind: overrides.driver ? "injected" : driverKind,
    driver: overrides.driver,
    electron,
    playwright: {
      headless: cu.headless,
      ...overrides.playwright,
    },
    enableMissionTapeSink:
      overrides.enableMissionTapeSink ?? cu.enableMissionTapeSink,
  });
}
