import { SecureSocket } from "./secureSocket";
import { lucaLinkRelayBoundary as legacyRelayClient } from "./lucaLinkRelayBoundary";
import type { LucaLinkRelayImplementation } from "./lucaLinkRelayBoundary";
export type {
  LucaLinkMessage,
  LucaLinkState,
  LucaLinkDevice,
} from "./lucaLinkRelayBoundary";

/**
 * The relay/guest surface consumers are allowed to use — a narrow, typed
 * window onto the legacy client. Anything not listed here is considered
 * internal and will not survive the consolidation.
 */
/**
 * The state-only governance surface — device trust, approval queue,
 * continuation tokens, soft enforcement. Same single source of truth as
 * the relay facade (the legacy singleton's registries); consumers migrate
 * to lucaLinkManager.governance.* so the registries can later move into
 * the manager without another consumer sweep. Nothing here transports.
 */
export type LucaLinkGovernanceFacade = Pick<
  LucaLinkRelayImplementation,
  // Device trust
  | "getTrustedDevices"
  | "getDeviceTrustSummary"
  | "getDeviceTrustAudit"
  | "clearDeviceTrustAudit"
  | "renameTrustedDevice"
  | "setTrustedDeviceTrustLevel"
  | "revokeTrustedDevice"
  | "blockTrustedDevice"
  | "unblockTrustedDevice"
  // Approval queue
  | "getPendingApprovalRequests"
  | "getApprovalRequests"
  | "getApprovalQueueSummary"
  | "approveApprovalRequest"
  | "denyApprovalRequest"
  | "cancelApprovalRequest"
  | "queueApprovalForSoftEnforcementResult"
  // Continuation tokens
  | "getContinuationTokens"
  | "getValidContinuationTokens"
  | "createContinuationFromApprovalRequest"
  | "validateContinuationToken"
  | "consumeContinuationToken"
  | "prepareSafeContinuation"
  | "consumePreparedContinuation"
  | "evaluateContinuationBridge"
  // Soft enforcement
  | "enableSoftEnforcement"
  | "disableSoftEnforcement"
  | "getSoftEnforcementMode"
  | "evaluateRuntimeEventForSoftEnforcement"
>;

/**
 * The settings-console surface — exactly what SettingsLucaLinkTab (the one
 * full governance console) touches: relay ops, every registry, handoffs,
 * bridge reviews, adapter drafts, approval surfaces, host connections,
 * guest security, runtime shadow. Other consumers must use the narrower
 * relay/governance facades; this window exists so the console migrates off
 * the legacy import without forking state.
 */
export type LucaLinkConsoleFacade = Pick<
  LucaLinkRelayImplementation,
  | "approveApprovalRequest"
  | "approveBridgeReviewForSandbox"
  | "approveHandoff"
  | "blockTrustedDevice"
  | "cancelAdapterDraft"
  | "cancelApprovalRequest"
  | "cancelBridgeReview"
  | "cancelContinuationToken"
  | "cancelHandoff"
  | "clearAdapterDrafts"
  | "consumeContinuationToken"
  | "createAdapterDraftFromBlueprint"
  | "createAdapterDraftFromBridgeReview"
  | "createBridgeReviewFromBlueprint"
  | "createContinuationFromApprovalRequest"
  | "createConversationHandoff"
  | "createRoom"
  | "declineHandoff"
  | "denyApprovalRequest"
  | "disconnect"
  | "generateGuestSession"
  | "getActiveTrustedDevices"
  | "getAdapterDraftSummary"
  | "getAdapterDrafts"
  | "getApprovalQueueSummary"
  | "getApprovalRequests"
  | "getApprovalSurfaceSummary"
  | "getApprovalSurfaces"
  | "getBridgeReviewSummary"
  | "getBridgeReviews"
  | "getContinuationRegistrySummary"
  | "getContinuationTokens"
  | "getDeviceTrustAudit"
  | "getDeviceTrustSummary"
  | "getEmbodiedHostCapabilityEnvelopes"
  | "getFreshHostConnectionSummary"
  | "getFreshHostConnections"
  | "getGuestSecuritySessions"
  | "getGuestSecuritySummary"
  | "getHandoffSummary"
  | "getHandoffs"
  | "getPairingUrl"
  | "getPendingApprovalRequests"
  | "getPendingHandoffs"
  | "getRuntimeShadowObservations"
  | "getRuntimeShadowSummary"
  | "getSoftEnforcementMode"
  | "getState"
  | "getTrustedDevices"
  | "getValidContinuationTokens"
  | "joinWithToken"
  | "markHandoffAccepted"
  | "onStateChange"
  | "rejectBridgeReview"
  | "renameTrustedDevice"
  | "revokeGuestSession"
  | "revokeTrustedDevice"
  | "setTrustedDeviceTrustLevel"
  | "unblockTrustedDevice"
  | "validateContinuationToken"
>;

export type LucaLinkRelayFacade = Pick<
  LucaLinkRelayImplementation,
  | "createRoom"
  | "joinWithToken"
  | "autoConnect"
  | "disconnect"
  | "dispose"
  | "generateGuestSession"
  | "initGuestHandler"
  | "onGuestMessage"
  | "sendToGuest"
  | "getState"
  | "onStateChange"
  | "onMessage"
  | "send"
  | "beamPacket"
  | "syncMission"
  | "getPairingUrl"
>;

export type LucaLinkRelayGuestHandler = Parameters<
  LucaLinkRelayFacade["initGuestHandler"]
>;
export type LucaLinkRelayMessageListener = Parameters<
  LucaLinkRelayFacade["onMessage"]
>[0];

type FacadeKey<T extends object> = keyof T & string;

function createBoundFacade<
  T extends object,
  K extends FacadeKey<T>,
>(source: T, keys: readonly K[]): Pick<T, K> {
  const facade = {} as Pick<T, K>;
  for (const key of keys) {
    (facade as Record<string, unknown>)[key] = (
      source as unknown as Record<string, (...args: never[]) => unknown>
    )[key].bind(source);
  }
  return facade;
}

const governanceFacadeKeys = [
  "getTrustedDevices",
  "getDeviceTrustSummary",
  "getDeviceTrustAudit",
  "clearDeviceTrustAudit",
  "renameTrustedDevice",
  "setTrustedDeviceTrustLevel",
  "revokeTrustedDevice",
  "blockTrustedDevice",
  "unblockTrustedDevice",
  "getPendingApprovalRequests",
  "getApprovalRequests",
  "getApprovalQueueSummary",
  "approveApprovalRequest",
  "denyApprovalRequest",
  "cancelApprovalRequest",
  "queueApprovalForSoftEnforcementResult",
  "getContinuationTokens",
  "getValidContinuationTokens",
  "createContinuationFromApprovalRequest",
  "validateContinuationToken",
  "consumeContinuationToken",
  "prepareSafeContinuation",
  "consumePreparedContinuation",
  "evaluateContinuationBridge",
  "enableSoftEnforcement",
  "disableSoftEnforcement",
  "getSoftEnforcementMode",
  "evaluateRuntimeEventForSoftEnforcement",
] as const satisfies readonly FacadeKey<LucaLinkGovernanceFacade>[];

const consoleFacadeKeys = [
  "approveApprovalRequest",
  "approveBridgeReviewForSandbox",
  "approveHandoff",
  "blockTrustedDevice",
  "cancelAdapterDraft",
  "cancelApprovalRequest",
  "cancelBridgeReview",
  "cancelContinuationToken",
  "cancelHandoff",
  "clearAdapterDrafts",
  "consumeContinuationToken",
  "createAdapterDraftFromBlueprint",
  "createAdapterDraftFromBridgeReview",
  "createBridgeReviewFromBlueprint",
  "createContinuationFromApprovalRequest",
  "createConversationHandoff",
  "createRoom",
  "declineHandoff",
  "denyApprovalRequest",
  "disconnect",
  "generateGuestSession",
  "getActiveTrustedDevices",
  "getAdapterDraftSummary",
  "getAdapterDrafts",
  "getApprovalQueueSummary",
  "getApprovalRequests",
  "getApprovalSurfaceSummary",
  "getApprovalSurfaces",
  "getBridgeReviewSummary",
  "getBridgeReviews",
  "getContinuationRegistrySummary",
  "getContinuationTokens",
  "getDeviceTrustAudit",
  "getDeviceTrustSummary",
  "getEmbodiedHostCapabilityEnvelopes",
  "getFreshHostConnectionSummary",
  "getFreshHostConnections",
  "getGuestSecuritySessions",
  "getGuestSecuritySummary",
  "getHandoffSummary",
  "getHandoffs",
  "getPairingUrl",
  "getPendingApprovalRequests",
  "getPendingHandoffs",
  "getRuntimeShadowObservations",
  "getRuntimeShadowSummary",
  "getSoftEnforcementMode",
  "getState",
  "getTrustedDevices",
  "getValidContinuationTokens",
  "joinWithToken",
  "markHandoffAccepted",
  "onStateChange",
  "rejectBridgeReview",
  "renameTrustedDevice",
  "revokeGuestSession",
  "revokeTrustedDevice",
  "setTrustedDeviceTrustLevel",
  "unblockTrustedDevice",
  "validateContinuationToken",
] as const satisfies readonly FacadeKey<LucaLinkConsoleFacade>[];

const governanceFacade = createBoundFacade(
  legacyRelayClient,
  governanceFacadeKeys,
);
const consoleFacade = createBoundFacade(legacyRelayClient, consoleFacadeKeys);
import { CryptoService } from "./crypto";
import { deviceRegistry, DeviceRegistryService } from "./deviceRegistry";
import { sessionManager, SessionManager } from "./sessionManager";
import { errorHandler, ErrorHandler } from "./errorHandler";
import type {
  Device,
  LucaLinkMessage,
  LucaLinkEvent,
  ConnectionState,
  KeyPair,
} from "./types";

/**
 * LucaLinkManager - Main orchestrator for Luca Link system
 *
 * High-level API that coordinates:
 * - Secure socket connection (encrypted messaging)
 * - Device registry (multi-device management)
 * - Session management (persistence & recovery)
 * - Error handling (classification & recovery)
 *
 * This is the primary interface for Luca Link functionality.
 */
export class LucaLinkManager {
  private socket: SecureSocket | null = null;
  private isInitialized = false;
  private myDeviceId: string | null = null;
  private identityKeyPair: KeyPair | null = null;
  private eventHandlers: Map<string, Set<(event: LucaLinkEvent) => void>> =
    new Map();

  get deviceId(): string | null {
    return this.myDeviceId;
  }

  constructor(
    private deviceRegistry: DeviceRegistryService,
    private sessionManager: SessionManager,
    private errorHandler: ErrorHandler
  ) {
    this.setupErrorHandlers();
  }

  /**
   * Initialize the Luca Link system
   */
  async initialize(
    url: string,
    options: {
      path?: string;
      deviceId?: string;
      deviceName?: string;
    } = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn("[LucaLinkManager] Already initialized");
      return;
    }

    try {
      // Generate or use provided device ID
      this.myDeviceId =
        options.deviceId || DeviceRegistryService.generateDeviceId();

      // --- IDENTITY KEY MANAGEMENT ---
      // Load or generate long-term identity key pair (Ed25519)
      const storedKeys = localStorage.getItem(`luca_link_identity_${this.myDeviceId}`);
      if (storedKeys) {
        try {
          const { publicKey, secretKey } = JSON.parse(storedKeys);
          this.identityKeyPair = {
            publicKey: CryptoService.decodeKey(publicKey),
            secretKey: CryptoService.decodeKey(secretKey),
          };
          console.log("[LucaLinkManager] Identity keys loaded");
        } catch (e) {
          console.error("[LucaLinkManager] Failed to parse stored identity keys", e);
        }
      }

      if (!this.identityKeyPair) {
        this.identityKeyPair = CryptoService.generateIdentityKeyPair();
        localStorage.setItem(
          `luca_link_identity_${this.myDeviceId}`,
          JSON.stringify({
            publicKey: CryptoService.encodeKey(this.identityKeyPair.publicKey),
            secretKey: CryptoService.encodeKey(this.identityKeyPair.secretKey),
          })
        );
        console.log("[LucaLinkManager] New identity keys generated and persisted");
      }

      // Create secure socket
      this.socket = new SecureSocket(url, {
        path: options.path,
        query: {
          deviceId: this.myDeviceId,
          clientType: "desktop",
        },
      });

      // Setup socket event handlers
      this.setupSocketHandlers();

      this.isInitialized = true;
      console.log("[LucaLinkManager] Initialized");
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "LL_901",
        error instanceof Error ? error.message : "Unknown error"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Connect to the Luca Link server
   */
  async connect(): Promise<void> {
    if (!this.socket) {
      throw new Error(
        "LucaLinkManager not initialized. Call initialize() first."
      );
    }

    try {
      await this.socket.connect();

      // Try to recover previous session
      await this.attemptSessionRecovery();

      this.emit("connected", {});
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "LL_104",
        error instanceof Error ? error.message : "Connection failed"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.emit("disconnected", {});
  }

  /**
   * Pair a new device (generate QR code data)
   */
  async generatePairingData(): Promise<{
    token: string;
    qrData: string;
    deviceId: string;
  }> {
    if (!this.myDeviceId) {
      throw new Error("Device ID not set. Initialize first.");
    }

    // Generate pairing token
    const token = this.generateToken();

    // Create QR data (URL that mobile will scan)
    const qrData = JSON.stringify({
      type: "luca-link-pairing",
      token,
      deviceId: this.myDeviceId,
      identityPublicKey: this.identityKeyPair ? CryptoService.encodeKey(this.identityKeyPair.publicKey) : undefined,
      timestamp: Date.now(),
    });

    return {
      token,
      qrData,
      deviceId: this.myDeviceId,
    };
  }

  /**
   * Register a device that has paired
   */
  async registerDevice(deviceData: {
    id: string;
    name: string;
    type?: Device["type"];
    platform?: Device["platform"];
    capabilities?: string[];
    publicKey: string;
    identityPublicKey?: string;
  }): Promise<Device> {
    try {
      // Detect capabilities if not provided
      const capabilities =
        deviceData.capabilities ||
        DeviceRegistryService.detectCapabilities(
          navigator.userAgent,
          navigator.platform
        );

      // Register in device registry
      const device = this.deviceRegistry.registerDevice({
        id: deviceData.id,
        name: deviceData.name,
        type: deviceData.type || "mobile",
        platform:
          deviceData.platform ||
          DeviceRegistryService.detectPlatform(navigator.userAgent),
        capabilities,
        publicKey: deviceData.publicKey,
        identityPublicKey: (deviceData as any).identityPublicKey,
      });

      this.emit("device:added", { device });
      return device;
    } catch (error) {
      const nlError = this.errorHandler.createError(
        "LL_901",
        error instanceof Error ? error.message : "Device registration failed"
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Send a command to a device
   */
  async sendCommand(
    deviceId: string,
    command: string,
    args?: any
  ): Promise<void> {
    if (!this.socket?.isConnected()) {
      const nlError = this.errorHandler.createError("LL_103");
      await this.errorHandler.handleError(nlError);
      throw new Error("Not connected");
    }

    // Check if device has required capability
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device) {
      const nlError = this.errorHandler.createError(
        "LL_404",
        `Device ${deviceId} not found`
      );
      await this.errorHandler.handleError(nlError);
      throw new Error(`Device ${deviceId} not found`);
    }

    const message: LucaLinkMessage = {
      type: "command",
      payload: { command, args },
      target: deviceId,
      source: this.myDeviceId || undefined,
      timestamp: Date.now(),
      commandId: this.generateCommandId(),
    };

    // --- CRYPTOGRAPHIC SIGNING ---
    if (this.identityKeyPair) {
      message.identitySignature = CryptoService.signPayload(
        message.payload,
        this.identityKeyPair.secretKey
      );
      message.identityPublicKey = CryptoService.encodeKey(
        this.identityKeyPair.publicKey
      );
    }

    try {
      await this.socket.send(message);
    } catch (error) {
      // Queue for later if failed
      await this.sessionManager.queueMessage(deviceId, message);

      const nlError = this.errorHandler.createError(
        "LL_405",
        error instanceof Error ? error.message : "Command send failed",
        [deviceId]
      );
      await this.errorHandler.handleError(nlError);
      throw error;
    }
  }

  /**
   * Send a raw system event (unencrypted)
   */
  sendSystemEvent(event: string, data: any): void {
    this.socket?.emitSystemEvent(event, data);
  }

  /**
   * Hand the current session's summary to a linked companion (Body card:
   * "Hand this session to another device"). Display-only on the far side —
   * the companion shows the summary; nothing executes. Plain channel:
   * companions register without a key pair, so this never carries secrets.
   */
  /**
   * Single manager-owned relay send path for application surfaces.
   * The Socket.IO implementation remains behind this façade during the
   * transport migration, so consumers do not hold or emit on raw sockets.
   */
  sendRelayMessage(
    targetDeviceId: string | "all",
    type: string,
    payload: unknown,
  ): boolean {
    return legacyRelayClient.send(targetDeviceId, type, payload);
  }

  getRelayState(): ReturnType<LucaLinkRelayFacade["getState"]> {
    return legacyRelayClient.getState();
  }

  onRelayMessage(listener: LucaLinkRelayMessageListener): () => void {
    return legacyRelayClient.onMessage(listener);
  }

  onRelayStateChange(
    listener: Parameters<LucaLinkRelayFacade["onStateChange"]>[0],
  ): ReturnType<LucaLinkRelayFacade["onStateChange"]> {
    return legacyRelayClient.onStateChange(listener);
  }

  beamRelayPacket(
    ...args: Parameters<LucaLinkRelayFacade["beamPacket"]>
  ): ReturnType<LucaLinkRelayFacade["beamPacket"]> {
    return legacyRelayClient.beamPacket(...args);
  }

  async createRelayRoom(): ReturnType<LucaLinkRelayFacade["createRoom"]> {
    return legacyRelayClient.createRoom();
  }

  async joinRelayWithToken(
    ...args: Parameters<LucaLinkRelayFacade["joinWithToken"]>
  ): ReturnType<LucaLinkRelayFacade["joinWithToken"]> {
    return legacyRelayClient.joinWithToken(...args);
  }

  async generateRelayGuestSession(): ReturnType<
    LucaLinkRelayFacade["generateGuestSession"]
  > {
    return legacyRelayClient.generateGuestSession();
  }

  initRelayGuestHandler(...args: LucaLinkRelayGuestHandler): void {
    legacyRelayClient.initGuestHandler(...args);
  }

  autoConnectRelay(
    ...args: Parameters<LucaLinkRelayFacade["autoConnect"]>
  ): ReturnType<LucaLinkRelayFacade["autoConnect"]> {
    return legacyRelayClient.autoConnect(...args);
  }

  disconnectRelay(): ReturnType<LucaLinkRelayFacade["disconnect"]> {
    return legacyRelayClient.disconnect();
  }

  disposeRelay(): ReturnType<LucaLinkRelayFacade["dispose"]> {
    return legacyRelayClient.dispose();
  }

  onRelayGuestMessage(
    ...args: Parameters<LucaLinkRelayFacade["onGuestMessage"]>
  ): ReturnType<LucaLinkRelayFacade["onGuestMessage"]> {
    return legacyRelayClient.onGuestMessage(...args);
  }

  sendRelayToGuest(
    ...args: Parameters<LucaLinkRelayFacade["sendToGuest"]>
  ): ReturnType<LucaLinkRelayFacade["sendToGuest"]> {
    return legacyRelayClient.sendToGuest(...args);
  }

  syncRelayMission(
    ...args: Parameters<LucaLinkRelayFacade["syncMission"]>
  ): ReturnType<LucaLinkRelayFacade["syncMission"]> {
    return legacyRelayClient.syncMission(...args);
  }

  getRelayPairingUrl(): ReturnType<LucaLinkRelayFacade["getPairingUrl"]> {
    return legacyRelayClient.getPairingUrl();
  }

  /** Consolidation slice 3: the state-only governance surface (see type). */
  get governance(): LucaLinkGovernanceFacade {
    return governanceFacade;
  }

  /** Consolidation slice 4b: the settings-console surface (see type). */
  get console(): LucaLinkConsoleFacade {
    return consoleFacade;
  }

  sendSessionHandoff(
    deviceId: string,
    payload: { title: string; summary: string },
  ): void {
    this.sendSystemEvent("session:handoff", {
      target: deviceId,
      title: payload.title,
      summary: payload.summary,
    });
  }

  /**
   * Send a response to a command (encrypted)
   */
  async sendResponse(
    targetId: string,
    commandId: string,
    payload: any
  ): Promise<void> {
    if (!this.socket?.isConnected()) {
      throw new Error("Luca Link not connected");
    }

    const message: LucaLinkMessage = {
      type: "response",
      payload,
      target: targetId,
      source: this.myDeviceId || undefined,
      timestamp: Date.now(),
      commandId,
    };

    await this.socket.send(message);
  }

  /**
   * Send a generic event message (encrypted)
   */
  async sendEvent(
    targetId: string | "all",
    eventType: string,
    payload: any
  ): Promise<void> {
    if (!this.socket?.isConnected()) {
      return; // Silently fail for broadcast events if not connected
    }

    const message: LucaLinkMessage = {
      type: "event",
      payload: { ...payload, event: eventType },
      target: targetId === "all" ? undefined : targetId,
      source: this.myDeviceId || undefined,
      timestamp: Date.now(),
    };

    await this.socket.send(message);
  }

  /**
   * Delegate tool execution to best available device or a specific device
   * Supports:
   * - delegateTool(tool: string, args?: any) -> Automatically selects best device
   * - delegateTool(deviceId: string, tool: string, args?: any) -> Delegates to specific device
   */
  async delegateTool(
    deviceIdOrTool: string,
    toolOrArgs?: any,
    maybeArgs?: any
  ): Promise<any> {
    let deviceId: string | null = null;
    let tool: string;
    let args: any;

    // Determine which signature is being used
    if (typeof toolOrArgs === "string") {
      // (deviceId, tool, args)
      deviceId = deviceIdOrTool;
      tool = toolOrArgs;
      args = maybeArgs;
    } else {
      // (tool, args)
      tool = deviceIdOrTool;
      args = toolOrArgs;
    }

    let device: Device | null = null;
    if (deviceId) {
      device = this.deviceRegistry.getDevice(deviceId);
    } else {
      device = this.deviceRegistry.selectBestDevice(tool);
    }

    if (!device) {
      const nlError = this.errorHandler.createError(
        "LL_401",
        `No device found with capability: ${tool}${
          deviceId ? ` (Device ID: ${deviceId})` : ""
        }`
      );
      await this.errorHandler.handleError(nlError);
      throw new Error(`No device available for ${tool}`);
    }

    // Wrap in a promise to wait for response
    return new Promise((resolve, reject) => {
      const commandId = this.generateCommandId();

      // Setup temporary listener for the response
      const responseHandler = (event: LucaLinkEvent) => {
        if (event.data.message?.commandId === commandId) {
          this.off("response:received", responseHandler);
          resolve(event.data.message.payload);
        }
      };

      this.on("response:received", responseHandler);

      const sendMessage = async () => {
        try {
          const message: LucaLinkMessage = {
            type: "command",
            payload: { command: tool, args },
            target: device!.id,
            source: this.myDeviceId || undefined,
            timestamp: Date.now(),
            commandId,
          };

          // --- CRYPTOGRAPHIC SIGNING ---
          if (this.identityKeyPair) {
            message.identitySignature = CryptoService.signPayload(
              message.payload,
              this.identityKeyPair.secretKey
            );
            message.identityPublicKey = CryptoService.encodeKey(
              this.identityKeyPair.publicKey
            );
          }

          if (!this.socket?.isConnected()) {
            throw new Error("Luca Link not connected");
          }

          await this.socket.send(message);

          // Timeout handling
          setTimeout(() => {
            this.off("response:received", responseHandler);
            // Don't reject yet as some commands are fire-and-forget or taking long
            // But resolve with a status if needed
          }, 30000);
        } catch (error) {
          this.off("response:received", responseHandler);
          reject(error);
        }
      };

      sendMessage();
    });
  }

  /**
   * Get all connected devices
   */
  getDevices(): Device[] {
    return this.deviceRegistry.getAllDevices();
  }

  /**
   * Get online devices only
   */
  getOnlineDevices(): Device[] {
    return this.deviceRegistry.getDevicesByStatus("online");
  }

  /**
   * Remove a device
   */
  async removeDevice(deviceId: string): Promise<void> {
    const removed = this.deviceRegistry.removeDevice(deviceId);

    if (removed) {
      // Also delete session
      const session = await this.sessionManager.getSessionByDevice(deviceId);
      if (session) {
        await this.sessionManager.deleteSession(session.sessionId);
      }

      this.emit("device:removed", { deviceId });
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState | null {
    return this.socket?.getState() || null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.isConnected() || false;
  }

  /**
   * Get error diagnostics
   */
  getDiagnostics() {
    return {
      errors: this.errorHandler.exportDiagnostics(),
      devices: this.getDevices(),
      sessions: this.sessionManager.getActiveSessions(),
      queue: this.sessionManager.getQueueStats(),
      connection: {
        state: this.getConnectionState(),
        isConnected: this.isConnected(),
      },
    };
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: (event: LucaLinkEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (event: LucaLinkEvent) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  // ==================== Private Methods ====================

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connected", () => {
      this.emit("connected", {});
    });

    this.socket.on("disconnected", () => {
      this.emit("disconnected", {});
    });

    this.socket.on("reconnecting", (event) => {
      this.emit("reconnecting", event.data);
    });

    this.socket.on("device:connected", async (event: any) => {
      const device = event?.device ?? event?.data?.device;
      if (!device?.id) return;
      try {
        await this.registerDevice({
          id: device.id,
          name: device.name || device.id,
          type: device.type || "mobile",
          platform: device.platform || "web",
          capabilities: device.capabilities || [],
          // Companion browsers register without a key pair; secure channels
          // stay unavailable until a key exchange happens. Presence is honest.
          publicKey: device.publicKey || "",
        });
      } catch (error) {
        console.error("[LucaLinkManager] Companion register failed:", error);
      }
    });

    this.socket.on("device:disconnected", (event: any) => {
      const deviceId = event?.deviceId ?? event?.data?.deviceId;
      if (!deviceId) return;
      this.deviceRegistry.markOffline(deviceId);
      this.emit("device:updated", { deviceId });
    });

    this.socket.on("session:handoff:ack", (event: any) => {
      this.emit("session:handoff:ack", {
        deviceId: event?.deviceId ?? event?.data?.deviceId,
      });
    });

    this.socket.on("sensor:pulse", (event: any) => {
      const deviceId = event?.deviceId ?? event?.data?.deviceId;
      if (!deviceId) return;
      const metadata: Record<string, unknown> = {};
      if (typeof event.battery === "number") metadata.battery = event.battery;
      if (typeof event.network === "string") metadata.network = event.network;
      this.deviceRegistry.heartbeat(deviceId, metadata);
      this.emit("device:updated", { deviceId });
    });

    this.socket.on("message:received", async (event) => {
      await this.handleIncomingMessage(event.data.message);
    });

    this.socket.on("error", async (event) => {
      const nlError = this.errorHandler.createError(
        "LL_105",
        event.data.error?.message || "Socket error"
      );
      await this.errorHandler.handleError(nlError);
    });
  }

  private setupErrorHandlers(): void {
    // Handle critical errors
    this.errorHandler.on("security:breach", async () => {
      // Disconnect immediately on security breach
      this.disconnect();
    });

    this.errorHandler.on("reconnect:failed", () => {
      this.emit("reconnect:failed", {});
    });

    this.errorHandler.on("session:invalid", async () => {
      // Try to recover session
      if (this.myDeviceId) {
        const session = await this.sessionManager.getSessionByDevice(
          this.myDeviceId
        );
        if (session) {
          await this.sessionManager.recoverSession(session.sessionId);
        }
      }
    });
  }

  /**
   * Sync state data across all linked devices
   * @param key The state key (e.g., "memory", "settings")
   * @param data The state data to sync
   */
  async syncState(key: string, data: any): Promise<void> {
    if (!this.socket?.isConnected()) {
      return; // Silently fail if not connected
    }

    const message: LucaLinkMessage = {
      type: "sync",
      payload: { key, data },
      timestamp: Date.now(),
    };

    try {
      await this.socket.send(message);
    } catch (error) {
      console.warn(`[LucaLinkManager] Failed to sync state for ${key}:`, error);
    }
  }

  private async handleIncomingMessage(message: LucaLinkMessage): Promise<void> {
    // --- SIGNATURE VERIFICATION ---
    if (message.type === "command") {
      const sourceDevice = message.source
        ? this.deviceRegistry.getDevice(message.source)
        : null;

      // Ensure command is signed
      if (!message.identitySignature || !message.identityPublicKey) {
        console.error(
          `[SECURITY] 🚨 Unsigned command received from ${
            message.source || "unknown"
          }`
        );
        this.errorHandler.handleError(
          this.errorHandler.createError(
            "LL_208",
            "Unsigned command rejected"
          )
        );
        return;
      }

      // Verify signature against pinned public key if we have it, otherwise use the one provided (trust-on-first-use)
      const publicKeyToVerify = sourceDevice?.identityPublicKey
        ? CryptoService.decodeKey(sourceDevice.identityPublicKey)
        : CryptoService.decodeKey(message.identityPublicKey);

      const isValid = CryptoService.verifyPayload(
        message.payload,
        message.identitySignature,
        publicKeyToVerify
      );

      if (!isValid) {
        console.error(
          `[SECURITY] 🚨 Signature mismatch for command from ${
            message.source || "unknown"
          }`
        );
        this.errorHandler.handleError(
          this.errorHandler.createError(
            "LL_209",
            "Command signature verification failed"
          )
        );
        return;
      }

      // If this is a new device with identity, pin it in the registry
      if (sourceDevice && !sourceDevice.identityPublicKey) {
        this.deviceRegistry.updateDevice(sourceDevice.id, {
          identityPublicKey: message.identityPublicKey,
        });
        console.log(
          `[SECURITY] 📌 Pinned identity public key for device: ${sourceDevice.id}`
        );
      }
    }

    switch (message.type) {
      case "command":
        this.emit("command:received", { message });
        break;

      case "response":
        this.emit("response:received", { message });
        break;

      case "event":
        // Emit specific event for easier listening
        if (message.payload?.event) {
          this.emit(`event:${message.payload.event}`, {
            data: message.payload,
            source: message.source,
          });
        }
        this.emit("event:received", { message });
        break;

      case "sync":
        // Emit specific sync events per key for easier listening
        if (message.payload?.key) {
          this.emit(`sync:${message.payload.key}`, {
            data: message.payload.data,
            source: message.source,
          });
        }
        this.emit("sync:received", { message });
        break;

      case "heartbeat":
        // Update device heartbeat
        if (message.source) {
          this.deviceRegistry.heartbeat(message.source, message.payload);
        }
        break;
    }
  }

  private async attemptSessionRecovery(): Promise<void> {
    if (!this.myDeviceId) return;

    try {
      const session = await this.sessionManager.getSessionByDevice(
        this.myDeviceId
      );

      if (session) {
        const recovered = await this.sessionManager.recoverSession(
          session.sessionId
        );

        if (recovered) {
          console.log(
            "[LucaLinkManager] Session recovered:",
            session.sessionId
          );
          this.emit("session:restored", { session });

          // Process queued messages
          const stats = await this.sessionManager.processQueue(
            this.myDeviceId,
            async (message) => {
              if (this.socket) {
                await this.socket.send(message);
              }
            }
          );

          console.log(
            `[LucaLinkManager] Processed queue: ${stats.sent} sent, ${stats.failed} failed`
          );
        }
      }
    } catch (error) {
      console.warn("[LucaLinkManager] Session recovery failed:", error);
      // Non-critical, continue without session
    }
  }

  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    const lucaEvent: LucaLinkEvent = {
      type: event as any,
      data,
      timestamp: Date.now(),
    };

    handlers.forEach((handler) => {
      try {
        handler(lucaEvent);
      } catch (error) {
        console.error(
          `[LucaLinkManager] Event handler error for ${event}:`,
          error
        );
      }
    });
  }
}

// Export singleton instance
export const lucaLinkManager = new LucaLinkManager(
  deviceRegistry,
  sessionManager,
  errorHandler
);
