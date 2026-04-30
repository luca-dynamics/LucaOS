import { ErrorSeverity } from "./types";
import type { LucaLinkError } from "./types";

/**
 * Error Code Taxonomy
 */
export const ErrorCodes = {
  // Connection Errors (LL_1xx)
  LL_101: "Connection timeout",
  LL_102: "Network unreachable",
  LL_103: "Device disconnected",
  LL_104: "Handshake failed",
  LL_105: "WebSocket error",
  LL_106: "Max reconnection attempts reached",

  // Security Errors (LL_2xx)
  LL_201: "Invalid signature",
  LL_202: "Encryption failed",
  LL_203: "Decryption failed",
  LL_204: "Token expired",
  LL_205: "Unauthorized device",
  LL_206: "Key exchange failed",
  LL_207: "Message too old (replay attack)",

  // Protocol Errors (LL_3xx)
  LL_301: "Malformed message",
  LL_302: "Unsupported protocol version",
  LL_303: "Rate limit exceeded",
  LL_304: "Invalid message type",
  LL_305: "Missing required field",

  // Delegation Errors (LL_4xx)
  LL_401: "Capability not found",
  LL_402: "Execution timeout",
  LL_403: "Permission denied",
  LL_404: "Device not found",
  LL_405: "Command failed",

  // Session Errors (LL_5xx)
  LL_501: "Session not found",
  LL_502: "Session expired",
  LL_503: "Session creation failed",
  LL_504: "Session recovery failed",
  LL_505: "Storage error",

  // Generic Errors (LL_9xx)
  LL_900: "Unknown error",
  LL_901: "Internal error",
  LL_902: "Not implemented",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * ErrorHandler - Centralized error handling for Luca Link
 *
 * Features:
 * - Error classification
 * - Recovery strategies
 * - User-friendly messages
 * - Logging and diagnostics
 * - Error analytics
 */
export class ErrorHandler {
  private errorLog: LucaLinkError[] = [];
  private readonly MAX_LOG_SIZE = 100;
  private errorHandlers: Map<string, Set<(error: LucaLinkError) => void>> =
    new Map();

  /**
   * Create a Luca Link error
   */
  createError(
    code: ErrorCode,
    technicalDetails?: string,
    affectedDevices?: string[]
  ): LucaLinkError {
    const error: LucaLinkError = {
      code,
      severity: this.getSeverity(code),
      message: this.getUserMessage(code),
      technicalDetails,
      timestamp: new Date(),
      affectedDevices,
      suggestedAction: this.getSuggestedAction(code),
      retryable: this.isRetryable(code),
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  async handleError(error: LucaLinkError): Promise<void> {
    console.error(
      `[ErrorHandler] ${error.code}: ${error.message}`,
      error.technicalDetails
    );

    // Emit to subscribers
    this.emit("error", error);

    // Execute recovery strategy
    await this.executeRecovery(error);

    // Show user notification if needed
    if (this.shouldNotifyUser(error)) {
      this.notifyUser(error);
    }
  }

  /**
   * Get error severity based on code
   */
  private getSeverity(code: ErrorCode): ErrorSeverity {
    // Connection errors - mostly warnings
    if (code.startsWith("LL_1")) {
      if (code === "LL_106") return ErrorSeverity.ERROR; // Max reconnect is serious
      return ErrorSeverity.WARNING;
    }

    // Security errors - always critical
    if (code.startsWith("LL_2")) {
      return ErrorSeverity.CRITICAL;
    }

    // Protocol errors - errors
    if (code.startsWith("LL_3")) {
      return ErrorSeverity.ERROR;
    }

    // Delegation errors - warnings/errors
    if (code.startsWith("LL_4")) {
      return code === "LL_403" ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;
    }

    // Session errors - errors
    if (code.startsWith("LL_5")) {
      return ErrorSeverity.ERROR;
    }

    return ErrorSeverity.ERROR;
  }

  /**
   * Get user-friendly message
   */
  private getUserMessage(code: ErrorCode): string {
    const userMessages: Record<ErrorCode, string> = {
      // Connection
      LL_101: "Connection timed out. Please check your internet connection.",
      LL_102: "Unable to reach the server. Please check your network.",
      LL_103: "Device disconnected. Attempting to reconnect...",
      LL_104: "Failed to establish secure connection.",
      LL_105: "Network connection error occurred.",
      LL_106: "Unable to reconnect after multiple attempts.",

      // Security
      LL_201: "Message authentication failed. Connection may be compromised.",
      LL_202: "Failed to encrypt message.",
      LL_203: "Failed to decrypt message.",
      LL_204: "Your session has expired. Please reconnect.",
      LL_205: "This device is not authorized.",
      LL_206: "Failed to establish secure connection.",
      LL_207: "Received an outdated message.",

      // Protocol
      LL_301: "Received an invalid message.",
      LL_302: "Protocol version mismatch.",
      LL_303: "Too many requests. Please slow down.",
      LL_304: "Invalid message format.",
      LL_305: "Incomplete message received.",

      // Delegation
      LL_401: "This device doesn't support the requested feature.",
      LL_402: "Command timed out.",
      LL_403: "Permission denied.",
      LL_404: "Device not found.",
      LL_405: "Command failed to execute.",

      // Session
      LL_501: "Session not found. Please reconnect.",
      LL_502: "Your session has expired. Please reconnect.",
      LL_503: "Failed to create session.",
      LL_504: "Failed to restore previous session.",
      LL_505: "Storage error occurred.",

      // Generic
      LL_900: "An unknown error occurred.",
      LL_901: "An internal error occurred.",
      LL_902: "This feature is not yet available.",
    };

    return userMessages[code] || ErrorCodes[code];
  }

  /**
   * Get suggested user action
   */
  private getSuggestedAction(code: ErrorCode): string | undefined {
    const actions: Partial<Record<ErrorCode, string>> = {
      LL_101: "Check your internet connection and try again.",
      LL_102: "Verify your network settings and try reconnecting.",
      LL_103: "Device will automatically reconnect.",
      LL_106: "Manually reconnect the device.",
      LL_201: "Disconnect and reconnect the device.",
      LL_204: "Scan the QR code again to reconnect.",
      LL_205: "Contact support if you believe this is an error.",
      LL_303: "Wait a moment before trying again.",
      LL_401: "Choose a different device or feature.",
      LL_403: "Check device permissions and try again.",
      LL_502: "Reconnect by scanning the QR code.",
    };

    return actions[code];
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(code: ErrorCode): boolean {
    const retryable = [
      "LL_101",
      "LL_102",
      "LL_103",
      "LL_104",
      "LL_105", // Connection errors
      "LL_303", // Rate limit
      "LL_402",
      "LL_405", // Delegation timeouts
      "LL_505", // Storage errors
    ];

    return retryable.includes(code);
  }

  /**
   * Execute recovery strategy based on error type
   */
  private async executeRecovery(error: LucaLinkError): Promise<void> {
    switch (error.code) {
      // Connection errors - handled by SecureSocket auto-reconnect
      case "LL_101":
      case "LL_102":
      case "LL_103":
      case "LL_104":
      case "LL_105":
        // Let SecureSocket handle reconnection
        break;

      case "LL_106":
        // Max reconnect - need manual intervention
        this.emit("reconnect:failed", error);
        break;

      // Security errors - disconnect and require re-pairing
      case "LL_201":
      case "LL_205":
      case "LL_206":
      case "LL_207":
        this.emit("security:breach", error);
        break;

      // Session errors - attempt recovery
      case "LL_501":
      case "LL_502":
        this.emit("session:invalid", error);
        break;

      // Protocol errors - log and continue
      case "LL_301":
      case "LL_304":
      case "LL_305":
        // Just log, usually transient
        break;

      // Rate limit - backoff
      case "LL_303":
        this.emit("rate:limited", error);
        break;

      // Delegation errors - notify caller
      case "LL_401":
      case "LL_402":
      case "LL_403":
      case "LL_404":
      case "LL_405":
        this.emit("delegation:failed", error);
        break;
    }
  }

  /**
   * Check if user should be notified
   */
  private shouldNotifyUser(error: LucaLinkError): boolean {
    // Critical errors always notify
    if (error.severity === ErrorSeverity.CRITICAL) return true;

    // Errors that need user action
    const notifyForCodes: ErrorCode[] = [
      "LL_106", // Max reconnect
      "LL_204", // Token expired
      "LL_205", // Unauthorized
      "LL_303", // Rate limit
      "LL_403", // Permission denied
      "LL_502", // Session expired
    ];

    return notifyForCodes.includes(error.code as ErrorCode);
  }

  /**
   * Show user notification (to be implemented by UI layer)
   */
  private notifyUser(error: LucaLinkError): void {
    this.emit("notify:user", error);
  }

  /**
   * Log error to history
   */
  private logError(error: LucaLinkError): void {
    this.errorLog.unshift(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(count?: number): LucaLinkError[] {
    return count ? this.errorLog.slice(0, count) : [...this.errorLog];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<string, number>;
    recentErrors: number; // Last hour
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.INFO]: 0,
      [ErrorSeverity.WARNING]: 0,
      [ErrorSeverity.ERROR]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const byCode: Record<string, number> = {};
    let recentErrors = 0;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const error of this.errorLog) {
      bySeverity[error.severity]++;
      byCode[error.code] = (byCode[error.code] || 0) + 1;

      if (error.timestamp.getTime() > oneHourAgo) {
        recentErrors++;
      }
    }

    return {
      total: this.errorLog.length,
      bySeverity,
      byCode,
      recentErrors,
    };
  }

  /**
   * Export diagnostics for debugging
   */
  exportDiagnostics(): {
    timestamp: string;
    errorLog: LucaLinkError[];
    stats: ReturnType<ErrorHandler["getErrorStats"]>;
    systemInfo: {
      userAgent: string;
      platform: string;
      language: string;
    };
  } {
    return {
      timestamp: new Date().toISOString(),
      errorLog: this.getErrorHistory(50), // Last 50 errors
      stats: this.getErrorStats(),
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorLog = [];
  }

  /**
   * Subscribe to error events
   */
  on(event: string, handler: (error: LucaLinkError) => void): void {
    if (!this.errorHandlers.has(event)) {
      this.errorHandlers.set(event, new Set());
    }
    this.errorHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from error events
   */
  off(event: string, handler: (error: LucaLinkError) => void): void {
    this.errorHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit error event
   */
  private emit(event: string, error: LucaLinkError): void {
    const handlers = this.errorHandlers.get(event);
    if (!handlers) return;

    handlers.forEach((handler: (error: LucaLinkError) => void) => {
      try {
        handler(error);
      } catch (e) {
        console.error(`[ErrorHandler] Handler error for ${event}:`, e);
      }
    });
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
