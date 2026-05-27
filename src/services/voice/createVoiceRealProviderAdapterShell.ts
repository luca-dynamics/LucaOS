import { VoiceProviderRouter } from "./VoiceProviderRouter";
import {
  VoiceRealProviderAdapterShell,
  type VoiceRealProviderAdapterShellOptions,
} from "./VoiceRealProviderAdapterShell";
import { type LucaVoiceRealProviderAdapterRequest } from "./types";

export function createVoiceRealProviderAdapterShell(
  providerRouter: VoiceProviderRouter,
  options: VoiceRealProviderAdapterShellOptions = {},
) {
  const adapter = new VoiceRealProviderAdapterShell(providerRouter, options);

  return {
    adapter,
    invoke: (request: LucaVoiceRealProviderAdapterRequest) => adapter.invoke(request),
    getSnapshot: () => adapter.getSnapshot(),
    reset: () => adapter.reset(),
  };
}
