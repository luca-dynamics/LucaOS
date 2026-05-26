import type { BrowserRuntimeAction } from "../browserRuntime/types";
import type { ComputerUseActionType } from "./types";

export type ComputerUseBrowserRuntimeConformanceDisposition = "mapped" | "noop" | "rejected";

export interface ComputerUseBrowserRuntimeConformanceEntry {
  sourceAction: ComputerUseActionType;
  disposition: ComputerUseBrowserRuntimeConformanceDisposition;
  targetAction?: BrowserRuntimeAction;
  reason: string;
}

export const COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING: Readonly<
  Record<ComputerUseActionType, ComputerUseBrowserRuntimeConformanceEntry>
> = {
  click: {
    sourceAction: "click",
    disposition: "mapped",
    targetAction: "click",
    reason: "Click maps directly to BrowserRuntime click.",
  },
  type_text: {
    sourceAction: "type_text",
    disposition: "mapped",
    targetAction: "type",
    reason: "Type-text maps to BrowserRuntime type.",
  },
  observe: {
    sourceAction: "observe",
    disposition: "mapped",
    targetAction: "extract",
    reason: "Observe maps to BrowserRuntime extract for read-only inspection.",
  },
  wait: {
    sourceAction: "wait",
    disposition: "noop",
    reason: "BrowserRuntime action contract has no wait action in current phase.",
  },
  scroll: {
    sourceAction: "scroll",
    disposition: "noop",
    reason: "BrowserRuntime action contract has no scroll action in current phase.",
  },
  hotkey: {
    sourceAction: "hotkey",
    disposition: "rejected",
    reason: "Hotkey is rejected until BrowserRuntime keyboard semantics are explicitly defined.",
  },
};

export const getComputerUseBrowserRuntimeConformanceMatrix = (): ComputerUseBrowserRuntimeConformanceEntry[] =>
  Object.values(COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING).map((entry) => ({ ...entry }));

export const validateComputerUseBrowserRuntimeMapping = (input: {
  actionType?: string;
}):
  | { ok: true; entry: ComputerUseBrowserRuntimeConformanceEntry }
  | { ok: false; reason: string } => {
  if (!input.actionType) {
    return { ok: false, reason: "Missing action type for BrowserRuntime conformance validation." };
  }

  const entry = COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING[input.actionType as ComputerUseActionType];
  if (!entry) {
    return {
      ok: false,
      reason: `Unsupported computer-use browser action for BrowserRuntime bridge: ${input.actionType}.`,
    };
  }

  return { ok: true, entry };
};
