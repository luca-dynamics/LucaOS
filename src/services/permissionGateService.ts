/**
 * PermissionGate Service
 * Handles granular, per-operation authorization for high-risk actions.
 * Ensures total operator sovereignty over critical system modifications.
 */

import { eventBus } from "./eventBus";

export interface PermissionRequest {
  id: string;
  tool: string;
  args: any;
  reason: string;
  timestamp: number;
  status: "PENDING" | "AUTHORIZED" | "DENIED";
}

class PermissionGateService {
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  private authorizationHistory: Map<string, boolean> = new Map();

  constructor() {
    console.log("[PERMISSION_GATE] Initialized");
  }

  /**
   * Request permission for a high-risk operation
   * Returns a unique requestId
   */
  requestPermission(tool: string, args: any, reason: string): string {
    const requestId = `perm_${Math.random().toString(36).substring(2, 11)}`;
    const request: PermissionRequest = {
      id: requestId,
      tool,
      args,
      reason,
      timestamp: Date.now(),
      status: "PENDING"
    };

    this.pendingRequests.set(requestId, request);
    
    // Emit for UI to show Permission Card
    eventBus.emit("permission-request", request);
    console.log(`[PERMISSION_GATE] Requesting permission for ${tool}: ${reason} (ID: ${requestId})`);
    
    return requestId;
  }

  /**
   * Authorize a specific request
   */
  authorize(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.status = "AUTHORIZED";
      this.authorizationHistory.set(requestId, true);
      eventBus.emit(`permission-resolved:${requestId}`, { authorized: true });
      console.log(`[PERMISSION_GATE] ✅ Authorized ${request.tool} (ID: ${requestId})`);
    }
  }

  /**
   * Deny a specific request
   */
  deny(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.status = "DENIED";
      this.authorizationHistory.set(requestId, false);
      eventBus.emit(`permission-resolved:${requestId}`, { authorized: false });
      console.log(`[PERMISSION_GATE] 🛑 Denied ${request.tool} (ID: ${requestId})`);
    }
  }

  /**
   * Check if a request has been authorized
   */
  isAuthorized(requestId: string): boolean {
    return this.authorizationHistory.get(requestId) === true;
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values()).filter(r => r.status === "PENDING");
  }
}

export const permissionGateService = new PermissionGateService();
export default permissionGateService;
