import type { WebProfile } from "../../web/webLifecycleStorage";
import {
  getLucaOnboardingFlowSelection,
  type LucaOnboardingFlowState,
} from "./lucaOnboardingFlowEngine";

/**
 * lucaOnboardingCompletionBridge — the PURE mapper from the premium onboarding
 * flow state to the existing completion contracts (per
 * docs/luca-premium-onboarding-productionization-plan.md, P1).
 *
 * The premium flow collects more than the legacy completion shapes accept:
 * `presence` and `intelligence_route` map cleanly onto the existing
 * `WebProfile` / desktop fields (and the optional display name from P2), but
 * `environment` (skin), `permission_style`,
 * `memory_boundaries`, and `connect_tools` have no legacy target. This mapper
 * NEVER drops a selection — it maps the clean fields and returns every premium
 * selection separately as `premiumPreferences`, so a later additive persistence
 * block (P3) can store them without overloading the legacy shape.
 *
 * Purity / boundary discipline:
 * - Plain TypeScript: flow state in, plain completion objects out. It imports
 *   no React/UI, reads no storage, performs no side effects, and writes nothing
 *   (it does not call completeWebOnboarding / saveSettings — wiring is P4+).
 * - It carries no status/safety semantics and grants nothing; it only describes
 *   what a future caller would persist.
 */

export interface LucaOnboardingPremiumPreferences {
  environment?: string;
  presence?: string;
  permissionStyle?: string;
  memoryBoundaries?: string;
  connectTools?: string;
  intelligenceRoute?: string;
  /**
   * Tool-app connectors the user marked to set up on the connect_tools screen.
   * Intent only — nothing is connected. First-party ids match
   * `settings.connectors` keys so Settings can surface them as pending setup.
   */
  connectors?: string[];
}

export interface LucaOnboardingWebCompletion {
  profile: WebProfile;
  premiumPreferences: LucaOnboardingPremiumPreferences;
}

export interface LucaOnboardingDesktopCompletion {
  setupComplete: true;
  preferredMode: "text" | "voice";
  premiumPreferences: LucaOnboardingPremiumPreferences;
}

const DEFAULT_BACKGROUND_OPACITY = 30;
const DEFAULT_BACKGROUND_BLUR = 40;

/** Voice presence maps to a voice-first interaction; everything else is chat. */
function mapInteraction(presence: string | undefined): "chat" | "voice" {
  return presence === "voice" ? "voice" : "chat";
}

/** Map the premium intelligence route onto the legacy WebProfile.modelRoute set. */
function mapModelRoute(
  route: string | undefined,
): WebProfile["modelRoute"] {
  switch (route) {
    case "bring_your_own_key":
      return "byok";
    case "local_model":
      return "desktop-later";
    case "cloud_provider":
    case "luca_prime":
    default:
      return "cloud";
  }
}

/** Collect every premium selection so nothing is dropped at the bridge. */
export function getLucaOnboardingPremiumPreferences(
  flow: LucaOnboardingFlowState,
): LucaOnboardingPremiumPreferences {
  return {
    environment: getLucaOnboardingFlowSelection(flow, "environment"),
    presence: getLucaOnboardingFlowSelection(flow, "presence"),
    permissionStyle: getLucaOnboardingFlowSelection(flow, "permission_style"),
    memoryBoundaries: getLucaOnboardingFlowSelection(flow, "memory_boundaries"),
    connectTools: getLucaOnboardingFlowSelection(flow, "connect_tools"),
    intelligenceRoute: getLucaOnboardingFlowSelection(flow, "intelligence_route"),
    connectors: [...(flow.connectorSelections ?? [])],
  };
}

/**
 * Map the premium flow to the web `WebProfile` completion shape. Skin/theme is
 * intentionally NOT forced onto a legacy UIThemeId (it stays in
 * premiumPreferences); name is not captured by the premium flow yet (P2).
 */
export function mapLucaOnboardingFlowToWebProfile(
  flow: LucaOnboardingFlowState,
): LucaOnboardingWebCompletion {
  const presence = getLucaOnboardingFlowSelection(flow, "presence");
  const route = getLucaOnboardingFlowSelection(flow, "intelligence_route");

  return {
    profile: {
      name: flow.displayName.trim(),
      interaction: mapInteraction(presence),
      theme: "PROFESSIONAL",
      modelRoute: mapModelRoute(route),
      personality: "proactive",
      backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
      backgroundBlur: DEFAULT_BACKGROUND_BLUR,
    },
    premiumPreferences: getLucaOnboardingPremiumPreferences(flow),
  };
}

/** Map the premium flow to the desktop completion (settings general block). */
export function mapLucaOnboardingFlowToDesktopCompletion(
  flow: LucaOnboardingFlowState,
): LucaOnboardingDesktopCompletion {
  const presence = getLucaOnboardingFlowSelection(flow, "presence");

  return {
    setupComplete: true,
    preferredMode: presence === "voice" ? "voice" : "text",
    premiumPreferences: getLucaOnboardingPremiumPreferences(flow),
  };
}
