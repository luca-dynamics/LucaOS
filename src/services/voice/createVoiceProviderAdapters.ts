import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  VoiceByokProviderAdapter,
  VoiceByokProviderAdapterOptions,
} from "./VoiceByokProviderAdapter";
import { VoiceLocalProviderAdapter } from "./VoiceLocalProviderAdapter";
import { VoiceLucaPrimeProviderAdapter } from "./VoiceLucaPrimeProviderAdapter";
import { LucaVoiceProviderAdapterSnapshot } from "./types";

export interface CreateVoiceProviderAdaptersOptions {
  registry?: VoiceBackendRegistry;
  byok?: VoiceByokProviderAdapterOptions;
}

export function createVoiceProviderAdapters(options: CreateVoiceProviderAdaptersOptions = {}) {
  const localAdapter = new VoiceLocalProviderAdapter();
  const lucaPrimeAdapter = new VoiceLucaPrimeProviderAdapter();
  const byokAdapter = new VoiceByokProviderAdapter(options.byok);

  const registerAll = (registry: VoiceBackendRegistry = options.registry ?? new VoiceBackendRegistry()) => {
    localAdapter.registerBackends(registry);
    lucaPrimeAdapter.registerBackends(registry);
    byokAdapter.registerBackends(registry);
    return registry;
  };

  const getSnapshots = (): LucaVoiceProviderAdapterSnapshot[] => [
    localAdapter.getSnapshot(),
    lucaPrimeAdapter.getSnapshot(),
    byokAdapter.getSnapshot(),
  ];

  const reset = (): void => {
    localAdapter.reset();
    lucaPrimeAdapter.reset();
    byokAdapter.reset();
  };

  return {
    localAdapter,
    lucaPrimeAdapter,
    byokAdapter,
    registerAll,
    getSnapshots,
    reset,
  };
}
