// ChatIntentProvenanceService — PR #124: Chat Intent Routing Integration
// Creates minimal local provenance records for user chat messages before routing.
// Uses ProvenanceGateService when available. No external API calls. No secrets stored.

import { provenanceGateService, type ProvenanceGateService } from "../provenance/ProvenanceGateService";
import type { ProvenanceSourceType } from "../../types/provenance";

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface ChatIntentProvenanceServiceDependencies {
  provenance: Pick<ProvenanceGateService, "createProvenanceRecord">;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// TODO: Add "chat_message" to ProvenanceSourceType when the canonical provenance
// registry supports it. Using "external_input" as the closest compatible type.
const CHAT_PROVENANCE_SOURCE_TYPE: ProvenanceSourceType = "external_input";
const SECRET_PATTERNS = [
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i,
  /\bseed\b/i,
  /\bmnemonic\b/i,
  /\bcredential\b/i,
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ChatIntentProvenanceService {
  constructor(
    private readonly deps: ChatIntentProvenanceServiceDependencies = {
      provenance: provenanceGateService,
    },
  ) {}

  createChatProvenance(input: {
    message: string;
    sessionId?: string;
    messageId?: string;
  }): { provenanceIds: string[] } {
    if (!input.message || input.message.trim().length === 0) {
      return { provenanceIds: [] };
    }

    if (this.containsSecretLikeContent(input.message)) {
      return { provenanceIds: [] };
    }

    const sourceId = input.messageId ?? `chat-msg:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    try {
      const record = this.deps.provenance.createProvenanceRecord({
        sourceType: CHAT_PROVENANCE_SOURCE_TYPE,
        sourceId,
        sourceTrustLevel: "local",
        createdBy: "chat-intent-provenance",
        parentProvenanceIds: [],
        approvalState: "not_required",
      });

      return { provenanceIds: [record.provenanceId] };
    } catch {
      return { provenanceIds: [] };
    }
  }

  shouldRouteMessage(input: {
    message: string;
    senderType?: string;
    isHidden?: boolean;
    isAwakening?: boolean;
  }): boolean {
    if (!input.message || input.message.trim().length === 0) return false;
    if (input.isHidden) return false;
    if (input.isAwakening) return false;
    if (input.senderType === "assistant" || input.senderType === "luca" || input.senderType === "system") return false;
    return true;
  }

  private containsSecretLikeContent(message: string): boolean {
    return SECRET_PATTERNS.some((pattern) => pattern.test(message));
  }
}

export const chatIntentProvenanceService = new ChatIntentProvenanceService();
