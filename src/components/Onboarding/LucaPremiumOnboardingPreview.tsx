import React, { useEffect, useRef, useState } from "react";
import { LucaOnboardingShell } from "./LucaOnboardingShell";
import { LucaOnboardingScreen } from "./LucaOnboardingScreen";
import { LucaOnboardingMotion } from "./LucaOnboardingMotion";
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
 * staged premium onboarding stack works end-to-end:
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
 * Scope / boundary discipline (deliberately dormant):
 * - This component is mounted NOWHERE in the production boot path. It does not
 *   touch OnboardingFlow.tsx, App.tsx, WebLifecycleShell, the runtime adapters,
 *   routing, or the legacy `onComplete` contract.
 * - Completion is the engine's inert in-memory flag only; it activates nothing
 *   (no settings, provider, memory, tool, voice, or boot-state side effects).
 * - All visual scoping stays local via LucaOnboardingShell; nothing mutates
 *   document / body / html. It carries no status / safety semantics — the
 *   merged per-screen reassurance copy stays authoritative.
 */

export interface LucaPremiumOnboardingPreviewProps {
  audienceMode?: PremiumOnboardingAudienceMode;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  initialScreenId?: PremiumOnboardingScreenId;
  /**
   * Called once when the flow completes (finish primary CTA), with the final
   * flow state. When omitted the component is a dormant preview that activates
   * nothing; a live host (P4) provides this to bridge completion.
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
  const skinId = getLucaOnboardingFlowSelection(flow, "environment") ?? "carbon";
  // Calm per-screen entrance; Flow stays static and reduced motion always wins.
  const motionReduced = Boolean(reducedMotion) || skinId === "flow";
  const isLast = isLucaOnboardingFlowLastScreen(flow);
  const canBack = canLucaOnboardingFlowGoBack(flow);
  const canSkip = canLucaOnboardingFlowSkip(flow);
  const complete = isLucaOnboardingFlowComplete(flow);

  const completeFlow = () => setFlow((current) => lucaOnboardingFlowComplete(current));

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

  const activeTailStep =
    tail && !isOnboardingTailComplete(tail) ? currentOnboardingTailStep(tail) : undefined;

  const tailPresenceProps = {
    skinId,
    hostKind,
    reducedMotion,
    reducedTransparency,
  } as const;

  return (
    <LucaOnboardingShell
      selectedSkinId={skinId}
      surface={surfaceForScreen(screenId)}
      hostKind={hostKind}
      reducedMotion={reducedMotion}
      reducedTransparency={reducedTransparency}
      className={className}
      style={style}
    >
      <div
        data-luca-onboarding-preview
        data-luca-onboarding-preview-screen={screenId}
        data-luca-onboarding-preview-phase={activeTailStep ? "tail" : "flow"}
        data-luca-onboarding-preview-complete={complete ? "true" : "false"}
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "28px 24px 32px",
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

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
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
              onConnectorSelectionsChange={handleConnectorSelections}
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
