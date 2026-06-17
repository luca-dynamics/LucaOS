import type { LucaProviderHubCategory, LucaProviderHubEntry } from "./providerHubRegistry";
import type {
  LucaProviderHubConnectionState,
  LucaProviderHubReadinessResult,
  LucaProviderHubRequiredAction,
} from "./providerHubReadiness";
import type { ProviderHubPanelCardViewModel, ProviderHubPanelViewModel } from "./providerHubPanelViewModel";
import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";

export type LucaProviderHubConfigureIntentKind =
  | "connect_managed"
  | "add_api_key"
  | "set_base_url"
  | "start_local_runtime"
  | "select_model"
  | "review_provider"
  | "unsupported";

export interface LucaProviderHubConfigureIntent {
  readonly intentId: string;
  readonly providerId: string;
  readonly providerLabel: string;
  readonly providerCategory: LucaProviderHubCategory;
  readonly intentKind: LucaProviderHubConfigureIntentKind;
  readonly requiredAction: LucaProviderHubRequiredAction;
  readonly readinessState: LucaProviderHubConnectionState;
  readonly title: string;
  readonly description: string;
  readonly primaryLabel: string;
  readonly secondaryLabel: string;
  readonly safeDiagnosticsText: string;
  readonly supportedTaskTypes: readonly LucaModelTaskType[];
  readonly capabilities: readonly LucaModelCapability[];
  readonly missingCapabilities: readonly LucaModelCapability[];
  readonly sideEffectsPerformed: false;
  readonly settingsWritePerformed: false;
  readonly providerApiCalled: false;
  readonly runtimeStarted: false;
}

interface ConfigureIntentCopy {
  readonly title: string;
  readonly description: string;
  readonly primaryLabel: string;
  readonly secondaryLabel: string;
}

const INTENT_COPY: Record<LucaProviderHubConfigureIntentKind, ConfigureIntentCopy> = {
  connect_managed: {
    title: "Review managed provider",
    description: "Luca Prime is managed by LucaOS. No user API key is required by this configure intent.",
    primaryLabel: "Review Luca Prime",
    secondaryLabel: "No key needed",
  },
  add_api_key: {
    title: "Add API key",
    description: "This provider needs a user-managed API key before future routing can use it.",
    primaryLabel: "Add API key",
    secondaryLabel: "Review provider",
  },
  set_base_url: {
    title: "Set base URL",
    description: "This provider needs a custom OpenAI-compatible base URL before it can be considered configured.",
    primaryLabel: "Set base URL",
    secondaryLabel: "Review provider",
  },
  start_local_runtime: {
    title: "Start local runtime",
    description: "This provider needs its local runtime to be available. This intent does not start it.",
    primaryLabel: "Start runtime manually",
    secondaryLabel: "Review setup",
  },
  select_model: {
    title: "Select supported model",
    description: "This provider cannot satisfy the requested task or capabilities with the current selection.",
    primaryLabel: "Select model",
    secondaryLabel: "Review support",
  },
  review_provider: {
    title: "Review provider",
    description: "Review this provider before changing configuration in a future settings flow.",
    primaryLabel: "Review provider",
    secondaryLabel: "Keep unchanged",
  },
  unsupported: {
    title: "Unsupported provider",
    description: "This provider cannot be configured by Provider Hub from the current readiness state.",
    primaryLabel: "Unsupported",
    secondaryLabel: "Choose another provider",
  },
};

export function getProviderHubConfigureIntentKind(
  readiness: Pick<LucaProviderHubReadinessResult, "providerId" | "category" | "state" | "requiredAction" | "ready">,
): LucaProviderHubConfigureIntentKind {
  if (readiness.providerId === "luca_prime") {
    return readiness.state === "unknown" || readiness.state === "unsupported_task" || readiness.state === "unsupported_capability"
      ? "unsupported"
      : "connect_managed";
  }

  switch (readiness.state) {
    case "missing_user_key":
      return "add_api_key";
    case "missing_base_url":
      return "set_base_url";
    case "local_runtime_unavailable":
      return "start_local_runtime";
    case "unsupported_task":
    case "unsupported_capability":
    case "unknown":
      return "unsupported";
    case "disabled":
      return readiness.requiredAction === "choose_known_provider" ? "unsupported" : "review_provider";
    case "ready":
      return readiness.category === "luca_managed" ? "connect_managed" : "review_provider";
    default:
      return "review_provider";
  }
}

export function createProviderHubConfigureIntent(
  entry: LucaProviderHubEntry,
  readiness: LucaProviderHubReadinessResult,
): LucaProviderHubConfigureIntent {
  const intentKind = getProviderHubConfigureIntentKind(readiness);
  const copy = INTENT_COPY[intentKind];
  const intent: Omit<LucaProviderHubConfigureIntent, "safeDiagnosticsText"> = {
    intentId: `${entry.providerId}:${readiness.state}:${intentKind}`,
    providerId: entry.providerId,
    providerLabel: entry.label,
    providerCategory: entry.category,
    intentKind,
    requiredAction: readiness.requiredAction,
    readinessState: readiness.state,
    title: copy.title,
    description: copy.description,
    primaryLabel: copy.primaryLabel,
    secondaryLabel: copy.secondaryLabel,
    supportedTaskTypes: [...readiness.supportedTaskTypes],
    capabilities: [...readiness.capabilities],
    missingCapabilities: [...readiness.missingCapabilities],
    sideEffectsPerformed: false,
    settingsWritePerformed: false,
    providerApiCalled: false,
    runtimeStarted: false,
  };

  return {
    ...intent,
    safeDiagnosticsText: createProviderHubConfigureIntentDiagnostics(intent),
  };
}

export function createProviderHubConfigureIntentFromCard(card: ProviderHubPanelCardViewModel): LucaProviderHubConfigureIntent {
  return createProviderHubConfigureIntent(card.entry, card.readiness);
}

export function createProviderHubConfigureIntentsFromViewModel(
  viewModel: ProviderHubPanelViewModel,
): readonly LucaProviderHubConfigureIntent[] {
  return viewModel.sections.flatMap((section) => section.cards.map(createProviderHubConfigureIntentFromCard));
}

export function createProviderHubConfigureIntentDiagnostics(
  intent: Omit<LucaProviderHubConfigureIntent, "safeDiagnosticsText"> | LucaProviderHubConfigureIntent,
): string {
  return [
    `providerId=${intent.providerId}`,
    `providerLabel=${intent.providerLabel}`,
    `category=${intent.providerCategory}`,
    `readinessState=${intent.readinessState}`,
    `requiredAction=${intent.requiredAction}`,
    `intentKind=${intent.intentKind}`,
    `supportedTasks=${intent.supportedTaskTypes.join(",") || "none"}`,
    `capabilities=${intent.capabilities.join(",") || "none"}`,
    `missingCapabilities=${intent.missingCapabilities.join(",") || "none"}`,
    `sideEffectsPerformed=${intent.sideEffectsPerformed}`,
    `settingsWritePerformed=${intent.settingsWritePerformed}`,
    `providerApiCalled=${intent.providerApiCalled}`,
    `runtimeStarted=${intent.runtimeStarted}`,
  ].join("\n");
}
