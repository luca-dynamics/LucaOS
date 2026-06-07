import { describe, expect, it } from "vitest";
import {
  createLucaLinkWebDisplayBridgeAuditRecord,
  summarizeLucaLinkWebDisplayBridgeAudit,
} from "./webDisplayBridgeAudit";
import { createLucaLinkWebDisplaySessionIntent } from "./webDisplaySession";

describe("LucaLink web display bridge audit", () => {
  it("creates and summarizes audit-only records", () => {
    const intent = createLucaLinkWebDisplaySessionIntent({
      sessionId: "display-session-audit",
      requestedByHostId: "primary-host",
      targetHostId: "display-host",
      title: "Audit preview",
      contentKind: "presentation",
      createdAt: "2026-06-07T10:00:00.000Z",
      expiresAt: "2026-06-07T10:15:00.000Z",
    });
    const records = [
      createLucaLinkWebDisplayBridgeAuditRecord({
        intent,
        eventType: "created",
        summary: "Display intent created without side effects.",
        timestamp: "2026-06-07T10:00:00.000Z",
      }),
      createLucaLinkWebDisplayBridgeAuditRecord({
        intent,
        eventType: "approval_required",
        summary: "Target host approval is required.",
        timestamp: "2026-06-07T10:00:01.000Z",
      }),
    ];
    const summary = summarizeLucaLinkWebDisplayBridgeAudit(records);
    expect(records.every((record) => !record.sideEffectsPerformed)).toBe(true);
    expect(summary.total).toBe(2);
    expect(summary.byEventType.approval_required).toBe(1);
    expect(summary.sideEffectsPerformed).toBe(false);
  });
});
