/**
 * onboardingConnectors — the connector source for the onboarding "Connect now"
 * grid.
 *
 * It does NOT define its own catalog. The connectors come from the shared
 * `connectorCatalog` (the same first-party list Settings renders), plus a
 * best-effort merge of live MCP-registry connectors. This keeps onboarding,
 * Settings, and the marketplace agreeing on one source of truth.
 *
 * Boundary discipline: choosing a connector here only records intent for later
 * review in Settings — no OAuth, token, or tool access is granted during
 * onboarding. The registry fetch is read-only and best-effort: if the backend
 * is unreachable (first run / offline / web), only the first-party list shows.
 */

import { useEffect, useState } from "react";
import { apiUrl } from "../../config/api";
import {
  FIRST_PARTY_CONNECTORS,
  mapMcpRegistryEntry,
  type ConnectorCatalogEntry,
} from "../../config/connectorCatalog";

export type { ConnectorCatalogEntry } from "../../config/connectorCatalog";

const REGISTRY_TIMEOUT_MS = 4000;
const REGISTRY_LIMIT = 12;

/** Popular-first ordering, stable across renders. */
const byPopular = (a: ConnectorCatalogEntry, b: ConnectorCatalogEntry): number =>
  Number(Boolean(b.popular)) - Number(Boolean(a.popular));

export interface OnboardingConnectorsState {
  /** First-party + any live registry connectors, popular-first. */
  connectors: ConnectorCatalogEntry[];
  /** True while the best-effort registry fetch is in flight. */
  loadingRegistry: boolean;
}

/**
 * The onboarding connector list: the first-party catalog immediately, then any
 * MCP-registry connectors merged in once a best-effort fetch resolves. Failure
 * (offline / no backend) is silent — first-party connectors always render.
 */
export function useOnboardingConnectors(): OnboardingConnectorsState {
  const [registry, setRegistry] = useState<ConnectorCatalogEntry[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS);
    let active = true;

    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/mcp/registry?limit=${REGISTRY_LIMIT}`),
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        const seen = new Set(FIRST_PARTY_CONNECTORS.map((c) => c.id));
        const mapped = (data?.servers ?? [])
          .map(mapMcpRegistryEntry)
          .filter(
            (c: ConnectorCatalogEntry | null): c is ConnectorCatalogEntry =>
              Boolean(c) && !seen.has((c as ConnectorCatalogEntry).id),
          );
        if (active) setRegistry(mapped);
      } catch {
        // Offline / no backend / aborted — first-party connectors only.
      } finally {
        if (active) setLoadingRegistry(false);
        clearTimeout(timer);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return {
    connectors: [...FIRST_PARTY_CONNECTORS, ...registry].sort(byPopular),
    loadingRegistry,
  };
}
