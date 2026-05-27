import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { LucaVoiceProviderRouteRequest } from "./types";

export function createVoiceProviderRouter(registry: VoiceBackendRegistry) {
  const router = new VoiceProviderRouter(registry);

  return {
    router,
    route: (request: LucaVoiceProviderRouteRequest) => router.route(request),
    getSnapshot: () => router.getSnapshot(),
    reset: () => router.reset(),
  };
}
