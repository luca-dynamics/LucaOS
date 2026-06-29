export type PremiumOnboardingAudienceMode = "basic" | "pro" | "creator";

export type PremiumOnboardingScreenId =
  | "welcome"
  | "environment"
  | "presence"
  | "permission_style"
  | "memory_boundaries"
  | "connect_tools"
  | "intelligence_route"
  | "finish";

export interface PremiumOnboardingOptionCopy {
  id: string;
  title: string;
  description: string;
  recommended?: boolean;
  advanced?: boolean;
}

export interface PremiumOnboardingScreenCopy {
  id: PremiumOnboardingScreenId;
  eyebrow?: string;
  title: string;
  summary: string;
  reassurance?: string;
  primaryCta: string;
  secondaryCta?: string;
  detailsLabel?: string;
  options?: PremiumOnboardingOptionCopy[];
  accessibilityLabel?: string;
}

export interface PremiumOnboardingCopySet {
  mode: PremiumOnboardingAudienceMode;
  screens: Record<PremiumOnboardingScreenId, PremiumOnboardingScreenCopy>;
}

export const premiumOnboardingScreenOrder = [
  "welcome",
  "environment",
  "presence",
  "permission_style",
  "memory_boundaries",
  "connect_tools",
  "intelligence_route",
  "finish",
] as const satisfies readonly PremiumOnboardingScreenId[];

export const premiumOnboardingBasicBannedTerms = [
  "protocol",
  "directive",
  "kernel",
  "sovereign",
  "operator",
  "runtime",
  "provisioning",
  "calibration",
  "cognitive core",
  "tactical",
  "command center",
] as const;

const environmentOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "pearl",
    title: "Pearl",
    description: "I'll keep the space bright, quiet, and easy to read.",
    recommended: true,
  },
  {
    id: "carbon",
    title: "Carbon",
    description: "I'll keep the space dark, focused, and comfortable for longer sessions.",
  },
  {
    id: "flow",
    title: "Flow",
    description: "I'll add gentle depth while staying behind your work.",
  },
  {
    id: "canvas",
    title: "Canvas",
    description: "I'll make the space feel warm for writing, planning, and making things.",
  },
];

const presenceOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "minichat",
    title: "MiniChat",
    description: "I'll stay in a small chat surface until you bring me forward.",
    recommended: true,
  },
  {
    id: "voice",
    title: "Voice",
    description: "I'll be available for spoken conversations when you choose to enable voice.",
  },
  {
    id: "widget",
    title: "Widget",
    description: "I'll keep a compact entry point near your workspace.",
  },
  {
    id: "presence",
    title: "Presence",
    description: "I'll stay visible as a subtle presence while you work.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "I'll open the full LucaOS workspace when you want a broader view.",
  },
];

const permissionOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "ask_every_time",
    title: "Ask every time",
    description: "I'll check with you before taking action outside the conversation.",
  },
  {
    id: "ask_when_needed",
    title: "Ask when needed",
    description: "I'll handle low-risk steps smoothly and still ask before sensitive or destructive actions.",
    recommended: true,
  },
  {
    id: "custom",
    title: "Custom",
    description: "You can choose more detailed asking rules later in Settings.",
    advanced: true,
  },
];

const memoryOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "remember_preferences",
    title: "Remember preferences",
    description: "I'll keep simple preferences, like tone and workspace habits, so help feels more personal.",
    recommended: true,
  },
  {
    id: "ask_before_personal",
    title: "Ask before personal details",
    description: "I'll ask before keeping anything that feels personal or specific to your life.",
  },
  {
    id: "ask_before_anything",
    title: "Ask before remembering anything",
    description: "I'll check with you before keeping any new information for later.",
  },
];

const toolOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "connect_now",
    title: "Connect now",
    description: "I'll show optional tool connections and wait for you to approve each one.",
  },
  {
    id: "set_up_later",
    title: "Set up later",
    description: "We can enter LucaOS now and connect tools from Settings when you're ready.",
    recommended: true,
  },
];

const routeOptions: PremiumOnboardingOptionCopy[] = [
  {
    id: "luca_prime",
    title: "Luca Prime",
    description: "I'll use my recommended intelligence path for a balanced first experience.",
    recommended: true,
  },
  {
    id: "cloud_provider",
    title: "Cloud provider",
    description: "I'll prefer a connected model provider after you review and approve the connection.",
  },
  {
    id: "local_model",
    title: "Local model",
    description: "I'll prefer models on this device after you choose and start them yourself.",
    advanced: true,
  },
  {
    id: "bring_your_own_key",
    title: "Bring your own provider access",
    description: "I'll use your own provider access later, after you add it in Settings.",
    advanced: true,
  },
];

const basicScreens: PremiumOnboardingCopySet["screens"] = {
  welcome: {
    id: "welcome",
    eyebrow: "First run",
    title: "I'm Luca",
    summary:
      "I'll help from inside LucaOS through chat, voice, workspace surfaces, memory, tools, and actions you approve.",
    primaryCta: "Start with me",
    secondaryCta: "Set up later",
    accessibilityLabel: "Meet Luca",
  },
  environment: {
    id: "environment",
    title: "How should this space feel?",
    summary: "Choose the look you want me to use first. You can change it anytime in Settings.",
    reassurance:
      "This only describes a future visual choice. It does not change safety behavior or apply a device-wide look now.",
    primaryCta: "Continue",
    secondaryCta: "Skip for now",
    detailsLabel: "About environments",
    options: environmentOptions,
  },
  presence: {
    id: "presence",
    title: "How should I stay nearby?",
    summary: "Choose where I should appear first. You can turn on more surfaces later.",
    reassurance: "These are starting points, not permanent limits.",
    primaryCta: "Continue",
    secondaryCta: "Decide later",
    detailsLabel: "About Luca surfaces",
    options: presenceOptions,
  },
  permission_style: {
    id: "permission_style",
    title: "When should I ask first?",
    summary: "Set how often I should check with you before taking action.",
    reassurance:
      "Sensitive or destructive actions always ask first, and this choice does not bypass LucaOS safety checks.",
    primaryCta: "Continue",
    secondaryCta: "Use recommended",
    detailsLabel: "About permission style",
    options: permissionOptions,
  },
  memory_boundaries: {
    id: "memory_boundaries",
    title: "What may I remember?",
    summary: "Set a comfortable boundary for what I may keep for future conversations.",
    reassurance: "You can change this later and ask me to forget information at any time.",
    primaryCta: "Continue",
    secondaryCta: "Decide later",
    detailsLabel: "About memory boundaries",
    options: memoryOptions,
  },
  connect_tools: {
    id: "connect_tools",
    title: "Connect tools when you're ready",
    summary: "I can work with tools you approve, but we can enter LucaOS without connecting anything now.",
    reassurance: "No tool access starts until you review and approve it.",
    primaryCta: "Continue",
    secondaryCta: "Set up later",
    detailsLabel: "About tool access",
    options: toolOptions,
  },
  intelligence_route: {
    id: "intelligence_route",
    title: "How should I think?",
    summary: "Choose the intelligence path you want me to prefer later. This is only a preference for review.",
    reassurance:
      "This does not change providers, start a local model, store provider access, or grant a cloud connection.",
    primaryCta: "Continue",
    secondaryCta: "Use recommended",
    detailsLabel: "About intelligence paths",
    options: routeOptions,
  },
  finish: {
    id: "finish",
    title: "I'm ready",
    summary: "I'll open your workspace now. You can change these choices anytime in Settings.",
    primaryCta: "Enter LucaOS",
    secondaryCta: "Review choices",
    accessibilityLabel: "Luca is ready",
  },
};

const createCopySet = (
  mode: PremiumOnboardingAudienceMode,
  overrides: Partial<Record<PremiumOnboardingScreenId, Partial<PremiumOnboardingScreenCopy>>>,
): PremiumOnboardingCopySet => ({
  mode,
  screens: Object.fromEntries(
    premiumOnboardingScreenOrder.map((id) => [id, { ...basicScreens[id], ...overrides[id], id }]),
  ) as Record<PremiumOnboardingScreenId, PremiumOnboardingScreenCopy>,
});

export const premiumOnboardingCopy: Readonly<Record<PremiumOnboardingAudienceMode, PremiumOnboardingCopySet>> = {
  basic: { mode: "basic", screens: basicScreens },
  pro: createCopySet("pro", {
    welcome: {
      summary:
        "I'll become a calm intelligence layer across your device, with chat, voice, workspace surfaces, memory, tools, and actions you approve.",
    },
    presence: {
      summary: "Choose the surfaces I should emphasize first. Every core surface remains available later.",
    },
    permission_style: {
      summary: "Set the default approval style for actions I may take on your behalf.",
    },
    intelligence_route: {
      summary: "Choose the intelligence path you prefer me to use after you review the setup details.",
    },
  }),
  creator: createCopySet("creator", {
    welcome: {
      summary:
        "I'll become a quiet creative environment across your device, ready for chat, voice, memory, tools, and actions you approve as you build.",
    },
    environment: {
      summary: "Choose the visual environment you want me to keep around your writing, planning, and making.",
    },
    presence: {
      summary: "Choose how I should stay close while you draft, organize, and publish work.",
    },
    intelligence_route: {
      summary: "Choose the thinking style you prefer for future creative work. You can refine it later.",
    },
  }),
};

export const getPremiumOnboardingCopy = (
  mode: PremiumOnboardingAudienceMode | string,
): PremiumOnboardingCopySet => {
  if (mode === "pro" || mode === "creator" || mode === "basic") {
    return premiumOnboardingCopy[mode];
  }

  return premiumOnboardingCopy.basic;
};
