import { getProviderHubEntries, type LucaProviderHubCategory, type LucaProviderHubEntry } from "./providerHubRegistry";
import {
  evaluateProviderHubReadinessForAll,
  summarizeProviderHubReadiness,
  type LucaProviderHubConnectionSnapshot,
  type LucaProviderHubConnectionState,
  type LucaProviderHubReadinessResult,
  type LucaProviderHubRequiredAction,
} from "./providerHubReadiness";

export interface ProviderHubPanelCardViewModel {
  readonly entry: LucaProviderHubEntry;
  readonly readiness: LucaProviderHubReadinessResult;
  readonly requiredActionLabel: string;
  readonly readinessLabel: string;
  readonly categoryLabel: string;
  readonly diagnosticsText: string;
  readonly configuredModelId?: string;
}

export interface ProviderHubPanelSectionViewModel {
  readonly id: LucaProviderHubCategory;
  readonly title: string;
  readonly cards: readonly ProviderHubPanelCardViewModel[];
}

export interface ProviderHubPanelViewModel {
  readonly title: "Provider Hub";
  readonly subtitle: "Connect Luca Prime, cloud providers, routers, local runtimes, and BYOK endpoints.";
  readonly note: "Display-only foundation. Runtime routing is unchanged.";
  readonly summary: readonly { readonly id: LucaProviderHubConnectionState | "disabled_or_unknown"; readonly label: string; readonly count: number }[];
  readonly sections: readonly ProviderHubPanelSectionViewModel[];
}

const SECTION_ORDER: readonly LucaProviderHubCategory[] = ["luca_managed", "connected_cloud", "router", "local_runtime", "custom"];

const SECTION_TITLES: Record<LucaProviderHubCategory, string> = {
  luca_managed: "Luca Managed",
  connected_cloud: "Connected Cloud",
  router: "Router",
  local_runtime: "Local Runtime",
  custom: "Custom / BYOK",
  disabled: "Disabled / Unknown",
};

const STATE_LABELS: Record<LucaProviderHubConnectionState, string> = {
  ready: "Ready",
  missing_user_key: "Needs API key",
  missing_base_url: "Needs base URL",
  local_runtime_unavailable: "Local runtime unavailable",
  disabled: "Disabled",
  unknown: "Unknown",
  unsupported_task: "Unsupported task",
  unsupported_capability: "Unsupported capability",
};

const ACTION_LABELS: Record<LucaProviderHubRequiredAction, string> = {
  none: "No action needed",
  connect_provider: "Connect provider",
  add_api_key: "Needs API key",
  set_base_url: "Needs base URL",
  start_local_runtime: "Start local runtime",
  select_supported_model: "Select supported model",
  enable_provider: "Enable provider",
  choose_known_provider: "Choose known provider",
};

export function createProviderHubDiagnosticsText(result: LucaProviderHubReadinessResult, entry: LucaProviderHubEntry): string {
  return [
    `providerId=${result.providerId}`,
    `providerLabel=${entry.label}`,
    `category=${result.category}`,
    `readinessState=${result.state}`,
    `requiredAction=${result.requiredAction}`,
    `supportedTasks=${result.supportedTaskTypes.join(",") || "none"}`,
    `capabilities=${result.capabilities.join(",") || "none"}`,
    `missingCapabilities=${result.missingCapabilities.join(",") || "none"}`,
    `costTier=${entry.defaultCostTier}`,
    `latencyFit=${entry.defaultLatencyFit}`,
    `privacyFit=${entry.privacyFit}`,
    `sideEffectsPerformed=${result.sideEffectsPerformed}`,
  ].join("\n");
}

export function createProviderHubPanelViewModel(
  connectionSnapshots: readonly LucaProviderHubConnectionSnapshot[] = [{ providerId: "luca_prime", enabled: true }],
): ProviderHubPanelViewModel {
  const results = evaluateProviderHubReadinessForAll({ connectionSnapshots });
  const summary = summarizeProviderHubReadiness(results);
  const entries = getProviderHubEntries();
  const resultByProvider = new Map(results.map((result) => [result.providerId, result]));
  const snapshotByProvider = new Map(connectionSnapshots.map((snapshot) => [snapshot.providerId, snapshot]));

  const cards = entries.map((entry): ProviderHubPanelCardViewModel => {
    const readiness = resultByProvider.get(entry.providerId)!;
    return {
      entry,
      readiness,
      requiredActionLabel: ACTION_LABELS[readiness.requiredAction],
      readinessLabel: STATE_LABELS[readiness.state],
      categoryLabel: SECTION_TITLES[entry.category],
      diagnosticsText: createProviderHubDiagnosticsText(readiness, entry),
      configuredModelId: snapshotByProvider.get(entry.providerId)?.configuredModelId,
    };
  });

  return {
    title: "Provider Hub",
    subtitle: "Connect Luca Prime, cloud providers, routers, local runtimes, and BYOK endpoints.",
    note: "Display-only foundation. Runtime routing is unchanged.",
    summary: [
      { id: "ready", label: "Ready", count: summary.states.ready },
      { id: "missing_user_key", label: "Needs API key", count: summary.states.missing_user_key },
      { id: "missing_base_url", label: "Needs base URL", count: summary.states.missing_base_url },
      { id: "local_runtime_unavailable", label: "Local runtime unavailable", count: summary.states.local_runtime_unavailable },
      { id: "disabled_or_unknown", label: "Disabled/Unknown", count: summary.states.disabled + summary.states.unknown },
    ],
    sections: SECTION_ORDER.map((category) => ({
      id: category,
      title: SECTION_TITLES[category],
      cards: cards.filter((card) => card.entry.category === category),
    })),
  };
}
