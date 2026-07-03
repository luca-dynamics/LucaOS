import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings } from "../../services/settingsService";
import { apiUrl, WS_PORT, cortexUrl } from "../../config/api";
import { useMobile } from "../../hooks/useMobile";
import { lucaLinkManager } from "../../services/lucaLink/manager";
import type {
  LucaLinkDevice,
  LucaLinkState,
} from "../../services/lucaLink/manager";
import type {
  LucaLinkDeviceTrustAuditRecord,
  LucaLinkDeviceTrustRegistrySummary,
  LucaLinkDeviceTrustLevel,
  LucaLinkTrustedDeviceRecord,
} from "../../services/lucaLink/lucaLinkDeviceTrustRegistry";
import type {
  LucaLinkApprovalRequest,
  LucaLinkApprovalQueueSummary,
  LucaLinkApprovalRisk,
} from "../../services/lucaLink/lucaLinkApprovalQueue";
import type {
  LucaLinkContinuationRegistrySummary,
  LucaLinkContinuationToken,
} from "../../services/lucaLink/lucaLinkContinuation";
import type {
  LucaLinkHandoffRegistrySummary,
  LucaLinkHandoffRequest,
} from "../../services/lucaLink/lucaLinkHandoff";
import type {
  LucaLinkRuntimeObservation,
  LucaLinkRuntimeObservationSummary,
} from "../../services/lucaLink/lucaLinkRuntimeObserver";
import type {
  LucaLinkHostConnectionRecord,
  LucaLinkHostConnectionRegistrySummary,
} from "../../services/lucaLink/lucaLinkHostConnectionModel";
import type {
  LucaLinkApprovalSurfaceRecord,
  LucaLinkApprovalSurfaceSummary,
} from "../../services/lucaLink/lucaLinkMultiHostApproval";
import type {
  LucaLinkBridgeReviewRecord,
  LucaLinkBridgeReviewSummary,
} from "../../services/lucaLink/lucaLinkBridgeReview";
import type { LucaLinkEmbodiedCapabilityEnvelope } from "../../services/lucaLink/lucaLinkEmbodiedHostPolicy";
import {
  createLucaLinkLinkedHostRecord,
  getLucaLinkConnectionStateMetadata,
  getLucaLinkDeviceCenterDisclosure,
  getLucaLinkDeviceTypeLabel,
  getLucaLinkTrustStateMetadata,
} from "../../services/lucaLink/lucaLinkLinkedHostRegistry";
import type { LucaLinkLinkedHostRecord } from "../../services/lucaLink/lucaLinkLinkedHostRegistry";
import {
  canUsePermission,
  getLucaLinkGovernanceDecisionLabel,
} from "../../services/lucaLink/governance";
import type {
  LucaLinkAdapterDraft,
  LucaLinkAdapterDraftSummary,
} from "../../services/lucaLink/lucaLinkAdapterDrafts";
import type {
  LucaLinkGuestSessionRecord,
  LucaLinkGuestSessionSummary,
} from "../../services/lucaLink/lucaLinkGuestSessionPolicy";
import {
  DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG,
  LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN,
} from "../../services/lucaLink/adapters";
import {
  LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS,
  LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT,
  LUCA_LINK_WEB_DISPLAY_SAMPLE_PREVIEW,
} from "../../services/lucaLink/display";
import {
  LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION,
  LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION_INBOX,
  summarizeApprovalNotificationInbox,
} from "../../services/lucaLink/approvalNotifications";
import {
  createLucaLinkApprovalDisclosureSummary,
  LUCA_LINK_APPROVAL_ACTION_APPROVALS,
  LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS,
  LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES,
  LUCA_LINK_APPROVAL_ACTION_OWNERSHIP_ASSIGNMENTS,
  LUCA_LINK_APPROVAL_ACTION_PENDING_HANDOFFS,
  previewLucaLinkApprovalAction,
} from "../../services/lucaLink/approvalActions";
import {
  createLucaLinkPairingDeviceCenterSummary,
  createLucaLinkPairingDisclosureSummary,
  evaluateLucaLinkPairingRequest,
  LUCA_LINK_PAIRING_FIXTURE_NOW,
  LUCA_LINK_PAIRING_REQUEST_FIXTURES,
  previewLucaLinkPairingApproval,
  previewLucaLinkPairingDenial,
} from "../../services/lucaLink/pairingRequests";
import { qrScanner } from "../../services/qrScannerService";
import { setHexAlpha } from "../../config/themeColors";
import QRCode from "qrcode";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import { SettingsLucaLinkSensorBridge } from "./SettingsLucaLinkSensorBridge";
import { SettingsLucaLinkTransportPermissions } from "./SettingsLucaLinkTransportPermissions";
import { SettingsLucaLinkAdapterFileInstallPermissions } from "./SettingsLucaLinkAdapterFileInstallPermissions";
import { SettingsLucaLinkDryRunHandoff } from "./SettingsLucaLinkDryRunHandoff";
import { SettingsLucaLinkRuntimeAuthority } from "./SettingsLucaLinkRuntimeAuthority";

// Device Center source-level safety copy anchors for tests:
// Admin does not bypass Primary Host approvals
// Memory handoff is intent-only; raw memory databases are not transferred.
// Conversation handoff excludes hidden system prompts and private reasoning.
// Secrets are redacted before handoff.
// Handoff does not execute tools or mutate remote devices.
// Payload preview only
// No send-now action is exposed in this PR
// Host adaptation intelligence is model-only.
// generated adapters are not executed in this PR
// Primary Host approval, sandbox checks, and future execution controls
// Guest security sessions are read-only.
// This view does not revoke guests, regenerate invites, or change guest auth, PIN, or WebRTC behavior.
// Pairing request previews are model-only: no real QR scanning, pairing code verification, network discovery, transport, trust persistence, or linked-host writes.

// Guest Access Section (Long Distance via Relay)
const GuestAccessSection: React.FC<{
  theme: {
    primary: string;
    hex: string;
    themeName?: string;
    isLight?: boolean;
  };
  connected: boolean;
}> = ({ theme, connected }) => {
  const [guestUrl, setGuestUrl] = useState<string | null>(null);
  const [guestQR, setGuestQR] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Security Modal State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [securityMessage, setSecurityMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [checkingSecurity, setCheckingSecurity] = useState(false);

  // Check initial security state when modal opens
  useEffect(() => {
    if (showSecurityModal) {
      setCheckingSecurity(true);
      fetch(cortexUrl("/api/remote-access/info"))
        .then((r) => r.json())
        .then((data) => {
          setPinEnabled(data.pinRequired ?? false);
        })
        .catch(() => {})
        .finally(() => setCheckingSecurity(false));
    }
  }, [showSecurityModal]);

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      setSecurityMessage({ type: "error", text: "PIN must be 4-6 digits" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(cortexUrl("/api/remote-access/set-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: newPin,
          currentPin: pinEnabled ? currentPin : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPinEnabled(true);
        setNewPin("");
        setCurrentPin("");
        return true;
      } else {
        setSecurityMessage({ type: "error", text: data.error });
        return false;
      }
    } catch {
      setSecurityMessage({ type: "error", text: "Failed to set PIN" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleClearPin = async () => {
    if (!currentPin) {
      setSecurityMessage({ type: "error", text: "Enter current PIN to clear" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(cortexUrl("/api/remote-access/clear-pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin }),
      });
      const data = await res.json();
      if (data.success) {
        setPinEnabled(false);
        setCurrentPin("");
        return true;
      } else {
        setSecurityMessage({ type: "error", text: data.error });
        return false;
      }
    } catch {
      setSecurityMessage({ type: "error", text: "Failed to clear PIN" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateGuestAccess = async () => {
    if (!connected) return;

    // Show security modal first
    setShowSecurityModal(true);
  };

  const finalizeGeneration = async () => {
    setLoading(true);
    try {
      const session = await lucaLinkManager.console.generateGuestSession();
      if (session) {
        setGuestUrl(session.guestUrl);

        // Generate QR code
        const qr = await QRCode.toDataURL(session.guestUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: "var(--app-text-main)",
            light: "#00000000",
          },
        });
        setGuestQR(qr);
        setShowSecurityModal(false); // Close modal
      }
    } catch (e) {
      console.error("[GuestAccess] Failed to generate:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (guestUrl) {
      navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-xl p-4 text-center space-y-3 mt-4 border transition-all shadow-sm`}
      style={{
        backgroundColor: settingsSurfaceTokens.glass,
        borderColor: settingsSurfaceTokens.borderSubtle,
      }}
    >
      <div className="flex items-center justify-center gap-2 text-base font-semibold text-[var(--app-text-main)]">
        <Icon name="Globus" variant="BoldDuotone" className="w-4 h-4" />
        Remote access
      </div>

      <p className={`text-xs text-[var(--app-text-muted)] opacity-70`}>
        Create a time-limited remote link for trusted devices or guests over the
        internet.
      </p>

      {!guestUrl ? (
        <button
          onClick={generateGuestAccess}
          disabled={!connected || loading}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 border hover:bg-[var(--luca-surface-glass)] opacity-80 hover:opacity-100`}
          style={settingsControlInlineStyle}
        >
          {loading ? "Generating..." : "Generate secure link"}
        </button>
      ) : (
        <>
          {/* QR Code */}
          {guestQR && (
            <div className="flex justify-center">
              <div
                className={`p-3 rounded-lg bg-[var(--app-bg-tint)] border border-[var(--app-border-main)]`}
              >
                <img
                  src={guestQR}
                  alt="Guest Access QR"
                  className="w-36 h-36"
                />
              </div>
            </div>
          )}

          {/* URL Display */}
          <div className="space-y-1">
            <p className="text-xs text-[var(--app-text-muted)] font-bold">
              Share this secure URL:
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="px-3 py-1 rounded text-sm font-mono max-w-[200px] truncate border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-main)]">
                {guestUrl}
              </code>
              <button
                onClick={copyUrl}
                className="p-1 rounded hover:bg-[var(--luca-surface-hover)] transition-colors"
                title="Copy URL"
              >
                <Icon
                  name="Copy"
                  className="w-4 h-4"
                  style={{
                    color: copied
                      ? settingsSurfaceTokens.accentPrimary
                      : "var(--app-text-main)",
                  }}
                />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-[var(--luca-accent-primary,var(--app-core-hex))] font-bold">
                Copied!
              </p>
            )}
          </div>

          <p className="text-xs italic text-[var(--app-text-muted)] opacity-60">
            Valid for 24 hours • Share only with trusted people
          </p>
        </>
      )}

      {!connected && (
        <p className="text-xs text-[var(--luca-text-secondary,var(--app-text-muted))] font-bold italics opacity-80">
          Enable Luca Link first to generate secure guest access
        </p>
      )}

      {/* SECURITY MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`border rounded-xl p-6 transition-all shadow-2xl max-w-sm w-full flex flex-col gap-4`}
            style={{
              backgroundColor: settingsSurfaceTokens.glass,
              borderColor: settingsSurfaceTokens.borderSubtle,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: setHexAlpha(theme.hex, 0.12) }}
              >
                <Icon
                  name="Shield"
                  variant="BoldDuotone"
                  className="w-5 h-5"
                  style={{ color: theme.hex }}
                />
              </div>
              <div className="text-left">
                <h3
                  className={`font-semibold text-sm text-[var(--app-text-main)]`}
                >
                  Link security
                </h3>
                <p
                  className={`text-xs text-[var(--app-text-muted)] opacity-70`}
                >
                  Protect this public link
                </p>
              </div>
            </div>

            {checkingSecurity ? (
              <div className="text-lg py-4 text-[var(--app-text-muted)] text-sm">
                Checking security status...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Card */}
                <div
                  className="p-3 rounded-lg flex items-center gap-3"
                  style={{
                    backgroundColor: pinEnabled
                      ? theme.themeName?.toLowerCase() === "lucagent"
                        ? "rgba(74, 222, 128, 0.05)"
                        : "rgba(74, 222, 128, 0.1)"
                      : theme.themeName?.toLowerCase() === "lucagent"
                        ? "rgba(248, 113, 113, 0.05)"
                        : "rgba(248, 113, 113, 0.1)",
                    border: `1px solid ${
                      pinEnabled
                        ? theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(74, 222, 128, 0.2)"
                          : "rgba(74, 222, 128, 0.25)"
                        : theme.themeName?.toLowerCase() === "lucagent"
                          ? "rgba(248, 113, 113, 0.2)"
                          : "rgba(248, 113, 113, 0.25)"
                    }`,
                  }}
                >
                  {pinEnabled ? (
                    <Icon
                      name="Lock"
                      variant="BoldDuotone"
                      className="w-4 h-4 text-[var(--luca-accent-primary,var(--app-core-hex))]"
                    />
                  ) : (
                    <Icon
                      name="LockOpen"
                      variant="BoldDuotone"
                      className="w-4 h-4 text-[var(--luca-danger,#f87171)]"
                    />
                  )}
                  <div className="text-left">
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: pinEnabled ? "#4ade80" : "#f87171",
                      }}
                    >
                      {pinEnabled
                        ? "PIN protection active"
                        : "No PIN protection"}
                    </div>
                    <div className="text-base text-[var(--app-text-muted)]">
                      {pinEnabled
                        ? "Guests must enter PIN to access"
                        : "Anyone with the link can access"}
                    </div>
                  </div>
                </div>

                {/* PIN Interactions */}
                {pinEnabled ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--app-text-muted)] text-left">
                      To keep protection, just Continue. To remove it, verify
                      PIN.
                    </p>
                    <input
                      type="password"
                      placeholder="Current PIN to Remove (Optional)"
                      value={currentPin}
                      onChange={(e) =>
                        setCurrentPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-[var(--app-bg-tint)] border-[var(--luca-border-strong)] shadow-sm text-[var(--app-text-muted)]" : "bg-[var(--luca-surface-solid)] border-[var(--luca-border-subtle)] text-[var(--app-text-main)]"} rounded-lg p-2 outline-none font-mono text-sm border transition-all`}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--app-text-muted)] text-left">
                      Set a PIN (Recommended):
                    </p>
                    <input
                      type="password"
                      placeholder="Enter 4-6 digit PIN"
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-[var(--app-bg-tint)] border-[var(--luca-border-strong)] shadow-sm text-[var(--app-text-muted)]" : "bg-[var(--luca-surface-solid)] border-[var(--luca-border-subtle)] text-[var(--app-text-main)]"} rounded-lg p-2 outline-none font-mono text-base border transition-all`}
                    />
                  </div>
                )}

                {/* Error/Success Message */}
                {securityMessage && (
                  <div
                    className={`text-sm p-2 rounded border`}
                    style={{
                      backgroundColor: settingsSurfaceTokens.glass,
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      color: settingsSurfaceTokens.textPrimary,
                    }}
                  >
                    {securityMessage.text}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowSecurityModal(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold text-[var(--app-text-muted)] hover:bg-[var(--luca-surface-glass)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (pinEnabled) {
                        // If pin is enabled and they entered a current pin, it means they want to Disable it
                        if (currentPin) {
                          const result = await handleClearPin();
                          if (result) finalizeGeneration(); // Generate (Unprotected)
                        } else {
                          // If they left it empty, they want to KEEP it
                          finalizeGeneration(); // Generate (Protected)
                        }
                      } else {
                        // If pin is disable
                        if (newPin) {
                          // They want to set one
                          const result = await handleSetPin();
                          if (result) finalizeGeneration(); // Generate (Protected)
                        } else {
                          // They skipped setting one
                          finalizeGeneration(); // Generate (Unprotected)
                        }
                      }
                    }}
                    disabled={loading}
                    className="flex-[2] py-2 rounded-lg text-sm font-semibold text-[var(--app-text-main)] transition-all shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${theme.hex}, ${theme.hex}aa)`,
                    }}
                  >
                    {loading
                      ? "Processing..."
                      : pinEnabled
                        ? currentPin
                          ? "Remove & Generate"
                          : "Keep & Generate"
                        : newPin
                          ? "Set & Generate"
                          : "Generate unprotected"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SettingsLucaLinkTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    hex: string;
    primary: string;
    border: string;
    bg: string;
    themeName?: string;
    isLight?: boolean;
  };
  connectionMode?: "local" | "vpn" | "relay" | "disconnected";
  isMobile?: boolean;
}

type LucaLinkDeviceCenterTab =
  | "devices"
  | "hosts"
  | "approvals"
  | "guests"
  | "sync"
  | "bridge-review"
  | "advanced";

interface LucaLinkDeviceCenterSnapshot {
  state: LucaLinkState;
  pendingApprovals: LucaLinkApprovalRequest[];
  approvalRequests: LucaLinkApprovalRequest[];
  approvalSummary: LucaLinkApprovalQueueSummary;
  continuationTokens: LucaLinkContinuationToken[];
  validContinuationTokens: LucaLinkContinuationToken[];
  continuationSummary: LucaLinkContinuationRegistrySummary;
  handoffs: LucaLinkHandoffRequest[];
  pendingHandoffs: LucaLinkHandoffRequest[];
  handoffSummary: LucaLinkHandoffRegistrySummary;
  runtimeShadowSummary: LucaLinkRuntimeObservationSummary;
  runtimeShadowObservations: LucaLinkRuntimeObservation[];
  softEnforcementMode: ReturnType<typeof lucaLinkManager.console.getSoftEnforcementMode>;
  trustedDevices: LucaLinkTrustedDeviceRecord[];
  activeTrustedDevices: LucaLinkTrustedDeviceRecord[];
  deviceTrustSummary: LucaLinkDeviceTrustRegistrySummary;
  deviceTrustAudit: LucaLinkDeviceTrustAuditRecord[];
  guestSecuritySessions: LucaLinkGuestSessionRecord[];
  guestSecuritySummary: LucaLinkGuestSessionSummary;
  hostConnections: LucaLinkHostConnectionRecord[];
  hostConnectionSummary: LucaLinkHostConnectionRegistrySummary;
  approvalSurfaces: LucaLinkApprovalSurfaceRecord[];
  approvalSurfaceSummary: LucaLinkApprovalSurfaceSummary;
  bridgeReviews: LucaLinkBridgeReviewRecord[];
  bridgeReviewSummary: LucaLinkBridgeReviewSummary;
  embodiedCapabilityEnvelopes: LucaLinkEmbodiedCapabilityEnvelope[];
  adapterDrafts: LucaLinkAdapterDraft[];
  adapterDraftSummary: LucaLinkAdapterDraftSummary;
}

const lucaLinkDeviceCenterTabs: Array<{
  id: LucaLinkDeviceCenterTab;
  label: string;
}> = [
  { id: "devices", label: "Devices" },
  { id: "hosts", label: "Hosts" },
  { id: "approvals", label: "Approvals" },
  { id: "guests", label: "Guests" },
  { id: "sync", label: "Sync" },
  { id: "bridge-review", label: "Bridge Review" },
  { id: "advanced", label: "Advanced" },
];

function readLucaLinkDeviceCenterSnapshot(): LucaLinkDeviceCenterSnapshot {
  return {
    state: lucaLinkManager.console.getState(),
    pendingApprovals: lucaLinkManager.console.getPendingApprovalRequests(),
    approvalRequests: lucaLinkManager.console.getApprovalRequests(),
    approvalSummary: lucaLinkManager.console.getApprovalQueueSummary(),
    continuationTokens: lucaLinkManager.console.getContinuationTokens(),
    validContinuationTokens: lucaLinkManager.console.getValidContinuationTokens(),
    continuationSummary: lucaLinkManager.console.getContinuationRegistrySummary(),
    handoffs: lucaLinkManager.console.getHandoffs(),
    pendingHandoffs: lucaLinkManager.console.getPendingHandoffs(),
    handoffSummary: lucaLinkManager.console.getHandoffSummary(),
    runtimeShadowSummary: lucaLinkManager.console.getRuntimeShadowSummary(),
    runtimeShadowObservations: lucaLinkManager.console.getRuntimeShadowObservations(),
    softEnforcementMode: lucaLinkManager.console.getSoftEnforcementMode(),
    trustedDevices: lucaLinkManager.console.getTrustedDevices(),
    activeTrustedDevices: lucaLinkManager.console.getActiveTrustedDevices(),
    deviceTrustSummary: lucaLinkManager.console.getDeviceTrustSummary(),
    deviceTrustAudit: lucaLinkManager.console.getDeviceTrustAudit(),
    guestSecuritySessions: lucaLinkManager.console.getGuestSecuritySessions(),
    guestSecuritySummary: lucaLinkManager.console.getGuestSecuritySummary(),
    hostConnections: lucaLinkManager.console.getFreshHostConnections(),
    hostConnectionSummary: lucaLinkManager.console.getFreshHostConnectionSummary(),
    approvalSurfaces: lucaLinkManager.console.getApprovalSurfaces(),
    approvalSurfaceSummary: lucaLinkManager.console.getApprovalSurfaceSummary(),
    bridgeReviews: lucaLinkManager.console.getBridgeReviews(),
    bridgeReviewSummary: lucaLinkManager.console.getBridgeReviewSummary(),
    embodiedCapabilityEnvelopes: lucaLinkManager.console.getEmbodiedHostCapabilityEnvelopes(),
    adapterDrafts: lucaLinkManager.console.getAdapterDrafts(),
    adapterDraftSummary: lucaLinkManager.console.getAdapterDraftSummary(),
  };
}

export function formatLucaLinkTimestamp(value?: number): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export function getLucaLinkSecurityModeLabel(
  mode: ReturnType<typeof lucaLinkManager.console.getSoftEnforcementMode>,
): string {
  if (mode === "high-risk-only") return "High-risk gates active";
  if (mode === "observe-only") return "Observe-only";
  return "Disabled";
}

export function inferLucaLinkDeviceRole(
  device: Pick<LucaLinkDevice, "deviceId" | "type">,
  currentDeviceId?: string | null,
):
  | "Primary Host"
  | "Companion"
  | "Execution"
  | "Guest"
  | "Sensor"
  | "Display"
  | "Embodied" {
  const normalizedType = (device.type ?? "").toLowerCase();
  if (currentDeviceId && device.deviceId === currentDeviceId)
    return "Primary Host";
  if (
    normalizedType.includes("mobile") ||
    normalizedType.includes("phone") ||
    normalizedType.includes("tablet")
  )
    return "Companion";
  if (
    normalizedType.includes("guest") ||
    normalizedType.includes("browser") ||
    normalizedType.includes("web")
  )
    return "Guest";
  if (
    normalizedType.includes("tv") ||
    normalizedType.includes("display") ||
    normalizedType.includes("projector")
  )
    return "Display";
  if (
    normalizedType.includes("sensor") ||
    normalizedType.includes("camera") ||
    normalizedType.includes("watch") ||
    normalizedType.includes("iot")
  )
    return "Sensor";
  if (
    normalizedType.includes("robot") ||
    normalizedType.includes("humanoid") ||
    normalizedType.includes("drone")
  )
    return "Embodied";
  return "Execution";
}

function renderPayloadPreview(payloadPreview: unknown): string {
  if (typeof payloadPreview === "undefined")
    return "No payload preview provided.";
  try {
    return JSON.stringify(payloadPreview, null, 2);
  } catch {
    return String(payloadPreview);
  }
}

const continuationReplayModeLabels: Record<string, string> = {
  "non-replayable": "non-replayable",
  "manual-retry-only": "manual retry only",
  "single-use-replayable": "single-use replayable",
  "fresh-confirmation-required": "fresh confirmation required",
};

const RiskBadge: React.FC<{ risk?: LucaLinkApprovalRisk }> = ({ risk }) => (
  <span
    className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
    style={{
      borderColor: settingsSurfaceTokens.borderSubtle,
      color: settingsSurfaceTokens.textPrimary,
      backgroundColor: settingsSurfaceTokens.glass,
    }}
  >
    Risk: {risk ?? "not rated"}
  </span>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
    style={{
      borderColor: settingsSurfaceTokens.borderSubtle,
      color: settingsSurfaceTokens.textSecondary,
      backgroundColor: settingsSurfaceTokens.elevated,
    }}
  >
    Status: {status}
  </span>
);

const DetailField: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div
    className="rounded-lg border p-3"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
  >
    <p
      className="text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: settingsSurfaceTokens.textTertiary }}
    >
      {label}
    </p>
    <div
      className="mt-1 break-words text-sm"
      style={{ color: settingsSurfaceTokens.textPrimary }}
    >
      {value || "Not available"}
    </div>
  </div>
);

const SettingsLucaLinkTab: React.FC<SettingsLucaLinkTabProps> = ({
  settings,
  onUpdate,
  theme,
  connectionMode = "disconnected",
  isMobile: isMobileProp,
}) => {
  const isMobile = isMobileProp ?? useMobile();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LucaLinkState>(
    lucaLinkManager.console.getState(),
  );
  const [deviceCenterTab, setDeviceCenterTab] =
    useState<LucaLinkDeviceCenterTab>("devices");
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(
    null,
  );
  const [approvalActionMessage, setApprovalActionMessage] = useState<
    string | null
  >(null);
  const [continuationActionMessage, setContinuationActionMessage] = useState<
    string | null
  >(null);
  const [handoffActionMessage, setHandoffActionMessage] = useState<
    string | null
  >(null);
  const [deviceTrustActionMessage, setDeviceTrustActionMessage] = useState<
    string | null
  >(null);
  const [deviceCenterSnapshot, setDeviceCenterSnapshot] =
    useState<LucaLinkDeviceCenterSnapshot>(readLucaLinkDeviceCenterSnapshot());
  const [copied, setCopied] = useState(false);

  const refreshDeviceCenter = () => {
    const snapshot = readLucaLinkDeviceCenterSnapshot();
    setDeviceCenterSnapshot(snapshot);
    setLinkState(snapshot.state);
    if (
      selectedApprovalId &&
      !snapshot.approvalRequests.some(
        (request) => request.id === selectedApprovalId,
      )
    ) {
      setSelectedApprovalId(null);
    }
  };

  // Subscribe to Luca Link state changes
  useEffect(() => {
    refreshDeviceCenter();
    const unsubscribe = lucaLinkManager.console.onStateChange((state) => {
      setLinkState(state);
      setDeviceCenterSnapshot((snapshot) => ({ ...snapshot, state }));
    });
    return () => unsubscribe();
  }, []);

  // Auto-start room if enabled but missing token (e.g. on page refresh)
  useEffect(() => {
    if (
      settings.lucaLink.enabled &&
      !isMobile &&
      !linkState.pairingToken &&
      !linkState.connected
    ) {
      console.log("[Settings] Remote enabled but no token - Creating room...");
      lucaLinkManager.console
        .createRoom()
        .catch((e) => console.error("[Settings] Auto-create room failed:", e));
    }
  }, [settings.lucaLink.enabled, linkState.pairingToken, linkState.connected]);

  // Generate QR code when room is created
  useEffect(() => {
    const generateQR = async () => {
      const pairingUrl = await lucaLinkManager.console.getPairingUrl();
      if (pairingUrl) {
        try {
          const qr = await QRCode.toDataURL(pairingUrl, {
            width: 200,
            margin: 2,
            color: {
              dark:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "#000000"
                  : "#ffffff",
              light: "#00000000",
            },
          });
          setQrCodeUrl(qr);
        } catch (e) {
          console.error("[LucaLink] QR generation failed:", e);
        }
      } else {
        setQrCodeUrl(null);
      }
    };
    generateQR();
  }, [linkState.pairingToken]);

  // Copy pairing token to clipboard
  const copyRoomId = () => {
    if (linkState.pairingToken) {
      navigator.clipboard.writeText(linkState.pairingToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const getConnectionIcon = () => {
    switch (connectionMode) {
      case "local":
        return (
          <Icon
            name="Wifi"
            className="w-4 h-4 text-[var(--luca-accent-primary,var(--app-core-hex))]"
          />
        );
      case "vpn":
        return (
          <Icon
            name="Shield"
            className="w-4 h-4"
            style={{ color: theme.hex }}
          />
        );
      case "relay":
        return (
          <Icon
            name="Globus"
            className="w-4 h-4"
            style={{ color: theme.hex }}
          />
        );
      default:
        return (
          <Icon
            name="WifiLow"
            className="w-4 h-4 text-[var(--app-text-muted)]"
          />
        );
    }
  };

  const getConnectionStatus = () => {
    switch (connectionMode) {
      case "local":
        return {
          text: "Connected (Local Network)",
          color: "text-[var(--luca-accent-primary,var(--app-core-hex))]",
        };
      case "vpn":
        return {
          text: "Connected (VPN)",
          color: "",
          style: { color: theme.hex },
        };
      case "relay":
        return {
          text: "Connected (Cloud Relay)",
          color: "",
          style: { color: theme.hex },
        };
      default:
        return { text: "Disconnected", color: "text-[var(--app-text-muted)]" };
    }
  };

  const status = getConnectionStatus();
  const currentDeviceId =
    deviceCenterSnapshot.state.deviceId ?? linkState.deviceId ?? undefined;
  const connectedDevices = deviceCenterSnapshot.state.connectedDevices;
  const trustedDevices: LucaLinkTrustedDeviceRecord[] =
    deviceCenterSnapshot.trustedDevices.length > 0
      ? deviceCenterSnapshot.trustedDevices
      : connectedDevices.map((device) => ({
          deviceId: device.deviceId,
          displayName: device.name || "Unnamed LucaLink device",
          deviceType: device.type,
          role: inferLucaLinkDeviceRole(device, currentDeviceId)
            .toLowerCase()
            .replace(" ", "-") as LucaLinkTrustedDeviceRecord["role"],
          trustLevel: "paired" as const,
          status: "connected" as const,
          createdAt: device.lastSeen || Date.now(),
          updatedAt: device.lastSeen || Date.now(),
          lastSeenAt: device.lastSeen,
          capabilities: [],
          deniedCapabilities: [
            "shell.execute",
            "files.write",
            "code.modify",
            "browser.control",
            "payment.spend",
            "physical-world.action",
          ],
          permissionSummary: {
            conversation: true,
            notification: true,
            memory: false,
            tools: false,
            files: false,
            code: false,
            browser: false,
            shell: false,
            payment: false,
            physicalWorld: false,
            safety: true,
          },
          warnings: [],
          errors: [],
        }));
  const linkedHosts = trustedDevices.map((device) =>
    createLucaLinkLinkedHostRecord(device, currentDeviceId),
  );
  const linkedHostsById = new Map<string, LucaLinkLinkedHostRecord>(
    linkedHosts.map((host) => [host.id, host] as const),
  );
  const linkedHostGovernanceById = new Map(
    linkedHosts.map((host) => [
      host.id,
      new Map(
        host.permissionProfile.permissions.map((permission) => [
          permission.id,
          canUsePermission({
            permission: permission.id,
            trustState: host.trustState,
            permissionState: permission.state,
            approvalState:
              permission.state === "allowed"
                ? "approved"
                : permission.state === "denied"
                  ? "denied"
                  : "pending",
            connectionState: host.connectionState,
          }),
        ]),
      ),
    ]),
  );
  const deviceCenterDisclosure = getLucaLinkDeviceCenterDisclosure(
    settings.general.experienceMode,
  );
  const pendingHighOrCritical =
    (deviceCenterSnapshot.approvalSummary.byRisk.high ?? 0) +
    (deviceCenterSnapshot.approvalSummary.byRisk.critical ?? 0);
  const selectedApproval =
    deviceCenterSnapshot.approvalRequests.find(
      (request) => request.id === selectedApprovalId,
    ) ??
    deviceCenterSnapshot.pendingApprovals[0] ??
    deviceCenterSnapshot.approvalRequests[0];
  const selectedApprovalContinuation = selectedApproval
    ? deviceCenterSnapshot.continuationTokens.find(
        (token) => token.requestId === selectedApproval.id,
      )
    : undefined;
  const localApprovalActionRevocationInput = {
    ownershipAssignments: LUCA_LINK_APPROVAL_ACTION_OWNERSHIP_ASSIGNMENTS,
    pendingHandoffs: LUCA_LINK_APPROVAL_ACTION_PENDING_HANDOFFS,
    approvals: LUCA_LINK_APPROVAL_ACTION_APPROVALS,
  };
  const localApprovalActionPreviews = {
    approve: previewLucaLinkApprovalAction({
      host: LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES.pendingMobileCompanion,
      action: "approve_host",
    }),
    deny: previewLucaLinkApprovalAction({
      host: LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES.pendingMobileCompanion,
      action: "deny_host",
    }),
    revoke: previewLucaLinkApprovalAction({
      host: LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: localApprovalActionRevocationInput,
    }),
    handoff: previewLucaLinkApprovalAction({
      host: LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES.displaySurface,
      action: "review_handoff",
      handoff: LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.primaryHostReviewRequired,
    }),
  };
  const localApprovalActionDisclosure = createLucaLinkApprovalDisclosureSummary(
    localApprovalActionPreviews.revoke,
    settings.general.experienceMode,
  );
  const pairingRequestPreview = evaluateLucaLinkPairingRequest({
    request: LUCA_LINK_PAIRING_REQUEST_FIXTURES.qrPreviewRequest,
    nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW,
  });
  const pairingApprovalPreview = previewLucaLinkPairingApproval({
    request: LUCA_LINK_PAIRING_REQUEST_FIXTURES.qrPreviewRequest,
    nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW,
  });
  const pairingDenialPreview = previewLucaLinkPairingDenial(
    LUCA_LINK_PAIRING_REQUEST_FIXTURES.qrPreviewRequest,
  );
  const pairingDeviceCenterSummary = createLucaLinkPairingDeviceCenterSummary(
    pairingRequestPreview,
  );
  const pairingDisclosure = createLucaLinkPairingDisclosureSummary(
    pairingRequestPreview,
    settings.general.experienceMode,
  );

  const handleApprovalAction = (
    request: LucaLinkApprovalRequest,
    action: "approve" | "deny" | "cancel",
  ) => {
    const reason = `${action} recorded from LucaLink Device Center; model record only, no runtime execution.`;
    if (action === "approve") {
      const approvalResult = lucaLinkManager.console.approveApprovalRequest(request.id, {
        decidedByDeviceId: currentDeviceId,
        reason,
      });
      if (approvalResult.request?.status === "approved") {
        const continuationResult =
          lucaLinkManager.console.createContinuationFromApprovalRequest(request.id);
        if (continuationResult.token && continuationResult.valid) {
          setApprovalActionMessage(
            "Approved. Continuation token created for manual validation. No action was executed.",
          );
        } else if (
          continuationResult.token?.replayMode ===
            "fresh-confirmation-required" ||
          continuationResult.token?.status === "blocked"
        ) {
          setApprovalActionMessage(
            "Approved. Continuation recorded, but this action requires fresh confirmation and cannot be replayed.",
          );
        } else {
          setApprovalActionMessage(
            "Approved. No continuation token was created.",
          );
        }
      } else {
        setApprovalActionMessage(
          "Approval request was not approved. No continuation token was created.",
        );
      }
    } else if (action === "deny") {
      lucaLinkManager.console.denyApprovalRequest(request.id, {
        decidedByDeviceId: currentDeviceId,
        reason,
      });
      setApprovalActionMessage(
        `${request.title} marked denied. Queue status updated only; no continuation token was created.`,
      );
    } else {
      lucaLinkManager.console.cancelApprovalRequest(request.id, {
        decidedByDeviceId: currentDeviceId,
        reason,
      });
      setApprovalActionMessage(
        `${request.title} marked cancelled. Queue status updated only; no continuation token was created.`,
      );
    }
    refreshDeviceCenter();
    setSelectedApprovalId(request.id);
  };

  const handleContinuationRecordAction = (
    token: LucaLinkContinuationToken,
    action: "validate" | "cancel" | "mark-consumed",
  ) => {
    if (action === "validate") {
      const validation = lucaLinkManager.console.validateContinuationToken(token.id);
      setContinuationActionMessage(
        validation.valid
          ? `${token.title} validated as a model record only. No runtime execution and no action replay occurred.`
          : `${token.title} is not valid for model continuation: ${validation.errors.concat(validation.warnings).join("; ") || "No additional details."}`,
      );
    } else if (action === "cancel") {
      lucaLinkManager.console.cancelContinuationToken(
        token.id,
        "Cancelled from LucaLink Device Center; state-only model record action.",
      );
      setContinuationActionMessage(
        `${token.title} cancelled as a continuation record only. No action replay occurred.`,
      );
    } else {
      lucaLinkManager.console.consumeContinuationToken(token.id, {
        consumedByDeviceId: currentDeviceId,
        reason:
          "Marked consumed from LucaLink Device Center; records state only and does not execute the action.",
      });
      setContinuationActionMessage(
        `${token.title} marked consumed. This only records state; it does not execute the action.`,
      );
    }
    refreshDeviceCenter();
  };

  const handleCreateSampleConversationHandoff = () => {
    const result = lucaLinkManager.console.createConversationHandoff({
      conversationTitle: "Sample conversation handoff",
      messageSummary:
        "A safe local sample handoff preview for Device Center visibility.",
      currentTask: "Review LucaLink handoff state in Device Center.",
      activeIntent:
        "Continue on a trusted LucaLink device after approval if required.",
      userVisibleContext: {
        source: "Device Center sample",
        rawPayloadVisible: false,
      },
      sourceDeviceId: currentDeviceId,
      requestedByDeviceId: currentDeviceId,
      reason:
        "Created locally from Device Center as a sample model-only handoff.",
    });
    setHandoffActionMessage(
      result.valid
        ? "Sample conversation handoff created locally. No payload was sent."
        : result.errors.concat(result.warnings).join(" ") ||
            "Sample handoff was not created.",
    );
    refreshDeviceCenter();
  };

  const handleHandoffAction = (
    handoff: LucaLinkHandoffRequest,
    action: "approve" | "decline" | "cancel" | "accept",
  ) => {
    const reason = `${action} recorded from LucaLink Device Center; state-only handoff action with no transport send.`;
    const result =
      action === "approve"
        ? lucaLinkManager.console.approveHandoff(handoff.id, {
            approvedByDeviceId: currentDeviceId,
            reason,
          })
        : action === "decline"
          ? lucaLinkManager.console.declineHandoff(handoff.id, { reason })
          : action === "cancel"
            ? lucaLinkManager.console.cancelHandoff(handoff.id, { reason })
            : lucaLinkManager.console.markHandoffAccepted(handoff.id, { reason });
    setHandoffActionMessage(
      result.valid
        ? `${handoff.title} marked ${action}. No handoff payload was sent.`
        : result.errors.concat(result.warnings).join(" ") ||
            "Handoff action was not applied.",
    );
    refreshDeviceCenter();
  };

  const handleDeviceTrustAction = (
    device: LucaLinkTrustedDeviceRecord,
    action: "rename" | "trust" | "revoke" | "block" | "unblock",
    nextTrustLevel?: LucaLinkDeviceTrustLevel,
  ) => {
    const options = {
      performedByDeviceId: currentDeviceId,
      currentPrimaryHostDeviceId: currentDeviceId,
      reason:
        "Changed from LucaLink Device Center; local-only trust registry update.",
    };
    const result =
      action === "rename"
        ? lucaLinkManager.console.renameTrustedDevice(
            device.deviceId,
            window.prompt("Rename LucaLink device", device.displayName) ??
              device.displayName,
            options,
          )
        : action === "trust"
          ? lucaLinkManager.console.setTrustedDeviceTrustLevel(
              device.deviceId,
              nextTrustLevel ?? device.trustLevel,
              options,
            )
          : action === "revoke"
            ? lucaLinkManager.console.revokeTrustedDevice(device.deviceId, options)
            : action === "block"
              ? lucaLinkManager.console.blockTrustedDevice(device.deviceId, options)
              : lucaLinkManager.console.unblockTrustedDevice(device.deviceId, options);
    setDeviceTrustActionMessage(
      result.valid
        ? `${device.displayName} updated locally. ${result.warnings.join(" ")}`.trim()
        : `${device.displayName} was not changed: ${result.errors.concat(result.warnings).join(" ")}`,
    );
    refreshDeviceCenter();
  };

  const handleCreateSampleBridgeReview = () => {
    lucaLinkManager.console.createBridgeReviewFromBlueprint({
      id: "device-center-web-display-sample",
      strategyKind: "web-display-bridge",
      title: "Sample Web Display Bridge",
      summary: "Device Center sample blueprint for display-only bridge review.",
      targetHostClass: "web-display-host",
      generatedProgramAllowed: false,
      requiresPrimaryHostApproval: true,
      requiresSandbox: false,
      requiresUserProvidedCredentials: false,
      allowedCapabilities: ["display-only", "model-preview"],
      deniedCapabilities: ["approval-authority", "execute", "install"],
      safetyBoundaries: ["model-only", "network-disabled", "no execution"],
      sandboxTestPlan: ["Static config review only"],
      approvalChecklist: ["Primary Host review path visible"],
      configSketch: { mode: "display-only", generatedTextOnly: true },
      risk: "low",
      warnings: [],
      errors: [],
    });
    refreshDeviceCenter();
  };

  const handleCreateSamplePythonDraft = () => {
    lucaLinkManager.console.createAdapterDraftFromBlueprint({
      id: "device-center-python-agent-sample",
      strategyKind: "python-host-agent",
      title: "Sample Python Host Agent Draft",
      summary: "Text-only Python pseudocode draft for future sandbox review.",
      targetHostClass: "execution-host",
      generatedProgramLanguage: "python",
      generatedProgramAllowed: false,
      requiresPrimaryHostApproval: true,
      requiresSandbox: true,
      requiresUserProvidedCredentials: true,
      allowedCapabilities: ["model-preview", "static-review"],
      deniedCapabilities: [
        "execute",
        "install",
        "write-to-disk",
        "network-disabled",
      ],
      safetyBoundaries: ["generatedTextOnly", "no execution"],
      sandboxTestPlan: ["Static checks only"],
      approvalChecklist: ["Primary Host approval before any future sandbox"],
      pseudoCode:
        "# Pseudocode preview only; no execution or install in PR #202",
      risk: "medium",
      warnings: [],
      errors: [],
    });
    refreshDeviceCenter();
  };

  const handleBridgeReviewAction = (
    review: LucaLinkBridgeReviewRecord,
    action: "approve" | "reject" | "cancel",
  ) => {
    if (action === "approve")
      lucaLinkManager.console.approveBridgeReviewForSandbox(review.id, {
        approvedByDeviceId: currentDeviceId ?? undefined,
      });
    else if (action === "reject")
      lucaLinkManager.console.rejectBridgeReview(review.id, {
        reason: "Rejected from Device Center; model-only state action.",
      });
    else
      lucaLinkManager.console.cancelBridgeReview(review.id, {
        reason: "Cancelled from Device Center; model-only state action.",
      });
    refreshDeviceCenter();
  };

  const handleCreateDraftFromReview = (review: LucaLinkBridgeReviewRecord) => {
    lucaLinkManager.console.createAdapterDraftFromBridgeReview(review.id);
    refreshDeviceCenter();
  };
  const handleCancelAdapterDraft = (draft: LucaLinkAdapterDraft) => {
    lucaLinkManager.console.cancelAdapterDraft(draft.id);
    refreshDeviceCenter();
  };
  const handleClearAdapterDrafts = () => {
    lucaLinkManager.console.clearAdapterDrafts();
    refreshDeviceCenter();
  };

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      <SettingsSection
        title="Personal Intelligence Handoff"
        description="Future bounded handoff preview requires PR #212; raw memory/private reasoning transfer remains forbidden."
        icon="ShieldWarning"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <p className="text-sm font-semibold">Future note only</p>
          <p className="mt-1 text-xs leading-relaxed opacity-70">
            No Personal Intelligence data is wired into LucaLink. Any future
            handoff must remain redacted, bounded, approval-gated, and
            preview-only before transfer.
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="LucaLink Device Center"
        description="Manage trusted devices, approval requests, guest sessions, and mesh security."
        icon="Devices"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <SettingsStatusCard
            label="Primary Host"
            value={currentDeviceId ? "This device" : "Not confirmed"}
            detail={
              currentDeviceId
                ? `Device ID: ${currentDeviceId}`
                : "Primary Host identity is not exposed yet."
            }
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Connected Devices"
            value={`${connectedDevices.length}`}
            detail={
              connectedDevices.length > 0
                ? `${connectedDevices.length} device record${connectedDevices.length === 1 ? "" : "s"} visible.`
                : "No connected devices exposed yet."
            }
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Pending Approvals"
            value={`${deviceCenterSnapshot.pendingApprovals.length}`}
            detail={
              pendingHighOrCritical > 0
                ? `${pendingHighOrCritical} high or critical request${pendingHighOrCritical === 1 ? "" : "s"}.`
                : "No high-risk pending requests."
            }
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Guest Sessions"
            value={`${deviceCenterSnapshot.guestSecuritySummary.total} tracked`}
            detail={`${deviceCenterSnapshot.guestSecuritySummary.active} active · ${deviceCenterSnapshot.guestSecuritySummary.authenticated} authenticated · ${deviceCenterSnapshot.guestSecuritySummary.expired} expired · ${deviceCenterSnapshot.guestSecuritySummary.disconnected} disconnected · ${deviceCenterSnapshot.guestSecuritySummary.deniedGuestInbound} denied · ${deviceCenterSnapshot.guestSecuritySummary.rateLimitedGuestInbound} rate-limited`}
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Security Mode"
            value={getLucaLinkSecurityModeLabel(
              deviceCenterSnapshot.softEnforcementMode,
            )}
            detail={`Soft enforcement: ${deviceCenterSnapshot.softEnforcementMode}`}
            accentColor={theme.hex}
          />
        </div>

        <div
          className="flex gap-2 overflow-x-auto rounded-2xl border p-2"
          role="tablist"
          aria-label="LucaLink Device Center sections"
          style={{
            borderColor: settingsSurfaceTokens.borderSubtle,
            backgroundColor: settingsSurfaceTokens.glass,
          }}
        >
          {lucaLinkDeviceCenterTabs.map((tab) => {
            const active = deviceCenterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDeviceCenterTab(tab.id)}
                className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active
                    ? settingsSurfaceTokens.elevated
                    : "transparent",
                  color: active
                    ? settingsSurfaceTokens.textPrimary
                    : settingsSurfaceTokens.textSecondary,
                  border: `1px solid ${active ? settingsSurfaceTokens.borderStrong : "transparent"}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <SettingsCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold">Pairing request</p>
              <p className="mt-1 text-xs leading-relaxed opacity-70">
                {pairingDisclosure.simpleStatus} · Preview only · No real pairing has started.
              </p>
            </div>
            <StatusBadge status="Preview only" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <DetailField label="Preview code" value={pairingDeviceCenterSummary.codePreview} />
            <DetailField label="Expires" value={pairingDeviceCenterSummary.expiresAt} />
            <DetailField label="Primary Host approval required" value={pairingDeviceCenterSummary.primaryHostReviewRequired ? "Required" : "Not required"} />
            <DetailField label="Limited trust" value={pairingDeviceCenterSummary.requestedTrustState} />
            <DetailField label="Sensitive access remains blocked" value={`${pairingRequestPreview.blockedPermissions.length} blocked · ${pairingRequestPreview.approvalRequiredPermissions.length} approval-required`} />
            <DetailField label="Approve / deny preview" value={`Approve: ${pairingApprovalPreview.status} · Deny: ${pairingDenialPreview.status}`} />
          </div>
          {settings.general.experienceMode !== "basic" && (
            <p className="mt-3 text-xs opacity-70">
              Method {pairingDisclosure.requestMethod} · device {pairingDisclosure.deviceType} · host {pairingDisclosure.hostType} · requested permissions {pairingDisclosure.requestedPermissionsCount} · expiration {pairingDisclosure.expirationState}.
            </p>
          )}
          {settings.general.experienceMode === "creator" && (
            <p className="mt-2 text-xs opacity-70">
              Request {pairingDisclosure.diagnosticRequestId} · source {pairingDisclosure.diagnosticSourceHostId} · target {pairingDisclosure.diagnosticTargetHostId} · QR payload preview is non-secret and runtime-disabled · {pairingDisclosure.modelFlags?.join(" · ")}.
            </p>
          )}
          <p className="mt-3 text-xs font-semibold opacity-80">
            No real pairing started. No QR scanner, network discovery, WebRTC, socket, transport, linked-host registry write, or persistent trust change is invoked here.
          </p>
        </SettingsCard>
      </SettingsSection>

      {deviceCenterTab === "bridge-review" && (
        <SettingsSection
          title="Bridge Review"
          description="Review bridge blueprints, embodied safety policy, and controlled adapter drafts as model-only records."
          icon="ShieldCheck"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <SettingsCard>
            {/* Approval is host-aware and risk-aware. */}
            {/* Mobile is one companion host type, not the only approval host. */}
            <p className="text-sm font-semibold">Multi-Host Approval Surface</p>
            <p className="mt-1 text-xs opacity-70">
              Approval is host-aware and risk-aware. Mobile is one companion
              host type, not the only approval host. Displays, guests, sensors,
              public surfaces, and embodied hosts cannot approve by default.
              Physical/payment/safety actions require fresh Primary Host
              confirmation.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Eligible approval surfaces"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.eligibleApprovalSurfaces}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Display-only surfaces"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.displayOnlySurfaces}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Low/medium approval"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.lowMediumRiskApprovalSurfaces}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Primary Host-only"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.primaryHostOnlySurfaces}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Blocked surfaces"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.blockedSurfaces}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Public surfaces"
                value={`${deviceCenterSnapshot.approvalSurfaceSummary.publicSurfaces}`}
                accentColor={theme.hex}
              />
            </div>
            <div className="mt-3 space-y-2">
              {deviceCenterSnapshot.approvalSurfaces.map((surface) => (
                <div
                  key={surface.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                >
                  <p className="text-sm font-semibold">
                    {surface.displayName} · {surface.surfaceKind}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {surface.hostClass} · trust{" "}
                    {surface.trustLevel ?? "unknown"} · presence{" "}
                    {surface.presenceCapability} · authority {surface.authority}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    Display {surface.canDisplayApprovals ? "yes" : "no"} · Deny{" "}
                    {surface.canDenyApprovals ? "yes" : "no"} · Low{" "}
                    {surface.canApproveLowRisk ? "yes" : "no"} · Medium{" "}
                    {surface.canApproveMediumRisk ? "yes" : "no"} · High
                    escalation{" "}
                    {surface.requiresPrimaryHostEscalation ? "yes" : "no"}
                  </p>
                </div>
              ))}
            </div>
          </SettingsCard>
          <SettingsCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Bridge Blueprint Review</p>
                <p className="mt-1 text-xs opacity-70">
                  Approval for sandbox does not execute or install the adapter.
                  Generated bridges remain model-only until a future controlled
                  execution PR.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateSampleBridgeReview}
                style={settingsControlInlineStyle}
              >
                Create sample review
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Reviews"
                value={`${deviceCenterSnapshot.bridgeReviewSummary.total}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Pending"
                value={`${deviceCenterSnapshot.bridgeReviewSummary.pendingReview}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Sandbox approved"
                value={`${deviceCenterSnapshot.bridgeReviewSummary.approvedForSandbox}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Blocked"
                value={`${deviceCenterSnapshot.bridgeReviewSummary.blocked}`}
                accentColor={theme.hex}
              />
            </div>
            <div className="mt-3 space-y-2">
              {deviceCenterSnapshot.bridgeReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{review.title}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {review.status} · {review.risk} · {review.decision}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        Static checks:{" "}
                        {review.staticChecks
                          .map((check) => `${check.label} ${check.status}`)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        Sandbox plan denied operations:{" "}
                        {review.sandboxPlan.deniedOperations.join(", ")}
                      </p>
                    </div>
                    <div className="flex min-w-[10rem] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleBridgeReviewAction(review, "approve")
                        }
                        style={settingsControlInlineStyle}
                      >
                        Approve for sandbox only
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleBridgeReviewAction(review, "reject")
                        }
                        style={settingsControlInlineStyle}
                      >
                        Reject review
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleBridgeReviewAction(review, "cancel")
                        }
                        style={settingsControlInlineStyle}
                      >
                        Cancel review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateDraftFromReview(review)}
                        style={settingsControlInlineStyle}
                      >
                        Create text draft
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
          <SettingsCard>
            <p className="text-sm font-semibold">Sensor / Embodied Policy</p>
            <p className="mt-1 text-xs opacity-70">
              Sensor read is read-only. Motion, actuator, smart-home control,
              payment, and safety-critical actions are never auto-approved.
              Embodied hosts cannot approve their own physical action.
            </p>
            <div className="mt-3 space-y-2">
              {deviceCenterSnapshot.embodiedCapabilityEnvelopes.map(
                (envelope) => (
                  <div
                    key={envelope.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                  >
                    <p className="text-sm font-semibold">
                      {envelope.displayName} · {envelope.hostClass}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Read-only lanes:{" "}
                      {envelope.readOnlyLanes.join(", ") || "none"}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Approval lanes:{" "}
                      {envelope.approvalLanes.join(", ") || "none"}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Fresh-confirmation lanes:{" "}
                      {envelope.freshConfirmationLanes.join(", ") || "none"}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Denied/blocked lanes:{" "}
                      {envelope.deniedLanes
                        .concat(envelope.blockedLanes)
                        .join(", ") || "none"}
                    </p>
                  </div>
                ),
              )}
            </div>
          </SettingsCard>
          <SettingsCard>
            <p className="text-sm font-semibold">Adapter Sandbox Runtime</p>
            <p className="mt-1 text-xs opacity-70">
              Read-only controlled adapter planning status. This surface does
              not load entrypoints, execute generated code or shell commands,
              write files, install adapters, mutate networks, or control
              devices.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Runtime status"
                value={
                  DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG.enabled
                    ? "Enabled"
                    : "Disabled"
                }
                detail="Default blocked state"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Dry-run"
                value={
                  DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG.dryRun
                    ? "Enabled"
                    : "Blocked"
                }
                detail={`Sample plan: ${LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN.status}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Code and shell"
                value="Blocked"
                detail="Generated-code and shell execution disabled"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Host approval"
                value="Required"
                detail="Approval never grants execution"
                accentColor={theme.hex}
              />
            </div>
            <div
              className="mt-3 rounded-lg border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p className="text-xs font-semibold">Blocked side effects</p>
              <p className="mt-1 text-xs opacity-70">
                File write · install · network mutation · device control ·
                credential access
              </p>
              <p className="mt-2 text-xs opacity-70">
                Sample dry-run plan status:{" "}
                <span className="font-semibold">
                  {LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN.status}
                </span>{" "}
                · sideEffectsPerformed{" "}
                {String(
                  LUCA_LINK_DEFAULT_ADAPTER_SANDBOX_PREVIEW_PLAN.sideEffectsPerformed,
                )}
              </p>
            </div>
          </SettingsCard>
          <SettingsLucaLinkDryRunHandoff accentColor={theme.hex} />
          <SettingsLucaLinkRuntimeAuthority accentColor={theme.hex} />
          <SettingsLucaLinkTransportPermissions accentColor={theme.hex} />
          <SettingsLucaLinkAdapterFileInstallPermissions
            accentColor={theme.hex}
          />
          <SettingsLucaLinkSensorBridge accentColor={theme.hex} />
          <SettingsCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Web Display Bridge MVP</p>
                <p className="mt-1 text-xs opacity-70">
                  Read-only display session intents and sanitized previews only.
                  This surface does not open, cast, control, or send to a
                  browser.
                </p>
              </div>
              <span
                className="rounded-full border px-2 py-1 text-[11px] font-semibold"
                style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
              >
                Read-only MVP
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SettingsStatusCard
                label="Status"
                value="Read-only MVP"
                detail="Display bridge default is inert"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Host approval"
                value="Required"
                detail="Presentation requires target-host approval"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Display mode"
                value="Presentation / read-only"
                detail="No browser or DOM automation"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Allowed actions"
                value="None"
                detail="Preview payload is non-interactive"
                accentColor={theme.hex}
              />
            </div>
            <div
              className="mt-3 rounded-lg border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p className="text-xs font-semibold">Blocked actions</p>
              <p className="mt-1 text-xs opacity-70">
                {LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS.join(" · ")}
              </p>
              <p className="mt-2 text-xs opacity-70">
                Sample display session intent status:{" "}
                <span className="font-semibold">
                  {LUCA_LINK_WEB_DISPLAY_SAMPLE_INTENT.status}
                </span>{" "}
                · sample preview payload status: ready · allowed actions{" "}
                {LUCA_LINK_WEB_DISPLAY_SAMPLE_PREVIEW.allowedActions.length} ·
                sideEffectsPerformed{" "}
                {String(
                  LUCA_LINK_WEB_DISPLAY_SAMPLE_PREVIEW.sideEffectsPerformed,
                )}
              </p>
            </div>
          </SettingsCard>
          <SettingsCard>
            {/* generatedTextOnly true */}
            {/* canWriteToDisk false */}
            {/* canExecute false */}
            {/* canInstall false */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Adapter Drafts</p>
                <p className="mt-1 text-xs opacity-70">
                  Adapter drafts are controlled text/model-only artifacts:
                  generatedTextOnly true, canWriteToDisk false, canExecute
                  false, canInstall false.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCreateSamplePythonDraft}
                  style={settingsControlInlineStyle}
                >
                  Create sample Python draft
                </button>
                <button
                  type="button"
                  onClick={handleClearAdapterDrafts}
                  style={settingsControlInlineStyle}
                >
                  Clear drafts
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Drafts"
                value={`${deviceCenterSnapshot.adapterDraftSummary.total}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Requires review"
                value={`${deviceCenterSnapshot.adapterDraftSummary.requiresReview}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Sandbox approved"
                value={`${deviceCenterSnapshot.adapterDraftSummary.approvedForSandbox}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Blocked"
                value={`${deviceCenterSnapshot.adapterDraftSummary.blocked}`}
                accentColor={theme.hex}
              />
            </div>
            <div className="mt-3 space-y-2">
              {deviceCenterSnapshot.adapterDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{draft.title}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {draft.kind} · {draft.status} · {draft.language} ·
                        source{" "}
                        {draft.sourceReviewId ??
                          draft.sourceBlueprintId ??
                          "sample"}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        generatedTextOnly {String(draft.generatedTextOnly)} ·
                        canWriteToDisk {String(draft.canWriteToDisk)} ·
                        canExecute {String(draft.canExecute)} · canInstall{" "}
                        {String(draft.canInstall)}
                      </p>
                      {draft.codePreview && (
                        <pre
                          className="mt-2 overflow-auto rounded-md p-2 text-xs"
                          style={{
                            backgroundColor: settingsSurfaceTokens.glass,
                          }}
                        >
                          {draft.codePreview}
                        </pre>
                      )}
                      {draft.configPreview && (
                        <pre
                          className="mt-2 overflow-auto rounded-md p-2 text-xs"
                          style={{
                            backgroundColor: settingsSurfaceTokens.glass,
                          }}
                        >
                          {JSON.stringify(draft.configPreview, null, 2)}
                        </pre>
                      )}
                      {draft.setupGuide && (
                        <p className="mt-1 text-xs opacity-70">
                          {draft.setupGuide}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelAdapterDraft(draft)}
                      style={settingsControlInlineStyle}
                    >
                      Cancel draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "devices" && (
        <SettingsSection
          title="Devices"
          description="Linked hosts, trust state, and scoped permission summaries. Sensitive access always requires explicit approval."
          icon="Smartphone"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          {deviceTrustActionMessage && (
            <SettingsCard>
              <p className="text-sm font-semibold">
                {deviceTrustActionMessage}
              </p>
              <p className="mt-1 text-xs opacity-70">
                Local only; does not disconnect remote transport yet. Admin does
                not bypass Primary Host approvals.
              </p>
            </SettingsCard>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <SettingsStatusCard
              label="Known devices"
              value={`${deviceCenterSnapshot.deviceTrustSummary.total}`}
              detail={`${deviceCenterSnapshot.deviceTrustSummary.connected} connected · ${deviceCenterSnapshot.deviceTrustSummary.disconnected} disconnected`}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Revoked / blocked"
              value={`${deviceCenterSnapshot.deviceTrustSummary.revoked} / ${deviceCenterSnapshot.deviceTrustSummary.blocked}`}
              detail="Local-only state; no remote disconnect is sent."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Trusted / admin"
              value={`${deviceCenterSnapshot.deviceTrustSummary.trusted} / ${deviceCenterSnapshot.deviceTrustSummary.admin}`}
              detail="Admin is advanced device management only."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Trust audit"
              value={`${deviceCenterSnapshot.deviceTrustSummary.auditCount}`}
              detail={
                deviceCenterSnapshot.deviceTrustSummary.latestMutation
                  ? `${deviceCenterSnapshot.deviceTrustSummary.latestMutation.mutation} · ${formatLucaLinkTimestamp(deviceCenterSnapshot.deviceTrustSummary.latestMutation.timestamp)}`
                  : "No trust mutations yet."
              }
              accentColor={theme.hex}
            />
          </div>

          <SettingsCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  LucaLink Local Approval Actions
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Preview approve, deny, revoke, and handoff outcomes before any
                  local state change. No runtime action will run.
                </p>
              </div>
              <span
                className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
              >
                Preview only
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Needs your approval"
                value={localApprovalActionPreviews.approve.decision === "approval_required" ? "Pending" : "Review"}
                detail="Approve device defaults to Limited trust"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Sensitive access"
                value="Remains blocked"
                detail="remote_action/tool_execution/admin_trust disabled"
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Revocation preview"
                value={`${localApprovalActionPreviews.revoke.revocationDryRun?.affectedLanes.length ?? 0} lane(s)`}
                detail={`${localApprovalActionPreviews.revoke.revocationDryRun?.blockedPermissions.length ?? 0} permissions blocked`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Primary Host review"
                value={localApprovalActionPreviews.handoff.requiresPrimaryHostReview ? "Required" : "Not required"}
                detail={`Handoff readiness: ${localApprovalActionPreviews.handoff.handoffReview?.readiness ?? "review-only"}`}
                accentColor={theme.hex}
              />
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {[
                ["Approve device", localApprovalActionPreviews.approve],
                ["Deny request", localApprovalActionPreviews.deny],
                ["Revoke access", localApprovalActionPreviews.revoke],
                ["Review handoff", localApprovalActionPreviews.handoff],
              ].map(([label, preview]) => (
                <div
                  key={label as string}
                  className="rounded-lg border p-3"
                  style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">{label as string}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {(preview as typeof localApprovalActionPreviews.approve).reason}
                      </p>
                    </div>
                    <StatusBadge
                      status={(preview as typeof localApprovalActionPreviews.approve).previewOnly ? "Preview only" : "Review"}
                    />
                  </div>
                  <p className="mt-2 text-xs opacity-70">
                    Current: {(preview as typeof localApprovalActionPreviews.approve).currentState.trustState} / {(preview as typeof localApprovalActionPreviews.approve).currentState.connectionState} · Proposed: {(preview as typeof localApprovalActionPreviews.approve).proposedState.trustState} / {(preview as typeof localApprovalActionPreviews.approve).proposedState.connectionState}
                  </p>
                  <p className="mt-2 text-xs opacity-70">
                    Confirmation {(preview as typeof localApprovalActionPreviews.approve).requiresConfirmation ? "required" : "not required"} · Side effects {String((preview as typeof localApprovalActionPreviews.approve).sideEffectsPerformed)} · No runtime action executed
                  </p>
                </div>
              ))}
            </div>
            <div
              className="mt-3 rounded-lg border p-3 text-xs"
              style={{
                borderColor: settingsSurfaceTokens.borderSubtle,
                backgroundColor: settingsSurfaceTokens.glass,
              }}
            >
              <p className="font-semibold">Disclosure mode summary</p>
              <p className="mt-1 opacity-70">
                {localApprovalActionDisclosure.simpleStatus} · {localApprovalActionDisclosure.sensitiveAccessCopy} · {localApprovalActionDisclosure.runtimeCopy}
              </p>
              {settings.general.experienceMode !== "basic" && (
                <p className="mt-1 opacity-70">
                  Affected lanes {localApprovalActionDisclosure.counts?.affectedLanes ?? 0} · stale approvals {localApprovalActionDisclosure.counts?.staleApprovals ?? 0} · blocked permissions {localApprovalActionDisclosure.counts?.blockedPermissions ?? 0}
                </p>
              )}
              {settings.general.experienceMode === "creator" && (
                <p className="mt-1 opacity-70">
                  Dry-run adapter actions: {localApprovalActionDisclosure.dryRunAdapterActions?.join(", ") || "none"} · audit preview {localApprovalActionDisclosure.auditEventPreview?.join(", ") || "none"}
                </p>
              )}
            </div>
          </SettingsCard>

          {trustedDevices.length === 0 ? (
            <SettingsCard>
              <p className="text-sm font-semibold">No known device records</p>
              <p className="mt-1 text-xs opacity-70">
                Pairing controls remain available below. Device trust cards
                appear when LucaLink exposes connected or guest devices.
              </p>
            </SettingsCard>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {trustedDevices.map((device) => (
                <SettingsCard key={device.deviceId}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">
                          {device.displayName || "Unnamed LucaLink device"}
                        </p>
                        {linkedHostsById.get(device.deviceId)
                          ?.isCurrentDevice && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              borderColor: settingsSurfaceTokens.borderSubtle,
                            }}
                          >
                            Current device
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-all font-mono text-xs opacity-70">
                        {device.deviceId}
                      </p>
                      <p className="mt-2 text-xs opacity-70">
                        {device.role === "guest"
                          ? "Conversation/WebRTC limited."
                          : device.trustLevel === "admin"
                            ? "Advanced device management; does not bypass Primary Host approvals."
                            : "Runtime enforcement and Primary Host approval boundaries remain active."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={
                          getLucaLinkConnectionStateMetadata(
                            linkedHostsById.get(device.deviceId)!
                              .connectionState,
                          ).label
                        }
                      />
                      <StatusBadge
                        status={
                          getLucaLinkTrustStateMetadata(
                            linkedHostsById.get(device.deviceId)!.trustState,
                          ).label
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <DetailField
                      label="Device type"
                      value={getLucaLinkDeviceTypeLabel(
                        linkedHostsById.get(device.deviceId)!.deviceType,
                      )}
                    />
                    <DetailField
                      label="Host type"
                      value={
                        device.role === "primary-host"
                          ? "Primary Host"
                          : device.role
                      }
                    />
                    <DetailField
                      label="Last seen"
                      value={formatLucaLinkTimestamp(device.lastSeenAt)}
                    />
                    <DetailField
                      label="Allowed permissions"
                      value={`${linkedHostsById.get(device.deviceId)!.permissionProfile.allowedCount} allowed · ${linkedHostsById.get(device.deviceId)!.permissionProfile.pendingCount} require approval`}
                    />
                    {deviceCenterDisclosure.showSessionStatus && (
                      <DetailField
                        label="Session status"
                        value={
                          linkedHostsById.get(device.deviceId)!
                            .activeSessionId ?? "No active session recorded"
                        }
                      />
                    )}
                    {deviceCenterDisclosure.showTrustDiagnostics && (
                      <DetailField
                        label="Registry diagnostics"
                        value={`${device.capabilities.length} capabilities · ${device.deniedCapabilities.length} denied boundaries`}
                      />
                    )}
                  </div>

                  {deviceCenterDisclosure.showPermissionDetails && (
                    <div
                      className="mt-3 rounded-lg border p-3"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        backgroundColor: settingsSurfaceTokens.glass,
                      }}
                    >
                      <p className="text-xs font-semibold">
                        Permission profile
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {linkedHostsById
                          .get(device.deviceId)!
                          .permissionProfile.permissions.map((item) => {
                            const evaluation = linkedHostGovernanceById
                              .get(device.deviceId)!
                              .get(item.id)!;
                            return (
                              <span
                                key={item.id}
                                className="rounded-full border px-2 py-1 text-[11px]"
                                style={{
                                  borderColor:
                                    settingsSurfaceTokens.borderSubtle,
                                }}
                                title={`${item.description} Governance: ${evaluation.reason}.`}
                              >
                                {item.label}:{" "}
                                {getLucaLinkGovernanceDecisionLabel(
                                  evaluation.decision,
                                )}
                                {item.sensitive ? " · sensitive" : ""}
                              </span>
                            );
                          })}
                      </div>
                      <p className="mt-2 text-xs opacity-70">
                        Sensitive access requires approval. This summary does
                        not grant runtime authority.
                      </p>
                    </div>
                  )}

                  {(device.warnings.length > 0 || device.errors.length > 0) && (
                    <div
                      className="mt-3 rounded-lg border p-3 text-xs"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        backgroundColor: settingsSurfaceTokens.glass,
                      }}
                    >
                      {device.warnings.length > 0 && (
                        <p>Warnings: {device.warnings.join("; ")}</p>
                      )}
                      {device.errors.length > 0 && (
                        <p>Errors: {device.errors.join("; ")}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDeviceTrustAction(device, "rename")}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold"
                      style={settingsControlInlineStyle}
                    >
                      Rename
                    </button>
                    <select
                      aria-label={`Set trust level for ${device.displayName}`}
                      value={device.trustLevel}
                      onChange={(event) =>
                        handleDeviceTrustAction(
                          device,
                          "trust",
                          event.target.value as LucaLinkDeviceTrustLevel,
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                      style={settingsControlInlineStyle}
                      disabled={
                        device.role === "primary-host" ||
                        device.status === "revoked" ||
                        device.status === "blocked"
                      }
                    >
                      <option value="guest">Guest</option>
                      <option value="paired">Paired</option>
                      <option value="trusted">Trusted</option>
                      <option
                        value="admin"
                        disabled={
                          device.role !== "execution" &&
                          device.role !== "companion"
                        }
                      >
                        Admin — requires approvals
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeviceTrustAction(device, "revoke")}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                      style={settingsControlInlineStyle}
                      disabled={
                        device.status === "revoked" ||
                        device.role === "primary-host"
                      }
                    >
                      Revoke locally
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeviceTrustAction(device, "block")}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                      style={settingsControlInlineStyle}
                      disabled={
                        device.status === "blocked" ||
                        device.role === "primary-host"
                      }
                    >
                      Block locally
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeviceTrustAction(device, "unblock")}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                      style={settingsControlInlineStyle}
                      disabled={device.status !== "blocked"}
                    >
                      Unblock locally
                    </button>
                  </div>
                  <p className="mt-2 text-xs opacity-70">
                    Revoke/block are local only; they do not disconnect remote
                    transport yet.
                  </p>
                </SettingsCard>
              ))}
            </div>
          )}
        </SettingsSection>
      )}

      {deviceCenterTab === "hosts" && (
        <SettingsSection
          title="Host Connections / Adaptation"
          description="Read-only multi-host connection and Host Adaptation Intelligence summary for LucaLink's adaptive host mesh."
          icon="Devices"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <SettingsStatusCard
              label="Host connections"
              value={`${deviceCenterSnapshot.hostConnectionSummary.total}`}
              detail={`${deviceCenterSnapshot.hostConnectionSummary.online} online or locally visible.`}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Display hosts"
              value={`${deviceCenterSnapshot.hostConnectionSummary.displayHosts}`}
              detail="Can host read-only Luca UI or display surfaces."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Approval-capable hosts"
              value={`${deviceCenterSnapshot.hostConnectionSummary.approvalCapable}`}
              detail="Approval boundaries remain governed by Primary Host policy."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Sensor hosts"
              value={`${deviceCenterSnapshot.hostConnectionSummary.sensorHosts}`}
              detail="Read-only sensor eligibility model."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Embodied hosts"
              value={`${deviceCenterSnapshot.hostConnectionSummary.embodiedHosts}`}
              detail="Physical action is denied by default."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Unknown hosts"
              value={`${deviceCenterSnapshot.hostConnectionSummary.unknownHosts}`}
              detail="Require diagnosis before bridge planning."
              accentColor={theme.hex}
            />
          </div>

          <SettingsCard>
            {/* Primary Host approval, sandbox checks, and future execution controls */}
            <p className="text-sm font-semibold">
              Host adaptation intelligence is model-only.
            </p>
            <p className="mt-1 text-xs opacity-70">
              Luca can propose bridge strategies for unknown hosts, but
              generated adapters are not executed in this PR.
            </p>
            <p className="mt-1 text-xs opacity-70">
              Generated bridge programs require Primary Host approval, sandbox
              checks, and future execution controls.
            </p>
          </SettingsCard>

          <SettingsCard>
            <p className="text-sm font-semibold">
              Multi-host connection records
            </p>
            {deviceCenterSnapshot.hostConnections.length === 0 ? (
              <p className="mt-2 text-xs opacity-70">
                No host connection records are available yet. Records are
                derived from current LucaLink device, trust, and guest state
                only.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {deviceCenterSnapshot.hostConnections.map((host) => (
                  <div
                    key={host.id}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      backgroundColor: settingsSurfaceTokens.glass,
                    }}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {host.displayName}
                        </p>
                        <p className="text-xs opacity-70">
                          {host.hostClass} · {host.connectionClass} ·{" "}
                          {host.reachability}
                        </p>
                      </div>
                      <RiskBadge risk={host.connectionRisk} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField
                        label="Runtime surfaces"
                        value={host.runtimeSurfaces.join(", ")}
                      />
                      <DetailField
                        label="Presence"
                        value={host.presenceCapability}
                      />
                      <DetailField
                        label="Approval"
                        value={host.approvalCapability}
                      />
                      <DetailField
                        label="Trust / role"
                        value={
                          [host.trustLevel, host.deviceRole]
                            .filter(Boolean)
                            .join(" / ") || "Not classified"
                        }
                      />
                      <DetailField
                        label="Capabilities"
                        value={`display ${host.canDisplay ? "yes" : "no"} · approve ${host.canApprove ? "yes" : "no"} · execute ${host.canExecute ? "yes" : "no"} · sense ${host.canSense ? "yes" : "no"} · physical ${host.canActPhysically ? "yes" : "no"}`}
                      />
                      <DetailField
                        label="Handoff / UI"
                        value={`handoff ${host.canReceiveHandoff ? "yes" : "no"} · Luca UI ${host.canHostLucaUi ? "yes" : "no"}`}
                      />
                      <DetailField
                        label="Limitations"
                        value={
                          host.limitations.length
                            ? host.limitations.join("; ")
                            : "None"
                        }
                      />
                      <DetailField
                        label="Warnings"
                        value={
                          host.warnings.length
                            ? host.warnings.join("; ")
                            : "None"
                        }
                      />
                      <DetailField
                        label="Errors"
                        value={
                          host.errors.length ? host.errors.join("; ") : "None"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "approvals" && (
        <SettingsSection
          title="Approvals"
          description="Primary Host approval queue. Decisions update in-memory queue status only; they do not execute, retry, replay, emit, or continue blocked actions."
          icon="ShieldCheck"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          {approvalActionMessage && (
            <SettingsCard>
              <p className="text-sm font-semibold">{approvalActionMessage}</p>
              <p className="mt-1 text-xs opacity-70">
                Approval does not equal execution. Continuation tokens are model
                records only; no runtime execution or action replay is started.
              </p>
            </SettingsCard>
          )}

          <SettingsCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Companion Approval Notifications
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Intent-only notification preview. No execution, queue
                  mutation, socket send, display cast, browser open, or device
                  control is performed.
                </p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide">
                intent-only
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Pending notifications"
                value={`${summarizeApprovalNotificationInbox(LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION_INBOX).pending}`}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Risk"
                value={LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.risk}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Surface decision"
                value={LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.surfaceDecision}
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Audit only"
                value={`sideEffectsPerformed ${String(LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.sideEffectsPerformed)}`}
                accentColor={theme.hex}
              />
            </div>
            <div
              className="mt-3 rounded-lg border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p className="text-sm font-semibold">
                {LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.title}
              </p>
              <p className="mt-1 text-xs opacity-70">
                Expires{" "}
                {formatLucaLinkTimestamp(
                  LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.expiresAt,
                )}
              </p>
              <p className="mt-2 text-xs font-semibold">
                Allowed notification actions
              </p>
              <p className="mt-1 text-xs opacity-70">
                {LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.allowedNotificationActions.join(
                  " · ",
                )}
              </p>
              <p className="mt-2 text-xs font-semibold">Blocked actions</p>
              <p className="mt-1 text-xs opacity-70">
                {LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.blockedActions.join(
                  " · ",
                )}
              </p>
              <p className="mt-2 text-xs font-semibold">
                Payload preview summary
              </p>
              <p className="mt-1 break-words text-xs opacity-70">
                {renderPayloadPreview(
                  LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.payloadPreview,
                )}
              </p>
            </div>
          </SettingsCard>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="space-y-3">
              {deviceCenterSnapshot.approvalRequests.length === 0 ? (
                <SettingsCard>
                  <p className="text-sm font-semibold">No approval requests</p>
                  <p className="mt-1 text-xs opacity-70">
                    The in-memory queue is empty.
                  </p>
                </SettingsCard>
              ) : (
                deviceCenterSnapshot.approvalRequests.map((request) => (
                  <SettingsCard
                    key={request.id}
                    className={
                      selectedApproval?.id === request.id
                        ? "ring-1 ring-white/20"
                        : ""
                    }
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold">
                            {request.title}
                          </h4>
                          <StatusBadge status={request.status} />
                          <RiskBadge risk={request.risk} />
                        </div>
                        <p className="mt-2 text-sm opacity-80">
                          {request.summary}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {request.reason}
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <DetailField
                            label="Requested by"
                            value={request.requestedByDeviceId}
                          />
                          <DetailField
                            label="Target"
                            value={request.requestedTargetDeviceId}
                          />
                          <DetailField label="Lane" value={request.lane} />
                          <DetailField
                            label="Permission"
                            value={request.permission}
                          />
                          <DetailField
                            label="Created"
                            value={formatLucaLinkTimestamp(request.createdAt)}
                          />
                          <DetailField
                            label="Expires"
                            value={formatLucaLinkTimestamp(request.expiresAt)}
                          />
                        </div>
                      </div>
                      <div className="flex min-w-[9rem] flex-row gap-2 md:flex-col">
                        <button
                          type="button"
                          disabled={request.status !== "pending"}
                          onClick={() =>
                            handleApprovalAction(request, "approve")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                          style={settingsControlInlineStyle}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={request.status !== "pending"}
                          onClick={() => handleApprovalAction(request, "deny")}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                          style={settingsControlInlineStyle}
                        >
                          Deny
                        </button>
                        <button
                          type="button"
                          disabled={request.status !== "pending"}
                          onClick={() =>
                            handleApprovalAction(request, "cancel")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-45"
                          style={settingsControlInlineStyle}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedApprovalId(request.id)}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </SettingsCard>
                ))
              )}
            </div>

            <SettingsCard>
              <h4 className="text-base font-semibold">Approval Details</h4>
              {selectedApproval ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={selectedApproval.status} />
                    <RiskBadge risk={selectedApproval.risk} />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <DetailField label="Title" value={selectedApproval.title} />
                    <DetailField
                      label="Source"
                      value={selectedApproval.source}
                    />
                    <DetailField
                      label="Event"
                      value={selectedApproval.eventName}
                    />
                    <DetailField label="Lane" value={selectedApproval.lane} />
                    <DetailField
                      label="Permission"
                      value={selectedApproval.permission}
                    />
                    <DetailField
                      label="Requested by device"
                      value={selectedApproval.requestedByDeviceId}
                    />
                    <DetailField
                      label="Requested by role"
                      value={selectedApproval.requestedByRole}
                    />
                    <DetailField
                      label="Requested target"
                      value={selectedApproval.requestedTargetDeviceId}
                    />
                    <DetailField
                      label="Approval host"
                      value={[
                        selectedApproval.approvalHostId,
                        selectedApproval.approvalHostRole,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    />
                    <DetailField
                      label="Created"
                      value={formatLucaLinkTimestamp(
                        selectedApproval.createdAt,
                      )}
                    />
                    <DetailField
                      label="Updated"
                      value={formatLucaLinkTimestamp(
                        selectedApproval.updatedAt,
                      )}
                    />
                    <DetailField
                      label="Expires"
                      value={formatLucaLinkTimestamp(
                        selectedApproval.expiresAt,
                      )}
                    />
                    <DetailField
                      label="Reason"
                      value={selectedApproval.reason}
                    />
                    <DetailField
                      label="Explain"
                      value={selectedApproval.explain}
                    />
                    <DetailField
                      label="Warnings"
                      value={
                        selectedApproval.warnings.length
                          ? selectedApproval.warnings.join("; ")
                          : "None"
                      }
                    />
                    <DetailField
                      label="Errors"
                      value={
                        selectedApproval.errors.length
                          ? selectedApproval.errors.join("; ")
                          : "None"
                      }
                    />
                    <DetailField
                      label="Decision"
                      value={
                        selectedApproval.decision
                          ? `${selectedApproval.decision.decision} by ${selectedApproval.decision.decidedByDeviceId ?? "unknown"} at ${formatLucaLinkTimestamp(selectedApproval.decision.decidedAt)} — ${selectedApproval.decision.reason ?? "No reason provided"}`
                          : "Pending"
                      }
                    />
                  </div>
                  {selectedApprovalContinuation && (
                    <div
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        backgroundColor: settingsSurfaceTokens.glass,
                      }}
                    >
                      <p className="text-sm font-semibold">Continuation</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Status"
                          value={selectedApprovalContinuation.status}
                        />
                        <DetailField
                          label="Replay mode"
                          value={
                            continuationReplayModeLabels[
                              selectedApprovalContinuation.replayMode
                            ] ?? selectedApprovalContinuation.replayMode
                          }
                        />
                        <DetailField
                          label="Valid / blocked / expired / consumed"
                          value={
                            selectedApprovalContinuation.status === "validated"
                              ? "valid model record"
                              : selectedApprovalContinuation.status
                          }
                        />
                        <DetailField
                          label="Explanation"
                          value={
                            selectedApprovalContinuation.replayMode ===
                            "fresh-confirmation-required"
                              ? "This action requires a new Primary Host confirmation and cannot be replayed from approval."
                              : "This is a model record only. LucaOS did not execute or replay the action."
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs opacity-70">
                        Continuation token visibility is read-only model state.
                        Runtime continuation execution will come in a later PR.
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      Payload preview
                    </p>
                    <pre
                      className="max-h-64 overflow-auto rounded-xl border p-3 text-xs"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                        backgroundColor: settingsSurfaceTokens.elevated,
                        color: settingsSurfaceTokens.textPrimary,
                      }}
                    >
                      {renderPayloadPreview(selectedApproval.payloadPreview)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm opacity-70">
                  Select an approval request to inspect details.
                </p>
              )}
            </SettingsCard>
          </div>
        </SettingsSection>
      )}

      {deviceCenterTab === "guests" && (
        <SettingsSection
          title="Guest Sessions"
          description="Guest access events are observed through LucaLink runtime diagnostics. Detailed guest session controls will be added in a later hardening PR."
          icon="Globus"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <SettingsStatusCard
              label="Tracked guests"
              value={`${deviceCenterSnapshot.guestSecuritySummary.total}`}
              detail={`${deviceCenterSnapshot.guestSecuritySummary.connected} connected · ${deviceCenterSnapshot.guestSecuritySummary.authChallenge} awaiting auth`}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Authenticated / active"
              value={`${deviceCenterSnapshot.guestSecuritySummary.authenticated} / ${deviceCenterSnapshot.guestSecuritySummary.active}`}
              detail="Read-only guest security session state."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Expired / disconnected"
              value={`${deviceCenterSnapshot.guestSecuritySummary.expired} / ${deviceCenterSnapshot.guestSecuritySummary.disconnected}`}
              detail="No guest transport controls are exposed here."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Denied / rate-limited"
              value={`${deviceCenterSnapshot.guestSecuritySummary.deniedGuestInbound} / ${deviceCenterSnapshot.guestSecuritySummary.rateLimitedGuestInbound}`}
              detail="Inbound guest policy counters only."
              accentColor={theme.hex}
            />
          </div>
          <SettingsCard>
            {/* This view does not revoke guests, regenerate invites, or change guest auth, PIN, or WebRTC behavior. */}
            <p className="text-sm font-semibold">
              Guest security sessions are read-only.
            </p>
            <p className="mt-1 text-xs opacity-70">
              Guest host records are derived from existing guest security
              session state. This view does not revoke guests, regenerate
              invites, or change guest auth, PIN, or WebRTC behavior.
            </p>
            {deviceCenterSnapshot.guestSecuritySessions.length === 0 ? (
              <p className="mt-3 text-xs opacity-70">
                No guest security sessions are currently tracked.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {deviceCenterSnapshot.guestSecuritySessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="rounded-lg border p-3"
                    style={{
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      backgroundColor: settingsSurfaceTokens.glass,
                    }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-semibold">
                        Guest {session.sessionId}
                      </p>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <DetailField
                        label="Messages"
                        value={`${session.messageCount}`}
                      />
                      <DetailField
                        label="Denied inbound"
                        value={`${session.deniedCount}`}
                      />
                      <DetailField
                        label="Rate limited"
                        value={`${session.rateLimitedCount}`}
                      />
                      <DetailField
                        label="Expires"
                        value={formatLucaLinkTimestamp(session.expiresAt)}
                      />
                      <DetailField
                        label="Last activity"
                        value={formatLucaLinkTimestamp(session.lastActivityAt)}
                      />
                      <DetailField
                        label="Capabilities"
                        value={
                          session.capabilities.join(", ") ||
                          "conversation-limited"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "sync" && (
        <SettingsSection
          title="Sync & Handoff"
          description="Safe model-first handoff for conversation, memory intent, mission, artifact, settings context, and model context."
          icon="RefreshCircle"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <SettingsStatusCard
              label="Pending handoffs"
              value={`${deviceCenterSnapshot.pendingHandoffs.length}`}
              detail="Awaiting state action or Primary Host approval."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Conversation handoffs"
              value={`${deviceCenterSnapshot.handoffSummary.byKind.conversation}`}
              detail="Hidden system prompts and private reasoning are excluded."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Memory intent handoffs"
              value={`${deviceCenterSnapshot.handoffSummary.byKind["memory-intent"]}`}
              detail="Intent-only; no raw memory database transfer."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Artifact / mission handoffs"
              value={`${deviceCenterSnapshot.handoffSummary.byKind.artifact + deviceCenterSnapshot.handoffSummary.byKind.mission}`}
              detail="Metadata only; no raw file transfer."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Blocked / expired"
              value={`${deviceCenterSnapshot.handoffSummary.blocked} / ${deviceCenterSnapshot.handoffSummary.expired}`}
              detail="Unsafe or stale handoff records remain visible."
              accentColor={theme.hex}
            />
          </div>

          <SettingsCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Handoff safety boundaries
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs opacity-70">
                  <li>
                    Memory handoff is intent-only; raw memory databases are not
                    transferred.
                  </li>
                  <li>
                    Conversation handoff excludes hidden system prompts and
                    private reasoning.
                  </li>
                  <li>Secrets are redacted before handoff.</li>
                  <li>
                    Handoff does not execute tools or mutate remote devices.
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleCreateSampleConversationHandoff}
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                style={settingsControlInlineStyle}
              >
                Create sample conversation handoff
              </button>
            </div>
            {handoffActionMessage && (
              <p className="mt-3 text-xs opacity-70">{handoffActionMessage}</p>
            )}
          </SettingsCard>

          <SettingsCard>
            <p className="text-sm font-semibold">Handoff requests</p>
            {deviceCenterSnapshot.handoffs.length === 0 ? (
              <p className="mt-2 text-xs opacity-70">
                No handoff requests are registered yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {deviceCenterSnapshot.handoffs.map((handoff) => (
                  <div
                    key={handoff.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {handoff.title}
                          </p>
                          <StatusBadge status={handoff.status} />
                          <RiskBadge risk={handoff.risk} />
                          <span
                            className="rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                            style={{
                              borderColor: settingsSurfaceTokens.borderSubtle,
                            }}
                          >
                            Kind: {handoff.kind}
                          </span>
                        </div>
                        <p className="text-xs opacity-70">{handoff.summary}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <DetailField
                            label="Source device"
                            value={handoff.sourceDeviceId}
                          />
                          <DetailField
                            label="Target device"
                            value={handoff.targetDeviceId}
                          />
                          <DetailField
                            label="Expires"
                            value={formatLucaLinkTimestamp(handoff.expiresAt)}
                          />
                          <DetailField
                            label="Preview flags"
                            value={`${handoff.payloadPreview.redacted ? "redacted" : "not redacted"} · ${handoff.payloadPreview.truncated ? "truncated" : "not truncated"}`}
                          />
                          <DetailField
                            label="Warnings"
                            value={
                              handoff.warnings.length
                                ? handoff.warnings.join("; ")
                                : "None"
                            }
                          />
                          <DetailField
                            label="Errors"
                            value={
                              handoff.errors.length
                                ? handoff.errors.join("; ")
                                : "None"
                            }
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                            Payload preview only
                          </p>
                          <pre
                            className="max-h-52 overflow-auto rounded-xl border p-3 text-xs"
                            style={{
                              borderColor: settingsSurfaceTokens.borderSubtle,
                              backgroundColor: settingsSurfaceTokens.elevated,
                              color: settingsSurfaceTokens.textPrimary,
                            }}
                          >
                            {renderPayloadPreview(handoff.payloadPreview)}
                          </pre>
                        </div>
                      </div>
                      <div className="flex min-w-[10rem] flex-row gap-2 md:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            handleHandoffAction(handoff, "approve")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleHandoffAction(handoff, "decline")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHandoffAction(handoff, "cancel")}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHandoffAction(handoff, "accept")}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Mark accepted
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs opacity-70">
                      Payload preview is shown instead of underlying data. No
                      send-now action is exposed in this PR.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "advanced" && (
        <SettingsSection
          title="Advanced"
          description="Read-only LucaLink queue and runtime shadow diagnostics summary."
          icon="Settings"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SettingsStatusCard
              label="Soft enforcement"
              value={getLucaLinkSecurityModeLabel(
                deviceCenterSnapshot.softEnforcementMode,
              )}
              detail={deviceCenterSnapshot.softEnforcementMode}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Runtime observations"
              value={`${deviceCenterSnapshot.runtimeShadowSummary.total}`}
              detail={`Allow ${deviceCenterSnapshot.runtimeShadowSummary.wouldAllow} · Deny ${deviceCenterSnapshot.runtimeShadowSummary.wouldDeny} · Approval ${deviceCenterSnapshot.runtimeShadowSummary.wouldRequirePrimaryHostApproval}`}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Adapter diagnostics"
              value={`${deviceCenterSnapshot.runtimeShadowSummary.adapterWarnings} warnings / ${deviceCenterSnapshot.runtimeShadowSummary.adapterErrors} errors`}
              detail="Runtime shadow only; no enforcement toggles here."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Device trust"
              value={`${deviceCenterSnapshot.deviceTrustSummary.total} known`}
              detail={`${deviceCenterSnapshot.deviceTrustSummary.guests} guests · ${deviceCenterSnapshot.deviceTrustSummary.owner} owner record`}
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Trust audit"
              value={`${deviceCenterSnapshot.deviceTrustAudit.length}`}
              detail={
                deviceCenterSnapshot.deviceTrustSummary.latestMutation
                  ?.mutation ?? "No trust mutations yet"
              }
              accentColor={theme.hex}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SettingsStatusCard
              label="Continuation tokens"
              value={`${deviceCenterSnapshot.continuationSummary.total} total · ${deviceCenterSnapshot.continuationSummary.valid} valid`}
              detail="Continuation model only. Model records only; approvals do not execute actions."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Valid continuations"
              value={`${deviceCenterSnapshot.validContinuationTokens.length}`}
              detail="No action replay. Tokens can be validated as state only."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Consumed"
              value={`${deviceCenterSnapshot.continuationSummary.consumed}`}
              detail="No runtime execution. Mark consumed only records state."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Expired / blocked"
              value={`${deviceCenterSnapshot.continuationSummary.expired} expired · ${deviceCenterSnapshot.continuationSummary.blocked} blocked`}
              detail="Physical-world and payment actions require fresh confirmation."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Manual retry only"
              value={`${deviceCenterSnapshot.continuationSummary.byReplayMode["manual-retry-only"]}`}
              detail="Manual retry only is a classification, not an automatic action."
              accentColor={theme.hex}
            />
            <SettingsStatusCard
              label="Fresh confirmation required"
              value={`${deviceCenterSnapshot.continuationSummary.byReplayMode["fresh-confirmation-required"]}`}
              detail={`Single-use replayable records: ${deviceCenterSnapshot.continuationSummary.byReplayMode["single-use-replayable"]}. Runtime continuation execution will come later.`}
              accentColor={theme.hex}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(
              ["pending", "approved", "denied", "expired", "cancelled"] as const
            ).map((key) => (
              <SettingsStatusCard
                key={key}
                label={`Queue ${key}`}
                value={`${deviceCenterSnapshot.approvalSummary[key]}`}
                accentColor={theme.hex}
              />
            ))}
          </div>
          <SettingsCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Continuation Records</p>
                <p className="mt-1 text-xs opacity-70">
                  Continuation tokens are model records only. Approval does not
                  equal execution, and no runtime execution or action replay
                  occurs here.
                </p>
              </div>
              {continuationActionMessage && (
                <p className="text-xs opacity-70">
                  {continuationActionMessage}
                </p>
              )}
            </div>
            {deviceCenterSnapshot.continuationTokens.length === 0 ? (
              <p className="mt-3 text-xs opacity-70">
                No continuation records are available.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {deviceCenterSnapshot.continuationTokens.map((token) => (
                  <div
                    key={token.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{token.title}</p>
                          <StatusBadge status={token.status} />
                          <RiskBadge risk={token.risk} />
                        </div>
                        <p className="text-xs opacity-70">
                          Replay mode:{" "}
                          {continuationReplayModeLabels[token.replayMode] ??
                            token.replayMode}
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <DetailField
                            label="Requested by device"
                            value={token.requestedByDeviceId}
                          />
                          <DetailField
                            label="Requested target"
                            value={token.requestedTargetDeviceId}
                          />
                          <DetailField label="Lane" value={token.lane} />
                          <DetailField
                            label="Permission"
                            value={token.permission}
                          />
                          <DetailField
                            label="Created"
                            value={formatLucaLinkTimestamp(token.createdAt)}
                          />
                          <DetailField
                            label="Expires"
                            value={formatLucaLinkTimestamp(token.expiresAt)}
                          />
                          <DetailField
                            label="Validation warnings"
                            value={
                              token.validationWarnings.length
                                ? token.validationWarnings.join("; ")
                                : "None"
                            }
                          />
                          <DetailField
                            label="Validation errors"
                            value={
                              token.validationErrors.length
                                ? token.validationErrors.join("; ")
                                : "None"
                            }
                          />
                          <DetailField
                            label="Consumed record"
                            value={
                              token.consumeRecord
                                ? `${formatLucaLinkTimestamp(token.consumeRecord.consumedAt)} by ${token.consumeRecord.consumedByDeviceId ?? "unknown"} — ${token.consumeRecord.reason ?? "No reason provided"}`
                                : "Not consumed"
                            }
                          />
                        </div>
                      </div>
                      <div className="flex min-w-[10rem] flex-row gap-2 md:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            handleContinuationRecordAction(token, "validate")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Validate record
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleContinuationRecordAction(token, "cancel")
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Cancel record
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleContinuationRecordAction(
                              token,
                              "mark-consumed",
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                          style={settingsControlInlineStyle}
                        >
                          Mark consumed
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs opacity-70">
                      Mark consumed only records state; it does not execute the
                      action. Physical-world and payment actions require fresh
                      Primary Host confirmation.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>

          <SettingsCard>
            <p className="text-sm font-semibold">Recent observations</p>
            {deviceCenterSnapshot.runtimeShadowObservations.length === 0 ? (
              <p className="mt-1 text-xs opacity-70">
                No runtime shadow observations exposed yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {deviceCenterSnapshot.runtimeShadowObservations
                  .slice(-5)
                  .reverse()
                  .map((observation) => (
                    <div
                      key={observation.id}
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: settingsSurfaceTokens.borderSubtle,
                      }}
                    >
                      <p className="text-sm font-semibold">
                        {observation.eventName} · {observation.decision}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {formatLucaLinkTimestamp(observation.timestamp)} ·{" "}
                        {observation.reasons.join("; ")}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "devices" && (
        <>
          <SettingsSection
            title="Linked Devices"
            description="Use Luca across Primary Host, companion, display, guest, sensor, and future Luca-capable hosts in one host mesh."
            icon="Devices"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <SettingsStatusCard
                label="Primary Host"
                value={!isMobile ? status.text : "Available"}
                detail="This LucaOS session can pair with trusted clients."
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Phone"
                value={isMobile ? status.text : "Pair below"}
                detail="Companion hosts remain available through Luca Link."
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Tablet / browser"
                value="Supported"
                detail="Browser sessions and future devices use the same pairing surface."
                accentColor={theme.hex}
              />
              <SettingsStatusCard
                label="Connection health"
                value={linkState.connected ? "Connected" : "Ready"}
                detail="Relay, local, and VPN status remains in existing controls."
                accentColor={theme.hex}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Pair New Device"
            description="Pair with QR code, pairing code, nearby device, or trusted-device flows without network-admin framing."
            icon="Link"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            {/* Connection status */}
            <div
              className={`p-6 border transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-[var(--luca-surface-glass)]" : "rounded-2xl shadow-sm"}`}
              style={{
                backgroundColor: settingsSurfaceTokens.glass,
                borderColor: settingsSurfaceTokens.borderSubtle,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <label
                  className={`text-base font-semibold text-[var(--app-text-main)]`}
                >
                  {isMobile ? "Primary Host connection" : "Connection status"}
                </label>
                {getConnectionIcon()}
              </div>
              <div
                className={`text-sm font-medium ${status.color}`}
                style={(status as any).style}
              >
                {status.text}
              </div>
            </div>

            {/* ===== MOBILE CLIENT UI ===== */}
            {isMobile && (
              <>
                {/* Connection Mode */}
                <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
                  <label className="text-base font-medium text-[var(--app-text-muted)]">
                    Connection method
                  </label>
                  <select
                    value={settings.lucaLink.connectionMode}
                    onChange={(e) =>
                      onUpdate("lucaLink", "connectionMode", e.target.value)
                    }
                    className={`w-full border rounded-lg p-3 text-sm font-medium outline-none transition-all shadow-sm`}
                    style={settingsControlInlineStyle}
                  >
                    <option value="auto">Auto (Try All Methods)</option>
                    <option value="local">Local Network (Same WiFi)</option>
                    <option value="vpn">VPN (Tailscale/ZeroTier)</option>
                    <option value="relay">Cloud Relay</option>
                  </select>
                  <p className="text-xs text-[var(--app-text-muted)] opacity-70 italic leading-tight">
                    {settings.lucaLink.connectionMode === "auto" &&
                      "Automatically tries local → VPN → cloud relay"}
                    {settings.lucaLink.connectionMode === "local" &&
                      "Connect when on the same WiFi as your Primary Host"}
                    {settings.lucaLink.connectionMode === "vpn" &&
                      "Use Tailscale or ZeroTier for secure remote access"}
                    {settings.lucaLink.connectionMode === "relay" &&
                      "Connect via cloud relay (works everywhere)"}
                  </p>
                </div>

                {/* Direct IP/VPN Address */}
                {(settings.lucaLink.connectionMode === "auto" ||
                  settings.lucaLink.connectionMode === "local" ||
                  settings.lucaLink.connectionMode === "vpn") && (
                  <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
                    <label className="text-base font-medium text-[var(--app-text-muted)] flex items-center gap-2">
                      <Icon name="Smartphone" className="w-4 h-4" />
                      Primary Host address
                    </label>
                    <input
                      type="text"
                      value={settings.lucaLink.vpnServerUrl || ""}
                      onChange={(e) =>
                        onUpdate("lucaLink", "vpnServerUrl", e.target.value)
                      }
                      placeholder={
                        settings.lucaLink.connectionMode === "vpn"
                          ? "e.g., 100.x.x.x:8765 (Tailscale IP)"
                          : "e.g., 192.168.1.100:8765"
                      }
                      className={`w-full rounded-lg p-3 text-sm font-mono outline-none transition-all border shadow-sm`}
                      style={settingsControlInlineStyle}
                    />
                  </div>
                )}

                {/* Cloud relay server */}
                {(settings.lucaLink.connectionMode === "auto" ||
                  settings.lucaLink.connectionMode === "relay") && (
                  <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
                    <label className="text-base font-medium text-[var(--app-text-muted)] flex items-center gap-2">
                      <Icon
                        name="Globus"
                        variant="BoldDuotone"
                        className="w-4 h-4"
                      />
                      Cloud relay server
                    </label>
                    <input
                      type="text"
                      value={settings.lucaLink.relayServerUrl || ""}
                      onChange={(e) =>
                        onUpdate("lucaLink", "relayServerUrl", e.target.value)
                      }
                      placeholder="https://lucaos.onrender.com"
                      className={`w-full rounded-lg p-3 outline-none font-mono text-sm transition-all border shadow-sm`}
                      style={settingsControlInlineStyle}
                    />
                    <p className="text-xs text-[var(--app-text-muted)] opacity-70 italic leading-tight">
                      Default relay provided. You can self-host your own.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  className={`flex flex-col gap-3 ${isMobile ? "px-4" : ""}`}
                >
                  {/* QR Code Scanner */}
                  <button
                    onClick={async () => {
                      const success = await qrScanner.scanAndConnect();
                      if (success) {
                        console.log("[LucaLink] Connected via QR scan");
                      }
                    }}
                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 border hover:bg-[var(--luca-surface-glass)] shadow-sm`}
                    style={settingsControlInlineStyle}
                  >
                    <Icon name="QrCode" className="w-5 h-5" /> Scan QR Code from
                    Primary Host
                  </button>

                  {/* Connect Button */}
                  <button
                    onClick={async () => {
                      const token = settings.lucaLink.vpnServerUrl?.trim();
                      if (!token) {
                        alert(
                          "Please enter a Pairing Token or scan the QR code",
                        );
                        return;
                      }
                      try {
                        await lucaLinkManager.console.joinWithToken(token);
                      } catch (e) {
                        console.error("[LucaLink] Failed to connect:", e);
                        alert(
                          "Failed to connect to Primary Host. Check the Pairing Token and try again.",
                        );
                      }
                    }}
                    disabled={linkState.connected}
                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 border shadow-sm`}
                    style={{
                      ...settingsControlInlineStyle,
                      borderColor: linkState.connected
                        ? settingsSurfaceTokens.accentPrimary
                        : settingsSurfaceTokens.borderSubtle,
                      color: linkState.connected
                        ? settingsSurfaceTokens.accentPrimary
                        : settingsSurfaceTokens.textPrimary,
                    }}
                  >
                    {linkState.connected ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Icon name="CheckCircle" className="w-5 h-5" />{" "}
                        Connected to Primary Host
                      </span>
                    ) : (
                      "Connect to Primary Host"
                    )}
                  </button>

                  {/* Disconnect button if connected */}
                  {linkState.connected && (
                    <button
                      onClick={() => lucaLinkManager.console.disconnect()}
                      className="w-full py-2 rounded-lg text-lg font-medium transition-all border shadow-sm"
                      style={settingsControlInlineStyle}
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {/* Privacy Note */}
                <div
                  className={`p-4 border transition-all ${isMobile ? "border-x-0 border-y rounded-none bg-[var(--luca-surface-glass)]" : "rounded-xl"} text-[var(--app-text-main)] opacity-90 shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name="Shield"
                      variant="BoldDuotone"
                      className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--app-text-main)]"
                    />
                    <div>
                      <div className="font-medium mb-1 text-sm opacity-70">
                        Security
                      </div>
                      <div className="font-bold mb-1 font-bold">
                        End-to-end encrypted
                      </div>
                      <p className="text-[var(--app-text-muted)] text-sm opacity-80">
                        Your connection to the Primary Host is encrypted.
                        Messages are never stored on any server.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ===== DESKTOP SERVER UI ===== */}
            {!isMobile && (
              <>
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-base font-bold text-[var(--app-text-muted)]">
                      Enable Luca Link Remote Access
                    </label>
                    <p className="text-sm text-[var(--app-text-muted)] opacity-60 mt-1">
                      Allow trusted Luca-capable hosts to pair securely with
                      this Primary Host
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !settings.lucaLink.enabled;
                      onUpdate("lucaLink", "enabled", newValue);

                      try {
                        if (newValue) {
                          await fetch(apiUrl("/api/luca-link/start"), {
                            method: "POST",
                          });
                          await lucaLinkManager.console.createRoom();
                        } else {
                          await fetch(apiUrl("/api/luca-link/stop"), {
                            method: "POST",
                          });
                          lucaLinkManager.console.disconnect();
                        }
                        console.log(
                          `[LucaLink] Server ${newValue ? "started" : "stopped"}`,
                        );
                      } catch (e) {
                        console.error("[LucaLink] Failed to toggle server:", e);
                      }
                    }}
                    className={`w-7 h-3.5 rounded-full transition-all relative ${settings.lucaLink.enabled ? "" : "bg-[var(--app-border-main)] opacity-40 hover:opacity-100"}`}
                    style={{
                      backgroundColor: settings.lucaLink.enabled
                        ? theme.hex
                        : undefined,
                    }}
                  >
                    <div
                      className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[var(--app-bg-tint)] transition-all ${settings.lucaLink.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                      style={{
                        backgroundColor: settings.lucaLink.enabled
                          ? "white"
                          : "var(--app-text-muted)",
                      }}
                    />
                  </button>
                </div>

                {/* QR Code Pairing Section - Show when enabled */}
                {settings.lucaLink.enabled && (
                  <div
                    className={`rounded-xl p-4 text-center space-y-3 border shadow-sm`}
                    style={{
                      backgroundColor: settingsSurfaceTokens.glass,
                      borderColor: settingsSurfaceTokens.borderSubtle,
                    }}
                  >
                    <div
                      className={`text-lg font-semibold text-[var(--app-text-main)]`}
                    >
                      Device pairing
                    </div>

                    <p
                      className={`text-lg text-[var(--app-text-muted)] mb-2 opacity-80`}
                    >
                      Pair trusted Luca-capable hosts in the adaptive host mesh
                      using this QR code or token.
                    </p>

                    {/* QR Code */}
                    {qrCodeUrl ? (
                      <div className="flex justify-center">
                        <div
                          className={`p-3 rounded-lg bg-[var(--app-bg-tint)] border border-[var(--app-border-main)]`}
                        >
                          <img
                            src={qrCodeUrl}
                            alt="Pairing QR Code"
                            className="w-40 h-40"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-[var(--app-text-muted)] text-base opacity-60">
                        Starting Luca Link...
                      </div>
                    )}

                    {/* Pairing Token */}
                    {linkState.pairingToken && (
                      <div className="space-y-1">
                        <p className={`text-lg text-[var(--app-text-muted)]`}>
                          Or enter this one-time pairing token:
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="px-3 py-1 rounded text-base font-mono bg-[var(--app-bg-tint)] border border-[var(--app-border-main)] text-[var(--app-text-main)]">
                            {linkState.pairingToken}
                          </code>
                          <button
                            onClick={copyRoomId}
                            className="p-1 rounded hover:bg-[var(--luca-surface-hover)] transition-colors"
                            title="Copy Token"
                          >
                            <Icon
                              name="Copy"
                              className="w-4 h-4"
                              style={{
                                color: copied
                                  ? settingsSurfaceTokens.accentPrimary
                                  : "var(--app-text-main)",
                              }}
                            />
                          </button>
                        </div>
                        {copied && (
                          <p className="text-sm text-[var(--luca-accent-primary,var(--app-core-hex))]">
                            Copied!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ========== GUEST ACCESS SECTION (Long Distance) ========== */}
                <GuestAccessSection
                  theme={theme}
                  connected={linkState.connected}
                />

                {/* Relay Server Configuration */}
                {settings.lucaLink.enabled && (
                  <div className="space-y-2 mt-4">
                    <label className="text-base font-bold text-[var(--app-text-muted)]">
                      Custom relay server
                    </label>
                    <input
                      type="text"
                      value={settings.lucaLink.relayServerUrl || ""}
                      onChange={(e) =>
                        onUpdate("lucaLink", "relayServerUrl", e.target.value)
                      }
                      disabled={!settings.lucaLink.enabled}
                      placeholder="https://lucaos.onrender.com"
                      className={`w-full rounded-lg p-3 outline-none font-mono text-sm disabled:opacity-50 transition-all border`}
                      style={settingsControlInlineStyle}
                    />
                    <p className="text-sm text-[var(--app-text-muted)] opacity-60">
                      Default encrypted relay provided. Advanced users can
                      self-host their own.
                    </p>
                  </div>
                )}

                {/* VPN Server URL */}
                {(settings.lucaLink.connectionMode === "auto" ||
                  settings.lucaLink.connectionMode === "vpn") && (
                  <div className="space-y-2">
                    <label className="text-base font-bold text-[var(--app-text-muted)]">
                      Trusted VPN server URL (optional)
                    </label>
                    <input
                      type="text"
                      value={settings.lucaLink.vpnServerUrl}
                      onChange={(e) =>
                        onUpdate("lucaLink", "vpnServerUrl", e.target.value)
                      }
                      disabled={!settings.lucaLink.enabled}
                      placeholder={`http://100.x.x.x:${WS_PORT} (Tailscale IP)`}
                      className={`w-full rounded-lg p-3 outline-none font-mono text-sm disabled:opacity-50 transition-all border`}
                      style={settingsControlInlineStyle}
                    />
                    <p className="text-sm text-[var(--app-text-muted)] opacity-60">
                      Leave empty for auto-detection. Use a trusted Tailscale IP
                      (100.x.x.x) if configured.
                    </p>
                  </div>
                )}

                {/* Info Box */}
                <div
                  className={`p-4 rounded-xl border transition-all text-[var(--app-text-main)] opacity-90 shadow-sm mt-6`}
                  style={{
                    backgroundColor: settingsSurfaceTokens.glass,
                    borderColor: settingsSurfaceTokens.borderSubtle,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name="Shield"
                      variant="BoldDuotone"
                      className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--app-text-main)]"
                    />
                    <div>
                      <div className="font-medium mb-1 text-sm opacity-70">
                        Privacy & Security
                      </div>
                      <div className="font-bold mb-1">
                        Connection Protection
                      </div>
                      <ul className="space-y-1 opacity-80 text-sm list-disc pl-4 text-[var(--app-text-muted)]">
                        <li>
                          Local & VPN: direct private routes, no relay server
                        </li>
                        <li>
                          Relay: End-to-end encrypted, messages are unreadable
                          by relay
                        </li>
                        <li>Auto mode prioritizes local for maximum privacy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SettingsSection>
        </>
      )}

      {deviceCenterTab === "sync" && (
        <SettingsSection
          title="Sync Behavior"
          description="Memory sync, settings sync, conversation handoff, voice handoff, and notification handoff stay user-readable."
          icon="RefreshCircle"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <SettingsRow
            label="Memory sync"
            description="Use existing Luca Link sync behavior when enabled."
          />
          <SettingsRow
            label="Settings sync"
            description="Keep device preferences aligned through the current link service."
          />
          <SettingsRow
            label="Conversation and voice handoff"
            description="Move between Primary Host, companion hosts, display hosts, browser hosts, and future Luca-capable hosts where Luca Link supports handoff."
          />
          <SettingsRow
            label="Notification handoff"
            description="Notification routing stays under existing service policy."
          />
        </SettingsSection>
      )}

      {deviceCenterTab === "approvals" && (
        <SettingsSection
          title="Access Control"
          description="Trusted devices, revoke device, confirmation requirements, and session expiry stay grouped here."
          icon="ShieldCheck"
          accentColor={theme.hex}
          isMobile={isMobile}
        >
          <SettingsCard>
            <p className="text-sm font-semibold">Trusted device flow</p>
            <p className="mt-1 text-xs opacity-70">
              Use the existing pairing and guest access controls to authorize or
              revoke devices.
            </p>
          </SettingsCard>
        </SettingsSection>
      )}

      {deviceCenterTab === "advanced" && (
        <SettingsAdvancedDisclosure
          title="Advanced Details"
          description="Relay mode, local network discovery, VPN/tunnel settings, pairing token diagnostics, and connection logs."
        >
          <SettingsRow
            label="Relay mode"
            description="Relay server URL and mode controls remain in the existing Luca Link fields."
          />
          <SettingsRow
            label="Local network discovery"
            description="Discovery diagnostics stay grouped with low-level connection details."
          />
          <SettingsRow
            label="VPN/tunnel settings"
            description="VPN server URL and tunnel details are advanced configuration."
          />
          <SettingsRow
            label="Connection logs"
            description="Pairing token and connection logs stay diagnostic-only."
          />
        </SettingsAdvancedDisclosure>
      )}
    </div>
  );
};

export default SettingsLucaLinkTab;
