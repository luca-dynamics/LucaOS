import React from "react";
import { LucaPresence } from "../presence/LucaPresence";
import {
  recommendServedModelsForRam,
  type LucaLocalEndpointStatus,
} from "../../services/llm/lucaLocalEndpointService";
import type { LucaUnifiedModel } from "../../services/llm/lucaUnifiedModelRegistry";
import type { LucaSkinHostKind, LucaSkinId } from "../../config/lucaSkins";

/**
 * LucaLocalIntelligenceMoment — the calm, optional local-model setup moment
 * (per docs/luca-onboarding-local-intelligence-setup-spec.md, P5b/L4).
 *
 * It renders, in Luca's voice with its identity presence, one of three states
 * derived from the L3 endpoint status:
 *  - detected   — an endpoint is online; Luca recommends connecting to the
 *                 models it already serves (filtered to those that fit RAM).
 *  - endpoint-issue — configured but unreachable/needs-key/etc; honest + calm,
 *                 never a failure scream, with a "later" path.
 *  - offer-setup — nothing configured; set it up now, or stay on Luca Prime /
 *                 cloud and add local later in Settings.
 *
 * Boundary discipline: presentational and inert. It consumes a resolved status
 * (the caller does the async probe via lucaLocalEndpointService) and only
 * invokes callbacks — it connects/installs/starts nothing, mounts no provider,
 * does not write to document/body/html, and carries no status/safety semantics.
 * Local setup is always optional and skippable.
 */

export type LucaLocalIntelligenceState =
  | "detected"
  | "endpoint-issue"
  | "offer-setup";

export interface LucaLocalIntelligenceMomentProps {
  status: LucaLocalEndpointStatus;
  /** System RAM (bytes) to filter recommendations to models that fit. */
  systemRamBytes?: number;
  /** Connect to the already-running endpoint (optionally a specific model). */
  onConnect?: (modelId?: string) => void;
  /** Begin local setup now (the heavier install path; handled by the caller). */
  onSetUpNow?: () => void;
  /** Stay on Luca Prime / cloud for now. */
  onSkipToCloud?: () => void;
  /** Defer local setup to Settings. */
  onLater?: () => void;
  skinId?: LucaSkinId | string;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const textPrimary = "var(--luca-text-primary)";
const textSecondary = "var(--luca-text-secondary)";
const textTertiary = "var(--luca-text-tertiary)";
const accent = "var(--luca-accent-primary)";

export function deriveLocalIntelligenceState(
  status: LucaLocalEndpointStatus,
): LucaLocalIntelligenceState {
  if (!status.configured) return "offer-setup";
  if (status.health?.status === "online") return "detected";
  return "endpoint-issue";
}

const primaryButton: React.CSSProperties = {
  cursor: "pointer",
  padding: "11px 22px",
  borderRadius: 12,
  border: "none",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--luca-background-base)",
  background: accent,
  boxShadow: "var(--luca-shadow-soft)",
};
const subtleButton: React.CSSProperties = {
  cursor: "pointer",
  padding: "11px 18px",
  borderRadius: 12,
  border: "1px solid var(--luca-surface-hover)",
  fontSize: 15,
  fontWeight: 500,
  color: textSecondary,
  background: "transparent",
};

function ModelRow({
  model,
  onConnect,
}: {
  model: LucaUnifiedModel;
  onConnect?: (modelId?: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      data-luca-local-model={model.id}
      onClick={onConnect ? () => onConnect(model.id) : undefined}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: onConnect ? "pointer" : "default",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid var(--luca-surface-hover)",
        background: "var(--luca-surface-glass)",
        color: textPrimary,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14 }}>{model.name}</span>
      <span style={{ display: "block", marginTop: 3, fontSize: 12, color: textTertiary }}>
        {model.license.name}
        {model.minRamBytes ? ` · needs ~${Math.round(model.minRamBytes / 1e9)}GB RAM` : ""}
      </span>
    </button>
  );
}

export const LucaLocalIntelligenceMoment: React.FC<
  LucaLocalIntelligenceMomentProps
> = ({
  status,
  systemRamBytes,
  onConnect,
  onSetUpNow,
  onSkipToCloud,
  onLater,
  skinId,
  hostKind,
  reducedMotion,
  reducedTransparency,
  className,
  style,
}) => {
  const state = deriveLocalIntelligenceState(status);
  const recommended =
    systemRamBytes === undefined
      ? status.servedCuratedModels
      : recommendServedModelsForRam(status.servedCuratedModels, systemRamBytes);

  return (
    <section
      data-luca-local-moment
      data-luca-local-moment-state={state}
      aria-label="Set up local intelligence"
      className={className}
      style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", color: textPrimary, ...style }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <LucaPresence
          state="identity"
          label="Luca"
          skinId={skinId}
          hostKind={hostKind}
          reducedMotion={reducedMotion}
          reducedTransparency={reducedTransparency}
        />
      </div>

      {state === "detected" && (
        <>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 650, letterSpacing: "-0.02em" }}>
            I can see you already run models here
          </h2>
          <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: textSecondary }}>
            Want me to use your local models? Nothing downloads — I&rsquo;ll just
            connect to what&rsquo;s already running.
          </p>
          {recommended.length > 0 && (
            <div data-luca-local-models style={{ display: "flex", flexDirection: "column", gap: 8, margin: "18px 0 0" }}>
              {recommended.map((model) => (
                <ModelRow key={model.id} model={model} onConnect={onConnect} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "22px 0 0" }}>
            <button type="button" data-luca-local-cta="connect" onClick={() => onConnect?.()} style={primaryButton}>
              Use my local models
            </button>
            <button type="button" data-luca-local-cta="skip" onClick={onSkipToCloud} style={subtleButton}>
              Not now
            </button>
          </div>
        </>
      )}

      {state === "endpoint-issue" && (
        <>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 650, letterSpacing: "-0.02em" }}>
            I couldn&rsquo;t reach your local models
          </h2>
          <p data-luca-local-health style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: textSecondary }}>
            {status.health?.message ?? "The local endpoint isn't responding right now."}{" "}
            That&rsquo;s okay — I can stay on Luca Prime and you can sort this out later.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "22px 0 0" }}>
            <button type="button" data-luca-local-cta="skip" onClick={onSkipToCloud} style={primaryButton}>
              Continue on Luca Prime
            </button>
            <button type="button" data-luca-local-cta="later" onClick={onLater} style={subtleButton}>
              Fix it later in Settings
            </button>
          </div>
        </>
      )}

      {state === "offer-setup" && (
        <>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 650, letterSpacing: "-0.02em" }}>
            Want me to think locally on this device?
          </h2>
          <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: textSecondary }}>
            I can run a private model on this device. Setting one up takes a normal
            install and download, or you can stay on Luca Prime and add local later.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, margin: "22px 0 0" }}>
            <button type="button" data-luca-local-cta="setup-now" onClick={onSetUpNow} style={primaryButton}>
              Set it up now
            </button>
            <button type="button" data-luca-local-cta="skip" onClick={onSkipToCloud} style={subtleButton}>
              Stay on Luca Prime
            </button>
            <button
              type="button"
              data-luca-local-cta="later"
              onClick={onLater}
              style={{ ...subtleButton, border: "none", color: textTertiary, padding: "4px 8px", fontSize: 13 }}
            >
              Set up local later in Settings
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default LucaLocalIntelligenceMoment;
