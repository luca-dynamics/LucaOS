export type LucaOnboardingStepId = "identity" | "interaction" | "appearance" | "model-route" | "ready";

export interface LucaOnboardingStep {
  id: LucaOnboardingStepId;
  label: string;
  eyebrow: string;
  title: string;
  detail: string;
}

// Browser-safe expression of the original LucaOS progression: identity,
// conversation mode, interface calibration, runtime route, then activation.
export const LUCA_ONBOARDING_STEPS: readonly LucaOnboardingStep[] = [
  { id: "identity", label: "Identity", eyebrow: "Identity link", title: "What should Luca call you?", detail: "Establish the operator identity Luca will use in this environment." },
  { id: "interaction", label: "Interaction", eyebrow: "Conversation mode", title: "How would you like to talk?", detail: "Choose text or voice. Microphone access is requested only when voice is used." },
  { id: "appearance", label: "Appearance", eyebrow: "Interface calibration", title: "Choose your LucaOS appearance.", detail: "Use the same LucaOS theme direction across your available hosts." },
  { id: "model-route", label: "Model route", eyebrow: "Runtime route", title: "Choose how Luca should think here.", detail: "Local models remain available through LucaOS Desktop or a paired host." },
  { id: "ready", label: "Ready", eyebrow: "Activation", title: "LucaOS is ready.", detail: "Your settings can be changed later without repeating onboarding." },
] as const;

export const LUCA_INTERACTION_OPTIONS = [
  { value: "chat", label: "Text", detail: "Type your thoughts" },
  { value: "voice", label: "Voice", detail: "Speak naturally when ready" },
] as const;
export const LUCA_THEME_OPTIONS = [
  { value: "cyan", label: "Luca Silver", detail: "Pearl glass with a cool Luca accent" },
  { value: "neutral", label: "Luca Graphite", detail: "Focused charcoal workspace" },
  { value: "violet", label: "Luca Frost", detail: "Cool surfaces with soft highlights" },
] as const;
export const LUCA_WEB_MODEL_ROUTES = [
  { value: "cloud", label: "Luca Cloud", detail: "Use an approved API route" },
  { value: "byok", label: "Bring your key", detail: "Configure a provider in Settings" },
  { value: "desktop-later", label: "LucaOS Desktop", detail: "Pair a local-model host later" },
] as const;
