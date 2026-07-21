/**
 * Computer-use sandbox pilot status — settings-gated real browser path.
 *
 * This is the second thin execution pilot surface (after governed memory write):
 * it reports whether the real sandbox stack is allowed to run. It does not
 * launch browsers or invoke tools by itself; product code must still call
 * resolveComputerUseStackFromSettings and existing guards.
 */

import type { LucaSettings } from "../settingsService";
import {
  getComputerUseSettings,
  resolveDriverKindFromSettings,
} from "./resolveComputerUseStackFromSettings";

export type ComputerUseSandboxPilotStatus = {
  kind: "computer_use_real_sandbox";
  label: string;
  /** Product flag: realSandboxEnabled */
  enabled: boolean;
  /** When enabled, stack may create real drivers under existing pipeline guards */
  canCreateRealStack: boolean;
  driverKindResolved: "playwright" | "electron_sandbox" | "injected" | "auto";
  headless: boolean;
  enableMissionTapeSink: boolean;
  blockedActions: string[];
  readinessNotes: string[];
  dryRunRequired: true;
  sideEffectsPerformed: false;
};

/**
 * Read-only pilot status from settings (and optional window for electron detect).
 */
export function getComputerUseSandboxPilotStatus(
  settings: Pick<LucaSettings, "computerUse"> | null | undefined,
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): ComputerUseSandboxPilotStatus {
  const cu = getComputerUseSettings(settings);
  const resolved = cu.realSandboxEnabled
    ? resolveDriverKindFromSettings(settings, win)
    : "auto";

  const readinessNotes: string[] = [];
  if (!cu.realSandboxEnabled) {
    readinessNotes.push(
      "Real sandbox is off — computer-use stays on simulated/guarded paths only.",
    );
  } else {
    readinessNotes.push(
      `Real sandbox enabled; resolved driver: ${resolved}.`,
    );
    readinessNotes.push(
      "Pipeline/mission gates still apply; this flag alone does not auto-run browser actions.",
    );
  }

  return {
    kind: "computer_use_real_sandbox",
    label: "Computer-use real sandbox",
    enabled: cu.realSandboxEnabled,
    canCreateRealStack: cu.realSandboxEnabled,
    driverKindResolved: resolved,
    headless: cu.headless,
    enableMissionTapeSink: cu.enableMissionTapeSink,
    blockedActions: [
      "skill execution",
      "shell outside sandbox policy",
      "unapproved spending",
      "LucaLink remote action",
      "mission auto-run without approval",
    ],
    readinessNotes,
    dryRunRequired: true,
    sideEffectsPerformed: false,
  };
}
