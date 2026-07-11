/**
 * Manager-owned LucaLink runtime diagnostics and enforcement state.
 *
 * Runtime enforcement evaluation remains pure; this store owns mutable mode,
 * diagnostics shadow observations, and enforcement audit history.
 */
import type { LucaHostManifest } from "./lucaHostManifest";
import {
  clearLucaLinkShadowObservations,
  createLucaLinkRuntimeShadow,
  getLucaLinkShadowObservations,
  recordLucaLinkShadowObservation,
  summarizeLucaLinkShadowObservations,
  type LucaLinkRuntimeShadowEventInput,
  type LucaLinkRuntimeShadowOptions,
} from "./lucaLinkRuntimeShadow";
import type {
  LucaLinkRuntimeObservation,
  LucaLinkRuntimeObservationSummary,
} from "./lucaLinkRuntimeObserver";
import {
  createLucaLinkRuntimeEnforcementAuditRecord,
  summarizeLucaLinkRuntimeEnforcementAudit,
  type LucaLinkRuntimeEnforcementAuditRecord,
  type LucaLinkRuntimeEnforcementAuditSummary,
  type LucaLinkRuntimeEnforcementMode,
  type LucaLinkRuntimeEnforcementResult,
} from "./lucaLinkRuntimeEnforcementGate";

export class LucaLinkRuntimeStore {
  private shadow = createLucaLinkRuntimeShadow({ enabled: false });
  private enforcementMode: LucaLinkRuntimeEnforcementMode = "disabled";
  private enforcementAudit: LucaLinkRuntimeEnforcementAuditRecord[] = [];
  private readonly enforcementAuditLimit = 100;

  enableEnforcement(mode: LucaLinkRuntimeEnforcementMode = "observe-only"): void {
    this.enforcementMode = mode;
  }

  disableEnforcement(): void {
    this.enforcementMode = "disabled";
  }

  getEnforcementMode(): LucaLinkRuntimeEnforcementMode {
    return this.enforcementMode;
  }

  getEnforcementAudit(): LucaLinkRuntimeEnforcementAuditRecord[] {
    return [...this.enforcementAudit];
  }

  getEnforcementSummary(): LucaLinkRuntimeEnforcementAuditSummary {
    return summarizeLucaLinkRuntimeEnforcementAudit(this.enforcementAudit);
  }

  clearEnforcementAudit(): void {
    this.enforcementAudit = [];
  }

  recordEnforcement(result: LucaLinkRuntimeEnforcementResult): void {
    this.enforcementAudit = [
      ...this.enforcementAudit,
      createLucaLinkRuntimeEnforcementAuditRecord(result),
    ].slice(-this.enforcementAuditLimit);
  }

  enableShadowDiagnostics(options: LucaLinkRuntimeShadowOptions = {}): void {
    this.shadow = createLucaLinkRuntimeShadow({
      ...options,
      enabled: true,
    });
  }

  disableShadowDiagnostics(): void {
    this.shadow.enabled = false;
  }

  getShadowObservations(): LucaLinkRuntimeObservation[] {
    return getLucaLinkShadowObservations(this.shadow);
  }

  clearShadowObservations(): void {
    clearLucaLinkShadowObservations(this.shadow);
  }

  getShadowSummary(): LucaLinkRuntimeObservationSummary {
    return summarizeLucaLinkShadowObservations(this.shadow);
  }

  observeRuntimeEvent(
    input: LucaLinkRuntimeShadowEventInput,
    candidates: LucaHostManifest[],
  ): LucaLinkRuntimeObservation | undefined {
    return recordLucaLinkShadowObservation(this.shadow, input, { candidates });
  }
}

export const lucaLinkRuntimeStore = new LucaLinkRuntimeStore();
