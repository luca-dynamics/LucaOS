import type { PremiumOnboardingScreenId } from "./onboardingPremiumCopy";

export type PremiumOnboardingScreenCategory =
  | "intro"
  | "appearance"
  | "presence"
  | "trust"
  | "tools"
  | "intelligence"
  | "finish";

export type PremiumOnboardingSavedDataIntent =
  | "none"
  | "display_name"
  | "environment_preference"
  | "presence_preference"
  | "permission_style_preference"
  | "memory_boundary_preference"
  | "tool_connection_intent"
  | "intelligence_route_preference"
  | "completion_state";

export type PremiumOnboardingRuntimeEffect = "none" | "deferred_preference_only" | "finish_only";

export interface PremiumOnboardingScreenMapEntry {
  id: PremiumOnboardingScreenId;
  order: number;
  category: PremiumOnboardingScreenCategory;
  copyScreenId: PremiumOnboardingScreenId;
  defaultOptionId?: string;
  savedDataIntent: PremiumOnboardingSavedDataIntent[];
  runtimeEffect: PremiumOnboardingRuntimeEffect;
  canSkip: boolean;
  canGoBack: boolean;
  requiresExplicitConsent: boolean;
  mobileLayout: "single_column" | "summary";
  accessibilityRole: "screen" | "radiogroup" | "summary";
  sideEffectBoundary: string[];
}

export type PremiumOnboardingScreenMap = Record<PremiumOnboardingScreenId, PremiumOnboardingScreenMapEntry>;

export interface PremiumOnboardingDefaultSelections {
  environment: "pearl";
  presence: "minichat";
  permission_style: "ask_when_needed";
  memory_boundaries: "ask_before_personal";
  connect_tools: "set_up_later";
  intelligence_route: "luca_prime";
}

export const premiumOnboardingScreenMapOrder = [
  "welcome",
  "environment",
  "presence",
  "permission_style",
  "memory_boundaries",
  "connect_tools",
  "intelligence_route",
  "finish",
] as const satisfies readonly PremiumOnboardingScreenId[];

const createScreenMapEntry = (
  entry: Omit<PremiumOnboardingScreenMapEntry, "order">,
): PremiumOnboardingScreenMapEntry => ({
  ...entry,
  order: premiumOnboardingScreenMapOrder.indexOf(entry.id),
});

const premiumOnboardingScreenMap: PremiumOnboardingScreenMap = {
  welcome: createScreenMapEntry({
    id: "welcome",
    category: "intro",
    copyScreenId: "welcome",
    savedDataIntent: ["none"],
    runtimeEffect: "none",
    canSkip: true,
    canGoBack: false,
    requiresExplicitConsent: false,
    mobileLayout: "single_column",
    accessibilityRole: "screen",
    sideEffectBoundary: [
      "no provider changes",
      "no memory changes",
      "no governance changes",
      "no tool changes",
      "no storage writes",
      "no route changes",
    ],
  }),
  environment: createScreenMapEntry({
    id: "environment",
    category: "appearance",
    copyScreenId: "environment",
    defaultOptionId: "pearl",
    savedDataIntent: ["environment_preference"],
    runtimeEffect: "deferred_preference_only",
    canSkip: true,
    canGoBack: true,
    requiresExplicitConsent: false,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: [
      "no skin boundary",
      "no root or global skin mutation",
      "no semantic-status color changes",
    ],
  }),
  presence: createScreenMapEntry({
    id: "presence",
    category: "presence",
    copyScreenId: "presence",
    defaultOptionId: "minichat",
    savedDataIntent: ["presence_preference"],
    runtimeEffect: "deferred_preference_only",
    canSkip: true,
    canGoBack: true,
    requiresExplicitConsent: false,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: [
      "no microphone start",
      "no voice listener",
      "no widget launch",
      "no feature disabling",
    ],
  }),
  permission_style: createScreenMapEntry({
    id: "permission_style",
    category: "trust",
    copyScreenId: "permission_style",
    defaultOptionId: "ask_when_needed",
    savedDataIntent: ["permission_style_preference"],
    runtimeEffect: "deferred_preference_only",
    canSkip: false,
    canGoBack: true,
    requiresExplicitConsent: true,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: ["no governance bypass", "no security weakening", "no automatic tool grants"],
  }),
  memory_boundaries: createScreenMapEntry({
    id: "memory_boundaries",
    category: "trust",
    copyScreenId: "memory_boundaries",
    defaultOptionId: "ask_before_personal",
    savedDataIntent: ["memory_boundary_preference"],
    runtimeEffect: "deferred_preference_only",
    canSkip: false,
    canGoBack: true,
    requiresExplicitConsent: true,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: [
      "no memory engine mutation",
      "no embeddings",
      "no deletion",
      "no automatic personal-detail save",
    ],
  }),
  connect_tools: createScreenMapEntry({
    id: "connect_tools",
    category: "tools",
    copyScreenId: "connect_tools",
    defaultOptionId: "set_up_later",
    savedDataIntent: ["tool_connection_intent"],
    runtimeEffect: "deferred_preference_only",
    canSkip: true,
    canGoBack: true,
    requiresExplicitConsent: true,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: [
      "no browser automation",
      "no file-app permissions",
      "no LucaLink pairing",
      "no secure vault writes",
    ],
  }),
  intelligence_route: createScreenMapEntry({
    id: "intelligence_route",
    category: "intelligence",
    copyScreenId: "intelligence_route",
    defaultOptionId: "luca_prime",
    savedDataIntent: ["intelligence_route_preference"],
    runtimeEffect: "deferred_preference_only",
    canSkip: true,
    canGoBack: true,
    requiresExplicitConsent: true,
    mobileLayout: "single_column",
    accessibilityRole: "radiogroup",
    sideEffectBoundary: [
      "no provider routing change",
      "no local model start or download",
      "no key storage",
      "no cloud grant",
    ],
  }),
  finish: createScreenMapEntry({
    id: "finish",
    category: "finish",
    copyScreenId: "finish",
    savedDataIntent: ["completion_state"],
    runtimeEffect: "finish_only",
    canSkip: false,
    canGoBack: true,
    requiresExplicitConsent: true,
    mobileLayout: "summary",
    accessibilityRole: "summary",
    sideEffectBoundary: [
      "completion only after explicit Enter LucaOS",
      "no hidden provider, memory, tool, or governance activation",
    ],
  }),
};

export const getPremiumOnboardingScreenMap = (): PremiumOnboardingScreenMap => premiumOnboardingScreenMap;

export const getPremiumOnboardingScreenEntry = (
  id: PremiumOnboardingScreenId,
): PremiumOnboardingScreenMapEntry => premiumOnboardingScreenMap[id];

export const getPremiumOnboardingNextScreen = (
  id: PremiumOnboardingScreenId,
): PremiumOnboardingScreenId | undefined => premiumOnboardingScreenMapOrder[premiumOnboardingScreenMap[id].order + 1];

export const getPremiumOnboardingPreviousScreen = (
  id: PremiumOnboardingScreenId,
): PremiumOnboardingScreenId | undefined => premiumOnboardingScreenMapOrder[premiumOnboardingScreenMap[id].order - 1];

export const getPremiumOnboardingDefaultSelections = (): PremiumOnboardingDefaultSelections => ({
  environment: "pearl",
  presence: "minichat",
  permission_style: "ask_when_needed",
  memory_boundaries: "ask_before_personal",
  connect_tools: "set_up_later",
  intelligence_route: "luca_prime",
});

