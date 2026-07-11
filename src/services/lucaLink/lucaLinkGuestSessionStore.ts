/**
 * Manager-owned LucaLink guest session state.
 *
 * WebRTC and socket handlers stay in the relay adapter; this store owns guest
 * peer records, guest security sessions, inbound audit, and the guest message
 * callback.
 */
import {
  createLucaLinkGuestSession,
  summarizeLucaLinkGuestSessions,
  type LucaLinkGuestInboundResult,
  type LucaLinkGuestSessionRecord,
  type LucaLinkGuestSessionSummary,
} from "./lucaLinkGuestSessionPolicy";

export interface LucaLinkGuestPeerSession {
  peerConnection: RTCPeerConnection | null;
  sessionId: string;
}

type GuestMessageHandler = (sessionId: string, message: string) => void;

export class LucaLinkGuestSessionStore {
  private peerSessions: Map<string, LucaLinkGuestPeerSession> = new Map();
  private securitySessions: Map<string, LucaLinkGuestSessionRecord> = new Map();
  private inboundAudit: LucaLinkGuestInboundResult[] = [];
  private readonly inboundAuditLimit = 100;
  private messageHandler: GuestMessageHandler | null = null;

  ensurePeerSession(sessionId: string): LucaLinkGuestPeerSession {
    const existing = this.peerSessions.get(sessionId);
    if (existing) return existing;
    const session = { peerConnection: null, sessionId };
    this.peerSessions.set(sessionId, session);
    return session;
  }

  hasPeerSession(sessionId: string): boolean {
    return this.peerSessions.has(sessionId);
  }

  getPeerSession(sessionId: string): LucaLinkGuestPeerSession | undefined {
    return this.peerSessions.get(sessionId);
  }

  setPeerConnection(
    sessionId: string,
    peerConnection: RTCPeerConnection | null,
  ): void {
    this.ensurePeerSession(sessionId).peerConnection = peerConnection;
  }

  removePeerSession(sessionId: string): void {
    this.peerSessions.delete(sessionId);
  }

  closeAndRemovePeerSession(sessionId: string): void {
    this.getPeerSession(sessionId)?.peerConnection?.close();
    this.removePeerSession(sessionId);
  }

  ensureSecuritySession(sessionId: string): LucaLinkGuestSessionRecord {
    const existing = this.securitySessions.get(sessionId);
    if (existing) return existing;
    const session = createLucaLinkGuestSession(sessionId);
    this.securitySessions.set(sessionId, session);
    return session;
  }

  getSecuritySession(sessionId: string): LucaLinkGuestSessionRecord | undefined {
    return this.securitySessions.get(sessionId);
  }

  setSecuritySession(
    sessionId: string,
    session: LucaLinkGuestSessionRecord,
  ): void {
    this.securitySessions.set(sessionId, session);
  }

  updateSecuritySession(
    sessionId: string,
    update: (session: LucaLinkGuestSessionRecord) => LucaLinkGuestSessionRecord,
  ): LucaLinkGuestSessionRecord | undefined {
    const session = this.getSecuritySession(sessionId);
    if (!session) return undefined;
    const updated = update(session);
    this.setSecuritySession(sessionId, updated);
    return updated;
  }

  getSecuritySessions(): LucaLinkGuestSessionRecord[] {
    return [...this.securitySessions.values()];
  }

  getSecuritySummary(): LucaLinkGuestSessionSummary {
    return summarizeLucaLinkGuestSessions(this.securitySessions.values());
  }

  getInboundAudit(): LucaLinkGuestInboundResult[] {
    return [...this.inboundAudit];
  }

  clearInboundAudit(): void {
    this.inboundAudit = [];
  }

  recordInbound(result: LucaLinkGuestInboundResult): void {
    this.inboundAudit = [...this.inboundAudit, result].slice(
      -this.inboundAuditLimit,
    );
  }

  setMessageHandler(handler: GuestMessageHandler): void {
    this.messageHandler = handler;
  }

  getMessageHandler(): GuestMessageHandler | null {
    return this.messageHandler;
  }

  dispose(): void {
    for (const session of this.peerSessions.values()) {
      session.peerConnection?.close();
    }
    this.peerSessions.clear();
    this.securitySessions.clear();
    this.inboundAudit = [];
    this.messageHandler = null;
  }
}

export const lucaLinkGuestSessionStore = new LucaLinkGuestSessionStore();
