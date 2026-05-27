import { ComputerUseGuardConfirmationBridge } from "./ComputerUseGuardConfirmationBridge";
import { ComputerUseGuardConfirmationResult } from "./types";

export interface ComputerUseConfirmationUiBridgeState {
  pendingConfirmations: ReturnType<ComputerUseGuardConfirmationBridge["getSnapshot"]>["requests"];
  lastResult?: ComputerUseGuardConfirmationResult;
  metadata: {
    bridgeKind: "computer_use_confirmation_ui_bridge_scaffold";
    uiComponentsTouched: false;
    browserApisCalled: false;
    systemApisCalled: false;
    directHostAllowed: false;
    storageWritesEnabled: false;
    requiresExplicitOptIn: true;
  };
}

const metadata: ComputerUseConfirmationUiBridgeState["metadata"] = { bridgeKind: "computer_use_confirmation_ui_bridge_scaffold", uiComponentsTouched: false, browserApisCalled: false, systemApisCalled: false, directHostAllowed: false, storageWritesEnabled: false, requiresExplicitOptIn: true };
export type ComputerUseConfirmationUiBridgeListener = (state: ComputerUseConfirmationUiBridgeState) => void;

export class ComputerUseConfirmationUiBridge {
  private listeners = new Set<ComputerUseConfirmationUiBridgeListener>();
  private lastResult?: ComputerUseGuardConfirmationResult;
  constructor(private readonly bridge: ComputerUseGuardConfirmationBridge) {}
  subscribe(listener: ComputerUseConfirmationUiBridgeListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getState(): ComputerUseConfirmationUiBridgeState { return { pendingConfirmations: this.listPendingConfirmations(), lastResult: this.lastResult, metadata: { ...metadata } }; }
  listPendingConfirmations() { return this.bridge.getSnapshot().requests.filter((r) => r.status === "pending"); }
  approve(confirmationId: string, options?: { approvedBy?: "user" | "policy" | "system"; reason?: string; phrase?: string }) { this.lastResult = this.bridge.approve(confirmationId, options); return this.emit(); }
  reject(confirmationId: string, reason?: string) { this.lastResult = this.bridge.reject(confirmationId, reason); return this.emit(); }
  reset(): ComputerUseConfirmationUiBridgeState { this.bridge.reset(); this.lastResult = undefined; return this.emit(); }
  private emit(): ComputerUseConfirmationUiBridgeState { const s = this.getState(); this.listeners.forEach((l) => l(s)); return s; }
}
