import { describe, expect, it, vi } from "vitest";
import { ChatIntentProvenanceService } from "./ChatIntentProvenanceService";
import type { ProvenanceMetadata } from "../../types/provenance";

function makeMockProvenance(): Pick<import("../provenance/ProvenanceGateService").ProvenanceGateService, "createProvenanceRecord"> {
  return {
    createProvenanceRecord: vi.fn().mockReturnValue({
      provenanceId: "prov:test:2026-01-01T00:00:00.000Z",
      sourceType: "external_input",
      sourceId: "chat-msg:test",
      sourceTrustLevel: "local",
      createdBy: "chat-intent-provenance",
      createdAt: "2026-01-01T00:00:00.000Z",
      digest: "fnv1a:deadbeef",
      parentProvenanceIds: [],
      quarantineState: "clear",
      approvalState: "not_required",
      revocationState: "active",
    } satisfies ProvenanceMetadata),
  };
}

describe("ChatIntentProvenanceService", () => {
  describe("createChatProvenance", () => {
    it("returns provenanceIds for a normal message", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      const result = service.createChatProvenance({ message: "hello world" });
      expect(result.provenanceIds).toHaveLength(1);
      expect(result.provenanceIds[0]).toBe("prov:test:2026-01-01T00:00:00.000Z");
      expect(mock.createProvenanceRecord).toHaveBeenCalledTimes(1);
    });

    it("returns empty provenanceIds for empty message", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      const result = service.createChatProvenance({ message: "" });
      expect(result.provenanceIds).toEqual([]);
      expect(mock.createProvenanceRecord).not.toHaveBeenCalled();
    });

    it("returns empty provenanceIds for whitespace-only message", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      const result = service.createChatProvenance({ message: "   " });
      expect(result.provenanceIds).toEqual([]);
    });

    it("returns empty provenanceIds for secret-like content", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      expect(service.createChatProvenance({ message: "my api_key is abc123" }).provenanceIds).toEqual([]);
      expect(service.createChatProvenance({ message: "password: hunter2" }).provenanceIds).toEqual([]);
      expect(service.createChatProvenance({ message: "sk-abcdefghij" }).provenanceIds).toEqual([]);
      expect(mock.createProvenanceRecord).not.toHaveBeenCalled();
    });

    it("uses external_input as sourceType", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      service.createChatProvenance({ message: "plan my week" });
      const call = (mock.createProvenanceRecord as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.sourceType).toBe("external_input");
      expect(call.sourceTrustLevel).toBe("local");
      expect(call.createdBy).toBe("chat-intent-provenance");
    });

    it("degrades gracefully if provenance creation throws", () => {
      const mock = {
        createProvenanceRecord: vi.fn().mockImplementation(() => {
          throw new Error("storage full");
        }),
      };
      const service = new ChatIntentProvenanceService({ provenance: mock });

      const result = service.createChatProvenance({ message: "hello" });
      expect(result.provenanceIds).toEqual([]);
    });

    it("uses messageId as sourceId when provided", () => {
      const mock = makeMockProvenance();
      const service = new ChatIntentProvenanceService({ provenance: mock });

      service.createChatProvenance({ message: "hello", messageId: "msg-42" });
      const call = (mock.createProvenanceRecord as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.sourceId).toBe("msg-42");
    });
  });

  describe("shouldRouteMessage", () => {
    it("returns true for normal user message", () => {
      const service = new ChatIntentProvenanceService({ provenance: makeMockProvenance() });
      expect(service.shouldRouteMessage({ message: "hello", senderType: "user" })).toBe(true);
    });

    it("returns false for empty message", () => {
      const service = new ChatIntentProvenanceService({ provenance: makeMockProvenance() });
      expect(service.shouldRouteMessage({ message: "" })).toBe(false);
    });

    it("returns false for hidden message", () => {
      const service = new ChatIntentProvenanceService({ provenance: makeMockProvenance() });
      expect(service.shouldRouteMessage({ message: "hello", isHidden: true })).toBe(false);
    });

    it("returns false for awakening message", () => {
      const service = new ChatIntentProvenanceService({ provenance: makeMockProvenance() });
      expect(service.shouldRouteMessage({ message: "hello", isAwakening: true })).toBe(false);
    });

    it("returns false for assistant messages", () => {
      const service = new ChatIntentProvenanceService({ provenance: makeMockProvenance() });
      expect(service.shouldRouteMessage({ message: "hello", senderType: "assistant" })).toBe(false);
      expect(service.shouldRouteMessage({ message: "hello", senderType: "luca" })).toBe(false);
      expect(service.shouldRouteMessage({ message: "hello", senderType: "system" })).toBe(false);
    });
  });
});
