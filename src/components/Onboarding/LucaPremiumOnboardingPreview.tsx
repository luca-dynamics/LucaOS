import React, { useEffect, useRef, useState } from "react";
import LucaPresence from "../presence/LucaPresence";
import { LucaOnboardingShell } from "./LucaOnboardingShell";
import { LucaOnboardingScreen } from "./LucaOnboardingScreen";
import { LucaOnboardingMotion } from "./LucaOnboardingMotion";
import { isElectron } from "../../utils/env";
import { startConnectorAuth } from "../../services/connectorAuth";
import type { ConnectorCatalogEntry } from "../../config/connectorCatalog";
import {
  canLucaOnboardingFlowGoBack,
  canLucaOnboardingFlowSkip,
  createLucaOnboardingFlowState,
  getLucaOnboardingFlowIndex,
  getLucaOnboardingFlowSelection,
  getLucaOnboardingFlowTotal,
  isLucaOnboardingFlowComplete,
  isLucaOnboardingFlowLastScreen,
  lucaOnboardingFlowComplete,
  lucaOnboardingFlowGoBack,
  lucaOnboardingFlowGoNext,
  lucaOnboardingFlowSetName,
  lucaOnboardingFlowSetMaterial,
  lucaOnboardingFlowSetOption,
  lucaOnboardingFlowSetConnectors,
  lucaOnboardingFlowSkip,
  type LucaOnboardingFlowState,
} from "./lucaOnboardingFlowEngine";
import type {
  PremiumOnboardingAudienceMode,
  PremiumOnboardingScreenId,
} from "./onboardingPremiumCopy";
import {
  advanceOnboardingTail,
  createOnboardingTailState,
  currentOnboardingTailStep,
  isOnboardingTailComplete,
  type LucaOnboardingTailState,
} from "./lucaOnboardingTailController";
import { LucaFaceRecognitionMoment } from "./LucaFaceRecognitionMoment";
import { LucaLocalIntelligenceMoment } from "./LucaLocalIntelligenceMoment";
import type { LucaLocalEndpointStatus } from "../../services/llm/lucaLocalEndpointService";
import type { LucaOnboardingSkinBoundarySurface } from "../../styles/lucaOnboardingSkinBoundary";
import type { LucaSkinHostKind } from "../../config/lucaSkins";

const NOT_CONFIGURED_ENDPOINT: LucaLocalEndpointStatus = {
  configured: false,
  servedCuratedModels: [],
};

function detectCameraAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator).mediaDevices !== "undefined"
  );
}

/**
 * LucaPremiumOnboardingPreview — a PREVIEW-ONLY composition that proves the
 * production onboarding stack used by both desktop and web:
 *
 *   lucaOnboardingFlowEngine (state)
 *        ↓ selectors / transitions
 *   LucaOnboardingScreen (renderer)
 *        ↓ inside
 *   LucaOnboardingShell (skin + presence boundary)
 *
 * It holds the pure flow-engine state in local React state and maps the
 * engine's selectors onto the renderer's props; CTA / option / back controls
 * call the engine's pure transitions. The chosen environment option drives the
 * shell's skin so the look responds as the user picks.
 *
 * Scope / boundary discipline:
 * - Hosts provide `onComplete` to bridge the final state through their guarded
 *   persistence and lifecycle transition.
 * - This component does not directly activate tools, models, memory, voice, or
 *   boot-state side effects.
 * - All visual scoping stays local via LucaOnboardingShell; nothing mutates
 *   document / body / html. It carries no status / safety semantics — the
 *   merged per-screen reassurance copy stays authoritative.
 */

export interface LucaPremiumOnboardingPreviewProps {
  /**
   * Settle handoff duration in ms (the face travelling to the rail anchor
   * before completion fires). 0 completes synchronously; reduced motion
   * always does.
   */
  settleDurationMs?: number;
  audienceMode?: PremiumOnboardingAudienceMode;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  initialScreenId?: PremiumOnboardingScreenId;
  /**
   * Called once when the flow completes (finish primary CTA), with the final
   * flow state. Tests and isolated previews may omit it; production hosts pass
   * it to bridge completion through the host lifecycle.
   */
  onComplete?: (flow: LucaOnboardingFlowState) => void;
  /** Whether this host can provision local models (gates the local-setup tail step). */
  supportsLocalProvisioning?: boolean;
  /** Override camera availability (defaults to detecting navigator.mediaDevices). */
  cameraAvailable?: boolean;
  /** Whether to offer the optional face-recognition tail step (default true). */
  offerFaceRecognition?: boolean;
  /** Resolved local endpoint status for the local-setup step (caller probes via L3). */
  localEndpointStatus?: LucaLocalEndpointStatus;
  /** System RAM (bytes) to recommend models that fit, in the local-setup step. */
  systemRamBytes?: number;
  className?: string;
  style?: React.CSSProperties;
}

const surfaceForScreen = (
  screenId: PremiumOnboardingScreenId,
): LucaOnboardingSkinBoundarySurface => {
  if (screenId === "welcome") return "onboarding-welcome";
  if (screenId === "finish") return "onboarding-finish";
  return "onboarding-step";
};

export const LucaPremiumOnboardingPreview: React.FC<
  LucaPremiumOnboardingPreviewProps
> = ({
  settleDurationMs = 900,
  audienceMode = "basic",
  hostKind,
  reducedMotion,
  reducedTransparency,
  initialScreenId,
  onComplete,
  supportsLocalProvisioning = false,
  cameraAvailable,
  offerFaceRecognition = true,
  localEndpointStatus,
  systemRamBytes,
  className,
  style,
}) => {
  const [flow, setFlow] = useState<LucaOnboardingFlowState>(() =>
    createLucaOnboardingFlowState({
      audienceMode,
      startScreenId: initialScreenId,
    }),
  );
  // The functional tail (face / local) runs after the finish CTA; null = still in choices.
  const [tail, setTail] = useState<LucaOnboardingTailState | null>(null);

  // Fire onComplete exactly once when the flow completes (StrictMode-safe).
  const completedRef = useRef(false);
  useEffect(() => {
    if (flow.complete && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(flow);
    }
  }, [flow, onComplete]);

  const screenId = flow.currentScreenId;
  // The environment selection is also the skin choice (ids align 1:1).
  const chosenSkinId =
    getLucaOnboardingFlowSelection(flow, "environment") ?? "carbon";
  // Hover preview: the being tries the room on while the pointer hovers a
  // skin card — the WHOLE surface re-skins live, then falls back to the
  // chosen room on leave. Display-only; nothing persists until selection.
  const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);
  const skinId = previewSkinId ?? chosenSkinId;
  // Settle handoff: after "Enter LucaOS" the face travels to the rail anchor
  // before completion fires — the identity comes to rest, then the shell
  // takes over. Reduced motion skips straight through.
  const [settling, setSettling] = useState(false);
  // Calm per-screen entrance; Flow stays static and reduced motion always wins.
  const motionReduced = Boolean(reducedMotion) || skinId === "flow";
  const isLast = isLucaOnboardingFlowLastScreen(flow);
  const canBack = canLucaOnboardingFlowGoBack(flow);
  const canSkip = canLucaOnboardingFlowSkip(flow);
  const complete = isLucaOnboardingFlowComplete(flow);

  const completeFlow = () => {
    if (reducedMotion || settling || settleDurationMs <= 0) {
      setFlow((current) => lucaOnboardingFlowComplete(current));
      return;
    }
    setSettling(true);
    window.setTimeout(() => {
      setFlow((current) => lucaOnboardingFlowComplete(current));
    }, settleDurationMs + 50);
  };

  const handlePrimary = () => {
    if (!isLucaOnboardingFlowLastScreen(flow)) {
      setFlow((current) => lucaOnboardingFlowGoNext(current));
      return;
    }
    // On finish: run the functional tail first; complete immediately if it's empty.
    const tailState = createOnboardingTailState({
      intelligenceRoute: getLucaOnboardingFlowSelection(flow, "intelligence_route"),
      supportsLocalProvisioning,
      cameraAvailable: cameraAvailable ?? detectCameraAvailable(),
      offerFaceRecognition,
    });
    if (isOnboardingTailComplete(tailState)) {
      completeFlow();
    } else {
      setTail(tailState);
    }
  };

  // Advance the tail; when it finishes, complete the flow (fires onComplete).
  const advanceTail = () =>
    setTail((current) => {
      if (!current) return current;
      const next = advanceOnboardingTail(current);
      if (isOnboardingTailComplete(next)) {
        completeFlow();
        return null;
      }
      return next;
    });

  const handleSecondary = () =>
    setFlow((current) =>
      canLucaOnboardingFlowSkip(current)
        ? lucaOnboardingFlowSkip(current)
        : lucaOnboardingFlowGoBack(current),
    );

  const handleBack = () => setFlow((current) => lucaOnboardingFlowGoBack(current));

  const handleSelectOption = (optionId: string) =>
    setFlow((current) =>
      lucaOnboardingFlowSetOption(current, current.currentScreenId, optionId),
    );

  const handleNameChange = (name: string) =>
    setFlow((current) => lucaOnboardingFlowSetName(current, name));

  const handleConnectorSelections = (connectorIds: string[]) =>
    setFlow((current) => lucaOnboardingFlowSetConnectors(current, connectorIds));

  // Real connect flow is only offered where a desktop host is present (LucaLink
  // events + local API resolve there). In browser-safe / offline onboarding the
  // tiles fall back to marking intent for later setup in Settings.
  const canConnectTools = isElectron();
  const handleConnectorConnect = (connector: ConnectorCatalogEntry) => {
    void startConnectorAuth(connector, {
      onError: (message) => console.warn("[Onboarding connect]", message),
    });
  };

  const activeTailStep =
    tail && !isOnboardingTailComplete(tail) ? currentOnboardingTailStep(tail) : undefined;

  const tailPresenceProps = {
    skinId,
    hostKind,
    reducedMotion,
    reducedTransparency,
  } as const;
  const reserveWindowControls = hostKind === "desktop-app";

  return (
    <LucaOnboardingShell
      selectedSkinId={skinId}
      surface={surfaceForScreen(screenId)}
      hostKind={hostKind}
      reducedMotion={reducedMotion}
      reducedTransparency={reducedTransparency}
      userMaterialOpacity={flow.materialOpacity}
      userMaterialBlurPx={flow.materialBlur}
      className={className}
      style={style}
    >
      {settling && (
        <div
          data-luca-onboarding-settle
          aria-hidden="true"
          style={{
            position: "fixed",
            zIndex: 60,
            transform: "translate(-50%, -50%)",
            animation: `luca-presence-settle ${settleDurationMs}ms cubic-bezier(0.22, 0.88, 0.24, 1) forwards`,
            pointerEvents: "none",
          }}
        >
          <LucaPresence
            state="identity"
            size={210}
            label="Luca"
            breathing
            skinId={skinId}
            hostKind={hostKind}
            reducedMotion={reducedMotion}
            reducedTransparency={reducedTransparency}
            style={{ width: "100%" }}
          />
        </div>
      )}
      <div
        data-luca-onboarding-preview
        data-luca-onboarding-preview-screen={screenId}
        data-luca-onboarding-preview-phase={activeTailStep ? "tail" : "flow"}
        data-luca-onboarding-preview-complete={complete ? "true" : "false"}
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          padding: reserveWindowControls ? "36px 24px 32px" : "28px 24px 32px",
        }}
      >
        {activeTailStep ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {activeTailStep === "face-recognition" ? (
              <LucaFaceRecognitionMoment
                userName={flow.displayName}
                onComplete={advanceTail}
                onSkip={advanceTail}
                {...tailPresenceProps}
              />
            ) : (
              <LucaLocalIntelligenceMoment
                status={localEndpointStatus ?? NOT_CONFIGURED_ENDPOINT}
                systemRamBytes={systemRamBytes}
                onConnect={advanceTail}
                onSetUpNow={advanceTail}
                onSkipToCloud={advanceTail}
                onLater={advanceTail}
                {...tailPresenceProps}
              />
            )}
          </div>
        ) : (
          <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            paddingRight: reserveWindowControls ? 88 : 0,
          }}
        >
          {canBack ? (
            <button
              type="button"
              data-luca-onboarding-preview-back
              onClick={handleBack}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: "6px 8px",
                fontSize: 14,
                color: "var(--luca-text-secondary)",
              }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <span
            data-luca-onboarding-preview-progress
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              color: "var(--luca-text-tertiary)",
            }}
          >
            {getLucaOnboardingFlowIndex(flow) + 1} / {getLucaOnboardingFlowTotal()}
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: screenId === "environment" ? 1100 : undefined,
            margin: "0 auto",
          }}
        >
          <LucaOnboardingMotion
            key={screenId}
            reducedMotion={motionReduced}
            style={{ width: "100%" }}
          >
            <LucaOnboardingScreen
              screenId={screenId}
              audienceMode={audienceMode}
              selectedOptionId={getLucaOnboardingFlowSelection(flow, screenId)}
              onSelectOption={handleSelectOption}
              nameValue={flow.displayName}
              onNameChange={handleNameChange}
              onPreviewOption={
                screenId === "environment" ? setPreviewSkinId : undefined
              }
              materialValue={{
                opacity: flow.materialOpacity ?? 0.3,
                blur: flow.materialBlur ?? 40,
              }}
              onMaterialChange={(material) =>
                setFlow((current) =>
                  lucaOnboardingFlowSetMaterial(current, material),
                )
              }
              onConnectorSelectionsChange={handleConnectorSelections}
              canConnectTools={canConnectTools}
              onConnectorConnect={handleConnectorConnect}
              onPrimary={handlePrimary}
              onSecondary={handleSecondary}
              skinId={skinId}
              hostKind={hostKind}
              reducedMotion={reducedMotion}
              reducedTransparency={reducedTransparency}
              style={{ width: "100%" }}
            />
          </LucaOnboardingMotion>
        </div>
          </>
        )}
      </div>
    </LucaOnboardingShell>
  );
};

export default LucaPremiumOnboardingPreview;
